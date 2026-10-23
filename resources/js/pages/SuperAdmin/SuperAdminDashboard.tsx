import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import Badge from '../../components/ui/badge/Badge';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

interface CenterRow {
    id: number;
    name: string;
    directorName: string;
    directorEmail: string | null;
    status: 'active' | 'archived';
    teachersCount: number;
    studentsCount: number;
    estimatedMonthlySmsCost: number;
    estimatedMonthlyWhatsappCost: number;
}

interface Overview {
    totals: Record<string, number>;
    rates: { sms: number; whatsapp: number; currency: string };
    centers: CenterRow[];
}

function csrfHeaders(): Record<string, string> {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content || '',
    };
}

function formatMoney(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FCFA`;
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<CenterRow | null>(null);
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const sortedCenters = useMemo(
        () =>
            sortAlphabetically(
                overview?.centers ?? [],
                (center) => center.name,
                sortDirection,
            ),
        [overview?.centers, sortDirection],
    );
    const [form, setForm] = useState({
        name: '',
        director_name: '',
        director_email: '',
    });

    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/web/superadmin/overview', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message || 'Impossible de charger la plateforme.',
                );
            setOverview(payload);
            setError('');
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Erreur de chargement.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);

    const createCenter = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch('/web/superadmin/centers', {
                method: 'POST',
                credentials: 'include',
                headers: csrfHeaders(),
                body: JSON.stringify(form),
            });
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ||
                        Object.values(payload.errors || {})
                            .flat()
                            .join(' '),
                );
            setMessage(payload.message);
            setForm({ name: '', director_name: '', director_email: '' });
            await loadOverview();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Création impossible.',
            );
        } finally {
            setSaving(false);
        }
    };

    const changeCenterStatus = async (center: CenterRow, archived: boolean) => {
        setSaving(true);
        setError('');
        try {
            const response = await fetch(
                `/web/superadmin/centers/${center.id}/status`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: csrfHeaders(),
                    body: JSON.stringify({ archived }),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(payload.message || 'Modification impossible.');
            setMessage(payload.message);
            setArchiveTarget(null);
            await loadOverview();
        } catch (statusError) {
            setError(
                statusError instanceof Error
                    ? statusError.message
                    : 'Modification impossible.',
            );
        } finally {
            setSaving(false);
        }
    };

    const enterCenter = async (center: CenterRow) => {
        const response = await fetch(
            `/web/superadmin/centers/${center.id}/enter`,
            {
                method: 'POST',
                credentials: 'include',
                headers: csrfHeaders(),
                body: JSON.stringify({}),
            },
        );
        const payload = await response.json();
        if (!response.ok) {
            setError(payload.message || 'Impossible d’ouvrir ce centre.');
            return;
        }
        const meResponse = await fetch('/me', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        let selectedCenterSlug: string | null = null;
        if (meResponse.ok) {
            const me = await meResponse.json();
            selectedCenterSlug = me.center_slug || null;
            const saved = JSON.parse(localStorage.getItem('sgcr_user') || '{}');
            localStorage.setItem(
                'sgcr_user',
                JSON.stringify({
                    ...saved,
                    centerId: me.selected_center_id,
                    centerSlug: me.center_slug,
                }),
            );
            window.dispatchEvent(new Event('auth:refresh'));
        }
        if (selectedCenterSlug) {
            window.location.assign(
                `/${selectedCenterSlug}${payload.redirect || '/dashboard'}`,
            );
        } else {
            void navigate(payload.redirect || '/dashboard');
        }
    };

    return (
        <div className="space-y-6">
            <header>
                <p className="text-brand-600 text-sm font-medium">
                    EduCore · Administration centrale
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    Plateforme multi-centres
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Gérez les centres, leurs accès et le volume estimé de
                    notifications mensuelles.
                </p>
            </header>

            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                    {error}
                </p>
            )}
            {message && (
                <p
                    role="status"
                    className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300"
                >
                    {message}
                </p>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                    ['Centres', overview?.totals.centers],
                    ['Enseignants', overview?.totals.teachers],
                    ['Élèves', overview?.totals.students],
                    ['Centres actifs', overview?.totals.activeCenters],
                    [
                        'Estimation SMS / mois',
                        overview?.totals.estimatedMonthlySmsCost != null
                            ? formatMoney(
                                  overview.totals.estimatedMonthlySmsCost,
                              )
                            : '—',
                    ],
                    [
                        'Estimation WhatsApp / mois',
                        overview?.totals.estimatedMonthlyWhatsappCost != null
                            ? formatMoney(
                                  overview.totals.estimatedMonthlyWhatsappCost,
                              )
                            : '—',
                    ],
                ].map(([label, value]) => (
                    <article
                        key={String(label)}
                        className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                    >
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                            {value ?? (loading ? '…' : 0)}
                        </p>
                    </article>
                ))}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Créer un centre
                </h2>
                <form
                    onSubmit={createCenter}
                    className="mt-4 grid gap-3 md:grid-cols-4"
                >
                    <input
                        required
                        minLength={2}
                        maxLength={180}
                        placeholder="Nom du centre"
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <input
                        required
                        minLength={2}
                        maxLength={180}
                        placeholder="Nom du directeur"
                        value={form.director_name}
                        onChange={(e) =>
                            setForm({ ...form, director_name: e.target.value })
                        }
                        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <input
                        required
                        type="email"
                        maxLength={255}
                        placeholder="Courriel du directeur"
                        value={form.director_email}
                        onChange={(e) =>
                            setForm({ ...form, director_email: e.target.value })
                        }
                        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <button
                        disabled={saving}
                        className="bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-500 dark:disabled:bg-brand-900 rounded-lg px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 disabled:opacity-50"
                    >
                        {saving ? 'Création…' : 'Créer et envoyer l’accès'}
                    </button>
                </form>
                <p className="mt-2 text-xs text-gray-500">
                    Un mot de passe temporaire sécurisé de 8 caractères sera
                    envoyé au directeur. Il pourra le modifier depuis son
                    profil.
                </p>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Centres
                    </h2>
                    <AlphabeticalSortControl
                        value={sortDirection}
                        onChange={setSortDirection}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3">
                                    Centre / directeur
                                </th>
                                <th className="px-4 py-3">État</th>
                                <th className="px-4 py-3">Enseignants</th>
                                <th className="px-4 py-3">Élèves</th>
                                <th className="px-4 py-3">
                                    Coût estimé / mois
                                </th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sortedCenters.map((center) => (
                                <tr key={center.id}>
                                    <td className="px-4 py-4">
                                        <strong className="block text-gray-900 dark:text-white">
                                            {center.name}
                                        </strong>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {center.directorName} ·{' '}
                                            {center.directorEmail || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge
                                            color={
                                                center.status === 'active'
                                                    ? 'success'
                                                    : 'light'
                                            }
                                            size="sm"
                                        >
                                            {center.status === 'active'
                                                ? 'Actif'
                                                : 'Archivé'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        {center.teachersCount}
                                    </td>
                                    <td className="px-4 py-4">
                                        {center.studentsCount}
                                    </td>
                                    <td className="px-4 py-4">
                                        SMS{' '}
                                        {formatMoney(
                                            center.estimatedMonthlySmsCost,
                                        )}
                                        <br />
                                        WhatsApp{' '}
                                        {formatMoney(
                                            center.estimatedMonthlyWhatsappCost,
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    void enterCenter(center)
                                                }
                                                className="border-brand-300 text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-500/10 rounded border px-3 py-1.5 text-xs font-medium"
                                            >
                                                Ouvrir
                                            </button>
                                            <button
                                                disabled={saving}
                                                onClick={() =>
                                                    center.status === 'active'
                                                        ? setArchiveTarget(
                                                              center,
                                                          )
                                                        : void changeCenterStatus(
                                                              center,
                                                              false,
                                                          )
                                                }
                                                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                            >
                                                {center.status === 'active'
                                                    ? 'Archiver'
                                                    : 'Réactiver'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && overview?.centers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        Aucun centre créé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="p-4 text-xs text-gray-500">
                    Estimation à raison d’un message mensuel par élève.
                    Configurez les tarifs unitaires dans les paramètres de la
                    plateforme.
                </p>
            </section>

            {archiveTarget && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="archive-title"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <h2
                            id="archive-title"
                            className="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                            Archiver {archiveTarget.name} ?
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Tous les comptes du centre seront déconnectés et
                            bloqués jusqu’à sa réactivation.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setArchiveTarget(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Annuler
                            </button>
                            <button
                                disabled={saving}
                                onClick={() =>
                                    void changeCenterStatus(archiveTarget, true)
                                }
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
                            >
                                {saving
                                    ? 'Archivage…'
                                    : 'Confirmer l’archivage'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
