import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
} from 'react-router';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import AppLayout from './layout/AppLayout';
import { ScrollToTop } from './components/common/ScrollToTop';
import ProtectedRoute from './components/common/ProtectedRoute';
import { SchoolStructureProvider } from './context/SchoolStructureContext';
import { TeachersProvider } from './context/TeachersContext';
import { EnrollmentProvider } from './context/EnrollmentContext';
import { EvaluationsProvider } from './context/EvaluationsContext';
import { AuthProvider } from './context/AuthContext';
import { SubjectsProvider } from './context/SubjectsContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { ToastProvider } from './context/ToastContext';
import { AlertModalProvider } from './context/AlertModalContext';
import { useAuth } from './context/AuthContext';
import SuperAdminCenters from './pages/SuperAdmin/SuperAdminCenters';

function AuthenticatedRouter() {
    const { currentUser, isLoading } = useAuth();
    const isSuperAdminSection =
        currentUser?.role === 'superadmin' &&
        /^\/superadmin(?:\/|$)/.test(window.location.pathname);
    const prefixedSuperAdminSection = Boolean(
        currentUser?.role === 'superadmin' &&
        currentUser.centerSlug &&
        window.location.pathname.startsWith(
            `/${currentUser.centerSlug}/superadmin`,
        ),
    );
    const signInSlug = window.location.pathname.match(
        /^\/([a-z0-9-]+)\/(?:signin|signup)$/,
    )?.[1];
    const publicParentSlug = window.location.pathname.match(
        /^\/([a-z0-9-]+)\/parent\/[^/]+(?:\/(?:absences|solde))?\/?$/,
    )?.[1];
    const slug =
        isSuperAdminSection || prefixedSuperAdminSection
            ? undefined
            : publicParentSlug || currentUser?.centerSlug || signInSlug;
    const basename = slug ? `/${slug}` : undefined;
    const hasCenterPrefix = Boolean(
        slug &&
        (window.location.pathname === basename ||
            window.location.pathname.startsWith(`${basename}/`)),
    );

    useEffect(() => {
        if (isLoading) return;
        if (prefixedSuperAdminSection && currentUser?.centerSlug) {
            window.location.replace(
                `${window.location.pathname.slice(currentUser.centerSlug.length + 1)}${window.location.search}${window.location.hash}`,
            );
            return;
        }
        if (!slug || hasCenterPrefix) return;
        window.location.replace(
            `${basename}${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
    }, [
        basename,
        currentUser?.centerSlug,
        hasCenterPrefix,
        isLoading,
        prefixedSuperAdminSection,
        slug,
    ]);

    if (isLoading) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Chargement de la session…
            </div>
        );
    }

    if (slug && !hasCenterPrefix) return null;

    return (
        <Router basename={basename} key={basename || 'public'}>
            <TenantDataProviders>
                <ScrollToTop />
                <Suspense
                    fallback={
                        <div className="p-6 text-sm text-gray-500">
                            Chargement de la page…
                        </div>
                    }
                >
                    <AppRoutes />
                </Suspense>
            </TenantDataProviders>
        </Router>
    );
}

const SignIn = lazy(() => import('./pages/AuthPages/SignIn'));
const NotFound = lazy(() => import('./pages/OtherPage/NotFound'));
const UserProfiles = lazy(() => import('./pages/UserProfiles'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Home = lazy(() => import('./pages/Dashboard/Home'));
const SallesList = lazy(() => import('./pages/Salles/SallesList'));
const SalleDetail = lazy(() => import('./pages/Salles/SalleDetail'));
const AnneesScolairesList = lazy(
    () => import('./pages/AnneesScolaires/AnneesScolairesList'),
);
const EnseignantsList = lazy(
    () => import('./pages/Enseignants/EnseignantsList'),
);
const EnseignantDetail = lazy(
    () => import('./pages/Enseignants/EnseignantDetail'),
);
const ElevesList = lazy(() => import('./pages/Eleves/ElevesList'));
const EleveDetail = lazy(() => import('./pages/Eleves/EleveDetail'));
const InscriptionForm = lazy(() => import('./pages/Eleves/InscriptionForm'));
const TarifsList = lazy(() => import('./pages/Eleves/TarifsList'));
const DettesList = lazy(() => import('./pages/Eleves/DettesList'));
const PresencesList = lazy(() => import('./pages/Presences/PresencesList'));
const PresencesEleve = lazy(() => import('./pages/Presences/PresencesEleve'));
const PresencesEnseignant = lazy(
    () => import('./pages/Presences/PresencesEnseignant'),
);
const PresencesDetail = lazy(() => import('./pages/Presences/PresencesDetail'));
const EvaluationsList = lazy(
    () => import('./pages/Evaluations/EvaluationsList'),
);
const EvaluationDetail = lazy(
    () => import('./pages/Evaluations/EvaluationDetail'),
);
const EvaluationSaisie = lazy(
    () => import('./pages/Evaluations/EvaluationSaisie'),
);
const MatieresList = lazy(() => import('./pages/Matieres/MatieresList'));
const DashboardEnseignant = lazy(
    () => import('./pages/Enseignant/DashboardEnseignant'),
);
const EmploiDuTempsEnseignant = lazy(
    () => import('./pages/Enseignant/EmploiDuTempsEnseignant'),
);
const AppelPresence = lazy(() => import('./pages/Enseignant/AppelPresence'));
const SaisieNotes = lazy(() => import('./pages/Enseignant/SaisieNotes'));
const ParentLayout = lazy(() => import('./layout/ParentLayout'));
const ParentBulletin = lazy(() => import('./pages/Parent/ParentBulletin'));
const ParentSolde = lazy(() => import('./pages/Parent/ParentSolde'));
const ParentAbsences = lazy(() => import('./pages/Parent/ParentAbsences'));
const SuperAdminDashboard = lazy(
    () => import('./pages/SuperAdmin/SuperAdminDashboard'),
);
const PlatformAudit = lazy(() => import('./pages/SuperAdmin/PlatformAudit'));
const SuperAdminSettings = lazy(
    () => import('./pages/SuperAdmin/SuperAdminSettings'),
);

function HomeRedirect() {
    const { currentUser, isLoading } = useAuth();
    if (isLoading) return null;
    if (!currentUser) return <Navigate to="/signin" replace />;
    return (
        <Navigate
            to={
                currentUser.role === 'superadmin'
                    ? '/superadmin'
                    : currentUser.role === 'admin'
                      ? '/dashboard'
                      : '/enseignant'
            }
            replace
        />
    );
}

function TenantDataProviders({ children }: { children: ReactNode }) {
    const { currentUser, isLoading } = useAuth();
    const { pathname } = useLocation();

    // Les pages superadmin hors d'un centre ne consomment pas les API scolaires.
    // Attendre /me évite aussi de lancer ces requêtes avant de connaître le rôle.
    if (
        isLoading ||
        (currentUser?.role === 'superadmin' && !currentUser.centerId)
    ) {
        return <>{children}</>;
    }

    const needsSchoolStructure =
        /^\/(dashboard|salles|enseignants|eleves|tarifs|dettes)(\/|$)/.test(
            pathname,
        );
    const needsEnrollment = /^\/(dashboard|eleves|tarifs|dettes)(\/|$)/.test(
        pathname,
    );
    const needsTeachers = /^\/enseignants\/[^/]+$/.test(pathname);
    const needsEvaluations = /^\/(evaluations|eleves)(\/|$)/.test(pathname);
    const needsSubjects = /^\/salles\/[^/]+$/.test(pathname);
    const needsAttendance =
        /^\/(presences|presences-eleve|presences-enseignant|eleves)(\/|$)/.test(
            pathname,
        );

    let providers = children;
    if (needsAttendance)
        providers = <AttendanceProvider>{providers}</AttendanceProvider>;
    if (needsSubjects)
        providers = <SubjectsProvider>{providers}</SubjectsProvider>;
    if (needsEvaluations)
        providers = <EvaluationsProvider>{providers}</EvaluationsProvider>;
    if (needsTeachers)
        providers = <TeachersProvider>{providers}</TeachersProvider>;
    if (needsEnrollment)
        providers = <EnrollmentProvider>{providers}</EnrollmentProvider>;
    if (needsSchoolStructure)
        providers = (
            <SchoolStructureProvider>{providers}</SchoolStructureProvider>
        );

    return <>{providers}</>;
}

function AppRoutes() {
    return (
        <Routes>
            {/* Default route - redirect to sign in */}
            <Route index path="/" element={<HomeRedirect />} />

            {/* Auth Layout */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<Navigate to="/signin" replace />} />

            {/* Dashboard Layout */}
            <Route element={<AppLayout />}>
                <Route
                    path="/superadmin"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <SuperAdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/superadmin/centres"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <SuperAdminCenters />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/superadmin/audit"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <PlatformAudit />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/superadmin/settings"
                    element={
                        <ProtectedRoute allowedRoles={['superadmin']}>
                            <SuperAdminSettings />
                        </ProtectedRoute>
                    }
                />
                {/* Admin-only routes */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Home />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/calendar"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <Calendar />
                        </ProtectedRoute>
                    }
                />

                {/* Structure pédagogique */}
                <Route
                    path="/salles"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <SallesList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/salles/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <SalleDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/annees-scolaires"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AnneesScolairesList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/enseignants"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EnseignantsList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/enseignants/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EnseignantDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/matieres"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <MatieresList />
                        </ProtectedRoute>
                    }
                />

                {/* Élèves */}
                <Route
                    path="/eleves"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <ElevesList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/eleves/nouveau"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <InscriptionForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/eleves/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EleveDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/tarifs"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <TarifsList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dettes"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <DettesList />
                        </ProtectedRoute>
                    }
                />

                {/* Présences */}
                <Route
                    path="/presences-eleve"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <PresencesEleve />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/presences-enseignant"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <PresencesEnseignant />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/presences"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <PresencesList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/presences/:salleId"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <PresencesDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Évaluations */}
                <Route
                    path="/evaluations"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EvaluationsList />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/evaluations/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EvaluationDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/evaluations/:id/saisie"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EvaluationSaisie />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/evaluations/:id/bulletin/:studentId"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <EvaluationDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Administration */}
                <Route
                    path="/journal-audit"
                    element={<Navigate to="/superadmin/audit" replace />}
                />
                <Route
                    path="/parametres"
                    element={<Navigate to="/superadmin/settings" replace />}
                />

                {/* Espace enseignant */}
                <Route
                    path="/enseignant"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                            <DashboardEnseignant />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/enseignant/emploi-du-temps"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                            <EmploiDuTempsEnseignant />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/enseignant/appel/:slotId"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                            <AppelPresence />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/enseignant/saisie-notes"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                            <SaisieNotes />
                        </ProtectedRoute>
                    }
                />

                {/* Espace Parent — lien sécurisé EF-32 */}
                <Route element={<ParentLayout />}>
                    <Route
                        path="/parent/:studentId"
                        element={<ParentBulletin />}
                    />
                    <Route
                        path="/parent/:studentId/solde"
                        element={<ParentSolde />}
                    />
                    <Route
                        path="/parent/:studentId/absences"
                        element={<ParentAbsences />}
                    />
                </Route>

                {/* Profile - accessible to all roles */}
                <Route path="/profile" element={<UserProfiles />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <AlertModalProvider>
                    <AuthenticatedRouter />
                </AlertModalProvider>
            </ToastProvider>
        </AuthProvider>
    );
}
