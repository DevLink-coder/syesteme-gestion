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
import StyledSelect from '../../components/ui/select/StyledSelect';
import { formatFCFA } from '../../context/EnrollmentContext';
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { Link } from 'react-router';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

interface BackendDette {
    inscriptionId: string;
    studentId: string;
    studentCode?: string;
    studentName: string;
    roomLabel: string;
    schoolYearId: string;
    schoolYearLabel: string;
    statut: string;
    totalDu: number;
    totalPaye: number;
    solde: number;
    monthlyDue: number;
    monthlySolde: number;
    lastPaymentDate: string | null;
}

export default function DettesList() {
    const { schoolYears } = useSchoolStructure();
    const [dettes, setDettes] = useState<BackendDette[]>([]);

    const activeSchoolYear =
        schoolYears.find((year) => year.isActive) ?? schoolYears[0];
    const [filterSalle, setFilterSalle] = useState<string>('all');
    const [filterYear, setFilterYear] = useState<string>(() =>
        activeSchoolYear ? activeSchoolYear.id : 'all',
    );
    const [filterStatut, setFilterStatut] = useState<string>('all');
    const [filterSolde, setFilterSolde] = useState<string>('all');
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');

    useEffect(() => {
        if (activeSchoolYear && filterYear === 'all') {
            setFilterYear(activeSchoolYear.id);
        }
    }, [activeSchoolYear, filterYear]);

    useEffect(() => {
        const loadDettes = async () => {
            try {
                const res = await fetch('/web/dettes', {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const payload = await res.json();
                    const list = Array.isArray(payload?.dettes)
                        ? payload.dettes
                        : Array.isArray(payload?.data)
                          ? payload.data
                          : [];
                    setDettes(list);
                }
            } catch (e) {
                console.error('Failed to load dettes:', e);
            }
        };
        void loadDettes();
    }, []);

    const filtered = useMemo(() => {
        let list = [...dettes];
        if (filterSalle !== 'all')
            list = list.filter((d) => d.roomLabel === filterSalle);
        if (filterYear !== 'all')
            list = list.filter(
                (d) => String(d.schoolYearId) === String(filterYear),
            );
        if (filterStatut !== 'all')
            list = list.filter((d) => d.statut === filterStatut);
        if (filterSolde === 'zero') list = list.filter((d) => d.solde === 0);
        else if (filterSolde === 'dû') list = list.filter((d) => d.solde > 0);
        else if (filterSolde === 'partiel')
            list = list.filter(
                (d) => d.solde > 0 && d.totalPaye > 0 && d.solde < d.totalDu,
            );
        else if (filterSolde === 'nonpaye')
            list = list.filter((d) => d.totalPaye === 0 && d.solde > 0);
        return sortAlphabetically(
            list,
            (dette) => dette.studentName,
            sortDirection,
        );
    }, [
        dettes,
        filterSalle,
        filterYear,
        filterStatut,
        filterSolde,
        sortDirection,
    ]);

    return (
        <>
            <PageMeta
                title="Dettes et relances | Administration"
                description="Vue des dettes"
            />
            <PageBreadcrumb pageTitle="Dettes / Relances" />
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap gap-2">
                        <StyledSelect
                            value={filterSalle}
                            onChange={setFilterSalle}
                            placeholder="Toutes les salles"
                            options={[
                                { value: 'all', label: 'Toutes les salles' },
                                ...[
                                    ...new Set(
                                        dettes
                                            .map((d) => d.roomLabel)
                                            .filter(Boolean),
                                    ),
                                ].map((label) => ({
                                    value: label,
                                    label,
                                })),
                            ]}
                            className="min-w-[160px]"
                        />
                        <StyledSelect
                            value={filterYear}
                            onChange={setFilterYear}
                            placeholder="Toutes les années"
                            options={[
                                { value: 'all', label: 'Toutes les années' },
                                ...[
                                    ...new Map(
                                        dettes
                                            .filter(
                                                (d) =>
                                                    d.schoolYearId &&
                                                    d.schoolYearLabel,
                                            )
                                            .map((d) => [
                                                d.schoolYearId,
                                                d.schoolYearLabel,
                                            ]),
                                    ),
                                ].map(([id, label]) => ({
                                    value: id,
                                    label,
                                })),
                            ]}
                            className="min-w-[140px]"
                        />
                        <StyledSelect
                            value={filterStatut}
                            onChange={setFilterStatut}
                            placeholder="Tous les statuts"
                            options={[
                                { value: 'all', label: 'Tous les statuts' },
                                { value: 'Validée', label: 'Validée' },
                                { value: 'En pause', label: 'En pause' },
                                {
                                    value: 'En attente de paiement',
                                    label: 'En attente',
                                },
                            ]}
                            className="min-w-[160px]"
                        />
                        <StyledSelect
                            value={filterSolde}
                            onChange={setFilterSolde}
                            placeholder="Tous les soldes"
                            options={[
                                { value: 'all', label: 'Tous' },
                                { value: 'zero', label: 'Solde = 0' },
                                { value: 'dû', label: 'Solde > 0' },
                                { value: 'partiel', label: 'Partiel' },
                                { value: 'nonpaye', label: 'Non payé' },
                            ]}
                            className="min-w-[140px]"
                        />
                        <AlphabeticalSortControl
                            value={sortDirection}
                            onChange={setSortDirection}
                        />
                    </div>
                    <p className="text-xs text-gray-400">
                        En pause = relances suspendues (facturation suspendue).
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Élève
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Salle / Année
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Total dû
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Payé
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Solde
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Statut
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                >
                                    Dernier paiement
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y">
                            {filtered.map((d) => (
                                <TableRow
                                    key={d.inscriptionId}
                                    className={
                                        d.statut === 'En pause'
                                            ? 'bg-warning-50/30'
                                            : d.solde > 0
                                              ? 'bg-error-50/20'
                                              : ''
                                    }
                                >
                                    <TableCell className="py-2">
                                        <Link
                                            to={`/eleves/${encodeURIComponent(d.studentCode || d.studentId)}`}
                                            className="text-brand-600 font-medium hover:underline"
                                        >
                                            {d.studentName}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {d.roomLabel || 'N/A'} •{' '}
                                        {d.schoolYearLabel || 'N/A'}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {formatFCFA(d.totalDu || 0)}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {formatFCFA(d.totalPaye || 0)}
                                    </TableCell>
                                    <TableCell className="py-2 font-semibold">
                                        {d.solde === 0 ? (
                                            <span className="text-success-600">
                                                Soldé
                                            </span>
                                        ) : (
                                            <span className="text-error-600">
                                                {formatFCFA(d.solde || 0)}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Badge
                                            size="sm"
                                            color={
                                                d.statut === 'Validée'
                                                    ? 'success'
                                                    : d.statut === 'En pause'
                                                      ? 'warning'
                                                      : 'error'
                                            }
                                        >
                                            {d.statut}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 text-sm text-gray-500">
                                        {d.lastPaymentDate || 'Aucun'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    {filtered.length} inscription(s) sur {dettes.length} —
                    montants calculés réellement.
                </p>
            </div>
        </>
    );
}
