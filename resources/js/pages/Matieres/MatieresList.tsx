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
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import { Modal } from '../../components/ui/modal';
import Badge from '../../components/ui/badge/Badge';
import StyledSelect from '../../components/ui/select/StyledSelect';
import { useToast } from '../../context/ToastContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

interface SubjectItem {
    id: number;
    name: string;
    slug?: string;
    description?: string | null;
    coefficient?: number | null;
    deleted_at?: string | null;
    salles?: Array<{
        id: number;
        name: string;
        room_id?: string;
        pivot?: { coefficient?: number | null };
    }>;
}

interface SalleItem {
    id: number;
    name: string;
    room_id?: string;
    school_year_label?: string;
}

function getCsrf() {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export default function MatieresList() {
    const { showToast } = useToast();
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [salles, setSalles] = useState<SalleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const [meta, setMeta] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1,
    });
    const [search, setSearch] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<SubjectItem | null>(null);
    const [editName, setEditName] = useState('');
    const [confirmArchive, setConfirmArchive] = useState<SubjectItem | null>(
        null,
    );

    const fetchSalles = async () => {
        try {
            const res = await fetch('/web/salles', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const data = await res.json();
                setSalles(Array.isArray(data) ? data : []);
            }
        } catch {
            setSalles([]);
        }
    };

    const fetchSubjects = async (
        nextPage = 1,
        nextSearch = '',
        nextRoom = 'all',
        nextShowArchived = showArchived,
    ) => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(nextPage),
            per_page: '10',
        });
        if (nextSearch.trim()) params.set('search', nextSearch.trim());
        if (nextRoom !== 'all') params.set('salle_id', nextRoom);
        if (nextShowArchived) params.set('include_archived', '1');

        try {
            const res = await fetch(`/web/subjects?${params.toString()}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Impossible de charger les matières');
            const data = await res.json();
            const mapped = Array.isArray(data.data)
                ? data.data.map((subject: any) => ({
                      ...subject,
                      coefficient:
                          subject.coefficient ??
                          subject.salles?.[0]?.pivot?.coefficient ??
                          subject.salles?.[0]?.coefficient ??
                          null,
                  }))
                : [];
            setSubjects(mapped);
            setMeta({
                current_page: data.meta?.current_page ?? 1,
                per_page: data.meta?.per_page ?? 10,
                total: data.meta?.total ?? 0,
                last_page: data.meta?.last_page ?? 1,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchSalles();
        void fetchSubjects(page, search, selectedRoom, showArchived);
    }, [page, search, selectedRoom, showArchived]);

    const filteredCount = useMemo(() => subjects.length, [subjects]);
    const sortedSubjects = useMemo(
        () =>
            sortAlphabetically(
                subjects,
                (subject) => subject.name,
                sortDirection,
            ),
        [subjects, sortDirection],
    );

    const toggleRoomSelection = (roomId: number) => {
        setSelectedRoomIds((prev) =>
            prev.includes(roomId)
                ? prev.filter((id) => id !== roomId)
                : [...prev, roomId],
        );
    };

    const handleCreate = async () => {
        if (!newName.trim()) {
            setError('Le nom est obligatoire.');
            return;
        }
        if (selectedRoomIds.length === 0) {
            setError('Sélectionnez au moins une salle concernée.');
            return;
        }

        try {
            const res = await fetch('/web/subjects', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({
                    name: newName.trim(),
                    coefficient: 1,
                    room_ids: selectedRoomIds,
                    is_optional: false,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message = data.message || 'Erreur lors de la création';
                showToast(message, 'error');
                throw new Error(message);
            }
            setIsCreateOpen(false);
            setNewName('');
            setSelectedRoomIds([]);
            setPage(1);
            showToast('Matière créée avec succès', 'success');
            await fetchSubjects(1, search, selectedRoom);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleRename = async () => {
        if (!editing) return;
        if (!editName.trim()) {
            setError('Le nom est obligatoire.');
            return;
        }

        try {
            const res = await fetch(`/web/subjects/${editing.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({
                    name: editName.trim(),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message =
                    data.message || 'Erreur lors de la modification';
                showToast(message, 'error');
                throw new Error(message);
            }
            setEditing(null);
            setEditName('');
            showToast('Matière modifiée avec succès', 'success');
            await fetchSubjects(page, search, selectedRoom);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleArchive = async () => {
        if (!confirmArchive) return;
        try {
            const res = await fetch(`/web/subjects/${confirmArchive.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message = data.message || "Erreur lors de l'archivage";
                showToast(message, 'error');
                throw new Error(message);
            }
            setConfirmArchive(null);
            showToast('Matière archivée', 'success');
            await fetchSubjects(page, search, selectedRoom, showArchived);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleRestore = async (subject: SubjectItem) => {
        try {
            const res = await fetch(`/web/subjects/${subject.id}/restore`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const message =
                    data.message || 'Erreur lors de la restauration';
                showToast(message, 'error');
                throw new Error(message);
            }
            showToast('Matière désarchivée', 'success');
            await fetchSubjects(page, search, selectedRoom, showArchived);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    return (
        <>
            <PageMeta
                title="Matières | Administration"
                description="Gestion des matières"
            />
            <PageBreadcrumb pageTitle="Matières" />
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Matières ({filteredCount})
                        </h3>
                        <p className="text-xs text-gray-500">
                            Référentiel global — réservé aux salles et aux
                            évaluations.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Rechercher une matière"
                        />
                        <StyledSelect
                            value={selectedRoom}
                            onChange={(value) => {
                                setSelectedRoom(value);
                                setPage(1);
                            }}
                            placeholder="Toutes les salles"
                            className="min-w-[220px]"
                            options={[
                                { value: 'all', label: 'Toutes les salles' },
                                ...salles.map((room) => ({
                                    value: String(room.id),
                                    label: room.name,
                                })),
                            ]}
                        />
                        <AlphabeticalSortControl
                            value={sortDirection}
                            onChange={(value) => {
                                setSortDirection(value);
                                setPage(1);
                            }}
                        />
                        <Button
                            variant="outline"
                            onClick={() => {
                                setPage(1);
                                void fetchSubjects(
                                    1,
                                    search,
                                    selectedRoom,
                                    showArchived,
                                );
                            }}
                        >
                            Rechercher
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowArchived((value) => !value);
                                setPage(1);
                            }}
                        >
                            {showArchived
                                ? 'Masquer archivées'
                                : 'Afficher archivées'}
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            Nouvelle matière
                        </Button>
                    </div>
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
                                        Matière
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Salles
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
                                {sortedSubjects.map((subj) => {
                                    const isArchived = !!subj.deleted_at;

                                    return (
                                        <TableRow key={subj.id}>
                                            <TableCell className="py-3 font-medium text-gray-800 dark:text-white">
                                                {subj.name}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-600">
                                                {subj.salles &&
                                                subj.salles.length > 0
                                                    ? subj.salles
                                                          .map(
                                                              (room) =>
                                                                  room.name,
                                                          )
                                                          .join(', ')
                                                    : 'Aucune salle'}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {isArchived ? (
                                                    <Badge
                                                        color="warning"
                                                        size="sm"
                                                    >
                                                        Archivée
                                                    </Badge>
                                                ) : subj.salles &&
                                                  subj.salles.length > 0 ? (
                                                    <Badge
                                                        color="success"
                                                        size="sm"
                                                    >
                                                        Associée
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        color="light"
                                                        size="sm"
                                                    >
                                                        Non liée
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {!isArchived && (
                                                        <button
                                                            onClick={() => {
                                                                setEditing(
                                                                    subj,
                                                                );
                                                                setEditName(
                                                                    subj.name,
                                                                );
                                                                setError(null);
                                                            }}
                                                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700"
                                                        >
                                                            Modifier
                                                        </button>
                                                    )}
                                                    {isArchived ? (
                                                        <button
                                                            onClick={() =>
                                                                void handleRestore(
                                                                    subj,
                                                                )
                                                            }
                                                            className="bg-warning-50 text-warning-600 hover:bg-warning-100 rounded px-2 py-1 text-xs"
                                                        >
                                                            Désarchiver
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                setConfirmArchive(
                                                                    subj,
                                                                )
                                                            }
                                                            className="bg-error-50 text-error-600 hover:bg-error-100 rounded px-2 py-1 text-xs"
                                                        >
                                                            Archiver
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
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
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">Nouvelle matière</h3>
                {error && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {error}
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nom *
                        </label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Philosophie"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salles concernées
                        </label>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded border border-gray-200 p-2">
                            {salles
                                .filter(
                                    (room: any) => room.status !== 'archivée',
                                )
                                .map((room) => (
                                    <label
                                        key={room.id}
                                        className="flex items-center gap-2 text-sm text-gray-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedRoomIds.includes(
                                                room.id,
                                            )}
                                            onChange={() =>
                                                toggleRoomSelection(room.id)
                                            }
                                        />
                                        {room.name}
                                    </label>
                                ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedRoomIds(
                                        salles
                                            .filter(
                                                (room: any) =>
                                                    room.status !== 'archivée',
                                            )
                                            .map((room) => room.id),
                                    )
                                }
                                className="text-primary-600 hover:underline"
                            >
                                Cocher toutes
                            </button>
                            <span>
                                {selectedRoomIds.length} salle(s)
                                sélectionnée(s)
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={() => void handleCreate()}>
                            Créer
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!editing}
                onClose={() => setEditing(null)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    Modifier — {editing?.name}
                </h3>
                {error && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {error}
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nouveau nom *
                        </label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditing(null)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={() => void handleRename()}>
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!confirmArchive}
                onClose={() => setConfirmArchive(null)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-2 font-semibold">Archiver la matière ?</h3>
                <p className="mb-4 text-sm text-gray-500">
                    L’archivage de{' '}
                    <span className="font-medium text-gray-800">
                        {confirmArchive?.name}
                    </span>{' '}
                    la rend indisponible dans les salles jusqu’à sa
                    restauration.
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setConfirmArchive(null)}
                    >
                        Annuler
                    </Button>
                    <Button onClick={() => void handleArchive()}>
                        Confirmer
                    </Button>
                </div>
            </Modal>
        </>
    );
}
