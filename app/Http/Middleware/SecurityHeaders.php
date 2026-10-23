<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Add security headers to response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();
        $response = $next($request);

        // Protection contre le clickjacking
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // Protection contre le sniffing de type MIME
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Activation du XSS Protection
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Politique de sécurité du contenu (CSP) - basique
        $scriptSources = "'self' 'nonce-{$nonce}'";
        if (app()->isLocal()) {
            $scriptSources .= " 'unsafe-eval'";
        }
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; script-src {$scriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'",
        );

        // Referrer Policy
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Les URL du portail parent portent un jeton d'accès temporaire.
        // Ne pas le transmettre comme Referer et ne pas mettre en cache la page.
        if ($request->is('parent/*') || $request->is('web/parent/*')) {
            $response->headers->set('Referrer-Policy', 'no-referrer');
            $response->headers->set('Cache-Control', 'no-store, private');
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        }

        // Permissions Policy
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        return $response;
    }
}
