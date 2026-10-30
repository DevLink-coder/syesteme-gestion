import { useMemo, useState, useEffect } from 'react';
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
import StyledSelect from '../../components/ui/select/StyledSelect';
import { Modal } from '../../components/ui/modal';
import { useEvaluations } from '../../context/EvaluationsContext';
import { useToast } from '../../context/ToastContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

interface SalleOption {
    id: string;
    name: string;
}

interface SchoolYearOption {
    id: string;
    label: string;
    is_active?: boolean;
}

export default function EvaluationsList() {
    const { evaluations, loadEvaluations, createEvaluation } = useEvaluations();
    const { showToast } = useToast();
    const [salles, setSalles] = useState<SalleOption[]>([]);
    const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSalleIds, setSelectedSalleIds] = useState<string[]>([]);
    const [schoolYearId, setSchoolYearId] = useState('');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [error, setError] = useState<string | null>(null);
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const sortedEvaluations = useMemo(
        () =>
            sortAlphabetically(
                evaluations,
                (evaluation) => evaluation.salleName || evaluation.title || '',
                sortDirection,
            ),
        [evaluations, sortDirection],
    );

    useEffect(() => {
        const loadFormOptions = async () => {
            try {
                const [sallesResponse, yearsResponse] = await Promise.all([
                    fetch('/web/salles', {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    }),
                    fetch('/web/school-years?per_page=100', {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    }),
                ]);

                if (!sallesResponse.ok || !yearsResponse.ok) {
                    throw new Error(
                        'Impossible de charger les salles et années scolaires.',
                    );
                }

                const [sallesPayload, yearsPayload] = await Promise.all([
                    sallesResponse.json(),
                    yearsResponse.json(),
                ]);
                const salleOptions = Array.isArray(sallesPayload)
                    ? sallesPayload.map((salle: any) => ({
                          id: String(salle.id),
                          name: salle.name,
                      }))
                    : [];
                const yearOptions = Array.isArray(yearsPayload?.data)
                    ? yearsPayload.data.map((year: any) => ({
                          id: String(year.id),
                          label: year.label,
                          is_active: year.is_active,
                      }))
                    : [];

                setSalles(salleOptions);
                setSchoolYears(yearOptions);
                setSchoolYearId((current) => {
                    const activeYear = yearOptions.find(
                        (year: SchoolYearOption) => year.is_active,
                    );
                    return (
                        activeYear?.id || current || yearOptions[0]?.id || ''
                    );
                });
            } catch (loadError: any) {
                setError(
                    loadError.message ||
                        'Erreur lors du chargement des options.',
                );
            }
        };

        void loadFormOptions();
    }, []);

    useEffect(() => {
        if (schoolYearId) {
            void loadEvaluations(schoolYearId);
        }
    }, [schoolYearId, loadEvaluations]);

    const openModal = () => {
        setSelectedSalleIds([]);
        setTitle('');
        setDate(new Date().toISOString().slice(0, 10));
        setError(null);
        setIsOpen(true);
    };

    const handleCreate = async () => {
        if (
            !title.trim() ||
            selectedSalleIds.length === 0 ||
            !date ||
            !schoolYearId
        ) {
            setError('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const result = await createEvaluation({
            title: title.trim(),
            salleIds: selectedSalleIds,
            date,
            schoolYearId,
        });

        if (!result.ok) {
            setError(result.error || 'Erreur lors de la création');
        } else {
            showToast('Évaluation créée avec succès', 'success');
            setIsOpen(false);
            void loadEvaluations(schoolYearId);
        }
    };

    return (
        <>
            <PageMeta
                title="Évaluations | Administration"
                description="Liste des évaluations"
            />
            <PageBreadcrumb pageTitle="Évaluations" />
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <AlphabeticalSortControl
                        value={sortDirection}
                        onChange={setSortDirection}
                    />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        Évaluations ({evaluations.length})
                    </h3>
                    <Button onClick={openModal}>Nouvelle évaluation</Button>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Salle
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Intitulé
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Date
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
                                    Élèves notés
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
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {sortedEvaluations.map((ev) => (
                                <TableRow key={ev.id}>
                                    <TableCell className="py-3 font-medium">
                                        {ev.salleName || '—'}
                                    </TableCell>
                                    <TableCell className="py-3 text-sm">
                                        {ev.title || '—'}
                                    </TableCell>
                                    <TableCell className="py-3 text-sm text-gray-500">
                                        {ev.date}
                                    </TableCell>
                                    <TableCell className="py-3 text-sm">
                                        {ev.nbMatieres}
                                    </TableCell>
                                    <TableCell className="py-3 text-sm">
                                        {ev.nbEleves}
                                    </TableCell>
                                    <TableCell className="py-3">
                                        {ev.isPending ? (
                                            <Badge color="warning" size="sm">
                                                En attente de notes
                                            </Badge>
                                        ) : (
                                            <Badge color="success" size="sm">
                                                Notée
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                to={`/evaluations/${ev.id}/saisie`}
                                                className="bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 rounded-lg px-3 py-1.5 text-xs font-medium"
                                            >
                                                Saisir les notes
                                            </Link>
                                            {ev.isPending ? (
                                                <span className="rounded-lg border px-3 py-1.5 text-xs text-gray-400 dark:border-gray-700">
                                                    Bulletins —
                                                </span>
                                            ) : (
                                                <Link
                                                    to={`/evaluations/${ev.id}`}
                                                    className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700"
                                                >
                                                    Voir bulletins
                                                </Link>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className="max-w-[560px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    Nouvelle évaluation
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Intitulé *
                        </label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Devoir surveillé du premier trimestre"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salles *
                        </label>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
                            {salles.length === 0 ? (
                                <p className="py-1 text-sm text-gray-400">
                                    Aucune salle disponible
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {salles.map((salle) => (
                                        <label
                                            key={salle.id}
                                            className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSalleIds.includes(
                                                    salle.id,
                                                )}
                                                onChange={(event) => {
                                                    setSelectedSalleIds(
                                                        (current) =>
                                                            event.target.checked
                                                                ? [
                                                                      ...current,
                                                                      salle.id,
                                                                  ]
                                                                : current.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          salle.id,
                                                                  ),
                                                    );
                                                    setError(null);
                                                }}
                                                className="text-brand-500 focus:ring-brand-500/20 h-4 w-4 rounded border-gray-300"
                                            />
                                            <span>{salle.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedSalleIds.length > 0 && (
                            <p className="mt-1 text-xs text-gray-500">
                                {selectedSalleIds.length} salle(s)
                                sélectionnée(s)
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Année scolaire *
                        </label>
                        <StyledSelect
                            value={schoolYearId}
                            onChange={setSchoolYearId}
                            disabled={schoolYears.some(
                                (year) =>
                                    year.id === schoolYearId && year.is_active,
                            )}
                            placeholder="Choisir une année scolaire"
                            options={schoolYears.map((sy) => ({
                                value: sy.id,
                                label: sy.label,
                            }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Date *
                        </label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-error-500 text-sm">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleCreate}>Créer</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
