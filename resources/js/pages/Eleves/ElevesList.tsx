import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';
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
import { useEnrollment, formatFCFA } from '../../context/EnrollmentContext';
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { buildEcheancier, getCurrentMonthEcheance } from '../../lib/echeancier';

export default function ElevesList() {
    const [searchParams] = useSearchParams();
    const {
        inscriptions,
        students,
        tarifs,
        getInscriptionActuelle,
        getStudentById,
        getPaymentsForInscription,
    } = useEnrollment();
    const { salles: ctxSalles, schoolYears: ctxYears } = useSchoolStructure();

    const salles = ctxSalles.map((s: any) => ({
        id: String(s.id),
        roomId: String(s.roomId),
        name: s.name,
        schoolYearId: String(s.schoolYearId),
        status: s.status,
    }));
    const schoolYears = ctxYears.map((y: any) => ({
        id: String(y.id),
        label: y.label,
        isActive: !!y.isActive,
    }));

    const [search, setSearch] = useState('');
    const [filterSalle, setFilterSalle] = useState<string>(
        searchParams.get('salle') || 'all',
    );
    const [filterStatut, setFilterStatut] = useState<string>(
        searchParams.get('statut') || 'all',
    );
    const [filterSolde, setFilterSolde] = useState<string>(
        searchParams.get('paiement') || 'all',
    );
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const [page, setPage] = useState(1);
    const perPage = 10;

    const elevesAvecInscription = useMemo(() => {
        const ids = Array.from(new Set(inscriptions.map((i) => i.studentId)));
        return ids
            .map((id) => {
                const student = getStudentById(id);
                const ins = getInscriptionActuelle(id);
                if (!student || !ins) return null;
                const salle = salles.find((s) => s.id === ins.salleId);
                const schoolYear = schoolYears.find(
                    (y) => y.id === ins.schoolYearId,
                );
                const tarif = tarifs.find((t) => t.id === ins.tarifId);
                const ech = buildEcheancier(
                    {
                        dateInscription: ins.dateInscription,
                        fraisInscription: tarif?.fraisInscription ?? 0,
                        mensualite: tarif?.mensualite ?? 0,
                    },
                    tarif,
                    getPaymentsForInscription(ins.id),
                );
                const monthlyEcheance = getCurrentMonthEcheance(ech);
                return {
                    student,
                    ins,
                    salle,
                    schoolYear,
                    totalPaye: ech.totalPaye,
                    ech,
                    monthlyEcheance,
                };
            })
            .filter(Boolean) as Array<{
            student: NonNullable<ReturnType<typeof getStudentById>>;
            ins: NonNullable<ReturnType<typeof getInscriptionActuelle>>;
            salle: (typeof salles)[0] | undefined;
            schoolYear: (typeof schoolYears)[0] | undefined;
            totalPaye: number;
            ech: ReturnType<typeof buildEcheancier>;
            monthlyEcheance:
                | ReturnType<typeof getCurrentMonthEcheance>
                | undefined;
        }>;
    }, [
        inscriptions,
        getStudentById,
        getInscriptionActuelle,
        salles,
        schoolYears,
        tarifs,
        getPaymentsForInscription,
    ]);

    const sansSalle = useMemo(
        () =>
            students.filter(
                (s) => !inscriptions.some((i) => i.studentId === s.id),
            ),
        [students, inscriptions],
    );

    const filtered = useMemo(() => {
        let list = [...elevesAvecInscription];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                ({ student }) =>
                    student.name.toLowerCase().includes(q) ||
                    `${student.code || ''} ${student.id}`
                        .toLowerCase()
                        .includes(q),
            );
        }
        if (filterSalle !== 'all')
            list = list.filter(
                ({ salle }) =>
                    salle?.id === filterSalle || salle?.roomId === filterSalle,
            );
        if (filterStatut !== 'all')
            list = list.filter(({ ins }) => ins.statut === filterStatut);
        if (filterSolde === 'partiel')
            list = list.filter(
                ({ monthlyEcheance }) =>
                    monthlyEcheance?.status === 'partielle',
            );
        else if (filterSolde === 'paye')
            list = list.filter(
                ({ monthlyEcheance }) => monthlyEcheance?.status === 'payee',
            );
        else if (filterSolde === 'nonpaye')
            list = list.filter(
                ({ monthlyEcheance }) =>
                    monthlyEcheance !== undefined &&
                    monthlyEcheance.status !== 'payee' &&
                    monthlyEcheance.status !== 'partielle',
            );
        return sortAlphabetically(
            list,
            (item) => item.student.name,
            sortDirection,
        );
    }, [
        elevesAvecInscription,
        search,
        filterSalle,
        filterStatut,
        filterSolde,
        sortDirection,
    ]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const statusColor: Record<
        string,
        'success' | 'warning' | 'error' | 'light'
    > = {
        Validée: 'success',
        'En pause': 'warning',
        'En attente de paiement': 'error',
    };

    return (
        <>
            <PageMeta
                title="Élèves | Administration"
                description="Liste des élèves"
            />
            <PageBreadcrumb pageTitle="Élèves" />

            {sansSalle.length > 0 && (
                <div className="border-warning-300 bg-warning-50 mb-4 rounded-2xl border p-4">
                    <p className="text-sm font-medium text-gray-800">
                        ⚠ {sansSalle.length} élève(s) sans salle affectée — un
                        élève appartient obligatoirement à une salle.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {sansSalle.slice(0, 8).map((s) => (
                            <Link
                                key={s.id}
                                to={`/eleves/${encodeURIComponent(s.code || s.id)}`}
                                className="rounded-lg border bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {s.name} →
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                {/* Header responsive refait */}
                <div className="mb-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex flex-1 flex-col gap-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="sm:col-span-2 lg:col-span-1">
                                    <Input
                                        placeholder="Rechercher par nom ou matricule..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                                <StyledSelect
                                    value={filterSalle}
                                    onChange={(v) => {
                                        setFilterSalle(v);
                                        setPage(1);
                                    }}
                                    placeholder="Toutes les salles"
                                    options={[
                                        {
                                            value: 'all',
                                            label: 'Toutes les salles',
                                        },
                                        ...salles
                                            .filter(
                                                (s) => s.status === 'active',
                                            )
                                            .map((s) => ({
                                                value: s.id,
                                                label: s.name,
                                            })),
                                    ]}
                                />
                                <StyledSelect
                                    value={filterStatut}
                                    onChange={(v) => {
                                        setFilterStatut(v);
                                        setPage(1);
                                    }}
                                    placeholder="Tous les statuts"
                                    options={[
                                        {
                                            value: 'all',
                                            label: 'Tous les statuts',
                                        },
                                        { value: 'Validée', label: 'Validée' },
                                        {
                                            value: 'En pause',
                                            label: 'En pause',
                                        },
                                        {
                                            value: 'En attente de paiement',
                                            label: 'En attente de paiement',
                                        },
                                    ]}
                                />
                                <StyledSelect
                                    value={filterSolde}
                                    onChange={(v) => {
                                        setFilterSolde(v);
                                        setPage(1);
                                    }}
                                    placeholder="Paiement du mois"
                                    options={[
                                        {
                                            value: 'all',
                                            label: 'Tous les paiements',
                                        },
                                        {
                                            value: 'partiel',
                                            label: 'Partiellement payé',
                                        },
                                        { value: 'paye', label: 'Déjà payé' },
                                        { value: 'nonpaye', label: 'Non payé' },
                                    ]}
                                />
                                <AlphabeticalSortControl
                                    value={sortDirection}
                                    onChange={(value) => {
                                        setSortDirection(value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <p className="text-xs text-gray-400">
                                Un élève n'est actif que via son inscription
                                pertinente (pas la simple existence dans la
                                collection).
                            </p>
                        </div>
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:w-auto xl:flex-wrap xl:justify-end">
                            <Link
                                to="/eleves/nouveau"
                                className="bg-brand-500 shadow-theme-xs hover:bg-brand-600 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-white sm:w-auto"
                            >
                                Inscrire un élève
                            </Link>
                            <Link
                                to="/tarifs"
                                className="inline-flex w-full items-center justify-center rounded-lg border bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 sm:w-auto dark:bg-gray-800 dark:text-gray-300"
                            >
                                Tarifs
                            </Link>
                            <Link
                                to="/dettes"
                                className="inline-flex w-full items-center justify-center rounded-lg border bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 sm:w-auto dark:bg-gray-800 dark:text-gray-300"
                            >
                                Dettes
                            </Link>
                        </div>
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
                                    Élève
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Salle actuelle
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Statut
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Total versé
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Paiement du mois
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Dernier paiement
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
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell className="py-8 text-center text-sm text-gray-500">
                                        Aucun élève trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map(
                                    ({
                                        student,
                                        ins,
                                        salle,
                                        schoolYear,
                                        totalPaye,
                                        monthlyEcheance,
                                    }) => (
                                        <TableRow
                                            key={student.id}
                                            className={
                                                ins.statut === 'En pause'
                                                    ? 'bg-warning-50/30'
                                                    : ''
                                            }
                                        >
                                            <TableCell className="py-3">
                                                <div className="font-medium text-gray-800 dark:text-white">
                                                    {student.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm">
                                                {salle
                                                    ? salle.name
                                                    : student.roomId ||
                                                      'Sans salle'}
                                                {schoolYear?.label && (
                                                    <div className="text-xs text-gray-400">
                                                        {schoolYear.label}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge
                                                    color={
                                                        statusColor[
                                                            ins.statut
                                                        ] || 'light'
                                                    }
                                                    size="sm"
                                                >
                                                    {ins.statut}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-success-600 py-3 text-sm font-medium">
                                                {formatFCFA(totalPaye)}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm font-medium">
                                                {monthlyEcheance ? (
                                                    <>
                                                        <span
                                                            className={
                                                                monthlyEcheance.status ===
                                                                'payee'
                                                                    ? 'text-success-600'
                                                                    : monthlyEcheance.status ===
                                                                        'partielle'
                                                                      ? 'text-warning-600'
                                                                      : 'text-error-600'
                                                            }
                                                        >
                                                            {monthlyEcheance.status ===
                                                            'payee'
                                                                ? 'Payé'
                                                                : monthlyEcheance.status ===
                                                                    'partielle'
                                                                  ? 'Partiellement payé'
                                                                  : 'Non payé'}
                                                        </span>
                                                        {monthlyEcheance.status !==
                                                            'payee' && (
                                                            <span className="ml-2 text-gray-500">
                                                                {formatFCFA(
                                                                    monthlyEcheance.solde,
                                                                )}
                                                            </span>
                                                        )}
                                                        <div className="text-xs font-normal text-gray-400">
                                                            {
                                                                monthlyEcheance.label
                                                            }
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500">
                                                        Aucune mensualité prévue
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-500">
                                                {ins.dateInscription}
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <Link
                                                    to={`/eleves/${encodeURIComponent(student.code || student.id)}`}
                                                    className="rounded border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                                                >
                                                    Voir fiche
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ),
                                )
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>
                        {filtered.length} élève(s) sur{' '}
                        {elevesAvecInscription.length} — Page {page} /{' '}
                        {totalPages}
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
        </>
    );
}
