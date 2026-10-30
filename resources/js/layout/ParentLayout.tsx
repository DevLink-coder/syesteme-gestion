import { useEffect, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router';

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
                    Consultation en lecture seule — informations de{' '}
                    {student.name}.
                </div>
                <Outlet context={data} />
            </main>
        </div>
    );
}
