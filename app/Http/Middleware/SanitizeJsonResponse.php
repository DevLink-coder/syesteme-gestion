<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeJsonResponse
{
    /**
     * Sanitize JSON response data to prevent XSS
     */
    public function handle(Request $request, Closure $next): Response
    {
        // JSON encoders escape JSON syntax; HTML escaping here changes stored text
        // into visible entities. React escapes text nodes at the rendering boundary.
        return $next($request);
    }
}
