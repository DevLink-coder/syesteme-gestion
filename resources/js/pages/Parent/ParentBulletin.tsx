import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import jsPDF from 'jspdf';
import Button from '../../components/ui/button/Button';
import StyledSelect from '../../components/ui/select/StyledSelect';
import {
    addDocumentFooters,
    addDocumentHeading,
    addStructuredTable,
    formatPdfDate,
    minutesBetween,
} from '../../lib/structuredPdf';

const weekdays = [
    'dimanche',
    'lundi',
    'mardi',
    'mercredi',
    'jeudi',
    'vendredi',
    'samedi',
];
const frenchNumber = (value: number) =>
    Number(value).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function ParentBulletin() {
    const data = useOutletContext<any>();
    const bulletins = useMemo(() => data?.bulletins || [], [data?.bulletins]);
    const [selectedId, setSelectedId] = useState('');
    const selected =
        bulletins.find((item: any) => item.id === selectedId) || bulletins[0];
    const downloadPdf = () => {
        if (!selected) return;
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        const date = formatPdfDate();
        addDocumentHeading(pdf, 'Bulletin — ' + data.student.name, [
            'Salle : ' + (selected.salleName || '—'),
            (selected.title || selected.subject || 'Évaluation') +
                ' · ' +
                (selected.date || ''),
            'Année scolaire ' +
                (selected.schoolYearLabel || selected.schoolYearId || '—'),
        ]);
        addStructuredTable(pdf, {
            startY: 49,
            head: [
                ['Matière', 'Note / 20', 'Coefficient', 'Note × coefficient'],
            ],
            body: (selected.rows || []).map((row: any) => [
                row.subject,
                frenchNumber(row.note),
                frenchNumber(row.coefficient),
                frenchNumber(row.note * row.coefficient),
            ]),
            styles: { fontSize: 10 },
        });
        let y = ((pdf as any).lastAutoTable?.finalY || 50) + 8;
        if (y + 20 > pdf.internal.pageSize.getHeight() - 16) {
            pdf.addPage();
            y = 18;
        }
        pdf.setFillColor(239, 243, 248);
        pdf.setDrawColor(190, 195, 202);
        pdf.roundedRect(
            12,
            y,
            pdf.internal.pageSize.getWidth() - 24,
            17,
            1.5,
            1.5,
            'FD',
        );
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(31, 41, 55);
        pdf.text(
            'Moyenne générale pondérée : ' +
                (selected.average === null
                    ? '—'
                    : frenchNumber(selected.average) + ' / 20'),
            17,
            y + 11,
        );
        y += 27;
        if (y + 25 > pdf.internal.pageSize.getHeight() - 16) {
            pdf.addPage();
            y = 18;
        }

        const absences = (data?.absences?.items || []).filter(
            (item: any) =>
                String(item.schoolYearId) === String(selected.schoolYearId) &&
                (!selected.date || !item.date || item.date <= selected.date),
        );
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Absences sur la période concernée', 12, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(
            'Période : année scolaire jusqu’à la date de l’évaluation (' +
                (selected.date || 'date non précisée') +
                ')',
            12,
            y + 5,
        );
        y += 9;
        const absenceRows = absences.length
            ? absences.map((item: any) => {
                  const d = item.date
                      ? new Date(item.date + 'T12:00:00')
                      : null;
                  return [
                      item.date || '—',
                      d ? weekdays[d.getDay()] : '—',
                      item.startTime && item.endTime
                          ? item.startTime + '–' + item.endTime
                          : 'Horaire non renseigné',
                      item.subject || '—',
                  ];
              })
            : [['Aucune absence enregistrée sur la période', '', '', '']];
        addStructuredTable(pdf, {
            startY: y,
            head: [
                ['Date', 'Jour de la semaine', 'Créneau horaire', 'Matière'],
            ],
            body: absenceRows,
            ...(absences.length
                ? {}
                : {
                      didParseCell: (hook: any) => {
                          if (hook.section === 'body' && hook.row.index === 0)
                              hook.cell.colSpan = 4;
                      },
                  }),
            styles: { fontSize: 8.5 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 42 },
            },
        });
        const totalMinutes = absences.reduce(
            (total: number, item: any) =>
                total +
                (item.startTime && item.endTime
                    ? minutesBetween(item.startTime, item.endTime)
                    : Number(item.durationMinutes || 0)),
            0,
        );
        const totalY = ((pdf as any).lastAutoTable?.finalY || y) + 7;
        if (totalY > pdf.internal.pageSize.getHeight() - 18) pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(
            'Total : ' +
                absences.length +
                ' créneaux manqués (environ ' +
                frenchNumber(totalMinutes / 60) +
                ' heures)',
            12,
            totalY > pdf.internal.pageSize.getHeight() - 18 ? 18 : totalY,
        );
        addDocumentFooters(pdf, date);
        pdf.save('bulletin-' + data.student.code + '-' + selected.id + '.pdf');
    };

    if (bulletins.length === 0) {
        return (
            <div className="rounded-2xl border bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <h2 className="font-semibold text-gray-800 dark:text-white">
                    Aucun bulletin disponible
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    Les bulletins de {data.student.name} apparaîtront ici après
                    la saisie des notes.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {bulletins.length > 1 && (
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Choisir un bulletin
                    </label>
                    <div className="min-w-[260px]">
                        <StyledSelect
                            value={selected?.id || ''}
                            onChange={setSelectedId}
                            options={bulletins.map((bulletin: any) => ({
                                value: bulletin.id,
                                label: `${bulletin.title || bulletin.subject} · ${bulletin.date}`,
                            }))}
                            placeholder="Sélectionner une évaluation"
                        />
                    </div>
                </div>
            )}
            <div className="flex justify-end">
                <Button onClick={downloadPdf}>Télécharger le bulletin</Button>
            </div>
            <section className="rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Bulletin de {data.student.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    {selected.salleName || 'Salle'} · Année scolaire{' '}
                    {selected.schoolYearLabel || selected.schoolYearId} ·{' '}
                    {selected.title || selected.subject} · {selected.date}
                </p>
                <p className="mt-4 text-sm">
                    Moyenne générale pondérée :{' '}
                    <strong>
                        {selected.average === null
                            ? '—'
                            : frenchNumber(selected.average) + ' / 20'}
                    </strong>
                </p>
            </section>
            <section className="overflow-hidden rounded-2xl border bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b px-5 py-4 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        Détail des résultats
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                        <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-gray-900">
                            <tr>
                                <th className="px-5 py-3 font-medium">
                                    Matière
                                </th>
                                <th className="px-5 py-3 text-right font-medium">
                                    Note / 20
                                </th>
                                <th className="px-5 py-3 text-right font-medium">
                                    Coefficient
                                </th>
                                <th className="px-5 py-3 text-right font-medium">
                                    Note pondérée
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {(selected.rows || []).map(
                                (row: any, index: number) => (
                                    <tr key={`${row.subject}-${index}`}>
                                        <td className="px-5 py-3 text-gray-800 dark:text-gray-200">
                                            {row.subject}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {frenchNumber(row.note)}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {frenchNumber(row.coefficient)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium">
                                            {frenchNumber(
                                                row.note * row.coefficient,
                                            )}
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
