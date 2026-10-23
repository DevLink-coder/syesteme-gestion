import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';

interface TeacherSlot {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    roomId: string;
    roomName: string;
    schoolYearLabel: string | null;
}

interface DashboardData {
    teacher: { name: string };
    today: string;
    date: string;
    todaySlots: TeacherSlot[];
    upcomingSlots: TeacherSlot[];
    weekSlotsCount: number;
    assignmentsCount: number;
}

export default function DashboardEnseignant() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/web/teacher-portal/dashboard', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message || 'Chargement impossible.',
                    );
                if (!cancelled) setData(payload);
            })
            .catch((loadError: any) => {
                if (!cancelled)
                    setError(loadError.message || 'Chargement impossible.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const displayedSlots = data?.todaySlots.length
        ? data.todaySlots
        : data?.upcomingSlots || [];
    const showingUpcoming = Boolean(
        data && data.todaySlots.length === 0 && data.upcomingSlots.length > 0,
    );

    return (
        <>
            <PageMeta
                title="Espace Enseignant"
                description="Planning et activités de l’enseignant"
            />
            <PageBreadcrumb pageTitle="Espace Enseignant" />

            {loading ? (
                <p className="py-8 text-center text-sm text-gray-500">
                    Chargement de votre espace...
                </p>
            ) : error ? (
                <div className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300 rounded-lg border px-4 py-3 text-sm">
                    {error}
                </div>
            ) : data ? (
                <>
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                Bonjour, {data.teacher.name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {data.today}{' '}
                                {new Date(
                                    `${data.date}T12:00:00`,
                                ).toLocaleDateString('fr-FR')}
                                {' · '}
                                {data.todaySlots.length} créneau(x) aujourd’hui
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link
                                to="/enseignant/emploi-du-temps"
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Mon emploi du temps
                            </Link>
                            <Link
                                to="/enseignant/saisie-notes"
                                className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-2 text-sm font-medium text-white"
                            >
                                Saisir des notes
                            </Link>
                        </div>
                    </div>

                    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Créneaux cette semaine
                            </p>
                            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white">
                                {data.weekSlotsCount}
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Affectations matière / salle
                            </p>
                            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white">
                                {data.assignmentsCount}
                            </p>
                        </div>
                    </div>

                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800 dark:text-white">
                                {showingUpcoming
                                    ? 'Prochains créneaux'
                                    : 'Créneaux du jour'}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {displayedSlots.length} affiché(s)
                            </span>
                        </div>
                        {displayedSlots.length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                Aucun créneau prévu aujourd’hui ni pour la suite
                                de la semaine.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                                {displayedSlots.map((slot) => (
                                    <div
                                        key={slot.id}
                                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div className="w-28 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {slot.day} · {slot.startTime}–
                                                {slot.endTime}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-gray-800 dark:text-white">
                                                    {slot.subject}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {slot.roomName} ·{' '}
                                                    {slot.schoolYearLabel ||
                                                        slot.roomId}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/enseignant/appel/${slot.id}`}
                                            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-2 text-center text-sm font-medium text-white"
                                        >
                                            Faire l’appel
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            ) : null}
        </>
    );
}
