<?php

namespace App\Providers;

use App\Models\Salle;
use App\Models\User;
use App\Policies\SallePolicy;
use App\Policies\TeacherPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        // 'App\Models\Model' => 'App\Policies\ModelPolicy',
        User::class => TeacherPolicy::class,
        Salle::class => SallePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Gate pour vérifier si l'utilisateur est admin
        Gate::define('admin', function (User $user) {
            return $user->isAdmin();
        });

        // Gate pour vérifier si l'utilisateur est enseignant
        Gate::define('teacher', function (User $user) {
            return $user->isTeacher();
        });

        // Gate pour vérifier si l'utilisateur est enseignant actif
        Gate::define('teacher-active', function (User $user) {
            return $user->isActiveTeacher();
        });
    }
}
