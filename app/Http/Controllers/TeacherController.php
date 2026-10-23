<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTeacherRequest;
use App\Mail\TeacherWelcomeMail;
use App\Support\CameroonPhoneNumber;
use App\Support\PersonName;
use App\Support\TenantDB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $currentUser = $request->user();
        if (! $currentUser?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $protectedAdminIds = TenantDB::table('admin_promotions')
            ->where('promoted_user_id', $currentUser->id)
            ->pluck('promoter_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $teachers = TenantDB::table('users')
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('is_teacher', true)->orWhere('role', 'teacher');
            })
            ->orderBy('name')
            ->get()
            ->map(function ($u) {
                $teaches = TenantDB::table('teacher_subject')->where('user_id', $u->id)->get()->map(fn ($r) => ['subject' => TenantDB::table('subjects')->whereNull('deleted_at')->where('id', $r->subject_id)->value('name'), 'roomId' => $r->room_id, 'coefficient' => $r->coefficient])->filter(fn ($assignment) => $assignment['subject'] !== null)->values()->toArray();
                $u->teaches = $teaches;
                $u->slotsCount = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('teacher_id', $u->id)->count();
                $u->sallesCount = count(array_unique(array_column($teaches, 'roomId')));
                $u->is_admin = (bool) $u->is_admin || $u->role === 'admin';

                return $u;
            });

        $teachers->each(function ($teacher) use ($protectedAdminIds) {
            $teacher->cannotDemote = $teacher->is_admin
                && in_array((int) $teacher->id, $protectedAdminIds, true);
        });

        return response()->json($teachers);
    }

    public function show(Request $request, $id)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $user = TenantDB::table('users')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })
            ->where(function ($query) {
                $query->where('is_teacher', true)->orWhere('role', 'teacher');
            })
            ->whereNull('deleted_at')
            ->first();
        if (! $user) {
            return response()->json(['message' => 'Enseignant introuvable'], 404);
        }

        $teaches = TenantDB::table('teacher_subject')->where('user_id', $user->id)->get()->map(function ($r) {
            $subject = TenantDB::table('subjects')->whereNull('deleted_at')->where('id', $r->subject_id)->value('name');

            return ['subject' => $subject, 'roomId' => $r->room_id, 'coefficient' => $r->coefficient];
        })->filter(fn ($assignment) => $assignment['subject'] !== null)->values();

        $slots = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('teacher_id', $user->id)->get();
        $history = TenantDB::table('user_histories')->where('user_id', $user->id)->orderByDesc('changed_at')->get();

        $user->teaches = $teaches;
        $user->slots = $slots;
        $user->history = $history;

        return response()->json($user);
    }

    public function store(StoreTeacherRequest $request)
    {
        foreach ($request->teaches as $t) {
            $salle = TenantDB::table('salles')->whereNull('deleted_at')->where('room_id', $t['room_id'])->first();
            if (! $salle) {
                return response()->json(['message' => "Salle {$t['room_id']} introuvable."], 422);
            }
            if ($salle->status === 'archivée') {
                return response()->json(['message' => "La salle {$t['room_id']} est archivée et ne peut pas recevoir d'enseignant."], 422);
            }
            $subject = TenantDB::table('subjects')->whereNull('deleted_at')->where('name', $t['subject'])->first();
            if (! $subject) {
                return response()->json(['message' => "Matière {$t['subject']} introuvable."], 422);
            }
            $inSalle = TenantDB::table('salle_subject')->where('salle_id', $salle->id)->where('subject_id', $subject->id)->exists();
            if (! $inSalle) {
                return response()->json(['message' => "La matière {$t['subject']} n'est pas enseignée en {$t['room_id']}."], 422);
            }
        }

        $plainPassword = $this->generateSecurePassword();
        $maxCode = TenantDB::table('users')->where('code', 'like', 't-%')->max('code');
        $num = 0;
        if ($maxCode && preg_match('/t-0*(\d+)/', $maxCode, $m)) {
            $num = (int) $m[1];
        }
        do {
            $num++;
            $code = 't-'.str_pad($num, 2, '0', STR_PAD_LEFT);
        } while (TenantDB::table('users')->where('code', $code)->exists());
        $id = TenantDB::table('users')->insertGetId([
            'code' => $code,
            'name' => $request->name,
            'email' => $request->email,
            'telephone' => CameroonPhoneNumber::toInternational($request->telephone),
            'password' => Hash::make($plainPassword),
            'role' => 'teacher',
            'status' => 'active',
            'is_teacher' => true,
            'is_admin' => false,
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $assignmentsForMail = [];
        foreach ($request->teaches as $t) {
            $subjectId = TenantDB::table('subjects')->whereNull('deleted_at')->where('name', $t['subject'])->value('id');
            $salle = TenantDB::table('salles')->whereNull('deleted_at')->where('room_id', $t['room_id'])->first();
            $coef = TenantDB::table('salle_subject')->where('salle_id', $salle?->id)->where('subject_id', $subjectId)->value('coefficient') ?? 2;
            TenantDB::table('teacher_subject')->insert([
                'user_id' => $id,
                'subject_id' => $subjectId,
                'room_id' => $t['room_id'],
                'coefficient' => $coef,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $assignmentsForMail[] = [
                'room_id' => $t['room_id'],
                'subject' => $t['subject'],
                'salle_name' => $salle ? $salle->name : $t['room_id'],
            ];
        }

        $mailQueued = false;
        $mailError = null;
        try {
            TenantDB::table('pending_emails')->insert([
                'email' => $request->email,
                'mailable_class' => TeacherWelcomeMail::class,
                'mailable_data' => json_encode([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Crypt::encrypt($plainPassword),
                    'assignments' => $assignmentsForMail,
                ]),
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $mailQueued = true;
        } catch (\Throwable $e) {
            $mailError = $e->getMessage();
        }

        $user = TenantDB::table('users')->where('id', $id)->first();
        $payload = array_merge((array) $user, [
            'mail_queued' => $mailQueued,
            'mail_sent' => false,
            'mail_error' => $mailError,
        ]);

        return response()->json($payload, 201);
    }

    public function suspend(Request $request, $id)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $user = TenantDB::table('users')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->where('role', 'teacher')->first();
        if (! $user) {
            return response()->json(['message' => 'Enseignant introuvable'], 404);
        }
        if ($user->status !== 'active') {
            return response()->json(['message' => 'Déjà suspendu/renvoyé'], 409);
        }

        TenantDB::table('users')->where('id', $user->id)->update(['status' => 'suspended', 'suspended_at' => now(), 'status_reason' => $request->reason, 'updated_at' => now()]);
        TenantDB::table('user_histories')->insert([
            'user_id' => $user->id,
            'role' => 'teacher',
            'status' => 'suspended',
            'changed_by' => $request->user()?->id,
            'changed_by_name' => $request->user()?->name ?? 'Système',
            'reason' => $request->reason,
            'changed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $slots = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('teacher_id', $user->id)->get();

        return response()->json(['message' => 'Enseignant suspendu', 'impactedSlots' => $slots]);
    }

    public function expel(Request $request, $id)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $user = TenantDB::table('users')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->where('role', 'teacher')->first();
        if (! $user) {
            return response()->json(['message' => 'Enseignant introuvable'], 404);
        }
        TenantDB::table('users')->where('id', $user->id)->update(['status' => 'expelled', 'expelled_at' => now(), 'status_reason' => $request->reason, 'updated_at' => now()]);
        TenantDB::table('user_histories')->insert([
            'user_id' => $user->id,
            'role' => 'teacher',
            'status' => 'expelled',
            'changed_by' => $request->user()?->id,
            'changed_by_name' => $request->user()?->name ?? 'Système',
            'reason' => $request->reason,
            'changed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $slots = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('teacher_id', $user->id)->get();

        return response()->json(['message' => 'Enseignant renvoyé', 'impactedSlots' => $slots]);
    }

    public function reactivate(Request $request, $id)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $user = TenantDB::table('users')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->where('role', 'teacher')->first();
        if (! $user) {
            return response()->json(['message' => 'Enseignant introuvable'], 404);
        }
        TenantDB::table('users')->where('id', $user->id)->update(['status' => 'active', 'suspended_at' => null, 'expelled_at' => null, 'status_reason' => null, 'updated_at' => now()]);

        return response()->json(['message' => 'Enseignant réactivé']);
    }

    public function slots(Request $request, $id)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json([], 403);
        }

        $user = TenantDB::table('users')
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->where(fn ($query) => $query->where('is_teacher', true)->orWhere('role', 'teacher'))
            ->where(function ($query) use ($id) {
                $query->where('id', $id)->orWhere('code', $id);
            })
            ->first();
        if (! $user) {
            return response()->json([], 404);
        }
        $q = TenantDB::table('timetable_slots')->whereNull('deleted_at')->where('teacher_id', $user->id);
        if ($request->filled('week_start')) {
            $q->where('week_start', $request->week_start);
        }
        $slots = $q->orderBy('day')->orderBy('start_time')->get();

        return response()->json($slots);
    }

    public function update(Request $request, $id)
    {
        if (! $request->user()?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $user = TenantDB::table('users')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })
            ->where(function ($query) {
                $query->where('is_teacher', true)->orWhere('role', 'teacher');
            })
            ->whereNull('deleted_at')
            ->first();
        if (! $user) {
            return response()->json(['message' => 'Enseignant introuvable'], 404);
        }

        if ($request->filled('telephone')) {
            $request->merge([
                'telephone' => CameroonPhoneNumber::localDigits($request->telephone),
            ]);
        }

        $request->validate([
            'name' => 'sometimes|required|string|min:3',
            'email' => 'sometimes|required|email|unique:users,email,'.$user->id,
            'telephone' => ['nullable', 'string', 'size:9', 'regex:/^6\d{8}$/'],
        ]);

        $data = [];
        if ($request->filled('name')) {
            $data['name'] = PersonName::title($request->name);
        }
        if ($request->filled('email')) {
            $data['email'] = $request->email;
        }
        if ($request->filled('telephone')) {
            $data['telephone'] = CameroonPhoneNumber::toInternational($request->telephone);
        }
        $data['updated_at'] = now();

        TenantDB::table('users')->where('id', $user->id)->update($data);

        return response()->json(['message' => 'Enseignant mis à jour']);
    }

    public function promoteToAdmin(Request $request, $id)
    {
        $currentUser = $request->user();
        if (! $currentUser?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $targetUser = TenantDB::table('users')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $targetUser) {
            return response()->json(['message' => 'Utilisateur introuvable'], 404);
        }
        if ($targetUser->is_admin || $targetUser->role === 'admin') {
            return response()->json(['message' => 'Déjà admin'], 409);
        }
        if (! $targetUser->is_teacher && $targetUser->role !== 'teacher') {
            return response()->json(['message' => 'Seul un enseignant peut être promu'], 409);
        }

        TenantDB::table('users')->where('id', $targetUser->id)->update([
            'is_admin' => true,
            'role' => 'admin',
            'updated_at' => now(),
        ]);

        TenantDB::table('admin_promotions')->updateOrInsert(
            [
                'promoter_id' => $currentUser->id,
                'promoted_user_id' => $targetUser->id,
            ],
            [
                'promoted_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        return response()->json(['message' => 'Utilisateur promu admin']);
    }

    public function demoteFromAdmin(Request $request, $id)
    {
        $currentUser = $request->user();
        if (! $currentUser?->isAdmin()) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $targetUser = TenantDB::table('users')->whereNull('deleted_at')->where(function ($query) use ($id) {
            $query->where('id', $id)->orWhere('code', $id);
        })->first();
        if (! $targetUser) {
            return response()->json(['message' => 'Utilisateur introuvable'], 404);
        }
        if (! $targetUser->is_admin && $targetUser->role !== 'admin') {
            return response()->json(['message' => 'Pas admin'], 409);
        }
        if (! $targetUser->is_teacher) {
            return response()->json(['message' => 'Cet admin ne peut pas être rétrogradé'], 409);
        }

        $isPromoterOfCurrentUser = TenantDB::table('admin_promotions')
            ->where('promoter_id', $targetUser->id)
            ->where('promoted_user_id', $currentUser->id)
            ->exists();
        if ($isPromoterOfCurrentUser) {
            return response()->json(['message' => 'Vous ne pouvez pas destituer l’admin qui vous a promu'], 403);
        }

        TenantDB::table('users')->where('id', $targetUser->id)->update([
            'is_admin' => false,
            'is_teacher' => true,
            'role' => 'teacher',
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Utilisateur destitué du rôle admin']);
    }

    /**
     * Génère un mot de passe sécurisé avec complexité requise
     */
    private function generateSecurePassword(): string
    {
        $length = 16;
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
        $special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        $all = $lowercase.$uppercase.$numbers.$special;
        $password = '';

        // S'assurer qu'il y a au moins un caractère de chaque type
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $special[random_int(0, strlen($special) - 1)];

        // Remplir le reste avec des caractères aléatoires
        for ($i = 4; $i < $length; $i++) {
            $password .= $all[random_int(0, strlen($all) - 1)];
        }

        // Mélanger le mot de passe
        return str_shuffle($password);
    }
}
