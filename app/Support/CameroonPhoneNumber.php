<?php

namespace App\Support;

final class CameroonPhoneNumber
{
    public static function localDigits(?string $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';

        if (str_starts_with($digits, '237') && strlen($digits) === 12) {
            $digits = substr($digits, 3);
        }

        return $digits;
    }

    public static function toInternational(string $localDigits): string
    {
        return '+237'.$localDigits;
    }
}
