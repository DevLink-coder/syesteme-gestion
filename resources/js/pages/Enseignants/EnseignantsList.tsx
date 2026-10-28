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
import StyledSelect from '../../components/ui/select/StyledSelect';
import { useToast } from '../../context/ToastContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

const statusLabel: Record<string, string> = {
    active: 'Actif',
    suspended: 'Suspendu',
    expelled: 'Renvoyé',
};
const statusColor: Record<string, 'success' | 'warning' | 'error'> = {
    active: 'success',
    suspended: 'warning',
    expelled: 'error',
};

function getCsrf() {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export default function EnseignantsList() {
    const { showToast } = useToast();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [salles, setSalles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTeachers = async () => {
        try {
            const res = await fetch('/web/teachers', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (res.ok) setTeachers(await res.json());
        } catch {}
    };
    const fetchSalles = async () => {
        try {
            const res = await fetch('/web/salles', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (res.ok) setSalles(await res.json());
        } catch {}
    };
    useEffect(() => {
        void (async () => {
            setLoading(true);
            await Promise.all([fetchTeachers(), fetchSalles()]);
            setLoading(false);
        })();
    }, []);

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterMatiere, setFilterMatiere] = useState<string>('all');
    const [filterSalle, setFilterSalle] = useState<string>('all');
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newTelephone, setNewTelephone] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<{
        id: string | number;
        telephone?: string;
    } | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editTelephone, setEditTelephone] = useState('');
    const [editSalle, setEditSalle] = useState('');
    const [editMatiere, setEditMatiere] = useState('');
    const [editTeaches, setEditTeaches] = useState<any[]>([]);
    const [editMatieresForSalle, setEditMatieresForSalle] = useState<any[]>([]);
    const [editError, setEditError] = useState<string | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [pendingSalle, setPendingSalle] = useState<string>('');
    const [pendingMatiere, setPendingMatiere] = useState<string>('');
    const [pendingTeaches, setPendingTeaches] = useState<any[]>([]);
    const [pendingAction, setPendingAction] = useState<{
        teacher: any;
        action: 'suspend' | 'expel';
    } | null>(null);
    const [reason, setReason] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [matieresForSalle, setMatieresForSalle] = useState<any[]>([]);
    useEffect(() => {
        if (!pendingSalle) {
            setMatieresForSalle([]);
            return;
        }
        const salle = salles.find((s: any) => s.room_id === pendingSalle);
        if (!salle) {
            setMatieresForSalle([]);
            return;
        }
        fetch(`/web/salles/${salle.code || salle.id}/matieres`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any[]) => setMatieresForSalle(data || []))
            .catch(() => setMatieresForSalle([]));
    }, [pendingSalle, salles]);
    useEffect(() => {
        if (!editSalle) {
            setEditMatieresForSalle([]);
            return;
        }
        const salle = salles.find((item: any) => item.room_id === editSalle);
        if (!salle) {
            setEditMatieresForSalle([]);
            return;
        }
        fetch(`/web/salles/${salle.code || salle.id}/matieres`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Impossible de charger les matières de la salle.');
                }
                return response.json();
            })
            .then((data: any[]) => setEditMatieresForSalle(data || []))
            .catch((error: Error) => setEditError(error.message));
    }, [editSalle, salles]);

    const allMatieres = useMemo(() => {
        const set = new Set<string>();
        teachers.forEach((t) =>
            (t.teaches || []).forEach((m: any) => set.add(m.subject)),
        );
        return Array.from(set).sort();
    }, [teachers]);
    const allSalles = useMemo(() => {
        const set = new Set<string>();
        teachers.forEach((t) =>
            (t.teaches || []).forEach((m: any) => set.add(m.roomId)),
        );
        return Array.from(set) as string[];
    }, [teachers]);

    const filtered = useMemo(() => {
        let list = [...teachers];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    String(t.code || t.id)
                        .toLowerCase()
                        .includes(q),
            );
        }
        if (filterStatus !== 'all')
            list = list.filter((t) => t.status === filterStatus);
        if (filterMatiere !== 'all')
            list = list.filter((t) =>
                (t.teaches || []).some((m: any) => m.subject === filterMatiere),
            );
        if (filterSalle !== 'all')
            list = list.filter((t) =>
                (t.teaches || []).some((m: any) => m.roomId === filterSalle),
            );
        return sortAlphabetically(
            list,
            (teacher) => teacher.name,
            sortDirection,
        );
    }, [
        teachers,
        search,
        filterStatus,
        filterMatiere,
        filterSalle,
        sortDirection,
    ]);

    const handleAddTeach = async () => {
        if (isAdding) return;
        setIsAdding(true);
        if (!pendingSalle || !pendingMatiere) {
            setCreateError("Choisissez d'abord une salle et une matière.");
            setIsAdding(false);
            return;
        }
        const salle = salles.find((s: any) => s.room_id === pendingSalle);
        if (!salle) {
            setCreateError('Salle introuvable.');
            setIsAdding(false);
            return;
        }
        if (
            pendingTeaches.some(
                (t) =>
                    t.room_id === pendingSalle && t.subject === pendingMatiere,
            )
        ) {
            setCreateError('Cette matière est déjà ajoutée pour cette salle.');
            setIsAdding(false);
            return;
        }
        let coef = 2;
        try {
            const r = await fetch(
                `/web/salles/${salle.code || salle.id}/matieres`,
                {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                },
            );
            if (r.ok) {
                const mats: any[] = await r.json();
                const found = mats.find((m: any) => m.name === pendingMatiere);
                if (found) coef = Number(found.coefficient) || 2;
                else {
                    setCreateError('Matière non disponible pour cette salle.');
                    setIsAdding(false);
                    return;
                }
            }
        } catch {}
        setPendingTeaches((prev) => [
            ...prev,
            {
                subject: pendingMatiere,
                room_id: pendingSalle,
                coefficient: coef,
            },
        ]);
        setPendingMatiere('');
        setCreateError(null);
        setIsAdding(false);
    };

    const handleCreate = async () => {
        if (isCreating) return;
        if (!newName.trim()) {
            setCreateError('Le nom est obligatoire.');
            return;
        }
        if (!newEmail.trim()) {
            setCreateError("L'email est obligatoire.");
            return;
        }
        if (!newTelephone.trim()) {
            setCreateError('Le numéro de téléphone est obligatoire.');
            return;
        }
        if (
            !/^6\d{8}$/.test(
                newTelephone.replace(/\D/g, '').replace(/^237/, ''),
            )
        ) {
            setCreateError(
                'Saisissez un numéro camerounais de 9 chiffres commençant par 6.',
            );
            return;
        }
        if (pendingTeaches.length === 0) {
            setCreateError('Ajoutez au moins une matière/salle.');
            return;
        }
        setIsCreating(true);
        try {
            const res = await fetch('/web/teachers', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({
                    name: newName.trim(),
                    email: newEmail.trim(),
                    telephone: newTelephone.trim(),
                    teaches: pendingTeaches.map((t) => ({
                        room_id: t.room_id,
                        subject: t.subject,
                    })),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const validationDetails = data.errors
                    ? Object.values(data.errors).flat().join(' ')
                    : '';
                const message =
                    [data.message, validationDetails]
                        .filter(Boolean)
                        .join(' — ') ||
                    'Erreur lors de la création de l’enseignant.';
                setCreateError(message);
                showToast(message, 'error');
                return;
            }
            if (data.mail_queued === true) {
                showToast(
                    `Enseignant créé — mail à ${newEmail.trim()} en cours d’envoi`,
                    'success',
                );
            } else if (data.mail_sent === true) {
                showToast(
                    `Enseignant créé — mail envoyé à ${newEmail.trim()}`,
                    'success',
                );
            } else if (data.mail_sent === false) {
                showToast(
                    `Enseignant créé mais mail échoué: ${data.mail_error || 'voir laravel.log'}`,
                    'error',
                );
            } else {
                showToast('Enseignant créé avec succès', 'success');
            }
            setIsCreateOpen(false);
            setNewName('');
            setNewEmail('');
            setNewTelephone('');
            setPendingSalle('');
            setPendingMatiere('');
            setPendingTeaches([]);
            setCreateError(null);
            void fetchTeachers();
        } catch (e: any) {
            setCreateError(e.message);
            showToast(e.message, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleConfirmAction = async () => {
        if (!pendingAction || isActionLoading) return;
        setIsActionLoading(true);
        const { teacher, action } = pendingAction;
        try {
            const url =
                action === 'suspend'
                    ? `/web/teachers/${teacher.id}/suspend`
                    : `/web/teachers/${teacher.id}/expel`;
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({ reason }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(data.message || 'Erreur', 'error');
                return;
            }
            showToast(
                data.message ||
                    (action === 'suspend'
                        ? 'Enseignant suspendu'
                        : 'Enseignant renvoyé'),
                'success',
            );
            setPendingAction(null);
            setReason('');
            void fetchTeachers();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReactivate = async (id: any) => {
        try {
            const res = await fetch(`/web/teachers/${id}/reactivate`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-XSRF-TOKEN': getCsrf(),
                    Accept: 'application/json',
                },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(data.message || 'Erreur', 'error');
                return;
            }
            showToast('Enseignant réactivé', 'success');
            void fetchTeachers();
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const openTeacherEdit = (teacher: any) => {
        setEditingTeacher(teacher);
        setEditName(teacher.name || '');
        setEditEmail(teacher.email || '');
        setEditTelephone(
            String(teacher.telephone || '')
                .replace(/\D/g, '')
                .replace(/^237/, ''),
        );
        setEditTeaches(
            (teacher.teaches || []).map((teaching: any) => ({
                subject: teaching.subject,
                room_id: teaching.roomId,
                coefficient: teaching.coefficient,
            })),
        );
        setEditSalle('');
        setEditMatiere('');
        setEditError(null);
    };

    const handleAddEditTeach = () => {
        if (!editSalle || !editMatiere) {
            setEditError('Choisissez une salle et une matière.');
            return;
        }
        if (
            editTeaches.some(
                (teaching) =>
                    teaching.room_id === editSalle &&
                    teaching.subject === editMatiere,
            )
        ) {
            setEditError('Cette matière est déjà ajoutée pour cette salle.');
            return;
        }
        const selectedSubject = editMatieresForSalle.find(
            (subject: any) => subject.name === editMatiere,
        );
        setEditTeaches((previous) => [
            ...previous,
            {
                subject: editMatiere,
                room_id: editSalle,
                coefficient: Number(selectedSubject?.coefficient) || 2,
            },
        ]);
        setEditMatiere('');
        setEditError(null);
    };

    const handleSaveTeacher = async () => {
        if (!editingTeacher || isSavingEdit) return;
        if (!editName.trim() || !editEmail.trim()) {
            setEditError('Le nom et l’email sont obligatoires.');
            return;
        }
        if (editTeaches.length === 0) {
            setEditError('Ajoutez au moins une matière et une salle.');
            return;
        }

        setIsSavingEdit(true);
        try {
            const res = await fetch(`/web/teachers/${editingTeacher.id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({
                    name: editName.trim(),
                    email: editEmail.trim(),
                    teaches: editTeaches.map((teaching) => ({
                        room_id: teaching.room_id,
                        subject: teaching.subject,
                    })),
                    ...(editTelephone.trim() &&
                    editTelephone.trim() !==
                        String(editingTeacher.telephone || '')
                        ? { telephone: editTelephone.trim() }
                        : {}),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setEditError(
                    data.message || 'Impossible de modifier cet enseignant.',
                );
                return;
            }
            showToast('Enseignant modifié', 'success');
            setEditingTeacher(null);
            void fetchTeachers();
        } catch (error: any) {
            setEditError(error.message || 'Erreur lors de la modification.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleAdminRoleChange = async (teacher: any) => {
        const promote = !teacher.is_admin;
        const action = promote ? 'promote-admin' : 'demote-admin';
        const confirmation = promote
            ? `Promouvoir ${teacher.name} au rôle administrateur ?`
            : `Rétrograder ${teacher.name} au rôle enseignant ?`;
        if (!window.confirm(confirmation)) return;

        try {
            const res = await fetch(`/web/teachers/${teacher.id}/${action}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-XSRF-TOKEN': getCsrf(),
                    Accept: 'application/json',
                },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(data.message || 'Action refusée.', 'error');
                return;
            }
            showToast(data.message || 'Rôle mis à jour.', 'success');
            void fetchTeachers();
        } catch (error: any) {
            showToast(
                error.message || 'Erreur lors du changement de rôle.',
                'error',
            );
        }
    };

    return (
        <>
            <PageMeta
                title="Enseignants | Administration"
                description="Liste des enseignants"
            />
            <PageBreadcrumb pageTitle="Enseignants" />

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between min-[1024px]:gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center min-[1024px]:gap-2">
                        <div className="w-full min-w-0 flex-shrink lg:max-w-[220px] xl:max-w-xs">
                            <Input
                                placeholder="Rechercher par nom..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="min-[1024px]:!h-8 min-[1024px]:!px-3 min-[1024px]:!py-1 min-[1024px]:!text-xs"
                            />
                        </div>
                        <StyledSelect
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="Tous les statuts"
                            options={[
                                { value: 'all', label: 'Tous les statuts' },
                                { value: 'active', label: 'Actif' },
                                { value: 'suspended', label: 'Suspendu' },
                                { value: 'expelled', label: 'Renvoyé' },
                            ]}
                            className="min-w-0 flex-1 lg:min-w-[140px] lg:flex-none"
                            controlClassName="min-[1024px]:!h-8 min-[1024px]:!px-3 min-[1024px]:!py-1 min-[1024px]:!pr-8 min-[1024px]:!text-xs"
                        />
                        <StyledSelect
                            value={filterMatiere}
                            onChange={setFilterMatiere}
                            placeholder="Toutes les matières"
                            options={[
                                { value: 'all', label: 'Toutes les matières' },
                                ...allMatieres.map((m) => ({
                                    value: m,
                                    label: m,
                                })),
                            ]}
                            className="min-w-0 flex-1 lg:min-w-[150px] lg:flex-none"
                            controlClassName="min-[1024px]:!h-8 min-[1024px]:!px-3 min-[1024px]:!py-1 min-[1024px]:!pr-8 min-[1024px]:!text-xs"
                        />
                        <StyledSelect
                            value={filterSalle}
                            onChange={setFilterSalle}
                            placeholder="Toutes les salles"
                            options={[
                                { value: 'all', label: 'Toutes les salles' },
                                ...allSalles.map((r) => ({
                                    value: r,
                                    label: r,
                                })),
                            ]}
                            className="min-w-0 flex-1 lg:min-w-[150px] lg:flex-none"
                            controlClassName="min-[1024px]:!h-8 min-[1024px]:!px-3 min-[1024px]:!py-1 min-[1024px]:!pr-8 min-[1024px]:!text-xs"
                        />
                        <AlphabeticalSortControl
                            value={sortDirection}
                            onChange={setSortDirection}
                            className="min-[1024px]:!min-w-[110px] min-[1024px]:!px-2 min-[1024px]:!py-1 min-[1024px]:!text-xs"
                        />
                    </div>
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="w-full shrink-0 whitespace-nowrap xl:w-auto min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs"
                    >
                        Ajouter un enseignant
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Enseignant
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Matières
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Créneaux
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
                            {loading ? (
                                <TableRow>
                                    <TableCell className="py-8 text-center text-sm text-gray-500">
                                        Chargement...
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell className="py-8 text-center text-sm text-gray-500">
                                        Aucun enseignant trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((t) => {
                                    const matieres =
                                        Array.from(
                                            new Set(
                                                (t.teaches || []).map(
                                                    (m: any) => m.subject,
                                                ),
                                            ),
                                        ).join(', ') || '—';
                                    const sallesStr =
                                        Array.from(
                                            new Set(
                                                (t.teaches || []).map(
                                                    (m: any) => m.roomId,
                                                ),
                                            ),
                                        ).join(', ') || '—';
                                    const nbCreneaux = t.slotsCount ?? 0;
                                    return (
                                        <TableRow
                                            key={t.id}
                                            className={
                                                t.status !== 'active'
                                                    ? 'bg-gray-50/50 dark:bg-gray-800'
                                                    : ''
                                            }
                                        >
                                            <TableCell className="py-3">
                                                <div className="font-medium text-gray-800 dark:text-white">
                                                    {t.name}
                                                    {t.is_admin && (
                                                        <Badge
                                                            color="info"
                                                            size="sm"
                                                        >
                                                            Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t.code || t.id} • {t.email}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] truncate py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {matieres}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm font-medium text-gray-800 dark:text-white">
                                                {nbCreneaux}
                                            </TableCell>
                                            <TableCell className="max-w-[160px] truncate py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {sallesStr}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge
                                                    color={
                                                        statusColor[t.status] ||
                                                        'light'
                                                    }
                                                    size="sm"
                                                >
                                                    {statusLabel[t.status] ||
                                                        t.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <div className="flex justify-end gap-0.5 min-[1024px]:gap-2">
                                                    <button
                                                        onClick={() =>
                                                            openTeacherEdit(t)
                                                        }
                                                        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-700 transition-colors hover:bg-gray-50 min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs min-[1024px]:!font-medium max-[803px]:inline-flex max-[803px]:items-center max-[803px]:justify-center max-[803px]:py-px max-[803px]:whitespace-nowrap dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleAdminRoleChange(
                                                                t,
                                                            )
                                                        }
                                                        disabled={Boolean(
                                                            t.cannotDemote,
                                                        )}
                                                        title={
                                                            t.cannotDemote
                                                                ? 'Vous ne pouvez pas destituer l’admin qui vous a promu.'
                                                                : undefined
                                                        }
                                                        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-700 transition-colors hover:bg-gray-50 min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs min-[1024px]:!font-medium disabled:cursor-not-allowed disabled:opacity-50 max-[803px]:items-center max-[803px]:justify-center max-[803px]:py-px max-[803px]:whitespace-nowrap max-[802px]:inline-flex dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white disabled:dark:hover:bg-gray-800"
                                                    >
                                                        {t.is_admin
                                                            ? 'Destituer'
                                                            : 'Promouvoir admin'}
                                                    </button>
                                                    <Link
                                                        to={`/enseignants/${t.id}`}
                                                        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px] text-gray-700 transition-colors hover:bg-gray-50 min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs min-[1024px]:!font-medium max-[803px]:inline-flex max-[803px]:items-center max-[803px]:justify-center max-[803px]:py-px max-[803px]:whitespace-nowrap dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                                                    >
                                                        Voir
                                                    </Link>
                                                    {t.status === 'active' &&
                                                        !t.is_admin && (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        setPendingAction(
                                                                            {
                                                                                teacher:
                                                                                    t,
                                                                                action: 'suspend',
                                                                            },
                                                                        )
                                                                    }
                                                                    className="bg-warning-50 text-warning-700 hover:bg-warning-100 dark:bg-warning-500/10 dark:text-warning-400 dark:hover:bg-warning-500/20 dark:hover:text-warning-300 rounded px-1 py-0.5 text-[10px] transition-colors min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs min-[1024px]:!font-medium max-[803px]:inline-flex max-[803px]:items-center max-[803px]:justify-center max-[803px]:py-px max-[803px]:whitespace-nowrap"
                                                                >
                                                                    Suspendre
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        setPendingAction(
                                                                            {
                                                                                teacher:
                                                                                    t,
                                                                                action: 'expel',
                                                                            },
                                                                        )
                                                                    }
                                                                    className="bg-error-50 text-error-700 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20 dark:hover:text-error-300 rounded px-1 py-0.5 text-[10px] transition-colors min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs min-[1024px]:!font-medium max-[803px]:inline-flex max-[803px]:items-center max-[803px]:justify-center max-[803px]:py-px max-[803px]:whitespace-nowrap"
                                                                >
                                                                    Renvoyer
                                                                </button>
                                                            </>
                                                        )}
                                                    {t.status ===
                                                        'suspended' && (
                                                        <button
                                                            onClick={() =>
                                                                handleReactivate(
                                                                    t.id,
                                                                )
                                                            }
                                                            className="bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-500/10 dark:text-success-400 dark:hover:bg-success-500/20 dark:hover:text-success-300 rounded px-1 py-0.5 text-[10px] transition-colors min-[1024px]:!px-3 min-[1024px]:!py-1.5 min-[1024px]:!text-xs min-[1024px]:!font-medium"
                                                        >
                                                            Réactiver
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
                    {filtered.length} enseignant(s) affiché(s) sur{' '}
                    {teachers.length}.
                </p>
            </div>

            <Modal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setPendingSalle('');
                    setPendingMatiere('');
                    setPendingTeaches([]);
                }}
                className="max-h-[85vh] max-w-[520px] overflow-x-visible overflow-y-auto p-4 sm:max-w-[560px] sm:p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    Ajouter un enseignant
                </h3>
                {createError && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {createError}
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nom complet *
                        </label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Mme Dupont"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Email *
                        </label>
                        <Input
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="exemple@college-liberte.cm"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Numéro de téléphone *
                        </label>
                        <Input
                            type="tel"
                            value={newTelephone}
                            onChange={(e) => setNewTelephone(e.target.value)}
                            placeholder="6XX XXX XXX"
                            hint="9 chiffres locaux; +237 sera ajouté automatiquement."
                        />
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Matières et salles (contrainte : salle + matière
                            doivent exister)
                        </p>
                        <p className="mb-3 text-xs text-gray-500">
                            Un enseignant ne peut enseigner que dans une salle
                            où il a été assigné et uniquement les matières de
                            cette salle.
                        </p>
                        <div className="flex flex-col gap-3 overflow-visible sm:flex-row sm:items-end sm:gap-2">
                            <div className="min-w-0 flex-1">
                                <StyledSelect
                                    value={pendingSalle}
                                    onChange={(v) => {
                                        setPendingSalle(v);
                                        setPendingMatiere('');
                                    }}
                                    placeholder="Salle concernée"
                                    options={salles
                                        .filter(
                                            (s: any) => s.status === 'active',
                                        )
                                        .map((s: any) => ({
                                            value: s.room_id,
                                            label: s.name,
                                        }))}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <StyledSelect
                                    value={pendingMatiere}
                                    onChange={setPendingMatiere}
                                    placeholder={
                                        pendingSalle
                                            ? matieresForSalle.length
                                                ? 'Matière'
                                                : 'Aucune matière — ajoutez-en dans la salle'
                                            : "Choisir d'abord une salle"
                                    }
                                    options={matieresForSalle.map((m: any) => ({
                                        value: m.name,
                                        label: `${m.name} (coef ${m.coefficient})`,
                                    }))}
                                />
                            </div>
                            <Button
                                onClick={handleAddTeach}
                                disabled={isAdding}
                                className="h-10 shrink-0 px-3 text-xs whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:px-4 sm:text-sm"
                            >
                                {isAdding ? '...' : 'Ajouter'}
                            </Button>
                        </div>
                        {pendingTeaches.length > 0 && (
                            <div className="mt-3 max-h-[120px] overflow-y-auto">
                                <p className="mb-1 text-xs font-medium text-gray-600">
                                    Matières ajoutées :
                                </p>
                                <ul className="flex flex-col gap-2">
                                    {pendingTeaches.map(
                                        (t: any, idx: number) => (
                                            <li
                                                key={`${t.roomId}-${t.subject}-${idx}`}
                                                className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <span>
                                                    {t.subject} — {t.roomId}{' '}
                                                    <span className="text-xs text-gray-400">
                                                        (coef {t.coefficient})
                                                    </span>
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setPendingTeaches(
                                                            (prev) =>
                                                                prev.filter(
                                                                    (_, i) =>
                                                                        i !==
                                                                        idx,
                                                                ),
                                                        )
                                                    }
                                                    className="text-error-600 hover:text-error-700 text-xs"
                                                >
                                                    Retirer
                                                </button>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        )}
                        {pendingTeaches.length === 0 && (
                            <p className="mt-2 text-xs text-gray-400">
                                Aucune matière ajoutée — vous pourrez en ajouter
                                via la fiche.
                            </p>
                        )}
                    </div>
                    <p className="text-xs text-gray-400">
                        Le statut initial sera{' '}
                        <span className="font-medium">Actif</span>.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCreateOpen(false);
                                setPendingSalle('');
                                setPendingMatiere('');
                                setPendingTeaches([]);
                            }}
                            disabled={isCreating}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleCreate} disabled={isCreating}>
                            {isCreating ? '...' : 'Créer'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={Boolean(editingTeacher)}
                onClose={() => setEditingTeacher(null)}
                className="max-w-[520px] p-6"
            >
                <h3 className="mb-4 text-lg font-semibold">
                    Modifier l’enseignant
                </h3>
                {editError && (
                    <p className="border-error-200 bg-error-50 text-error-700 mb-3 rounded border px-3 py-2 text-sm">
                        {editError}
                    </p>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nom complet *
                        </label>
                        <Input
                            value={editName}
                            onChange={(event) =>
                                setEditName(event.target.value)
                            }
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Email *
                        </label>
                        <Input
                            type="email"
                            value={editEmail}
                            onChange={(event) =>
                                setEditEmail(event.target.value)
                            }
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Téléphone
                        </label>
                        <Input
                            type="tel"
                            value={editTelephone}
                            onChange={(event) =>
                                setEditTelephone(event.target.value)
                            }
                            placeholder="6XX XXX XXX"
                        />
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Matières et salles
                        </p>
                        <div className="flex flex-col gap-3 overflow-visible sm:flex-row sm:items-end sm:gap-2">
                            <div className="min-w-0 flex-1">
                                <StyledSelect
                                    value={editSalle}
                                    onChange={(value) => {
                                        setEditSalle(value);
                                        setEditMatiere('');
                                    }}
                                    placeholder="Salle concernée"
                                    options={salles
                                        .filter(
                                            (salle: any) =>
                                                salle.status === 'active',
                                        )
                                        .map((salle: any) => ({
                                            value: salle.room_id,
                                            label: salle.name,
                                        }))}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <StyledSelect
                                    value={editMatiere}
                                    onChange={setEditMatiere}
                                    placeholder={
                                        editSalle
                                            ? editMatieresForSalle.length
                                                ? 'Matière'
                                                : 'Aucune matière disponible'
                                            : "Choisir d'abord une salle"
                                    }
                                    options={editMatieresForSalle
                                        .filter(
                                            (subject: any) =>
                                                !editTeaches.some(
                                                    (teaching) =>
                                                        teaching.room_id ===
                                                            editSalle &&
                                                        teaching.subject ===
                                                            subject.name,
                                                ),
                                        )
                                        .map((subject: any) => ({
                                            value: subject.name,
                                            label: `${subject.name} (coef ${subject.coefficient})`,
                                        }))}
                                    disabled={!editSalle}
                                />
                            </div>
                            <Button
                                onClick={handleAddEditTeach}
                                className="h-10 shrink-0 px-3 text-xs whitespace-nowrap sm:h-11 sm:px-4 sm:text-sm"
                            >
                                Ajouter
                            </Button>
                        </div>
                        {editTeaches.length > 0 ? (
                            <ul className="mt-3 flex max-h-[120px] flex-col gap-2 overflow-y-auto">
                                {editTeaches.map(
                                    (teaching: any, index: number) => (
                                        <li
                                            key={`${teaching.room_id}-${teaching.subject}-${index}`}
                                            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                                        >
                                            <span>
                                                {teaching.subject} —{' '}
                                                {teaching.room_id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditTeaches((previous) =>
                                                        previous.filter(
                                                            (_, itemIndex) =>
                                                                itemIndex !==
                                                                index,
                                                        ),
                                                    )
                                                }
                                                className="text-error-600 hover:text-error-700 text-xs"
                                            >
                                                Retirer
                                            </button>
                                        </li>
                                    ),
                                )}
                            </ul>
                        ) : (
                            <p className="mt-2 text-xs text-gray-500">
                                Ajoutez au moins une matière et une salle.
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditingTeacher(null)}
                            disabled={isSavingEdit}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSaveTeacher}
                            disabled={isSavingEdit}
                        >
                            {isSavingEdit ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                className="max-h-[80vh] max-w-[560px] overflow-y-auto p-6"
            >
                {pendingAction && (
                    <>
                        <h3 className="mb-2 text-lg font-semibold">
                            {pendingAction.action === 'suspend'
                                ? "Suspendre l'enseignant ?"
                                : "Renvoyer l'enseignant ?"}
                        </h3>
                        <p className="mb-2 text-sm text-gray-600">
                            {pendingAction.action === 'suspend'
                                ? 'La suspension'
                                : 'Le renvoi'}{' '}
                            de{' '}
                            <span className="font-medium text-gray-800">
                                {pendingAction.teacher.name}
                            </span>{' '}
                            aura un impact sur ses créneaux (semaine variable).
                        </p>
                        <div className="border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10 mb-3 rounded-lg border p-3">
                            <p className="text-warning-800 dark:text-warning-400 text-sm font-medium">
                                Créneaux par semaine variable — non fixe.
                            </p>
                            <p className="mt-2 text-xs text-gray-600">
                                Les créneaux ne seront pas supprimés
                                automatiquement. Ils resteront visibles dans le
                                calendrier.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Raison (optionnel)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Motif..."
                                className="h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPendingAction(null)}
                                disabled={isActionLoading}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleConfirmAction}
                                disabled={isActionLoading}
                            >
                                {isActionLoading
                                    ? '...'
                                    : pendingAction.action === 'suspend'
                                      ? 'Confirmer la suspension'
                                      : 'Confirmer le renvoi'}
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </>
    );
}
