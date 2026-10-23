<?php

namespace App\Policies;

use App\Models\Salle;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SallePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any salles.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->isTeacher();
    }

    /**
     * Determine whether the user can view the salle.
     */
    public function view(User $user, Salle $salle): bool
    {
        return $user->isAdmin() || $user->isTeacher();
    }

    /**
     * Determine whether the user can create salles.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the salle.
     */
    public function update(User $user, Salle $salle): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the salle.
     */
    public function delete(User $user, Salle $salle): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can archive the salle.
     */
    public function archive(User $user, Salle $salle): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can unarchive the salle.
     */
    public function unarchive(User $user, Salle $salle): bool
    {
        return $user->isAdmin();
    }
}
