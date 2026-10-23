<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Tenant-aware query builder for the application's existing query-builder code.
 * Every tenant table and joined tenant table is constrained to the active center.
 */
final class TenantDB
{
    private const TABLES = [
        'users', 'school_years', 'subjects', 'salles', 'salle_subject', 'students',
        'tarifs', 'inscriptions', 'payments', 'timetable_slots', 'attendances',
        'evaluations', 'grades', 'audit_logs', 'notification_logs', 'user_histories',
        'teacher_subject', 'admin_promotions', 'pending_emails', 'application_notifications',
    ];

    public static function table(string $table): TenantTable
    {
        $builder = DB::table($table);
        $baseTable = self::tableName($table);

        if (! in_array($baseTable, self::TABLES, true)) {
            throw new InvalidArgumentException("Table [{$baseTable}] is not registered for tenant-scoped access.");
        }

        $centerId = TenantContext::requireId();

        return new TenantTable($builder, $centerId);
    }

    public static function registeredTables(): array
    {
        return self::TABLES;
    }

    public static function tableName(string $table): string
    {
        $table = trim($table, " `\t\n\r\0\x0B");
        $table = preg_split('/\s+as\s+|\s+/i', $table)[0] ?? $table;

        return trim($table, '`');
    }

    public static function qualifier(string $table): string
    {
        $parts = preg_split('/\s+as\s+|\s+/i', trim($table)) ?: [];
        $qualifier = $parts[1] ?? ($parts[0] ?? $table);

        return trim($qualifier, '`');
    }
}

/** @mixin Builder */
final class TenantTable
{
    public function __construct(
        private readonly Builder $builder,
        private readonly int $centerId,
    ) {}

    public function __call(string $method, array $arguments): mixed
    {
        if ($this->isReadOrMutation($method) && ! in_array($method, ['insert', 'insertOrIgnore', 'insertGetId', 'upsert', 'updateOrInsert'], true)) {
            $this->applyTenantFilters();
        }

        if (in_array($method, ['insert', 'insertOrIgnore', 'insertGetId', 'upsert', 'updateOrInsert'], true)) {
            $arguments = $this->tenantWriteArguments($method, $arguments);
        } elseif ($method === 'update' && isset($arguments[0]) && is_array($arguments[0])) {
            unset($arguments[0]['center_id']);
        } elseif (in_array($method, ['delete', 'forceDelete', 'truncate'], true)) {
            if ($method === 'truncate') {
                throw new InvalidArgumentException('Tenant-scoped truncate is prohibited.');
            }
        }

        $result = $this->builder->{$method}(...$arguments);

        if ($result === $this->builder) {
            $this->scopeNewJoins();

            return $this;
        }

        return $result;
    }

    private function tenantWriteArguments(string $method, array $arguments): array
    {
        if ($method === 'upsert') {
            $arguments[0] = $this->addCenterToRows($arguments[0] ?? []);
            $uniqueBy = (array) ($arguments[1] ?? []);
            $arguments[1] = array_values(array_unique(['center_id', ...$uniqueBy]));

            return $arguments;
        }

        if ($method === 'updateOrInsert') {
            $arguments[0]['center_id'] = $this->centerId;
            $arguments[1]['center_id'] = $this->centerId;

            return $arguments;
        }

        if (in_array($method, ['insert', 'insertOrIgnore'], true)) {
            $arguments[0] = $this->addCenterToRows($arguments[0] ?? []);

            return $arguments;
        }

        $arguments[0]['center_id'] = $this->centerId;

        return $arguments;
    }

    private function addCenterToRows(array $rows): array
    {
        if ($rows === []) {
            return $rows;
        }

        if (! array_is_list($rows)) {
            $rows['center_id'] = $this->centerId;

            return $rows;
        }

        return array_map(fn (array $row) => [...$row, 'center_id' => $this->centerId], $rows);
    }

    private function scopeNewJoins(): void
    {
        foreach ($this->builder->joins ?? [] as $join) {
            $table = $join->table;
            if (! is_string($table)) {
                continue;
            }

            if (in_array(TenantDB::tableName($table), TenantDB::registeredTables(), true)) {
                $qualifiedColumn = TenantDB::qualifier($table).'.center_id';
                $alreadyScoped = collect($join->wheres ?? [])->contains(fn (array $where) => ($where['type'] ?? null) === 'Basic'
                    && ($where['column'] ?? null) === $qualifiedColumn
                    && ($where['value'] ?? null) === $this->centerId,
                );
                if (! $alreadyScoped) {
                    $join->where($qualifiedColumn, '=', $this->centerId);
                    // JoinClause bindings are copied into the parent builder when
                    // the join is added, so keep the parent's binding list in sync.
                    $this->builder->addBinding($this->centerId, 'join');
                }
            }
        }
    }

    private function applyTenantFilters(): void
    {
        $this->scopeNewJoins();
        $wheres = $this->builder->wheres ?? [];
        if ($wheres !== []) {
            $whereBindings = $this->builder->getRawBindings()['where'] ?? [];
            $this->builder->wheres = [];
            $this->builder->setBindings([], 'where');
            $this->builder->where(function (Builder $nested) use ($wheres, $whereBindings): void {
                $nested->wheres = $wheres;
                $nested->setBindings($whereBindings, 'where');
            });
        }

        $this->builder->where(TenantDB::qualifier((string) $this->builder->from).'.center_id', '=', $this->centerId);
    }

    private function isReadOrMutation(string $method): bool
    {
        return in_array($method, [
            'get', 'first', 'value', 'pluck', 'count', 'sum', 'avg', 'min', 'max', 'exists', 'doesntExist',
            'paginate', 'simplePaginate', 'cursor', 'lazy', 'sole', 'find', 'findMany', 'findOrFail',
            'chunk', 'each', 'update', 'delete', 'increment', 'decrement', 'firstOr', 'firstOrFail',
        ], true);
    }
}
