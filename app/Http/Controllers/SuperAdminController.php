<?php

namespace App\Http\Controllers;

use App\Mail\CenterDirectorAccessMail;
use App\Models\User;
use App\Support\PlatformAuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SuperAdminController extends Controller
{
    public function overview()
    {
        $centerRows = DB::table('centers')->orderBy('name')->get();
        $teachers = DB::table('users')->select('center_id', DB::raw('COUNT(*) as total'))
            ->where(fn ($query) => $query->where('role', 'teacher')->orWhere('is_teacher', true))
            ->whereNull('deleted_at')->groupBy('center_id')->pluck('total', 'center_id');
        $students = DB::table('students')->select('center_id', DB::raw('COUNT(*) as total'))
            ->whereNull('deleted_at')->groupBy('center_id')->pluck('total', 'center_id');
        $admins = DB::table('users')->select('center_id', 'name', 'email')
            ->where('role', 'admin')->whereNull('deleted_at')->get()->keyBy('center_id');
        $smsRate = (float) (DB::table('platform_settings')->where('key', 'sms_unit_cost')->value('value') ?? 0);
        $whatsappRate = (float) (DB::table('platform_settings')->where('key', 'whatsapp_unit_cost')->value('value') ?? 0);

        $centers = $centerRows->map(function ($center) use ($teachers, $students, $admins, $smsRate, $whatsappRate) {
            $studentCount = (int) ($students[$center->id] ?? 0);

            return [
                'id' => (int) $center->id,
                'name' => $center->name,
                'directorName' => $center->director_name,
                'directorEmail' => $admins[$center->id]->email ?? null,
                'status' => $center->status,
                'archivedAt' => $center->archived_at,
                'teachersCount' => (int) ($teachers[$center->id] ?? 0),
                'studentsCount' => $studentCount,
                'estimatedMonthlySmsCost' => round($studentCount * $smsRate, 2),
                'estimatedMonthlyWhatsappCost' => round($studentCount * $whatsappRate, 2),
            ];
        })->values();

        return response()->json([
            'totals' => [
                'centers' => $centers->count(),
                'activeCenters' => $centers->where('status', 'active')->count(),
                'archivedCenters' => $centers->where('status', 'archived')->count(),
                'teachers' => $centers->sum('teachersCount'),
                'students' => $centers->sum('studentsCount'),
                'estimatedMonthlySmsCost' => round($centers->sum('estimatedMonthlySmsCost'), 2),
                'estimatedMonthlyWhatsappCost' => round($centers->sum('estimatedMonthlyWhatsappCost'), 2),
            ],
            'rates' => ['sms' => $smsRate, 'whatsapp' => $whatsappRate, 'currency' => 'FCFA'],
            'centers' => $centers,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function storeCenter(Request $request)
    {
        $request->merge(['director_email' => mb_strtolower(trim((string) $request->input('director_email')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:180'],
            'director_name' => ['required', 'string', 'min:2', 'max:180'],
            'director_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
        ]);

        $temporaryPassword = $this->generateTemporaryPassword();
        $centerId = DB::transaction(function () use ($data, $request, $temporaryPassword) {
            $centerId = DB::table('centers')->insertGetId([
                'name' => trim($data['name']),
                'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(8)),
                'director_name' => trim($data['director_name']),
                'status' => 'active',
                'created_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('users')->insert([
                'code' => 'admin-'.Str::lower(Str::random(12)),
                'name' => trim($data['director_name']),
                'email' => mb_strtolower(trim($data['director_email'])),
                'email_verified_at' => null,
                'password' => Hash::make($temporaryPassword),
                'role' => 'admin',
                'status' => 'active',
                'is_admin' => true,
                'is_teacher' => true,
                'must_change_password' => false,
                'center_id' => $centerId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $centerId;
        });

        $directorEmail = mb_strtolower(trim($data['director_email']));
        DB::table('pending_emails')->insert([
            'center_id' => $centerId,
            'email' => $directorEmail,
            'mailable_class' => CenterDirectorAccessMail::class,
            'mailable_data' => json_encode([
                'name' => trim($data['director_name']),
                'email' => $directorEmail,
                'password' => Crypt::encrypt($temporaryPassword),
                'assignments' => ['center_name' => trim($data['name'])],
            ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        PlatformAuditLogger::record('center.created', $request->user(), $centerId, $request, 201, [
            'center_name' => trim($data['name']),
            'director_email' => $directorEmail,
            'welcome_email_sent' => false,
            'welcome_email_queued' => true,
        ]);

        return response()->json([
            'message' => 'Centre créé. L’envoi des identifiants au directeur est en file d’attente.',
            'emailQueued' => true,
            'emailSent' => false,
            'center' => ['id' => $centerId, 'name' => trim($data['name']), 'directorEmail' => $directorEmail],
        ], 201);
    }

    public function updateCenter(Request $request, int $centerId)
    {
        $center = DB::table('centers')->where('id', $centerId)->first();
        abort_if(! $center, 404);

        $director = DB::table('users')
            ->where('center_id', $centerId)
            ->where('role', 'admin')
            ->whereNull('deleted_at')
            ->first();
        abort_if(! $director, 409, 'Aucun compte directeur actif n’est associé à ce centre.');

        $request->merge([
            'director_email' => mb_strtolower(trim((string) $request->input('director_email'))),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:180'],
            'director_name' => ['required', 'string', 'min:2', 'max:180'],
            'director_email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($director->id),
            ],
        ]);

        $data['name'] = trim($data['name']);
        $data['director_name'] = trim($data['director_name']);
        $data['director_email'] = mb_strtolower(trim($data['director_email']));

        DB::transaction(function () use ($centerId, $director, $data) {
            DB::table('centers')->where('id', $centerId)->update([
                'name' => $data['name'],
                'director_name' => $data['director_name'],
                'updated_at' => now(),
            ]);
            DB::table('users')->where('id', $director->id)->update([
                'name' => $data['director_name'],
                'email' => $data['director_email'],
                'updated_at' => now(),
            ]);
        });

        PlatformAuditLogger::record('center.updated', $request->user(), $centerId, $request, 200, [
            'center_name_before' => $center->name,
            'center_name_after' => $data['name'],
            'director_email' => $data['director_email'],
        ]);

        return response()->json([
            'message' => 'Centre et informations du directeur mis à jour.',
        ]);
    }

    public function setArchived(Request $request, int $centerId)
    {
        $center = DB::table('centers')->where('id', $centerId)->first();
        abort_if(! $center, 404);

        $archive = (bool) $request->validate(['archived' => ['required', 'boolean']])['archived'];
        DB::table('centers')->where('id', $centerId)->update([
            'status' => $archive ? 'archived' : 'active',
            'archived_at' => $archive ? now() : null,
            'updated_at' => now(),
        ]);

        if ($archive) {
            $userIds = DB::table('users')->where('center_id', $centerId)->pluck('id');
            DB::table('sessions')->whereIn('user_id', $userIds)->delete();
            DB::table('personal_access_tokens')->where('tokenable_type', User::class)->whereIn('tokenable_id', $userIds)->delete();
        }

        PlatformAuditLogger::record($archive ? 'center.archived' : 'center.reactivated', $request->user(), $centerId, $request, 200, [
            'center_name' => $center->name,
        ]);

        return response()->json(['message' => $archive ? 'Centre archivé.' : 'Centre réactivé.']);
    }

    public function enterCenter(Request $request, int $centerId)
    {
        $center = DB::table('centers')->where('id', $centerId)->first();
        abort_if(! $center, 404);

        $request->session()->put('selected_center_id', $centerId);
        PlatformAuditLogger::record('center.entered', $request->user(), $centerId, $request, 200, ['center_name' => $center->name]);

        return response()->json(['redirect' => '/dashboard', 'center' => ['id' => $centerId, 'name' => $center->name]]);
    }

    public function exitCenter(Request $request)
    {
        $centerId = $request->session()->pull('selected_center_id');
        PlatformAuditLogger::record('center.exited', $request->user(), $centerId ? (int) $centerId : null, $request, 200);

        return response()->json(['redirect' => '/superadmin']);
    }

    public function settings()
    {
        return response()->json([
            'smsUnitCost' => (float) (DB::table('platform_settings')->where('key', 'sms_unit_cost')->value('value') ?? 0),
            'whatsappUnitCost' => (float) (DB::table('platform_settings')->where('key', 'whatsapp_unit_cost')->value('value') ?? 0),
            'currency' => 'FCFA',
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'smsUnitCost' => ['required', 'numeric', 'min:0', 'max:100000'],
            'whatsappUnitCost' => ['required', 'numeric', 'min:0', 'max:100000'],
        ]);

        foreach (['sms_unit_cost' => $data['smsUnitCost'], 'whatsapp_unit_cost' => $data['whatsappUnitCost']] as $key => $value) {
            DB::table('platform_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => (string) $value, 'updated_by' => $request->user()->id, 'updated_at' => now(), 'created_at' => now()],
            );
        }

        PlatformAuditLogger::record('platform.settings.updated', $request->user(), null, $request, 200, $data);

        return response()->json(['message' => 'Tarifs de messagerie enregistrés.']);
    }

    private function generateTemporaryPassword(): string
    {
        $characterSets = [
            'ABCDEFGHJKLMNPQRSTUVWXYZ',
            'abcdefghijkmnopqrstuvwxyz',
            '23456789',
            '!@#$%&*+-_',
        ];
        $allCharacters = implode('', $characterSets);
        $characters = array_map(fn (string $set) => $set[random_int(0, strlen($set) - 1)], $characterSets);

        while (count($characters) < 8) {
            $characters[] = $allCharacters[random_int(0, strlen($allCharacters) - 1)];
        }

        for ($index = count($characters) - 1; $index > 0; $index--) {
            $swapIndex = random_int(0, $index);
            [$characters[$index], $characters[$swapIndex]] = [$characters[$swapIndex], $characters[$index]];
        }

        return implode('', $characters);
    }
}
