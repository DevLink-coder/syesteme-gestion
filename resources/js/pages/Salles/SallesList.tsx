import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
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
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import StyledSelect from '../../components/ui/select/StyledSelect';
import { useToast } from '../../context/ToastContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

function getCsrf() {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export default function SallesList() {
    const { schoolYears } = useSchoolStructure();
    const { showToast } = useToast();
    const [salles, setSalles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSalles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/web/salles', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(
                    data?.message ||
                        `Impossible de charger les salles (${res.status}).`,
                );
            }
            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                  ? data.data
                  : null;
            if (!list)
                throw new Error(
                    'La réponse du serveur pour les salles est invalide.',
                );
            setSalles(list);
            return list;
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Erreur lors du chargement des salles.';
            showToast(message, 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        void fetchSalles();
    }, []);

    const [liveSchoolYears, setLiveSchoolYears] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'students' | 'created'>(
        'name',
    );
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<any>(null);
    const [formName, setFormName] = useState('');
    const [formSerie, setFormSerie] = useState('');
    const normalizedSchoolYears = useMemo(() => {
        const items = [...(liveSchoolYears || []), ...(schoolYears || [])];
        const map = new Map<string, any>();
        for (const item of items) {
            const normalizedId = item?.id ?? item?.school_year_id;
            if (
                normalizedId === undefined ||
                normalizedId === null ||
                normalizedId === ''
            ) {
                continue;
            }
            const key = String(normalizedId);
            const current = map.get(key);
            map.set(key, {
                ...current,
                ...item,
                id: Number.isFinite(Number(normalizedId))
                    ? Number(normalizedId)
                    : key,
                label: item?.label ?? item?.name ?? `Année ${key}`,
                code: item?.code ?? String(normalizedId),
                isActive:
                    Boolean(item?.is_active ?? item?.isActive ?? false) ||
                    item?.label === 'Année active',
            });
        }
        return [...map.values()].sort((a, b) =>
            String(b.label).localeCompare(String(a.label)),
        );
    }, [liveSchoolYears, schoolYears]);

    const getActiveYearValue = () => {
        const active = normalizedSchoolYears.find((y) => y.isActive);
        if (active) return String(active.id);
        const fallback = normalizedSchoolYears[0];
        return fallback ? String(fallback.id) : '';
    };
    const getActiveYearLabel = () => {
        const active = normalizedSchoolYears.find((y) => y.isActive);
        if (active) return active.label;
        const fallback = normalizedSchoolYears[0];
        return fallback ? fallback.label : 'Année active';
    };
    const [formYear, setFormYear] = useState<string>(() =>
        getActiveYearValue(),
    );
    const [formStatus, setFormStatus] = useState<'active' | 'archivée'>(
        'active',
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadYears = async () => {
            try {
                const res = await fetch('/web/school-years?per_page=100', {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data?.data) ? data.data : [];
                setLiveSchoolYears(list);
            } catch {
                setLiveSchoolYears([]);
            }
        };

        void loadYears();
    }, []);

    useEffect(() => {
        if (!editing) {
            setFormYear(getActiveYearValue());
        }
    }, [normalizedSchoolYears, editing]);

    useEffect(() => {
        setFilterYear(getActiveYearValue());
    }, [normalizedSchoolYears]);

    const openCreate = () => {
        setEditing(null);
        setFormName('');
        setFormSerie('');
        setFormYear(getActiveYearValue());
        setFormStatus('active');
        setFormError(null);
        setIsFormOpen(true);
    };
    const openEdit = (salle: any) => {
        setEditing(salle);
        const parts = String(salle.name).trim().split(/\s+/);
        const seriePart = parts.length > 1 ? parts[parts.length - 1] : '';
        const baseName =
            parts.length > 1 ? parts.slice(0, -1).join(' ') : salle.name;
        const isSerie = seriePart.length <= 3 && /^[A-Za-z]+$/.test(seriePart);
        setFormName(isSerie ? baseName : salle.name);
        setFormSerie(isSerie ? seriePart : '');
        const selectedYear = normalizedSchoolYears.find(
            (y) =>
                String(y.id) === String(salle.school_year_id) ||
                y.label === salle.school_year_label,
        );
        setFormYear(
            selectedYear
                ? String(selectedYear.id)
                : String(salle.school_year_id || ''),
        );
        setFormStatus(salle.status);
        setFormError(null);
        setIsFormOpen(true);
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        if (!formName.trim()) {
            setFormError('Le nom est obligatoire.');
            return;
        }
        setIsSubmitting(true);
        const yearId = Number(formYear);
        if (!Number.isFinite(yearId) || yearId <= 0) {
            setFormError('Aucune année scolaire active disponible.');
            setIsSubmitting(false);
            return;
        }

        const payload: any = {
            name: formName.trim(),
            serie: formSerie.trim(),
            school_year_id: yearId,
            status: formStatus,
        };
        try {
            const url = editing
                ? `/web/salles/${editing.code || editing.id}`
                : '/web/salles';
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
                setFormError(data.message || 'Erreur');
                showToast(data.message || 'Erreur', 'error');
                return;
            }
            const savedSalle = data?.salle ?? data;
            setIsFormOpen(false);
            setEditing(null);
            const refreshedSalles = await fetchSalles();
            if (!refreshedSalles) {
                throw new Error(
                    'La salle est enregistrée, mais le rechargement de la liste a échoué.',
                );
            }
            const savedId = String(savedSalle?.id ?? '');
            const savedCode = String(savedSalle?.code ?? '');
            const isVisible = refreshedSalles.some(
                (salle: any) =>
                    (savedId && String(salle.id) === savedId) ||
                    (savedCode && String(salle.code) === savedCode),
            );
            if (!isVisible) {
                throw new Error(
                    'La salle a été enregistrée, mais elle est absente de la liste rechargée. Vérifiez le centre et l’année scolaire sélectionnés.',
                );
            }
            setSearch('');
            setFilterYear(String(savedSalle.school_year_id ?? yearId));
            setFilterStatus('all');
            showToast(
                editing
                    ? 'Salle modifiée avec succès'
                    : 'Salle créée avec succès',
                'success',
            );
        } catch (e: any) {
            setFormError(e.message);
            showToast(e.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleArchive = async (salle: any) => {
        try {
            const res = await fetch(`/web/salles/${salle.id}/archive`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-XSRF-TOKEN': getCsrf(),
                    Accept: 'application/json',
                },
            });
            if (!res.ok) throw new Error('Archivage échoué');
            showToast('Salle archivée', 'success');
            void fetchSalles();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };
    const handleUnarchive = async (id: any) => {
        try {
            const res = await fetch(`/web/salles/${id}/unarchive`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-XSRF-TOKEN': getCsrf(),
                    Accept: 'application/json',
                },
            });
            if (!res.ok) throw new Error('Restauration échouée');
            showToast('Salle restaurée', 'success');
            void fetchSalles();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const filtered = useMemo(() => {
        let list = [...salles];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((s) => s.name.toLowerCase().includes(q));
        }
        if (filterYear !== 'all') {
            const yid = Number(filterYear);
            if (Number.isFinite(yid) && yid > 0) {
                list = list.filter((s) => Number(s.school_year_id) === yid);
            }
        }
        if (filterStatus !== 'all')
            list = list.filter((s) => s.status === filterStatus);
        if (sortBy === 'name')
            list = sortAlphabetically(
                list,
                (salle) => salle.name,
                sortDirection,
            );
        else if (sortBy === 'created')
            list.sort((a, b) =>
                String(b.created_at).localeCompare(String(a.created_at)),
            );
        return list;
    }, [salles, search, filterYear, filterStatus, sortBy, sortDirection]);

    return (
        <>
            <PageMeta
                title="Salles de classe | Structure pédagogique"
                description="Liste des salles de classe"
            />
            <PageBreadcrumb pageTitle="Salles de classe" />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="w-full min-w-0 flex-shrink lg:max-w-[220px] xl:max-w-xs">
                            <Input
                                placeholder="Rechercher une salle..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <StyledSelect
                            value={filterYear}
                            onChange={setFilterYear}
                            placeholder="Toutes les années"
                            options={[
                                { value: 'all', label: 'Toutes les années' },
                                ...normalizedSchoolYears.map((y) => ({
                                    value: String(y.id),
                                    label: y.label,
                                })),
                            ]}
                            className="min-w-0 flex-1 lg:min-w-[140px] lg:flex-none"
                        />
                        <StyledSelect
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Tous les statuts"
                            options={[
                                { value: 'all', label: 'Tous les statuts' },
                                { value: 'active', label: 'Active' },
                                { value: 'archivée', label: 'Archivée' },
                            ]}
                            className="min-w-0 flex-1 lg:min-w-[140px] lg:flex-none"
                        />
                        <StyledSelect
                            value={sortBy}
                            onChange={(v) => setSortBy(v as any)}
                            placeholder="Trier"
                            options={[
                                { value: 'name', label: 'Trier par nom' },
                                {
                                    value: 'students',
                                    label: 'Trier par effectif',
                                },
                                {
                                    value: 'created',
                                    label: 'Trier par création',
                                },
                            ]}
                            className="min-w-0 flex-1 lg:min-w-[150px] lg:flex-none"
                        />
                        <AlphabeticalSortControl
                            value={sortDirection}
                            onChange={setSortDirection}
                        />
                    </div>
                    <Button
                        onClick={openCreate}
                        className="w-full shrink-0 whitespace-nowrap xl:w-auto"
                    >
                        Créer une salle
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                                >
                                    Salle
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                                >
                                    Année scolaire
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                                >
                                    Élèves
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                                >
                                    Matières
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                                >
                                    Statut
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-right font-medium text-gray-500 dark:text-gray-400"
                                >
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        className="py-8 text-center text-sm text-gray-500"
                                        isHeader={false}
                                    >
                                        <span>Chargement...</span>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="py-8 text-center text-sm text-gray-500"
                                        isHeader={false}
                                    >
                                        <span>Aucune salle trouvée.</span>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((salle) => {
                                    const isArchived =
                                        salle.status === 'archivée';
                                    return (
                                        <TableRow
                                            key={salle.id}
                                            className={
                                                isArchived
                                                    ? 'bg-gray-50/50 opacity-80 dark:bg-gray-800'
                                                    : ''
                                            }
                                        >
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-800 dark:text-white">
                                                        {salle.name}
                                                    </span>
                                                    {isArchived && (
                                                        <Badge
                                                            color="light"
                                                            size="sm"
                                                        >
                                                            Archivée
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {salle.code || salle.id}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {salle.school_year_label ||
                                                    salle.school_year_id}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white">
                                                {salle.students_count ?? 0}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {salle.subjects?.length ?? 0}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge
                                                    color={
                                                        isArchived
                                                            ? 'warning'
                                                            : 'success'
                                                    }
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    {salle.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        to={`/salles/${salle.code || salle.id}`}
                                                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                                                    >
                                                        Voir
                                                    </Link>
                                                    <button
                                                        onClick={() =>
                                                            openEdit(salle)
                                                        }
                                                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                                                    >
                                                        Modifier
                                                    </button>
                                                    {isArchived ? (
                                                        <button
                                                            onClick={() =>
                                                                handleUnarchive(
                                                                    salle.id,
                                                                )
                                                            }
                                                            className="bg-warning-50 text-warning-700 hover:bg-warning-100 dark:bg-warning-500/10 rounded-lg px-3 py-1.5 text-xs font-medium"
                                                        >
                                                            Restaurer
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                setArchiveTarget(
                                                                    salle,
                                                                )
                                                            }
                                                            className="bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 rounded-lg px-3 py-1.5 text-xs font-medium"
                                                        >
                                                            Archiver
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    {filtered.length} salle(s) affichée(s) sur {salles.length}.
                </p>
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                className="max-w-[560px] p-6"
            >
                <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
                    {editing ? 'Modifier la salle' : 'Créer une salle'}
                </h3>
                {formError && (
                    <div className="bg-error-50 text-error-600 dark:bg-error-500/10 mb-3 rounded-lg px-3 py-2 text-sm">
                        {formError}
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nom *
                        </label>
                        <Input
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Ex: Troisième, Première, Terminale"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Série{' '}
                            <span className="font-normal text-gray-400">
                                (facultatif)
                            </span>
                        </label>
                        <Input
                            value={formSerie}
                            onChange={(e) => setFormSerie(e.target.value)}
                            placeholder="Ex: C, D, A (laisser vide si pas de série)"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Sera affichée en majuscule. Ex: "C" → "Première C" →
                            code salle-premiereC-2026
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Année scolaire *
                        </label>
                        <Input
                            value={
                                normalizedSchoolYears.find(
                                    (y) => String(y.id) === String(formYear),
                                )?.label ||
                                normalizedSchoolYears.find((y) => y.isActive)
                                    ?.label ||
                                getActiveYearLabel() ||
                                formYear
                            }
                            disabled
                            className="cursor-not-allowed bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Année scolaire non modifiable — seule l'année active
                            est utilisée.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Statut
                        </label>
                        <StyledSelect
                            value={formStatus}
                            onChange={(v) => setFormStatus(v as any)}
                            placeholder="Statut"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'archivée', label: 'Archivée' },
                            ]}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsFormOpen(false)}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting
                                ? '...'
                                : editing
                                  ? 'Enregistrer'
                                  : 'Créer'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!archiveTarget}
                onClose={() => setArchiveTarget(null)}
                className="max-w-[460px] p-6"
            >
                <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
                    Archiver la salle ?
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                    La salle{' '}
                    <span className="font-medium text-gray-800 dark:text-white">
                        {archiveTarget?.name}
                    </span>{' '}
                    sera marquée comme archivée. Ses élèves, matières et emploi
                    du temps seront conservés.
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setArchiveTarget(null)}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={async () => {
                            if (archiveTarget)
                                await handleArchive(archiveTarget);
                            setArchiveTarget(null);
                        }}
                    >
                        Confirmer l'archivage
                    </Button>
                </div>
            </Modal>
        </>
    );
}
