<?php

namespace App\Http\Middleware;

use App\Support\PlatformAuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditPlatformActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->user();
        $centerId = $actor?->role === 'superadmin'
            ? ($request->session()->get('selected_center_id') ?: null)
            : ($actor?->center_id ?: null);

        $response = $next($request);

        if ($actor && in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)
            && ! $request->is('web/superadmin/*')) {
            PlatformAuditLogger::record(
                action: (string) ($request->route()?->getName() ?: $request->method().' '.$request->path()),
                actor: $actor,
                centerId: $centerId ? (int) $centerId : null,
                request: $request,
                statusCode: $response->getStatusCode(),
            );
        }

        return $response;
    }
}
