import Badge from '../../components/ui/badge/Badge';
import { useEffect, useState } from 'react';

interface AuditRow {
    id: string;
    actorName: string;
    action: string;
    method: string | null;
    path: string | null;
    statusCode: number | null;
    centerName: string;
    ipAddress: string | null;
    createdAt: string;
    metadata: Record<string, unknown> | null;
}

export default function PlatformAudit() {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [centers, setCenters] = useState<{ id: number; name: string }[]>([]);
    const [centerId, setCenterId] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const query = new URLSearchParams({
            page: String(page),
            per_page: '50',
        });
        if (centerId) query.set('center_id', centerId);
        if (search.trim()) query.set('search', search.trim());
        fetch(`/web/audit-logs?${query}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        })
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok)
                    throw new Error(
                        payload.message ||
                            'Impossible de charger le journal global.',
                    );
                if (cancelled) return;
                setRows(payload.data || []);
                setCenters(payload.centers || []);
                setLastPage(payload.meta?.lastPage || 1);
                setTotal(payload.meta?.total || 0);
                setError('');
            })
            .catch((requestError) => {
                if (!cancelled)
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : 'Erreur de chargement.',
                    );
            });
        return () => {
            cancelled = true;
        };
    }, [centerId, page, search]);

    return (
        <div className="space-y-5">
            <header>
                <p className="text-brand-600 text-sm font-medium">
                    Diagnostic transversal
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    Journal d’audit plateforme
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Actions, comptes, centre concerné, date, route et adresse
                    IP.
                </p>
            </header>
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row dark:border-gray-800 dark:bg-gray-900">
                <input
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder="Rechercher une action, un compte ou une route"
                    className="focus:border-brand-500 focus:ring-brand-500/20 min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 focus:ring-2 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                />
                <select
                    value={centerId}
                    onChange={(event) => {
                        setCenterId(event.target.value);
                        setPage(1);
                    }}
                    className="focus:border-brand-500 focus:ring-brand-500/20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                    <option value="">Tous les centres</option>
                    {centers.map((center) => (
                        <option key={center.id} value={center.id}>
                            {center.name}
                        </option>
                    ))}
                </select>
            </div>
            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                    {error}
                </p>
            )}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <table className="w-full min-w-[950px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Acteur</th>
                            <th className="px-4 py-3">Centre</th>
                            <th className="px-4 py-3">Action / route</th>
                            <th className="px-4 py-3">Résultat</th>
                            <th className="px-4 py-3">Adresse IP</th>
                            <th className="px-4 py-3">Détails</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.map((row) => (
                            <tr key={row.id} className="align-top">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {new Date(row.createdAt).toLocaleString(
                                        'fr-FR',
                                    )}
                                </td>
                                <td className="px-4 py-3">{row.actorName}</td>
                                <td className="px-4 py-3">{row.centerName}</td>
                                <td className="px-4 py-3">
                                    <strong>{row.action}</strong>
                                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                                        {row.method} {row.path}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {row.statusCode == null ? (
                                        '—'
                                    ) : (
                                        <Badge
                                            color={
                                                row.statusCode >= 500
                                                    ? 'error'
                                                    : row.statusCode >= 400
                                                      ? 'warning'
                                                      : row.statusCode >= 200
                                                        ? 'success'
                                                        : 'light'
                                            }
                                            size="sm"
                                        >
                                            {row.statusCode}
                                        </Badge>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {row.ipAddress || '—'}
                                </td>
                                <td className="max-w-xs px-4 py-3">
                                    <pre className="text-xs break-words whitespace-pre-wrap text-gray-500 dark:text-gray-400">
                                        {row.metadata
                                            ? JSON.stringify(
                                                  row.metadata,
                                                  null,
                                                  2,
                                              )
                                            : '—'}
                                    </pre>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="p-10 text-center text-gray-500"
                                >
                                    Aucune action trouvée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                    {total} action(s) · page {page}/{lastPage}
                </span>
                <div className="flex gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((value) => value - 1)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Précédent
                    </button>
                    <button
                        disabled={page >= lastPage}
                        onClick={() => setPage((value) => value + 1)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Suivant
                    </button>
                </div>
            </div>
        </div>
    );
}
