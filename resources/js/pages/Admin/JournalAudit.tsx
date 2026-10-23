import { useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import Badge from '../../components/ui/badge/Badge';
import Input from '../../components/form/input/InputField';
import StyledSelect from '../../components/ui/select/StyledSelect';
interface AuditEntry {
    id: string;
    auteurId: string | null;
    auteurNom: string;
    date: string;
    type: string;
    entite: string;
    anneeScolaire: string;
    valeurAvant: string | null;
    valeurApres: string | null;
    details: string | null;
}

interface AuditAuthor {
    id: string;
    name: string;
}

const typeLabel: Record<string, string> = {
    modification_note: 'Note',
    modification_paiement: 'Paiement',
    changement_statut: 'Statut',
};
const typeColor: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    modification_note: 'info',
    modification_paiement: 'success',
    changement_statut: 'warning',
};

// Historical audit rows may contain HTML-escaped text or JSON encoded twice.
// Decode for display only; React continues to escape the resulting text.
function decodeHtmlEntities(value: string | null | undefined): string {
    if (!value) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
}

function formatAuditValue(value: string | null): string {
    if (!value) return '—';
    const decoded = decodeHtmlEntities(value);
    try {
        return JSON.stringify(JSON.parse(decoded), null, 2);
    } catch {
        return decoded;
    }
}

export default function JournalAudit() {
    const [filterType, setFilterType] = useState('all');
    const [filterAuteur, setFilterAuteur] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [authors, setAuthors] = useState<AuditAuthor[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams({
            page: String(page),
            per_page: '50',
        });
        if (filterType !== 'all') params.set('type', filterType);
        if (filterAuteur !== 'all') params.set('author_id', filterAuteur);
        if (search.trim()) params.set('search', search.trim());

        setLoading(true);
        setError(null);
        fetch(`/web/audit-logs?${params.toString()}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message ||
                            'Impossible de charger le journal d’audit.',
                    );
                if (!cancelled) {
                    setAuditLog(
                        Array.isArray(payload.data) ? payload.data : [],
                    );
                    setAuthors(
                        Array.isArray(payload.authors) ? payload.authors : [],
                    );
                    setLastPage(Number(payload.meta?.lastPage || 1));
                    setTotal(Number(payload.meta?.total || 0));
                }
            })
            .catch((loadError: any) => {
                if (!cancelled)
                    setError(
                        loadError.message ||
                            'Impossible de charger le journal d’audit.',
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, filterType, filterAuteur, search]);

    const filtered = auditLog;

    return (
        <>
            <PageMeta
                title="Journal d'audit | Administration"
                description="EF-30/EF-31 — Historique des modifications"
            />
            <PageBreadcrumb pageTitle="Journal d'audit" />
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Journal d'audit — {total} entrée(s)
                        </h3>
                        <p className="text-xs text-gray-500">
                            Plus récent en premier • EF-30/EF-31
                        </p>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
                        <div className="w-full sm:max-w-xs">
                            <Input
                                placeholder="Rechercher élève/enseignant..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <StyledSelect
                            value={filterType}
                            onChange={(value) => {
                                setFilterType(value);
                                setPage(1);
                            }}
                            placeholder="Type"
                            options={[
                                { value: 'all', label: 'Tous les types' },
                                { value: 'modification_note', label: 'Note' },
                                {
                                    value: 'modification_paiement',
                                    label: 'Paiement',
                                },
                                { value: 'changement_statut', label: 'Statut' },
                            ]}
                            className="min-w-[160px]"
                        />
                        <StyledSelect
                            value={filterAuteur}
                            onChange={(value) => {
                                setFilterAuteur(value);
                                setPage(1);
                            }}
                            placeholder="Auteur"
                            options={[
                                { value: 'all', label: 'Tous les auteurs' },
                                ...authors.map((author) => ({
                                    value: author.id,
                                    label: decodeHtmlEntities(author.name),
                                })),
                            ]}
                            className="min-w-[180px]"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Date/Heure
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Auteur
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Type
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Entité
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Année
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Détail
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        className="py-8 text-center text-sm text-gray-500"
                                        colSpan={6 as any}
                                    >
                                        Chargement du journal...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell
                                        className="text-error-600 py-8 text-center text-sm"
                                        colSpan={6 as any}
                                    >
                                        {error}
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="py-8 text-center text-sm text-gray-500"
                                        colSpan={6 as any}
                                    >
                                        Aucune entrée pour ces filtres.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((entry) => (
                                    <>
                                        <TableRow
                                            key={entry.id}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                                            onClick={() =>
                                                setExpanded(
                                                    expanded === entry.id
                                                        ? null
                                                        : entry.id,
                                                )
                                            }
                                        >
                                            <TableCell className="py-3 text-sm whitespace-nowrap">
                                                {new Date(
                                                    entry.date,
                                                ).toLocaleString('fr-FR', {
                                                    dateStyle: 'short',
                                                    timeStyle: 'short',
                                                })}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm">
                                                {decodeHtmlEntities(
                                                    entry.auteurNom,
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge
                                                    color={
                                                        typeColor[entry.type] ||
                                                        'light'
                                                    }
                                                    size="sm"
                                                >
                                                    {typeLabel[entry.type] ||
                                                        entry.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm font-medium">
                                                {decodeHtmlEntities(
                                                    entry.entite,
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm">
                                                <Badge
                                                    color={
                                                        entry.anneeScolaire ===
                                                        '2024-2025'
                                                            ? 'warning'
                                                            : 'light'
                                                    }
                                                    size="sm"
                                                >
                                                    {entry.anneeScolaire}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-brand-600 py-3 text-xs">
                                                {expanded === entry.id
                                                    ? 'Masquer'
                                                    : 'Voir détail'}
                                            </TableCell>
                                        </TableRow>
                                        {expanded === entry.id && (
                                            <TableRow>
                                                <TableCell
                                                    className="bg-gray-50 py-3 dark:bg-gray-800"
                                                    colSpan={6 as any}
                                                >
                                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">
                                                                Valeur avant
                                                            </p>
                                                            <p className="mt-1 rounded-lg border bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                                                                <pre className="font-sans whitespace-pre-wrap">
                                                                    {formatAuditValue(
                                                                        entry.valeurAvant,
                                                                    )}
                                                                </pre>
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center justify-center text-gray-400">
                                                            →
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500">
                                                                Valeur après
                                                            </p>
                                                            <p className="mt-1 rounded-lg border bg-white px-3 py-2 font-medium dark:border-gray-700 dark:bg-gray-900">
                                                                <pre className="font-sans whitespace-pre-wrap">
                                                                    {formatAuditValue(
                                                                        entry.valeurApres,
                                                                    )}
                                                                </pre>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {entry.details && (
                                                        <p className="mt-2 text-xs text-gray-500">
                                                            Détail :{' '}
                                                            {decodeHtmlEntities(
                                                                entry.details,
                                                            )}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        ID : {entry.id} • Auteur
                                                        : {entry.auteurId}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>
                        Page {page} sur {lastPage} · {total} entrée(s)
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setPage((current) => Math.max(1, current - 1))
                            }
                            disabled={page <= 1 || loading}
                            className="rounded border px-2 py-1 disabled:opacity-40 dark:border-gray-700"
                        >
                            Précédent
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setPage((current) =>
                                    Math.min(lastPage, current + 1),
                                )
                            }
                            disabled={page >= lastPage || loading}
                            className="rounded border px-2 py-1 disabled:opacity-40 dark:border-gray-700"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
