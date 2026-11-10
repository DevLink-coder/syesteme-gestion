/**
 * POST JSON authentifié par session (cookie CSRF Sanctum).
 * Renvoie le JSON de la réponse ou lève une Error avec le message serveur.
 */
export async function postJson(url: string, body: unknown) {
    await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
    const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const token = csrf ? decodeURIComponent(csrf) : '';

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': token,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const firstError = data.errors
            ? Object.values(data.errors).flat()[0]
            : undefined;
        throw new Error(
            (firstError as string | undefined) ||
                data.message ||
                'Une erreur est survenue.',
        );
    }
    return data;
}
