#!/bin/sh
set -eu

cd /var/www/html

if [ "${1:-web}" = "web" ]; then
    if [ -z "${APP_KEY:-}" ]; then
        echo "[entrypoint] APP_KEY is required to start the application." >&2
        exit 1
    fi

    if [ -z "${APP_URL:-}" ] && [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
        export APP_URL="${RENDER_EXTERNAL_URL}"
    fi

    mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache

    chown -R www-data:www-data storage bootstrap/cache

    php artisan storage:link || true

    gosu www-data php artisan migrate --force

    if [ -n "${SUPERADMIN_EMAIL:-}" ] && [ -n "${SUPERADMIN_PASSWORD:-}" ]; then
        gosu www-data php artisan db:seed --class=SuperAdminSeeder --force
    fi

    gosu www-data php artisan config:cache
    gosu www-data php artisan view:cache
    gosu www-data php artisan event:cache

    sed "s/__PORT__/${PORT:-10000}/g" \
        /etc/nginx/templates/default.conf.template \
        > /etc/nginx/conf.d/default.conf

    exec supervisord -c /etc/supervisor/conf.d/sgcr.conf
fi

exec "$@"
