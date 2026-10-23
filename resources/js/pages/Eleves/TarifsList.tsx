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
import StyledSelect from '../../components/ui/select/StyledSelect';
import { Modal } from '../../components/ui/modal';
import { useEnrollment, formatFCFA } from '../../context/EnrollmentContext';
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { useToast } from '../../context/ToastContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

export default function TarifsList() {
    const { tarifs, createTarif, updateTarif, deleteTarif } = useEnrollment();
    const { salles, schoolYears } = useSchoolStructure();
    const { showToast } = useToast();
    const activeSchoolYear =
        schoolYears.find((year) => year.isActive) ?? schoolYears[0];

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formSalles, setFormSalles] = useState<string[]>([]);
    const [formYear, setFormYear] = useState<string>(() =>
        activeSchoolYear ? String(activeSchoolYear.id) : '',
    );
    const [latestSalles, setLatestSalles] = useState<any[] | null>(null);
    const [latestActiveYearId, setLatestActiveYearId] = useState<string | null>(
        null,
    );
    const [formFrais, setFormFrais] = useState('');
    const [formMens, setFormMens] = useState('');
    const [formMois, setFormMois] = useState('9');
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [page, setPage] = useState(1);
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const perPage = 10;

    useEffect(() => {
        if (!formYear && activeSchoolYear) {
            setFormYear(String(activeSchoolYear.id));
        }
    }, [activeSchoolYear, formYear]);
    const [formError, setFormError] = useState<string | null>(null);

    const sortedTarifs = useMemo(
        () =>
            sortAlphabetically(
                tarifs,
                (tarif) => tarif.salleLabel || tarif.salleId,
                sortDirection,
            ),
        [tarifs, sortDirection],
    );
    const totalPages = Math.max(1, Math.ceil(sortedTarifs.length / perPage));
    const paginatedTarifs = sortedTarifs.slice(
        (page - 1) * perPage,
        page * perPage,
    );
    const tarifSalleOptions = (latestSalles ?? salles).filter(
        (salle) =>
            salle.status === 'active' &&
            String(salle.schoolYearId) ===
                String(latestActiveYearId ?? activeSchoolYear?.id ?? formYear),
    );

    const refreshStructureForTarif = async () => {
        const [sallesResponse, yearsResponse] = await Promise.all([
            fetch('/web/salles', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            }),
            fetch('/web/school-years?per_page=100', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            }),
        ]);
        if (!sallesResponse.ok || !yearsResponse.ok) {
            throw new Error(
                'Impossible de charger les salles et années scolaires du centre.',
            );
        }
        const [sallePayload, yearPayload] = await Promise.all([
            sallesResponse.json(),
            yearsResponse.json(),
        ]);
        const salleRows = Array.isArray(sallePayload)
            ? sallePayload
            : Array.isArray(sallePayload?.data)
              ? sallePayload.data
              : [];
        const yearRows = Array.isArray(yearPayload?.data)
            ? yearPayload.data
            : Array.isArray(yearPayload)
              ? yearPayload
              : [];
        const activeYear =
            yearRows.find((year: any) =>
                Boolean(year.is_active ?? year.isActive),
            ) ?? yearRows[0];
        const activeYearId = activeYear ? String(activeYear.id) : '';
        setLatestSalles(
            salleRows.map((salle: any) => ({
                ...salle,
                id: String(salle.id ?? salle.code ?? ''),
                schoolYearId: String(
                    salle.schoolYearId ?? salle.school_year_id ?? '',
                ),
                status: salle.status ?? 'active',
            })),
        );
        setLatestActiveYearId(activeYearId);
        if (activeYearId) setFormYear(activeYearId);
    };

    const openCreate = () => {
        setEditingId(null);
        setFormSalles([]);
        setFormYear(activeSchoolYear ? String(activeSchoolYear.id) : '');
        setFormFrais('');
        setFormMens('');
        setFormMois('9');
        setFormError(null);
        setIsFormOpen(true);
        void refreshStructureForTarif().catch((error) => {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Erreur de chargement des salles.',
                'error',
            );
        });
    };
    const openEdit = (id: string) => {
        const t = tarifs.find((x) => x.id === id);
        if (!t) return;
        setEditingId(id);
        setFormSalles([t.salleId]);
        setFormYear(t.schoolYearId);
        setFormFrais(String(t.fraisInscription));
        setFormMens(String(t.mensualite));
        setFormMois(String(t.nombreMois ?? 9));
        setFormError(null);
        setIsFormOpen(true);
    };
    const handleSubmit = async () => {
        if (saving) return;
        const frais = Number(formFrais);
        const mens = Number(formMens);
        const mois = Number(formMois);
        if (formSalles.length === 0 || !formYear) {
            showToast('Sélectionnez une salle et une année scolaire.', 'error');
            setFormError('Salle et année obligatoires.');
            return;
        }
        setSaving(true);
        try {
            const results = editingId
                ? [
                      await updateTarif(editingId, {
                          salleId: formSalles[0],
                          schoolYearId: formYear,
                          fraisInscription: frais,
                          mensualite: mens,
                          nombreMois: mois,
                      }),
                  ]
                : await Promise.all(
                      formSalles.map((salleId) =>
                          createTarif({
                              salleId,
                              schoolYearId: formYear,
                              fraisInscription: frais,
                              mensualite: mens,
                              nombreMois: mois,
                          }),
                      ),
                  );
            const res = results.find((result) => !result.ok) ?? results[0];
            if (!res.ok) {
                showToast(
                    res.error || 'Échec de l’enregistrement du tarif.',
                    'error',
                );
                setFormError(
                    res.error || 'Erreur lors de l’enregistrement du tarif.',
                );
                return;
            }
            showToast(
                editingId
                    ? 'Tarif modifié avec succès.'
                    : 'Tarif créé avec succès.',
                'success',
            );
            setIsFormOpen(false);
        } catch {
            const message =
                'Une erreur est survenue lors de l’enregistrement du tarif.';
            setFormError(message);
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        try {
            const result = await deleteTarif(deleteTarget);
            if (!result.ok) {
                showToast(
                    result.error || 'Impossible de supprimer ce tarif.',
                    'error',
                );
                return;
            }
            showToast('Tarif supprimé avec succès.', 'success');
            setDeleteTarget(null);
        } catch {
            showToast(
                'Une erreur est survenue lors de la suppression du tarif.',
                'error',
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Tarifs | Administration"
                description="Gestion des tarifs par salle et année"
            />
            <PageBreadcrumb pageTitle="Tarifs" />
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">
                        Tarifs par salle et année scolaire
                    </h3>
                    <AlphabeticalSortControl
                        value={sortDirection}
                        onChange={(value) => {
                            setSortDirection(value);
                            setPage(1);
                        }}
                    />
                    <Button onClick={openCreate}>Créer un tarif</Button>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                    Chaque tarif est unique pour une salle + année scolaire.
                    Utilisé par les formulaires d'inscription et de paiement.
                </p>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Salle
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Année scolaire
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Frais d'inscription
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Mensualité
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Nombre de mois
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-right font-medium text-gray-500"
                                >
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y">
                            {paginatedTarifs.map((t) => {
                                return (
                                    <TableRow key={t.id}>
                                        <TableCell className="py-2">
                                            {t.salleLabel || t.salleId}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {t.schoolYearLabel ||
                                                t.schoolYearId}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {formatFCFA(t.fraisInscription)}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {formatFCFA(t.mensualite)}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {t.nombreMois ?? 9} mois
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        openEdit(t.id)
                                                    }
                                                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                                                >
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setDeleteTarget(t.id)
                                                    }
                                                    className="border-error-200 text-error-600 hover:bg-error-50 dark:border-error-900 dark:text-error-400 dark:hover:bg-error-950 rounded border px-2 py-1 text-xs"
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>
                        {tarifs.length} tarif(s) — Page {page} / {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            Précédent
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page >= totalPages}
                        >
                            Suivant
                        </Button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                className="my-4 max-h-[calc(100dvh-2rem)] max-w-[480px] overflow-y-auto p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    {editingId ? 'Modifier le tarif' : 'Créer un tarif'}
                </h3>
                {formError && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {formError}
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salle *
                        </label>
                        {editingId ? (
                            <StyledSelect
                                value={formSalles[0] ?? ''}
                                onChange={(value) => setFormSalles([value])}
                                placeholder="Choisir une salle"
                                options={tarifSalleOptions.map((salle) => ({
                                    value: salle.id,
                                    label: salle.name,
                                }))}
                            />
                        ) : (
                            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-300 p-2 dark:border-gray-700">
                                {tarifSalleOptions.map((salle) => {
                                    const alreadyHasTarif = tarifs.some(
                                        (tarif) =>
                                            String(tarif.salleId) ===
                                                String(salle.id) &&
                                            String(tarif.schoolYearId) ===
                                                String(formYear),
                                    );
                                    const selected = formSalles.includes(
                                        String(salle.id),
                                    );
                                    return (
                                        <label
                                            key={salle.id}
                                            className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm ${alreadyHasTarif ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                disabled={alreadyHasTarif}
                                                onChange={(event) => {
                                                    setFormSalles((current) =>
                                                        event.target.checked
                                                            ? [
                                                                  ...current,
                                                                  String(
                                                                      salle.id,
                                                                  ),
                                                              ]
                                                            : current.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      String(
                                                                          salle.id,
                                                                      ),
                                                              ),
                                                    );
                                                }}
                                            />
                                            <span>{salle.name}</span>
                                            {alreadyHasTarif && (
                                                <span className="ml-auto text-xs text-gray-400">
                                                    Tarif déjà créé
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                                {tarifSalleOptions.length === 0 && (
                                    <p className="px-2 py-3 text-sm text-gray-500">
                                        Aucune salle active pour l’année
                                        scolaire.
                                    </p>
                                )}
                            </div>
                        )}
                        {!editingId && (
                            <p className="mt-1 text-xs text-gray-500">
                                {formSalles.length} salle(s) sélectionnée(s). Un
                                tarif sera créé pour chaque salle.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Année scolaire *
                        </label>
                        <Input
                            value={
                                activeSchoolYear?.label ||
                                schoolYears.find(
                                    (year) => String(year.id) === formYear,
                                )?.label ||
                                'Année scolaire'
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
                        <label className="mb-1 block text-sm font-medium">
                            Frais d'inscription (FCFA) *
                        </label>
                        <Input
                            type="number"
                            value={formFrais}
                            onChange={(e) => setFormFrais(e.target.value)}
                            placeholder="20000"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Mensualité (FCFA) *
                        </label>
                        <Input
                            type="number"
                            value={formMens}
                            onChange={(e) => setFormMens(e.target.value)}
                            placeholder="12000"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nombre de mois *
                        </label>
                        <Input
                            type="number"
                            value={formMois}
                            onChange={(e) => setFormMois(e.target.value)}
                            placeholder="9"
                            min="1"
                            max="12"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Nombre de mois de cours (9 ou 10 mois selon la
                            salle)
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsFormOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={() => void handleSubmit()}
                            disabled={saving}
                        >
                            {saving
                                ? 'Enregistrement…'
                                : editingId
                                  ? 'Enregistrer'
                                  : 'Créer'}
                        </Button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={deleteTarget !== null}
                onClose={() => !deleting && setDeleteTarget(null)}
                className="max-w-[440px] p-6"
            >
                <h3 className="mb-2 text-lg font-semibold">
                    Supprimer ce tarif ?
                </h3>
                <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
                    Un tarif déjà utilisé par une inscription ne peut pas être
                    supprimé.
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleting}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={() => void handleDelete()}
                        disabled={deleting}
                    >
                        {deleting ? 'Suppression…' : 'Supprimer'}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
