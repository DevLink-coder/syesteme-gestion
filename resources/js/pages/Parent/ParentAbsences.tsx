import { useOutletContext } from 'react-router';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '../../components/ui/table';

function formatDate(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export default function ParentAbsences() {
    const data = useOutletContext<any>();
    const summary = data?.absences;
    const items = (summary?.items || []).filter(
        (item: any) =>
            String(item.schoolYearId) === String(summary?.schoolYearId),
    );

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Absences de {data.student.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    {summary.schoolYearLabel || 'Année scolaire en cours'}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                        <p className="text-xs text-gray-500">
                            Séances d’absence enregistrées
                        </p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                            {summary.count}
                        </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                        <p className="text-xs text-gray-500">
                            Heures calculées avec le créneau ou l’emploi du
                            temps
                        </p>
                        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                            {Number(summary.knownHours).toLocaleString('fr-FR')}{' '}
                            h
                        </p>
                    </div>
                </div>
                {summary.estimatedCount > 0 && (
                    <p className="mt-3 text-xs text-gray-500">
                        {summary.estimatedCount} absence(s) quotidienne(s)
                        calculée(s) à partir de l’emploi du temps de la salle.
                    </p>
                )}
                {summary.withoutSlotCount > 0 && (
                    <p className="text-warning-700 dark:text-warning-400 mt-3 text-xs">
                        {summary.withoutSlotCount} absence(s) n’ont pas de
                        créneau horaire associé ; leur durée n’est pas incluse
                        dans le total.
                    </p>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b px-5 py-4 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        Jours et séances manqués
                    </h3>
                </div>
                {items.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">
                        Aucune absence enregistrée pour cette année scolaire.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b dark:border-gray-700">
                                <TableRow>
                                    <TableCell
                                        isHeader
                                        className="py-3 text-left text-xs font-medium text-gray-500"
                                    >
                                        Date
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="py-3 text-left text-xs font-medium text-gray-500"
                                    >
                                        Matière
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="py-3 text-left text-xs font-medium text-gray-500"
                                    >
                                        Horaire
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="py-3 text-right text-xs font-medium text-gray-500"
                                    >
                                        Durée
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="py-3 text-sm capitalize">
                                            {formatDate(item.date)}
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {item.subject || 'Séance'}
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {item.startTime && item.endTime
                                                ? `${item.startTime}–${item.endTime}`
                                                : item.durationSource ===
                                                    'schedule'
                                                  ? 'Cours de la journée'
                                                  : 'Horaire non renseigné'}
                                        </TableCell>
                                        <TableCell className="py-3 text-right text-sm">
                                            {item.durationMinutes === null
                                                ? '—'
                                                : `${(item.durationMinutes / 60).toLocaleString('fr-FR')} h`}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>
        </div>
    );
}
