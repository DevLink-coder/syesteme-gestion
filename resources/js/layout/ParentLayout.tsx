import { useEffect, useState } from 'react';
import {
    Link,
    Outlet,
    useParams,
    useSearchParams,
    useLocation,
} from 'react-router';

interface ParentPortalData {
    student: {
        id: string;
        code: string;
        name: string;
        language: string | null;
    };
    bulletins: Array<any>;
    absences: {
        items: Array<any>;
        count: number;
        knownHours: number;
        withoutSlotCount: number;
        schoolYearLabel: string | null;
    };
    account: null | {
        schoolYearLabel: string;
        salleName: string;
        status: string;
        monthlyDue: number;
        monthlyPaid: number;
        monthlyBalance: number;
        currency: string;
        month: string;
    };
}

export default function ParentLayout() {
    const { studentId } = useParams();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const token = searchParams.get('token') || '';
    const [data, setData] = useState<ParentPortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [invalidLink, setInvalidLink] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setData(null);
        setInvalidLink(false);
        if (!studentId || !token || token.length < 32) {
            setInvalidLink(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(
            `/web/parent/${encodeURIComponent(studentId)}?token=${encodeURIComponent(token)}`,
            {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            },
        )
            .then(async (response) => {
                if (!response.ok) throw new Error('Lien invalide');
                const payload = await response.json();
                if (!cancelled) setData(payload);
            })
            .catch(() => {
                if (!cancelled) setInvalidLink(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [studentId, token]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900">
                Chargement de l’espace parent…
            </div>
        );
    }

    if (invalidLink || !data?.student) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
                <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <div className="bg-warning-50 dark:bg-warning-500/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl">
                        🔒
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Lien parent invalide ou expiré
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Demandez à l’administration de vous transmettre un
                        nouveau lien sécurisé.
                    </p>
                </div>
            </div>
        );
    }

    const { student } = data;
    const isBulletin = location.pathname === `/parent/${studentId}`;
    const isAbsences = location.pathname.endsWith('/absences');
    const isSolde = location.pathname.endsWith('/solde');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="border-b bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {student.name}
                    </h1>
                    <nav className="flex gap-2">
                        <Link
                            to={`/parent/${encodeURIComponent(student.code || student.id)}?token=${encodeURIComponent(token)}`}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${isBulletin ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'}`}
                        >
                            Bulletins
                        </Link>
                        <Link
                            to={`/parent/${encodeURIComponent(student.code || student.id)}/absences?token=${encodeURIComponent(token)}`}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${isAbsences ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'}`}
                        >
                            Absences
                        </Link>
                        <Link
                            to={`/parent/${encodeURIComponent(student.code || student.id)}/solde?token=${encodeURIComponent(token)}`}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${isSolde ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'}`}
                        >
                            Compte
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                <Outlet context={data} />
            </main>
        </div>
    );
}
