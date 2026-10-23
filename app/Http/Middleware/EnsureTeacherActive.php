<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && $user->isTeacher() && $user->status !== 'active') {
            // Suspendu ou renvoyé → peut se connecter mais pas faire appel/saisie
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return redirect('/signin')->with('error', 'Compte enseignant '.$user->status.'. Contactez la direction.');
            }
            abort(403, 'Enseignant '.$user->status);
        }

        return $next($request);
    }
}
