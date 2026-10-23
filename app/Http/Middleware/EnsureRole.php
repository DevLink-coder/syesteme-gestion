<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return redirect('/signin');
        }

        if ($user->isSuperAdmin()) {
            if (in_array('superadmin', $roles, true)) {
                return $next($request);
            }

            if (TenantContext::id() !== null && in_array('admin', $roles, true)) {
                return $next($request);
            }

            abort(403, 'Accès réservé au superadministrateur ou à un centre sélectionné.');
        }

        // Never let a center administrator satisfy a platform-only role check.
        if ($user->isAdmin()) {
            if (in_array('admin', $roles, true) || in_array('teacher', $roles, true)) {
                return $next($request);
            }

            abort(403, 'Accès refusé');
        }

        if (! in_array($user->role, $roles, true)) {
            // Enseignant tentant d'accéder à admin → redirige vers son dashboard
            if ($user->role === 'teacher') {
                return redirect('/enseignant');
            }
            abort(403, 'Accès refusé');
        }

        return $next($request);
    }
}
