<?php

use App\Http\Controllers\ApplicationNotificationController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EnrollmentDataController;
use App\Http\Controllers\EvaluationController;
use App\Http\Controllers\ParentPortalController;
use App\Http\Controllers\PlatformAuditController;
use App\Http\Controllers\SalleController;
use App\Http\Controllers\SchoolYearController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\TeacherPortalController;
use App\Http\Controllers\TimetableController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SGCR - SPA React Router (sans Inertia) pour navigation fluide
| Chaque route SPA renvoie la même vue `spa.blade.php` qui monte
| `resources/js/spa.tsx` → `SpaApp.tsx` (BrowserRouter).
| Ainsi : 1 clic = navigation client sans reload, pas de conflit
| Inertia/React Router, pas de removeChild.
| Migration progressive : plus tard, remplacer view('spa') par
| Route::inertia('Dashboard/Home') quand le backend sera prêt.
|--------------------------------------------------------------------------
*/

// SPA - toutes les URLs Front servent la même vue (sauf dashboard branchés backend)
$spaRoutes = [
    '/' => 'home',
    '/signin' => 'signin',
    '/signup' => 'signup',
    '/calendar' => 'calendar',
    '/salles' => 'salles.index',
    '/salles/{id}' => 'salles.show',
    '/annees-scolaires' => 'annees.index',
    '/enseignants' => 'enseignants.index',
    '/enseignants/{id}' => 'enseignants.show',
    '/matieres' => 'matieres.index',
    '/eleves' => 'eleves.index',
    '/eleves/nouveau' => 'eleves.create',
    '/eleves/{id}' => 'eleves.show',
    '/tarifs' => 'tarifs.index',
    '/dettes' => 'dettes.index',
    '/presences' => 'presences.index',
    '/presences/{salleId}' => 'presences.show',
    '/evaluations' => 'evaluations.index',
    '/evaluations/{id}' => 'evaluations.show',
    '/evaluations/{id}/saisie' => 'evaluations.saisie',
    '/evaluations/{id}/bulletin/{studentId}' => 'evaluations.bulletin',
    '/journal-audit' => 'audit.index',
    '/parametres' => 'parametres.index',
    '/enseignant/emploi-du-temps' => 'enseignant.edt',
    '/enseignant/appel/{slotId}' => 'enseignant.appel',
    '/enseignant/saisie-notes' => 'enseignant.saisie',
    '/parent/{studentId}' => 'parent.bulletin',
    '/parent/{studentId}/solde' => 'parent.solde',
    '/parent/{studentId}/absences' => 'parent.absences',
    '/profile' => 'profile',
    '/superadmin' => 'superadmin.dashboard',
    '/superadmin/centres' => 'superadmin.centres',
    '/superadmin/audit' => 'superadmin.audit',
    '/superadmin/settings' => 'superadmin.settings',
];

foreach ($spaRoutes as $uri => $name) {
    Route::get($uri, fn () => view('spa'))->name($name);
    if ($uri !== '/' && ! str_starts_with($name, 'superadmin.')) {
        $centerUri = '/{centerSlug}'.$uri;
        Route::get($centerUri, function (Request $request, string $centerSlug) {
            if ($request->is($centerSlug.'/signin', $centerSlug.'/signup')) {
                abort_unless(DB::table('centers')
                    ->where('slug', $centerSlug)
                    ->where('status', 'active')
                    ->whereNull('archived_at')
                    ->exists(), 404);

                return view('spa');
            }

            $user = $request->user();
            $centerId = $user?->role === 'superadmin'
                ? $request->session()->get('selected_center_id')
                : $user?->center_id;

            abort_unless(
                $centerId && DB::table('centers')
                    ->where('id', $centerId)
                    ->where('slug', $centerSlug)
                    ->where('status', 'active')
                    ->whereNull('archived_at')
                    ->exists(),
                404,
            );

            return view('spa');
        })
            // Keep reserved application roots from being interpreted as a center slug.
            // In particular, /web/salles must reach the API route below, not
            // the center-prefixed SPA route /{centerSlug}/salles.
            ->where('centerSlug', '(?!web(?:/|$)|api(?:/|$))[a-z0-9-]+')
            ->name($name.'.center');
    }
}

// Auth Sanctum via web (sans api.php) - token émis côté web
Route::post('/login', [AuthController::class, 'login'])->middleware(['throttle:5,1', 'web'])->name('login');
Route::get('/login', fn () => redirect('/signin', 302))->name('login.get'); // GET /login → 302 vers /signin (évite 405)
Route::post('/logout', [AuthController::class, 'logout'])->middleware(['auth', 'web'])->name('logout');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth')->name('me');

// Parent portal: read-only data is available only with an expiring bearer link.
Route::get('/web/parent/{studentId}', [ParentPortalController::class, 'show'])->middleware('throttle:60,1')->name('web.parent.show');

// Timetable lié étudiant/enseignant - web sans api (CRUD + réutiliser semaine passée)
Route::middleware('auth')->group(function () {
    Route::put('/web/profile', [AuthController::class, 'updateProfile'])->name('web.profile.update');
    Route::get('/web/notifications', [ApplicationNotificationController::class, 'index'])->name('web.notifications.index');
    Route::post('/web/notifications/viewed', [ApplicationNotificationController::class, 'markViewed'])->name('web.notifications.viewed');
    Route::get('/web/audit-logs', [PlatformAuditController::class, 'index'])->middleware('role:superadmin')->name('web.audit-logs.index');

    Route::prefix('/web/superadmin')->name('web.superadmin.')->middleware('role:superadmin')->group(function () {
        Route::get('/overview', [SuperAdminController::class, 'overview'])->name('overview');
        Route::post('/centers', [SuperAdminController::class, 'storeCenter'])->name('centers.store');
        Route::put('/centers/{centerId}', [SuperAdminController::class, 'updateCenter'])->whereNumber('centerId')->name('centers.update');
        Route::post('/centers/{centerId}/status', [SuperAdminController::class, 'setArchived'])->whereNumber('centerId')->name('centers.status');
        Route::post('/centers/{centerId}/enter', [SuperAdminController::class, 'enterCenter'])->whereNumber('centerId')->name('centers.enter');
        Route::post('/centers/exit', [SuperAdminController::class, 'exitCenter'])->name('centers.exit');
        Route::get('/settings', [SuperAdminController::class, 'settings'])->name('settings');
        Route::put('/settings', [SuperAdminController::class, 'updateSettings'])->name('settings.update');
    });

    // Les API de gestion scolaire sont réservées à la direction.
    Route::middleware('role:admin')->group(function () {
        Route::get('/web/timetable', [TimetableController::class, 'index'])->name('web.timetable.index');
        Route::post('/web/timetable', [TimetableController::class, 'store'])->name('web.timetable.store');
        Route::put('/web/timetable/{id}', [TimetableController::class, 'update'])->name('web.timetable.update');
        Route::delete('/web/timetable/{id}', [TimetableController::class, 'destroy'])->name('web.timetable.destroy');
        Route::post('/web/timetable/{id}/restore', [TimetableController::class, 'restore'])->name('web.timetable.restore');
        Route::post('/web/timetable/{id}/restore', [TimetableController::class, 'restore'])->name('web.timetable.restore');
        Route::post('/web/timetable/{id}/restore', [TimetableController::class, 'restore'])->name('web.timetable.restore');
        Route::post('/web/timetable/reuse-last-week', [TimetableController::class, 'reuseLastWeek'])->name('web.timetable.reuse');

        // Salles - CRUD + tabs
        Route::get('/web/salles', [SalleController::class, 'index'])->name('web.salles.index');
        Route::get('/web/salles/{id}', [SalleController::class, 'show'])->name('web.salles.show');
        Route::post('/web/salles', [SalleController::class, 'store'])->name('web.salles.store');
        Route::put('/web/salles/{id}', [SalleController::class, 'update'])->name('web.salles.update');
        Route::post('/web/salles/{id}/archive', [SalleController::class, 'archive'])->name('web.salles.archive');
        Route::post('/web/salles/{id}/unarchive', [SalleController::class, 'unarchive'])->name('web.salles.unarchive');
        Route::get('/web/salles/{id}/students', [SalleController::class, 'students'])->name('web.salles.students');
        Route::get('/web/salles/{id}/matieres', [SalleController::class, 'matieres'])->name('web.salles.matieres');
        Route::post('/web/salles/{id}/matieres', [SalleController::class, 'addMatiere'])->name('web.salles.matieres.add');
        Route::put('/web/salles/{id}/matieres/{subject}', [SalleController::class, 'updateCoefficient'])->where('subject', '.*')->name('web.salles.matieres.update');
        Route::delete('/web/salles/{id}/matieres/{subject}', [SalleController::class, 'removeMatiere'])->where('subject', '.*')->name('web.salles.matieres.remove');

        Route::get('/web/school-years', [SchoolYearController::class, 'index'])->name('web.school-years.index');
        Route::post('/web/school-years', [SchoolYearController::class, 'store'])->name('web.school-years.store');
        Route::put('/web/school-years/{id}', [SchoolYearController::class, 'update'])->name('web.school-years.update');
        Route::delete('/web/school-years/{id}', [SchoolYearController::class, 'destroy'])->name('web.school-years.destroy');
        Route::post('/web/school-years/{id}/restore', [SchoolYearController::class, 'restore'])->name('web.school-years.restore');
        Route::post('/web/school-years/{id}/restore', [SchoolYearController::class, 'restore'])->name('web.school-years.restore');
        Route::post('/web/school-years/{id}/restore', [SchoolYearController::class, 'restore'])->name('web.school-years.restore');

        Route::get('/web/subjects', [SubjectController::class, 'index'])->name('web.subjects.index');
        Route::post('/web/subjects', [SubjectController::class, 'store'])->name('web.subjects.store');
        Route::put('/web/subjects/{subject}', [SubjectController::class, 'update'])->name('web.subjects.update');
        Route::delete('/web/subjects/{subject}', [SubjectController::class, 'destroy'])->name('web.subjects.destroy');
        Route::post('/web/subjects/{id}/restore', [SubjectController::class, 'restore'])->name('web.subjects.restore');
        Route::post('/web/subjects/{id}/restore', [SubjectController::class, 'restore'])->name('web.subjects.restore');
        Route::post('/web/subjects/{id}/restore', [SubjectController::class, 'restore'])->name('web.subjects.restore');
        Route::post('/web/subjects/{subject}/rooms', [SubjectController::class, 'attachToRooms'])->name('web.subjects.attach-rooms');

        Route::get('/web/students', [EnrollmentDataController::class, 'students'])->name('web.students.index');
        Route::post('/web/students/{studentId}/parent-link', [ParentPortalController::class, 'createLink'])->middleware('role:admin')->name('web.students.parent-link');
        Route::post('/web/students', [EnrollmentDataController::class, 'storeStudent'])->name('web.students.store');
        Route::put('/web/students/{id}', [EnrollmentDataController::class, 'updateStudent'])->name('web.students.update');
        Route::delete('/web/students/{id}', [EnrollmentDataController::class, 'destroyStudent'])->name('web.students.destroy');
        Route::post('/web/students/{id}/restore', [EnrollmentDataController::class, 'restoreStudent'])->name('web.students.restore');
        Route::post('/web/students/{id}/restore', [EnrollmentDataController::class, 'restoreStudent'])->name('web.students.restore');
        Route::post('/web/students/{id}/restore', [EnrollmentDataController::class, 'restoreStudent'])->name('web.students.restore');
        Route::post('/web/inscriptions', [EnrollmentDataController::class, 'storeInscription'])->name('web.inscriptions.store');
        Route::put('/web/inscriptions/{id}', [EnrollmentDataController::class, 'updateInscription'])->name('web.inscriptions.update');
        Route::put('/web/inscriptions/{id}/statut', [EnrollmentDataController::class, 'updateInscriptionStatut'])->name('web.inscriptions.statut');
        Route::post('/web/payments', [EnrollmentDataController::class, 'storePayment'])->name('web.payments.store');
        Route::get('/web/tarifs', [EnrollmentDataController::class, 'tarifs'])->name('web.tarifs.index');
        Route::post('/web/tarifs', [EnrollmentDataController::class, 'storeTarif'])->name('web.tarifs.store');
        Route::put('/web/tarifs/{id}', [EnrollmentDataController::class, 'updateTarif'])->name('web.tarifs.update');
        Route::delete('/web/tarifs/{id}', [EnrollmentDataController::class, 'destroyTarif'])->name('web.tarifs.destroy');
        Route::post('/web/tarifs/{id}/restore', [EnrollmentDataController::class, 'restoreTarif'])->name('web.tarifs.restore');
        Route::post('/web/tarifs/{id}/restore', [EnrollmentDataController::class, 'restoreTarif'])->name('web.tarifs.restore');
        Route::post('/web/tarifs/{id}/restore', [EnrollmentDataController::class, 'restoreTarif'])->name('web.tarifs.restore');
        Route::get('/web/dettes', [EnrollmentDataController::class, 'dettes'])->name('web.dettes.index');

        // Présences - Appel et suivi
        Route::get('/web/attendances', [AttendanceController::class, 'index'])->name('web.attendances.index');
        Route::get('/web/attendances/{salleId}', [AttendanceController::class, 'show'])->name('web.attendances.show');
        Route::post('/web/attendances', [AttendanceController::class, 'store'])->name('web.attendances.store');

        // Évaluations
        Route::get('/web/evaluations', [EvaluationController::class, 'index'])->name('web.evaluations.index');
        Route::get('/web/evaluations/{id}', [EvaluationController::class, 'show'])->name('web.evaluations.show');
        Route::post('/web/evaluations', [EvaluationController::class, 'store'])->name('web.evaluations.store');
        Route::get('/web/evaluations/{id}/grades', [EvaluationController::class, 'grades'])->name('web.evaluations.grades');
        Route::post('/web/evaluations/{id}/grades', [EvaluationController::class, 'storeGrade'])->name('web.evaluations.grades.store');
    });

    // Espace enseignant: les données sont limitées à l'utilisateur authentifié.
    Route::get('/web/teacher-portal/dashboard', [TeacherPortalController::class, 'dashboard'])->middleware('teacher.active')->name('web.teacher-portal.dashboard');
    Route::get('/web/teacher-portal/timetable', [TeacherPortalController::class, 'timetable'])->middleware('teacher.active')->name('web.teacher-portal.timetable');
    Route::get('/web/teacher-portal/evaluations', [TeacherPortalController::class, 'evaluations'])->middleware('teacher.active')->name('web.teacher-portal.evaluations');
    Route::get('/web/teacher-portal/evaluations/{evaluationId}/grades', [TeacherPortalController::class, 'evaluationGrades'])->middleware('teacher.active')->name('web.teacher-portal.evaluations.grades');
    Route::post('/web/teacher-portal/evaluations/{evaluationId}/grades', [TeacherPortalController::class, 'storeGrade'])->middleware('teacher.active')->name('web.teacher-portal.evaluations.grades.store');
    Route::get('/web/teacher-portal/slots/{slotId}/attendance', [TeacherPortalController::class, 'attendanceSheet'])->middleware('teacher.active')->name('web.teacher-portal.attendance');
    Route::post('/web/teacher-portal/slots/{slotId}/attendance', [TeacherPortalController::class, 'storeAttendance'])->middleware('teacher.active')->name('web.teacher-portal.attendance.store');

    // Enseignants (admin) - CRUD + créneaux par semaine variable
    Route::middleware('role:admin')->group(function () {
        Route::get('/web/teachers', [TeacherController::class, 'index'])->name('web.teachers.index');
        Route::get('/web/teachers/{id}', [TeacherController::class, 'show'])->name('web.teachers.show');
        Route::post('/web/teachers', [TeacherController::class, 'store'])->name('web.teachers.store');
        Route::put('/web/teachers/{id}', [TeacherController::class, 'update'])->name('web.teachers.update');
        Route::post('/web/teachers/{id}/suspend', [TeacherController::class, 'suspend'])->name('web.teachers.suspend');
        Route::post('/web/teachers/{id}/expel', [TeacherController::class, 'expel'])->name('web.teachers.expel');
        Route::post('/web/teachers/{id}/reactivate', [TeacherController::class, 'reactivate'])->name('web.teachers.reactivate');
        Route::post('/web/teachers/{id}/promote-admin', [TeacherController::class, 'promoteToAdmin'])->name('web.teachers.promote-admin');
        Route::post('/web/teachers/{id}/demote-admin', [TeacherController::class, 'demoteFromAdmin'])->name('web.teachers.demote-admin');
        Route::get('/web/teachers/{id}/slots', [TeacherController::class, 'slots'])->name('web.teachers.slots');
    });
});

// Dashboard branchés backend (les seules pages qui quittent le mock)
Route::get('/dashboard', [DashboardController::class, 'admin'])->middleware(['auth', 'role:admin'])->name('dashboard.backend');
Route::get('/web/dashboard-data', [DashboardController::class, 'data'])->middleware(['auth', 'role:admin'])->name('dashboard.data');
Route::get('/enseignant', [DashboardController::class, 'teacher'])->middleware(['auth', 'teacher.active'])->name('enseignant.backend');

// Legacy Inertia welcome (hors SPA) pour debug
Route::inertia('/welcome', 'welcome')->name('welcome.legacy');

// Fallback SPA : toute URL non listée renvoie la SPA qui affichera sa 404 personnalisée (OtherPage/NotFound.tsx)
// Évite le 404 Laravel brut et utilise la 404 de C:\xampp\htdocs\front
Route::fallback(fn () => view('spa'))->name('spa.fallback');
