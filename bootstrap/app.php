<?php

use App\Http\Middleware\AuditPlatformActivity;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureTeacherActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogSecurityEvents;
use App\Http\Middleware\ResolveCenterContext;
use App\Http\Middleware\SanitizeJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use App\Providers\AuthServiceProvider;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([
        AuthServiceProvider::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SanitizeJsonResponse::class,
            LogSecurityEvents::class,
            ResolveCenterContext::class,
            AuditPlatformActivity::class,
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
            'teacher.active' => EnsureTeacherActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })
    ->create();
