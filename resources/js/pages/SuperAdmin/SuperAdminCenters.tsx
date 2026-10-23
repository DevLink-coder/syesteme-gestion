import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
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
    estimatedMonthlyWhatsappCost: number;
}

interface CenterForm {
    name: string;
    director_name: string;
    director_email: string;
}

interface Overview {
    totals: {
        centers: number;
        activeCenters: number;
        archivedCenters: number;
    };
    centers: CenterRow[];
}

const emptyForm: CenterForm = {
    name: '',
    director_name: '',
    director_email: '',
};

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

async function responseError(response: Response): Promise<string> {
    const payload = await response.json();
    return (
        payload.message ||
        Object.values(payload.errors || {})
            .flat()
            .join(' ') ||
        'Une erreur est survenue.'
    );
}

export default function SuperAdminCenters() {
    const navigate = useNavigate();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [form, setForm] = useState<CenterForm>(emptyForm);
    const [editingCenter, setEditingCenter] = useState<CenterRow | null>(null);
    const [editForm, setEditForm] = useState<CenterForm>(emptyForm);
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

    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/web/superadmin/overview', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            if (!response.ok) throw new Error(await responseError(response));
            setOverview(await response.json());
            setError('');
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Impossible de charger les centres.',
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
            if (!response.ok) throw new Error(await responseError(response));
            const payload = await response.json();
            setMessage(payload.message);
            setForm(emptyForm);
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

    const updateCenter = async (event: FormEvent) => {
        event.preventDefault();
        if (!editingCenter) return;
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch(
                `/web/superadmin/centers/${editingCenter.id}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: csrfHeaders(),
                    body: JSON.stringify(editForm),
                },
            );
            if (!response.ok) throw new Error(await responseError(response));
            const payload = await response.json();
            setMessage(payload.message);
            setEditingCenter(null);
            await loadOverview();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Modification impossible.',
            );
        } finally {
            setSaving(false);
        }
    };

    const changeCenterStatus = async (center: CenterRow, archived: boolean) => {
        setSaving(true);
        setError('');
        setMessage('');
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
            if (!response.ok) throw new Error(await responseError(response));
            const payload = await response.json();
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
        setError('');
        try {
            const response = await fetch(
                `/web/superadmin/centers/${center.id}/enter`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: csrfHeaders(),
                    body: JSON.stringify({}),
                },
            );
            if (!response.ok) throw new Error(await responseError(response));
            const payload = await response.json();
            const meResponse = await fetch('/me', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            let selectedCenterSlug: string | null = null;
            if (meResponse.ok) {
                const me = await meResponse.json();
                selectedCenterSlug = me.center_slug || null;
                const saved = JSON.parse(
                    localStorage.getItem('sgcr_user') || '{}',
                );
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
        } catch (enterError) {
            setError(
                enterError instanceof Error
                    ? enterError.message
                    : 'Impossible d’ouvrir ce centre.',
            );
        }
    };

    const startEditing = (center: CenterRow) => {
        setEditingCenter(center);
        setEditForm({
            name: center.name,
            director_name: center.directorName,
            director_email: center.directorEmail || '',
        });
    };

    return (
        <div className="space-y-6">
            <header>
                <p className="text-brand-600 text-sm font-medium">
                    EduCore · Administration centrale
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    Gestion des centres
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Créez, modifiez, consultez et archivez les centres et leurs
                    accès.
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

            <section className="grid gap-4 sm:grid-cols-3">
                {[
                    ['Centres', overview?.totals.centers],
                    ['Centres actifs', overview?.totals.activeCenters],
                    ['Centres archivés', overview?.totals.archivedCenters],
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
                        aria-label="Nom du centre"
                        value={form.name}
                        onChange={(event) =>
                            setForm({ ...form, name: event.target.value })
                        }
                        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <input
                        required
                        minLength={2}
                        maxLength={180}
                        placeholder="Nom du directeur"
                        aria-label="Nom du directeur"
                        value={form.director_name}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                director_name: event.target.value,
                            })
                        }
                        className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <input
                        required
                        type="email"
                        maxLength={255}
                        placeholder="Courriel du directeur"
                        aria-label="Courriel du directeur"
                        value={form.director_email}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                director_email: event.target.value,
                            })
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
                    Un mot de passe temporaire sécurisé sera envoyé au
                    directeur.
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
                    <table className="w-full min-w-[780px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3">
                                    Centre / directeur
                                </th>
                                <th className="px-4 py-3">État</th>
                                <th className="px-4 py-3">Enseignants</th>
                                <th className="px-4 py-3">Élèves</th>
                                <th className="px-4 py-3">
                                    Estimation WhatsApp / mois
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
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                center.status === 'active'
                                                    ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                        >
                                            {center.status === 'active'
                                                ? 'Actif'
                                                : 'Archivé'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        {center.teachersCount}
                                    </td>
                                    <td className="px-4 py-4">
                                        {center.studentsCount}
                                    </td>
                                    <td className="px-4 py-4">
                                        {formatMoney(
                                            center.estimatedMonthlyWhatsappCost,
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() =>
                                                    startEditing(center)
                                                }
                                                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                            >
                                                Modifier
                                            </button>
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
                            {loading && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        Chargement des centres…
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="p-4 text-xs text-gray-500">
                    L’estimation WhatsApp suppose un message mensuel par élève.
                </p>
            </section>

            {editingCenter && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-center-title"
                >
                    <form
                        onSubmit={updateCenter}
                        className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
                    >
                        <h2
                            id="edit-center-title"
                            className="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                            Modifier {editingCenter.name}
                        </h2>
                        <input
                            required
                            minLength={2}
                            maxLength={180}
                            aria-label="Nom du centre"
                            value={editForm.name}
                            onChange={(event) =>
                                setEditForm({
                                    ...editForm,
                                    name: event.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white"
                        />
                        <input
                            required
                            minLength={2}
                            maxLength={180}
                            aria-label="Nom du directeur"
                            value={editForm.director_name}
                            onChange={(event) =>
                                setEditForm({
                                    ...editForm,
                                    director_name: event.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white"
                        />
                        <input
                            required
                            type="email"
                            maxLength={255}
                            aria-label="Courriel du directeur"
                            value={editForm.director_email}
                            onChange={(event) =>
                                setEditForm({
                                    ...editForm,
                                    director_email: event.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingCenter(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                Annuler
                            </button>
                            <button
                                disabled={saving}
                                className="bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {archiveTarget && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="archive-center-title"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <h2
                            id="archive-center-title"
                            className="text-lg font-semibold text-gray-900 dark:text-white"
                        >
                            Archiver {archiveTarget.name} ?
                        </h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Les comptes du centre seront déconnectés et bloqués
                            jusqu’à sa réactivation. Les données sont
                            conservées.
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
