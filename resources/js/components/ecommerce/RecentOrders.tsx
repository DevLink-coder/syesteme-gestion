import { Link } from 'react-router';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '../ui/table';
import Badge from '../ui/badge/Badge';
import { useEnrollment, formatFCFA } from '../../context/EnrollmentContext';
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { buildEcheancier, getCurrentMonthEcheance } from '../../lib/echeancier';

export default function RecentOrders() {
    const {
        inscriptions,
        getInscriptionActuelle,
        getStudentById,
        getTarifForSalleYear,
        getPaymentsForInscription,
    } = useEnrollment();
    const { salles } = useSchoolStructure();
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const tableData = inscriptions
        .filter(
            (inscription) =>
                inscription.statut === 'Validée' &&
                getInscriptionActuelle(inscription.studentId)?.id ===
                    inscription.id,
        )
        .flatMap((inscription) => {
            const student = getStudentById(inscription.studentId);
            const tarif = getTarifForSalleYear(
                inscription.salleId,
                inscription.schoolYearId,
            );
            if (!student || !tarif) return [];

            const echeancier = buildEcheancier(
                {
                    dateInscription: inscription.dateInscription,
                    fraisInscription: tarif.fraisInscription,
                    mensualite: tarif.mensualite,
                    nombreMois: inscription.nombreMois ?? tarif.nombreMois,
                },
                tarif,
                getPaymentsForInscription(inscription.id),
            );
            const echeance = getCurrentMonthEcheance(echeancier);
            if (!echeance || echeance.status !== 'payee') return [];

            return [
                {
                    studentId: student.id,
                    studentName: student.name,
                    roomLabel:
                        salles.find((salle) => salle.id === inscription.salleId)
                            ?.name ?? 'Salle inconnue',
                    monthLabel: echeance.label,
                    amount: echeance.amount,
                },
            ];
        })
        .sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'))
        .slice(0, 5);

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Élèves ayant payé leur mensualité
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mensualités payées en {currentMonth}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        to="/eleves?salle=all&statut=Valid%C3%A9e&paiement=paye"
                        className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                    >
                        Tous les élèves payés
                    </Link>
                </div>
            </div>
            <div className="max-w-full overflow-x-auto">
                <Table>
                    <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                        <TableRow>
                            <TableCell
                                isHeader
                                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                            >
                                Élève
                            </TableCell>
                            <TableCell
                                isHeader
                                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                            >
                                Salle
                            </TableCell>
                            <TableCell
                                isHeader
                                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                            >
                                Mensualité payée
                            </TableCell>
                            <TableCell
                                isHeader
                                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                            >
                                Paiement du mois
                            </TableCell>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tableData.map((row) => (
                            <TableRow key={row.studentId} className="">
                                <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                                                {row.studentName}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                                    {row.roomLabel}
                                </TableCell>
                                <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                                    {row.monthLabel} — {formatFCFA(row.amount)}
                                </TableCell>
                                <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                                    <Badge size="sm" color="success">
                                        Payé
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {tableData.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="py-6 text-center text-sm text-gray-500"
                                >
                                    Aucun élève n’a encore payé sa mensualité ce
                                    mois-ci.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
