<?php

namespace App\Console\Commands;

use App\Support\TenantContext;
use App\Support\TenantDB;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateApplicationNotifications extends Command
{
    protected $signature = 'notifications:generate';

    protected $description = 'Create reminders for missed attendance calls and unpaid student dues';

    public function handle(): int
    {
        $now = Carbon::now('Africa/Douala');
        $centerIds = DB::table('centers')->whereNull('archived_at')->pluck('id');
        foreach ($centerIds as $centerId) {
            TenantContext::run((int) $centerId, function () use ($now): void {
                $this->notifyMissedAttendance($now);
                $this->notifyPaymentDue($now);
                $this->pruneOldNotifications($now);
            });
        }

        return self::SUCCESS;
    }

    private function notifyMissedAttendance(Carbon $now): void
    {
        $dayNames = [1 => 'Lundi', 2 => 'Mardi', 3 => 'Mercredi', 4 => 'Jeudi', 5 => 'Vendredi', 6 => 'Samedi', 7 => 'Dimanche'];
        $today = $now->toDateString();
        $weekStart = $now->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
        $slots = TenantDB::table('timetable_slots')
            ->join('salles', 'salles.id', '=', 'timetable_slots.salle_id')
            ->whereNull('timetable_slots.deleted_at')
            ->whereNull('salles.deleted_at')
            ->where('timetable_slots.day', $dayNames[$now->dayOfWeekIso])
            ->where('timetable_slots.end_time', '<=', $now->format('H:i:s'))
            ->where(function ($query) use ($weekStart) {
                $query->whereNull('timetable_slots.week_start')->orWhereDate('timetable_slots.week_start', $weekStart);
            })
            ->get([
                'timetable_slots.id', 'timetable_slots.salle_id', 'timetable_slots.room_id',
                'timetable_slots.school_year_id', 'timetable_slots.teacher_id',
                'timetable_slots.subject_name', 'timetable_slots.start_time', 'timetable_slots.end_time',
                'salles.name as salle_name',
            ]);

        if ($slots->isEmpty()) {
            return;
        }

        $admins = TenantDB::table('users')
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->where(fn ($query) => $query->where('role', 'admin')->orWhere('is_admin', true))
            ->pluck('id');

        foreach ($slots as $slot) {
            $studentIds = TenantDB::table('inscriptions')
                ->where('salle_id', $slot->salle_id)
                ->where('school_year_id', $slot->school_year_id)
                ->whereIn('statut', ['Validée', 'En attente de paiement'])
                ->whereNull('deleted_at')
                ->pluck('student_id');
            if ($studentIds->isEmpty()) {
                continue;
            }

            $calledCount = TenantDB::table('attendances')
                ->where('timetable_slot_id', $slot->id)
                ->whereDate('date', $today)
                ->whereIn('student_id', $studentIds)
                ->whereNull('deleted_at')
                ->distinct('student_id')
                ->count('student_id');
            if ($calledCount >= $studentIds->unique()->count()) {
                continue;
            }

            $subject = $slot->subject_name ?: 'Cours';
            $message = sprintf(
                'L’appel n’a pas été enregistré à temps : %s, %s (%s–%s), le %s.',
                $slot->salle_name,
                $subject,
                substr($slot->start_time, 0, 5),
                substr($slot->end_time, 0, 5),
                $now->format('d/m/Y'),
            );
            $teacher = TenantDB::table('users')
                ->where('id', $slot->teacher_id)
                ->whereNull('deleted_at')
                ->where('status', 'active')
                ->first(['id']);
            if ($teacher) {
                $this->insertNotification(
                    (int) $teacher->id,
                    'missed_attendance',
                    'Appel non effectué',
                    $message,
                    '/enseignant/appel/'.$slot->id,
                    'attendance:'.$slot->id.':'.$today.':'.$teacher->id,
                    $now,
                );
            }
            foreach ($admins as $adminId) {
                $this->insertNotification(
                    (int) $adminId,
                    'missed_attendance',
                    'Appel non effectué',
                    $message,
                    '/presences/'.$slot->salle_id,
                    'attendance:'.$slot->id.':'.$today.':'.$adminId,
                    $now,
                );
            }
        }
    }

    private function notifyPaymentDue(Carbon $now): void
    {
        $today = $now->toDateString();
        $inscriptions = TenantDB::table('inscriptions')
            ->join('students', 'students.id', '=', 'inscriptions.student_id')
            ->join('salles', 'salles.id', '=', 'inscriptions.salle_id')
            ->join('school_years', 'school_years.id', '=', 'inscriptions.school_year_id')
            ->leftJoin('tarifs', 'tarifs.id', '=', 'inscriptions.tarif_id')
            ->whereIn('inscriptions.statut', ['Validée', 'En attente de paiement'])
            ->where('school_years.is_active', true)
            ->whereDate('inscriptions.date_inscription', '<=', $today)
            ->whereNull('inscriptions.deleted_at')
            ->whereNull('students.deleted_at')
            ->whereNull('salles.deleted_at')
            ->whereNull('school_years.deleted_at')
            ->get([
                'inscriptions.id', 'inscriptions.student_id', 'inscriptions.salle_id',
                'inscriptions.school_year_id', 'inscriptions.date_inscription', 'inscriptions.nombre_mois',
                'students.name as student_name', 'salles.name as salle_name',
                'tarifs.frais_inscription', 'tarifs.mensualite', 'tarifs.nombre_mois as tarif_nombre_mois',
            ]);
        if ($inscriptions->isEmpty()) {
            return;
        }

        $payments = TenantDB::table('payments')
            ->whereIn('inscription_id', $inscriptions->pluck('id'))
            ->where('status', '!=', 'impayé')
            ->where('amount', '>', 0)
            ->where(fn ($query) => $query->whereNull('paid_at')->orWhereDate('paid_at', '<=', $today))
            ->whereNull('deleted_at')
            ->select('inscription_id', DB::raw('SUM(amount) as amount_paid'))
            ->groupBy('inscription_id')
            ->pluck('amount_paid', 'inscription_id');

        $admins = TenantDB::table('users')
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->where(fn ($query) => $query->where('role', 'admin')->orWhere('is_admin', true))
            ->pluck('id');

        foreach ($inscriptions as $inscription) {
            $start = Carbon::parse($inscription->date_inscription, 'Africa/Douala')->startOfDay();
            $numberOfMonths = (int) ($inscription->nombre_mois ?: $inscription->tarif_nombre_mois ?: 9);
            $dueMonthIndex = null;
            for ($month = 0; $month < $numberOfMonths; $month++) {
                if ($start->copy()->addMonthsNoOverflow($month)->toDateString() === $today) {
                    $dueMonthIndex = $month;
                    break;
                }
            }
            if ($dueMonthIndex === null) {
                continue;
            }

            $totalDue = (int) ($inscription->frais_inscription ?? 0)
                + ((int) ($inscription->mensualite ?? 0) * ($dueMonthIndex + 1));
            $balance = max(0, $totalDue - (int) ($payments[$inscription->id] ?? 0));
            if ($balance <= 0) {
                continue;
            }

            $message = sprintf(
                '%s a une échéance de paiement aujourd’hui. Solde dû : %s FCFA (%s).',
                $inscription->student_name,
                number_format($balance, 0, ',', ' '),
                $inscription->salle_name,
            );
            foreach ($admins as $adminId) {
                $this->insertNotification(
                    (int) $adminId,
                    'payment_due',
                    'Paiement à échéance',
                    $message,
                    '/eleves/'.$inscription->student_id,
                    'payment:'.$inscription->id.':'.$today.':'.$adminId,
                    $now,
                );
            }
        }
    }

    private function insertNotification(int $recipientId, string $type, string $title, string $message, string $targetUrl, string $dedupeKey, Carbon $now): void
    {
        TenantDB::table('application_notifications')->insertOrIgnore([
            'recipient_id' => $recipientId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'target_url' => $targetUrl,
            'dedupe_key' => $dedupeKey,
            'created_at' => $now->copy()->utc(),
            'updated_at' => $now->copy()->utc(),
        ]);
    }

    private function pruneOldNotifications(Carbon $now): void
    {
        TenantDB::table('application_notifications')
            ->where(function ($query) use ($now) {
                $query->where(fn ($read) => $read->whereNotNull('read_at')->where('read_at', '<=', $now->copy()->utc()->subDays(1)))
                    ->orWhere(fn ($unread) => $unread->whereNull('read_at')->where('created_at', '<=', $now->copy()->utc()->subDays(90)));
            })
            ->delete();
    }
}
