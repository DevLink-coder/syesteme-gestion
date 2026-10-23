<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogSecurityEvents
{
    /**
     * Log security-sensitive events
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Log des tentatives de connexion échouées
        if ($request->is('login') && $response->status() === 422) {
            Log::warning('Failed login attempt', [
                'ip' => $request->ip(),
                'email' => $request->input('email'),
                'user_agent' => $request->userAgent(),
            ]);
        }

        // Log des tentatives de connexion réussies
        if ($request->is('login') && $response->status() === 200) {
            Log::info('Successful login', [
                'ip' => $request->ip(),
                'email' => $request->input('email'),
                'user_agent' => $request->userAgent(),
            ]);
        }

        // Log des actions sensibles (CRUD utilisateurs, salles, etc.)
        $sensitiveRoutes = [
            'web.teachers.store',
            'web.teachers.update',
            'web.teachers.suspend',
            'web.teachers.expel',
            'web.teachers.promote-admin',
            'web.teachers.demote-admin',
            'web.salles.store',
            'web.salles.update',
            'web.salles.archive',
        ];

        $routeName = $request->route()?->getName();
        if (in_array($routeName, $sensitiveRoutes, true)) {
            Log::info('Sensitive action performed', [
                'route' => $routeName,
                'ip' => $request->ip(),
                'user_id' => $request->user()?->id,
                'user_email' => $request->user()?->email,
                'method' => $request->method(),
            ]);
        }

        return $response;
    }
}
