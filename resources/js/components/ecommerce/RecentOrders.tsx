import { Link } from 'react-router';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '../ui/table';
import Badge from '../ui/badge/Badge';
import { useDashboardData } from '../../lib/dashboard';

function formatFCFA(value: number) {
    return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

export default function RecentOrders() {
    const { dashboard } = useDashboardData();
    const debtors = Array.isArray(dashboard.debtors) ? dashboard.debtors : [];
    const tableData = debtors.map((row: any) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        roomLabel: row.roomLabel,
        soldeDu: Number(row.soldeDu || 0),
        enrollmentStatus: row.enrollmentStatus || 'Impayé',
    }));
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pt-4 pb-3 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Élèves avec solde dû
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        to="/dettes"
                        className="text-theme-sm shadow-theme-xs inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                    >
                        Tout voir
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
                                Solde dû
                            </TableCell>
                            <TableCell
                                isHeader
                                className="text-theme-xs py-3 text-start font-medium text-gray-500 dark:text-gray-400"
                            >
                                Statut
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
                                    {formatFCFA(row.soldeDu)}
                                </TableCell>
                                <TableCell className="text-theme-sm py-3 text-gray-500 dark:text-gray-400">
                                    <Badge
                                        size="sm"
                                        color={
                                            row.soldeDu > 0
                                                ? 'error'
                                                : 'success'
                                        }
                                    >
                                        {row.enrollmentStatus}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
