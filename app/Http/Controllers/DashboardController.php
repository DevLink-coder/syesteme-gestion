<?php

namespace App\Http\Controllers;

use App\Support\TenantDB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private function dateGroupSql(string $column, string $format): string
    {
        // Utilisation de valeurs whitelistées pour éviter l'injection SQL
        $allowedFormats = [
            '%Y-%m' => '%Y-%m',
            '%Y-%m-%d' => '%Y-%m-%d',
        ];

        if (! isset($allowedFormats[$format])) {
            throw new \InvalidArgumentException('Format de date non autorisé');
        }

        $safeFormat = $allowedFormats[$format];
        $safeColumn = preg_replace('/[^a-zA-Z0-9_]/', '', $column);
        $pgsqlFormat = $format === '%Y-%m' ? 'YYYY-MM' : 'YYYY-MM-DD';

        return match (DB::getDriverName()) {
            'sqlite' => "strftime('{$safeFormat}', {$safeColumn})",
            'pgsql' => "to_char({$safeColumn}, '{$pgsqlFormat}')",
            default => "DATE_FORMAT({$safeColumn}, '{$safeFormat}')",
        };
    }

    private function buildAdminPayload(): array
    {
        $students = TenantDB::table('students')->whereNull('deleted_at')->count();
        $activeStudents = TenantDB::table('students')->where('enrollment_status', 'validée')->whereNull('deleted_at')->count();
        $teachers = TenantDB::table('users')
            ->where(fn ($query) => $query->where('role', 'teacher')->orWhere('is_teacher', true))
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->count();
        $salles = TenantDB::table('salles')->where('status', 'active')->whereNull('deleted_at')->count();
        $attendTotal = TenantDB::table('attendances')->whereNull('deleted_at')->count();
        $attendPresent = TenantDB::table('attendances')->whereNull('deleted_at')->where('present', true)->count();
        $rate = $attendTotal > 0 ? round($attendPresent / $attendTotal * 100, 1) : 0;
        $ca = TenantDB::table('payments')->whereNull('deleted_at')->whereIn('status', ['payé', 'partiel'])->sum('amount');
        $monthly = TenantDB::table('payments')
            ->selectRaw("{$this->dateGroupSql('due_date', '%Y-%m')} as ym, SUM(amount) as total")
            ->whereIn('status', ['payé', 'partiel'])
            ->whereNull('deleted_at')
            ->groupBy('ym')
            ->orderBy('ym')
            ->get()
            ->map(fn ($r) => ['key' => $r->ym, 'label' => $r->ym, 'total' => (int) $r->total]);

        $recentPayments = TenantDB::table('payments')
            ->join('students', 'students.id', '=', 'payments.student_id')
            ->select('payments.*', 'students.name as student_name')
            ->whereIn('payments.status', ['payé', 'partiel'])
            ->whereNull('payments.deleted_at')
            ->whereNull('students.deleted_at')
            ->orderByDesc('payments.paid_at')
            ->limit(5)
            ->get();

        $attendanceTrend = TenantDB::table('attendances')
            ->selectRaw("{$this->dateGroupSql('date', '%Y-%m-%d')} as label, ROUND(AVG(CASE WHEN present = true THEN 100 ELSE 0 END), 1) as rate")
            ->whereNull('deleted_at')
            ->groupBy('label')
            ->orderBy('label')
            ->limit(12)
            ->get()
            ->map(fn ($r) => ['label' => $r->label, 'rate' => (float) $r->rate]);

        $notificationLogs = TenantDB::table('notification_logs')
            ->orderByDesc('sent_at')
            ->limit(5)
            ->get();

        return [
            'students' => $students,
            'activeStudents' => $activeStudents,
            'teachers' => $teachers,
            'salles' => $salles,
            'attendanceRate' => $rate,
            'ca' => (int) ($ca ?? 0),
            'monthly' => $monthly,
            'recent' => $recentPayments,
            'attendanceTrend' => $attendanceTrend,
            'notifications' => $notificationLogs,
        ];
    }

    public function admin(Request $request)
    {
        return view('spa', [
            'dashboard' => $this->buildAdminPayload(),
        ]);
    }

    public function data(Request $request)
    {
        return response()->json($this->buildAdminPayload());
    }

    public function teacher(Request $request)
    {
        $user = $request->user();
        $dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][date('w')];
        $todaySlots = TenantDB::table('timetable_slots')
            ->where('teacher_id', $user->id)
            ->whereNull('deleted_at')
            ->where('day', $dayName)
            ->count();

        return view('spa', [
            'teacherDashboard' => [
                'teacher' => $user,
                'todaySlots' => $todaySlots,
            ],
        ]);
    }
}
