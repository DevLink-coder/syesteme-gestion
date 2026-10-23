<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#465fff">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="EduCore">
        <link rel="manifest" href="/manifest.webmanifest">

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/icons/educore-192.png" type="image/png" sizes="192x192">
        <link rel="apple-touch-icon" href="/icons/educore-180.png">

        {{-- Early dark mode : évite le FOUC, synchronisé avec ThemeContext localStorage/system --}}
        <script nonce="{{ Vite::cspNonce() }}">
            (function() {
                try {
                    var t = localStorage.getItem('theme');
                    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    if (t === 'dark') document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                } catch(e) {}
            })();
        </script>

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        <x-inertia::head>
        <title>EduCore</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
