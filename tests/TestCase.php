<?php

namespace Tests;

use App\Support\TenantContext;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $centerId = DB::table('centers')->value('id');
        if (! $centerId) {
            $centerId = DB::table('centers')->insertGetId([
                'name' => 'Test Center',
                'slug' => 'test-center',
                'director_name' => 'Test Director',
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        TenantContext::set((int) $centerId);
    }

    protected function tearDown(): void
    {
        TenantContext::set(null);
        parent::tearDown();
    }
}
