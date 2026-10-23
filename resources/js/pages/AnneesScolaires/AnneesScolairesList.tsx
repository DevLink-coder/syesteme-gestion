import { useEffect, useMemo, useState } from 'react';
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
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import { Modal } from '../../components/ui/modal';
import { useToast } from '../../context/ToastContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

interface SchoolYearItem {
    id: number;
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_archived: boolean;
}

function getCsrf() {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export default function AnneesScolairesList() {
    const { showToast } = useToast();
    const [years, setYears] = useState<SchoolYearItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1,
    });
    const [search, setSearch] = useState('');
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<SchoolYearItem | null>(null);
    const [formCode, setFormCode] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formStart, setFormStart] = useState('');
    const [formEnd, setFormEnd] = useState('');
    const [formActive, setFormActive] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [confirmArchive, setConfirmArchive] = useState<SchoolYearItem | null>(
        null,
    );

    const fetchYears = async (nextPage = 1, nextSearch = '') => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(nextPage),
            per_page: '10',
        });
        if (nextSearch.trim()) params.set('search', nextSearch.trim());

        try {
            const res = await fetch(`/web/school-years?${params.toString()}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Impossible de charger les années');
            const data = await res.json();
            setYears(Array.isArray(data.data) ? data.data : []);
            setMeta({
                current_page: data.meta?.current_page ?? 1,
                per_page: data.meta?.per_page ?? 10,
                total: data.meta?.total ?? 0,
                last_page: data.meta?.last_page ?? 1,
            });
        } catch (error) {
            setFormError(
                error instanceof Error ? error.message : 'Erreur de chargement',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchYears(page, search);
    }, [page, search]);

    const openCreate = () => {
        setEditing(null);
        setFormCode('');
        setFormLabel('');
        setFormStart('2027-09-01');
        setFormEnd('2028-06-30');
        setFormActive(false);
        setFormError(null);
        setIsFormOpen(true);
    };

    const openEdit = (year: SchoolYearItem) => {
        setEditing(year);
        setFormCode(year.code);
        setFormLabel(year.label);
        setFormStart(year.start_date);
        setFormEnd(year.end_date);
        setFormActive(year.is_active);
        setFormError(null);
        setIsFormOpen(true);
    };

    const submitYear = async () => {
        const payload = {
            code: formCode.trim(),
            label: formLabel.trim(),
            start_date: formStart,
            end_date: formEnd,
            is_active: formActive,
        };

        try {
            const url = editing
                ? `/web/school-years/${editing.id}`
                : '/web/school-years';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Erreur lors de la sauvegarde');
            }
            setIsFormOpen(false);
            setEditing(null);
            setPage(1);
            if (formActive) {
                showToast(
                    `L'année ${formLabel.trim() || 'sélectionnée'} est maintenant active.`,
                    'success',
                );
            }
            await fetchYears(1, search);
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : 'Erreur lors de la sauvegarde',
            );
        }
    };

    const toggleActive = async (year: SchoolYearItem) => {
        try {
            const res = await fetch(`/web/school-years/${year.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({ is_active: true }),
            });
            if (!res.ok) throw new Error('Activation impossible');
            showToast(
                `L'année scolaire ${year.label} est maintenant active.`,
                'success',
            );
            await fetchYears(1, search);
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : 'Activation impossible',
            );
        }
    };

    const archiveYear = async () => {
        if (!confirmArchive) return;
        try {
            const res = await fetch(`/web/school-years/${confirmArchive.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({ is_archived: true, is_active: false }),
            });
            if (!res.ok) throw new Error('Archivage impossible');
            setConfirmArchive(null);
            await fetchYears(page, search);
        } catch (error) {
            setFormError(
                error instanceof Error ? error.message : 'Archivage impossible',
            );
        }
    };

    const canSearch = useMemo(
        () => search.trim().length >= 2 || search.trim().length === 0,
        [search],
    );

    return (
        <>
            <PageMeta
                title="Années scolaires | Administration"
                description="Gestion des années scolaires"
            />
            <PageBreadcrumb pageTitle="Années scolaires" />
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex justify-end">
                    <AlphabeticalSortControl
                        value={sortDirection}
                        onChange={setSortDirection}
                    />
                </div>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex flex-1 items-center gap-3">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Années scolaires
                        </h3>
                        <div className="w-full max-w-xs">
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher..."
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setPage(1);
                                void fetchYears(1, search);
                            }}
                            disabled={!canSearch}
                        >
                            Rechercher
                        </Button>
                    </div>
                    <Button onClick={openCreate}>Créer une année</Button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-500">Chargement...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                                <TableRow>
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
                                        Statut
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-right font-medium text-gray-500"
                                    >
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {sortAlphabetically(
                                    years,
                                    (year) => year.label,
                                    sortDirection,
                                ).map((year) => (
                                    <TableRow
                                        key={year.id}
                                        className={
                                            year.is_archived ? 'opacity-60' : ''
                                        }
                                    >
                                        <TableCell className="py-3 font-medium text-gray-800 dark:text-white">
                                            {year.label}{' '}
                                            <span className="text-xs text-gray-400">
                                                ({year.code})
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            {year.is_active ? (
                                                <Badge
                                                    color="success"
                                                    size="sm"
                                                >
                                                    Active
                                                </Badge>
                                            ) : year.is_archived ? (
                                                <Badge
                                                    color="warning"
                                                    size="sm"
                                                >
                                                    Archivée
                                                </Badge>
                                            ) : (
                                                <Badge color="light" size="sm">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        openEdit(year)
                                                    }
                                                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700"
                                                >
                                                    Modifier
                                                </button>
                                                {!year.is_active &&
                                                    !year.is_archived && (
                                                        <button
                                                            onClick={() =>
                                                                void toggleActive(
                                                                    year,
                                                                )
                                                            }
                                                            className="bg-brand-50 text-brand-600 hover:bg-brand-100 rounded px-2 py-1 text-xs"
                                                        >
                                                            Activer
                                                        </button>
                                                    )}
                                                {!year.is_archived && (
                                                    <button
                                                        onClick={() =>
                                                            setConfirmArchive(
                                                                year,
                                                            )
                                                        }
                                                        className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-800"
                                                    >
                                                        Archiver
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>Total : {meta.total}</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            Précédent
                        </Button>
                        <span>
                            Page {meta.current_page} / {meta.last_page}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setPage((p) => Math.min(meta.last_page, p + 1))
                            }
                            disabled={page >= meta.last_page}
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                className="max-w-[520px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    {editing ? "Modifier l'année" : 'Créer une année'}
                </h3>
                {formError && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {formError}
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Code *
                        </label>
                        <Input
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            placeholder="2027-2028"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Libellé *
                        </label>
                        <Input
                            value={formLabel}
                            onChange={(e) => setFormLabel(e.target.value)}
                            placeholder="2027-2028"
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Date début *
                            </label>
                            <Input
                                type="date"
                                value={formStart}
                                onChange={(e) => setFormStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Date fin *
                            </label>
                            <Input
                                type="date"
                                value={formEnd}
                                onChange={(e) => setFormEnd(e.target.value)}
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={formActive}
                            onChange={(e) => setFormActive(e.target.checked)}
                        />
                        Année active
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsFormOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={() => void submitYear()}>
                            {editing ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!confirmArchive}
                onClose={() => setConfirmArchive(null)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-2 font-semibold">Archiver l'année ?</h3>
                <p className="mb-4 text-sm text-gray-500">
                    Archiver{' '}
                    <span className="font-medium text-gray-800">
                        {confirmArchive?.label}
                    </span>{' '}
                    ?
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setConfirmArchive(null)}
                    >
                        Annuler
                    </Button>
                    <Button onClick={() => void archiveYear()}>
                        Confirmer
                    </Button>
                </div>
            </Modal>
        </>
    );
}
