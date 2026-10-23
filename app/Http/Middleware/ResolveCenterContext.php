<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveCenterContext
{
    public function handle(Request $request, Closure $next): Response
    {
        TenantContext::set(null);
        $user = $request->user();
        if (! $user) {
            TenantContext::set(null);

            return $next($request);
        }

        if ($user->role === 'superadmin') {
            $centerId = $request->session()->get('selected_center_id');
            TenantContext::set($centerId ? (int) $centerId : null);

            if ($centerId && ! DB::table('centers')->where('id', $centerId)->exists()) {
                $request->session()->forget('selected_center_id');
                TenantContext::set(null);
            }

            return $this->continueAndClear($request, $next);
        }

        $centerId = $user->center_id ? (int) $user->center_id : null;
        if (! $centerId) {
            abort(403, 'Ce compte n’est associé à aucun centre.');
        }

        $active = DB::table('centers')->where('id', $centerId)->where('status', 'active')->whereNull('archived_at')->exists();
        if (! $active) {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Ce centre est archivé. Contactez le superadministrateur.'], 423);
            }

            return redirect('/signin')->withErrors(['email' => 'Ce centre est temporairement archivé.']);
        }

        if ($user->must_change_password
            && ! in_array($request->path(), ['web/profile', 'me', 'logout'], true)
            && $request->path() !== 'profile') {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Vous devez modifier votre mot de passe provisoire.'], 423);
            }

            return redirect('/profile?change-password=required');
        }

        TenantContext::set($centerId);

        return $this->continueAndClear($request, $next);
    }

    private function continueAndClear(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } finally {
            TenantContext::set(null);
        }
    }
}
