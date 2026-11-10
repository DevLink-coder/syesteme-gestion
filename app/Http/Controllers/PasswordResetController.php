<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class PasswordResetController extends Controller
{
    /**
     * Envoie un lien de réinitialisation si l'email existe.
     * La réponse est identique dans tous les cas pour ne pas
     * révéler si un compte est associé à l'adresse saisie.
     */
    public function sendLink(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = Str::lower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if ($user) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                [
                    'token' => Hash::make($token),
                    'created_at' => now(),
                ],
            );

            Mail::to($user->email)->send(
                new PasswordResetMail($user->name, $token, $email),
            );
        }

        return response()->json([
            'message' => 'Un lien de réinitialisation vient de vous être envoyé. Consultez votre boîte mail.',
        ]);
    }

    /**
     * Réinitialise le mot de passe à partir du token reçu par email.
     */
    public function reset(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', Password::defaults()],
            'password_confirmation' => ['required', 'string'],
        ]);

        $email = Str::lower(trim($validated['email']));

        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        $isValid = $record
            && Hash::check($validated['token'], $record->token)
            && Carbon::parse($record->created_at)->gt(now()->subHour());

        if (! $isValid) {
            return response()->json([
                'message' => 'Ce lien de réinitialisation est invalide ou a expiré. Veuillez recommencer.',
            ], 422);
        }

        $user = User::where('email', $email)->firstOrFail();

        $user->password = $validated['password'];
        $user->must_change_password = false;
        $user->save();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // Révoque les éventuelles sessions/tokens existants.
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé avec succès.',
        ]);
    }
}
