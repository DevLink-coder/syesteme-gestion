<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Grade;
use App\Models\Inscription;
use App\Models\Student;
use App\Models\TimetableSlot;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ParentPortalController extends Controller
{
    public function loginByWhatsapp(Request $request)
    {
        $whatsapp = $request->input('whatsapp', '');
        $cleanNumber = preg_replace('/^(\+237|237)/', '', trim($whatsapp));

        if (strlen($cleanNumber) < 9) {
            return response()->json(['message' => 'Numéro WhatsApp invalide'], 422);
        }

        $student = Student::query()
            ->where('parent_whatsapp', 'like', '%'.$cleanNumber)
            ->whereNull('deleted_at')
            ->first();

        if (! $student) {
            return response()->json(['message' => 'Aucun compte parent trouvé pour ce numéro'], 404);
        }

        // Generate or refresh parent token if expired or doesn't exist
        if (! $student->parent_token || ! $student->parent_token_expires_at || $student->parent_token_expires_at->isPast()) {
            $plainToken = Str::random(64);
            $student->forceFill([
                'parent_token' => hash('sha256', $plainToken),
                'parent_token_expires_at' => now()->addDays(30),
            ])->save();
        } else {
            // Reuse existing token by finding it (we'll need to store the plain token somewhere or regenerate)
            // For security, we'll regenerate to avoid storing plain tokens
            $plainToken = Str::random(64);
            $student->forceFill([
                'parent_token' => hash('sha256', $plainToken),
                'parent_token_expires_at' => now()->addDays(30),
            ])->save();
        }

        $centerSlug = DB::table('centers')
            ->where('id', $student->center_id)
            ->value('slug');
        $centerPath = $centerSlug ? '/'.$centerSlug : '';

        return response()->json([
            'url' => rtrim((string) config('app.url'), '/').$centerPath.'/parent/'.$student->code.'?token='.urlencode($plainToken),
            'expiresAt' => $student->parent_token_expires_at?->toIso8601String(),
        ])->header('Cache-Control', 'no-store, private');
    }

    public function createLink(Request $request, $studentId)
    {
        $student = Student::query()->findOrFail($studentId);
        $plainToken = Str::random(64);

        $student->forceFill([
            'parent_token' => hash('sha256', $plainToken),
            'parent_token_expires_at' => now()->addDays(30),
        ])->save();

        $centerSlug = DB::table('centers')
            ->where('id', $student->center_id)
            ->value('slug');
        $centerPath = $centerSlug ? '/'.$centerSlug : '';

        return response()->json([
            'url' => rtrim((string) config('app.url'), '/').$centerPath.'/parent/'.$student->code.'?token='.urlencode($plainToken),
            'expiresAt' => $student->parent_token_expires_at?->toIso8601String(),
        ])->header('Cache-Control', 'no-store, private');
    }

    public function show(Request $request, $studentId)
    {
        $plainToken = (string) $request->query('token', '');
        abort_if(strlen($plainToken) < 32, 404);

        $student = Student::query()
            ->where(function ($query) use ($studentId) {
                $query->whereKey($studentId)->orWhere('code', $studentId);
            })
            ->where('parent_token', hash('sha256', $plainToken))
            ->where('parent_token_expires_at', '>', now())
            ->firstOrFail();

        $inscriptions = Inscription::query()
            ->with(['salle', 'schoolYear', 'tarif', 'payments' => fn ($query) => $query->orderBy('paid_at')])
            ->where('student_id', $student->id)
            ->whereIn('statut', ['Validée', 'En attente de paiement', 'En pause'])
            ->get();

        $activeInscription = $inscriptions
            ->sortByDesc(fn ($inscription) => [
                (int) ($inscription->schoolYear?->is_active ?? false),
                $inscription->date_inscription?->format('Y-m-d') ?? '',
                $inscription->id,
            ])
            ->first();

        $bulletins = Grade::query()
            ->with(['evaluation.salle', 'evaluation.schoolYear'])
            ->where('student_id', $student->id)
            ->whereHas('evaluation')
            ->orderByDesc('evaluation_id')
            ->get()
            ->groupBy('evaluation_id')
            ->map(function ($grades) {
                $evaluation = $grades->first()->evaluation;
                $rows = $grades->map(fn ($grade) => [
                    'subject' => $grade->subject_name ?: $grade->subject?->name ?: 'Matière',
                    'note' => (float) $grade->note,
                    'coefficient' => (float) ($grade->coefficient ?: 1),
                ])->values();
                $coefficientTotal = $rows->sum('coefficient');
                $weightedTotal = $rows->sum(fn ($row) => $row['note'] * $row['coefficient']);

                return [
                    'id' => (string) $evaluation->id,
                    'title' => $evaluation->title,
                    'date' => $evaluation->date?->format('Y-m-d'),
                    'subject' => $evaluation->subject,
                    'schoolYearId' => (string) $evaluation->school_year_id,
                    'schoolYearLabel' => $evaluation->schoolYear?->label,
                    'salleName' => $evaluation->salle?->name,
                    'rows' => $rows,
                    'totalCoefficient' => $coefficientTotal,
                    'weightedTotal' => $weightedTotal,
                    'average' => $coefficientTotal > 0 ? round($weightedTotal / $coefficientTotal, 2) : null,
                ];
            })
            ->sortByDesc('date')
            ->values();

        $absenceQuery = Attendance::query()
            ->with(['slot', 'salle'])
            ->where('student_id', $student->id)
            ->where('present', false);
        $absences = $absenceQuery->orderByDesc('date')->orderByDesc('heure_appel')->get();
        $absenceWeekStarts = $absences->map(fn ($absence) => $absence->date?->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d'))->filter()->unique();
        $slotsBySalleDay = TimetableSlot::query()
            ->whereIn('salle_id', $absences->pluck('salle_id')->unique())
            ->whereIn('school_year_id', $absences->pluck('school_year_id')->unique())
            ->where(fn ($query) => $query->whereNull('week_start')->orWhereIn('week_start', $absenceWeekStarts))
            ->get()
            ->groupBy(fn ($slot) => $slot->salle_id.'|'.$slot->school_year_id.'|'.($slot->week_start?->format('Y-m-d') ?? 'recurring').'|'.$slot->day);
        $weekdayNames = [1 => 'Lundi', 2 => 'Mardi', 3 => 'Mercredi', 4 => 'Jeudi', 5 => 'Vendredi', 6 => 'Samedi', 7 => 'Dimanche'];

        $absenceRows = $absences->map(function ($absence) use ($slotsBySalleDay, $weekdayNames) {
            $slot = $absence->slot;
            $minutes = null;
            $source = null;
            if ($slot?->start_time && $slot?->end_time) {
                $minutes = Carbon::parse($slot->start_time)->diffInMinutes(Carbon::parse($slot->end_time));
                $source = 'slot';
            } elseif ($absence->date) {
                $weekday = $weekdayNames[$absence->date->dayOfWeekIso] ?? null;
                $weekStart = $absence->date->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d');
                $weekPrefix = $absence->salle_id.'|'.$absence->school_year_id.'|'.$weekStart.'|';
                $hasWeekSchedule = $slotsBySalleDay->keys()->contains(fn ($key) => str_starts_with($key, $weekPrefix));
                $daySlots = ! $weekday
                    ? collect()
                    : ($hasWeekSchedule
                        ? $slotsBySalleDay->get($weekPrefix.$weekday, collect())
                        : $slotsBySalleDay->get($absence->salle_id.'|'.$absence->school_year_id.'|recurring|'.$weekday, collect()));
                if ($daySlots->isNotEmpty()) {
                    $minutes = $daySlots->sum(fn ($daySlot) => Carbon::parse($daySlot->start_time)->diffInMinutes(Carbon::parse($daySlot->end_time)));
                    $source = 'schedule';
                }
            }

            return [
                'id' => (string) $absence->id,
                'schoolYearId' => (string) $absence->school_year_id,
                'date' => $absence->date?->format('Y-m-d'),
                'heureAppel' => $absence->heure_appel,
                'subject' => $slot?->subject_name ?: ($source === 'schedule' ? 'Cours de la journée' : null),
                'startTime' => $slot?->start_time?->format('H:i'),
                'endTime' => $slot?->end_time?->format('H:i'),
                'durationMinutes' => $minutes,
                'durationSource' => $source,
            ];
        })->values();
        $currentYearAbsences = $activeInscription
            ? $absenceRows->where('schoolYearId', (string) $activeInscription->school_year_id)
            : collect();

        return response()->json([
            'student' => [
                'id' => (string) $student->id,
                'code' => $student->code,
                'name' => $student->name,
                'language' => $student->language,
            ],
            'bulletins' => $bulletins,
            'absences' => [
                'items' => $absenceRows,
                'count' => $currentYearAbsences->count(),
                'knownHours' => round($currentYearAbsences->sum(fn ($row) => $row['durationMinutes'] ?? 0) / 60, 2),
                'withoutSlotCount' => $currentYearAbsences->whereNull('durationMinutes')->count(),
                'estimatedCount' => $currentYearAbsences->where('durationSource', 'schedule')->count(),
                'schoolYearId' => $activeInscription ? (string) $activeInscription->school_year_id : null,
                'schoolYearLabel' => $activeInscription?->schoolYear?->label,
            ],
            'account' => $activeInscription ? $this->accountSummary($activeInscription) : null,
        ])->withHeaders([
            'Cache-Control' => 'no-store, private',
            'Referrer-Policy' => 'no-referrer',
            'X-Robots-Tag' => 'noindex, nofollow, noarchive',
        ]);
    }

    private function accountSummary(Inscription $inscription): array
    {
        $tarif = $inscription->tarif;
        $start = $inscription->date_inscription?->copy()->startOfDay() ?? now()->startOfDay();
        $today = now()->startOfDay();
        $numberOfMonths = (int) ($inscription->nombre_mois ?? $tarif?->nombre_mois ?? 9);
        $cycles = [[
            'kind' => 'registration',
            'dueDate' => $start->copy(),
            'amount' => (int) ($tarif?->frais_inscription ?? 0),
            'paid' => 0,
        ]];

        for ($month = 0; $month < $numberOfMonths; $month++) {
            $cycles[] = [
                'kind' => 'monthly',
                'dueDate' => $start->copy()->addMonthsNoOverflow($month),
                'amount' => (int) ($tarif?->mensualite ?? 0),
                'paid' => 0,
            ];
        }

        foreach ($inscription->payments->filter(fn ($payment) => $payment->status !== 'impayé'
            && $payment->amount > 0
            && (! $payment->paid_at || $payment->paid_at->lte($today))
        ) as $payment) {
            $type = mb_strtolower((string) $payment->type);
            $only = $type === 'inscription' ? 'registration' : (in_array($type, ['mensualité', 'mensualite'], true) ? 'monthly' : null);
            $remaining = (int) $payment->amount;
            foreach ($cycles as $index => &$cycle) {
                if ($remaining <= 0 || ($only && $cycle['kind'] !== $only)) {
                    continue;
                }
                $due = $cycle['amount'] - $cycle['paid'];
                if ($due <= 0) {
                    continue;
                }
                $applied = min($remaining, $due);
                $cycle['paid'] += $applied;
                $remaining -= $applied;
            }
            unset($cycle);
            if ($remaining > 0 && $only) {
                foreach ($cycles as &$cycle) {
                    if ($remaining <= 0 || $cycle['kind'] === $only) {
                        continue;
                    }
                    $due = $cycle['amount'] - $cycle['paid'];
                    if ($due <= 0) {
                        continue;
                    }
                    $applied = min($remaining, $due);
                    $cycle['paid'] += $applied;
                    $remaining -= $applied;
                }
                unset($cycle);
            }
        }

        $currentMonthlyCycle = null;
        foreach ($cycles as $index => $cycle) {
            if ($cycle['kind'] === 'monthly'
                && $cycle['dueDate']->format('Y-m') === $today->format('Y-m')
                && $cycle['dueDate']->lte($today)) {
                $currentMonthlyCycle = $cycle;
                break;
            }
        }
        $registrationCycle = $today->format('Y-m') === $start->format('Y-m') ? $cycles[0] : null;
        $monthlyDue = ($currentMonthlyCycle['amount'] ?? 0) + ($registrationCycle['amount'] ?? 0);
        $monthlyPaid = ($currentMonthlyCycle['paid'] ?? 0) + ($registrationCycle['paid'] ?? 0);

        return [
            'schoolYearLabel' => $inscription->schoolYear?->label,
            'salleName' => $inscription->salle?->name,
            'status' => $inscription->statut,
            'monthlyDue' => $monthlyDue,
            'monthlyPaid' => $monthlyPaid,
            'monthlyBalance' => max(0, $monthlyDue - $monthlyPaid),
            'currency' => 'FCFA',
            'month' => $today->format('Y-m'),
        ];
    }
}
