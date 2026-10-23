import { Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('admin' | 'teacher' | 'superadmin')[];
    redirectTo?: string;
}

export default function ProtectedRoute({
    children,
    allowedRoles = ['admin', 'teacher'],
    redirectTo = '/signin',
}: ProtectedRouteProps) {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) return null;
    if (!currentUser) return <Navigate to="/signin" replace />;

    const superAdminInsideCenter =
        currentUser.role === 'superadmin' &&
        allowedRoles.includes('admin') &&
        currentUser.centerId != null;
    if (
        !allowedRoles.includes(currentUser.role as any) &&
        !superAdminInsideCenter
    ) {
        if (currentUser.role === 'superadmin')
            return <Navigate to="/superadmin" replace />;
        if (currentUser.role === 'teacher') {
            return <Navigate to="/enseignant" replace />;
        }
        if (currentUser.role === 'admin')
            return <Navigate to="/dashboard" replace />;
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
