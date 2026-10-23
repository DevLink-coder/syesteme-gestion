<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TeacherPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any teachers.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view the teacher.
     */
    public function view(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can create teachers.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the teacher.
     */
    public function update(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the teacher.
     */
    public function delete(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can suspend the teacher.
     */
    public function suspend(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can expel the teacher.
     */
    public function expel(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can reactivate the teacher.
     */
    public function reactivate(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can promote the teacher to admin.
     */
    public function promoteToAdmin(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can demote the teacher from admin.
     */
    public function demoteFromAdmin(User $user, $teacher): bool
    {
        return $user->isAdmin();
    }
}
