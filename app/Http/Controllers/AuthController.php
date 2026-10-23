<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Support\CameroonPhoneNumber;
use App\Support\PlatformAuditLogger;
use App\Support\TenantDB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return view('spa');
    }

    public function login(LoginRequest $request)
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages(['email' => 'Identifiants incorrects.']);
        }

        if ($user->status === 'suspended' || $user->status === 'expelled') {
            throw ValidationException::withMessages([
                'email' => 'Votre compte est '.($user->status === 'suspended' ? 'suspendu' : 'renvoyé').'. Contactez la direction.',
            ]);
        }

        if ($user->role !== 'superadmin') {
            $centerActive = DB::table('centers')
                ->where('id', $user->center_id)
                ->where('status', 'active')
                ->whereNull('archived_at')
                ->exists();
            if (! $centerActive) {
                throw ValidationException::withMessages([
                    'email' => 'Ce centre est temporairement archivé. Contactez le superadministrateur.',
                ]);
            }
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        PlatformAuditLogger::record(
            'auth.login',
            $user,
            $user->isSuperAdmin() ? null : (int) $user->center_id,
            $request,
            200,
        );

        // Les appels SPA utilisent la session web; aucun bearer token n'est exposé au navigateur.
        $user->tokens()->where('name', 'spa')->delete();

        // Réponse Inertia : Inertia va suivre la redirection
        if ($request->header('X-Inertia')) {
            return redirect()->intended($user->isSuperAdmin() ? '/superadmin' : ($user->isAdmin() ? '/dashboard' : '/enseignant'));
        }

        return response()->json([
            'user' => $user->toArray() + [
                'selected_center_id' => $user->isSuperAdmin() ? null : $user->center_id,
                'center_slug' => $user->isSuperAdmin() ? null : DB::table('centers')->where('id', $user->center_id)->value('slug'),
                'center_name' => $user->isSuperAdmin() ? null : DB::table('centers')->where('id', $user->center_id)->value('name'),
            ],
            'redirect' => $user->isSuperAdmin() ? '/superadmin' : ($user->isAdmin() ? '/dashboard' : '/enseignant'),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(null, 200);
        }

        $selectedCenterId = $user->isSuperAdmin()
            ? $request->session()->get('selected_center_id')
            : $user->center_id;

        return response()->json($user->toArray() + [
            'selected_center_id' => $selectedCenterId,
            'center_slug' => $selectedCenterId
                ? DB::table('centers')->where('id', $selectedCenterId)->value('slug')
                : null,
            'center_name' => $selectedCenterId
                ? DB::table('centers')->where('id', $selectedCenterId)->value('name')
                : null,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        if ($request->exists('telephone')) {
            $phoneDigits = CameroonPhoneNumber::localDigits($request->input('telephone'));
            $request->merge([
                'telephone' => $phoneDigits !== '' ? $phoneDigits : null,
            ]);
        }
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'telephone' => ['nullable', 'string', 'size:9', 'regex:/^6\d{8}$/'],
            'current_password' => ['required_with:new_password', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! empty($validated['new_password']) && ! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $oldProfile = [
            'name' => $user->name,
            'email' => $user->email,
            'telephone' => $user->telephone,
        ];
        $user->name = trim($validated['name']);
        $user->email = trim($validated['email']);
        $user->telephone = ! empty($validated['telephone'])
            ? CameroonPhoneNumber::toInternational($validated['telephone'])
            : null;
        if (! empty($validated['new_password'])) {
            $user->password = $validated['new_password'];
            $user->must_change_password = false;
        }
        $user->save();

        if (! $user->isSuperAdmin()) {
            $schoolYear = TenantDB::table('school_years')->whereNull('deleted_at')->where('is_active', true)->first();
            TenantDB::table('audit_logs')->insert([
                'code' => 'audit-'.Str::random(8),
                'author_id' => $user->id,
                'author_name' => $user->name,
                'happened_at' => now(),
                'type' => 'modification_note',
                'entity' => 'Profil utilisateur — '.$user->name,
                'school_year_code' => $schoolYear?->code ?? 'non-cloisonne',
                'school_year_id' => $schoolYear?->id,
                'old_value' => json_encode($oldProfile, JSON_UNESCAPED_UNICODE),
                'new_value' => json_encode([
                    'name' => $user->name,
                    'email' => $user->email,
                    'telephone' => $user->telephone,
                ], JSON_UNESCAPED_UNICODE),
                'details' => 'Mise à jour du profil personnel',
                'auditable_type' => User::class,
                'auditable_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Profil mis à jour.',
            'user' => $user->fresh(),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            // Révoque les tokens Sanctum émis via web
            $user->tokens()->delete();
        }
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->header('X-Inertia')) {
            return redirect('/signin');
        }

        return response()->json(['message' => 'Déconnecté']);
    }
}
