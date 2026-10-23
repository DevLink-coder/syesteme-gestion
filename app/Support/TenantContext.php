<?php

namespace App\Support;

use LogicException;

final class TenantContext
{
    private static ?int $centerId = null;

    public static function id(): ?int
    {
        return self::$centerId;
    }

    public static function requireId(): int
    {
        return self::$centerId ?? throw new LogicException('A center context is required for tenant data access.');
    }

    public static function set(?int $centerId): void
    {
        self::$centerId = $centerId;
    }

    public static function run(int $centerId, callable $callback): mixed
    {
        $previous = self::$centerId;
        self::$centerId = $centerId;

        try {
            return $callback();
        } finally {
            self::$centerId = $previous;
        }
    }
}
