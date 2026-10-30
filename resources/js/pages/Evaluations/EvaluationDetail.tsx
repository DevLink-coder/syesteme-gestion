import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
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
import { useEvaluations } from '../../context/EvaluationsContext';
import jsPDF from 'jspdf';
import {
    addDocumentFooters,
    addDocumentHeading,
    addStructuredTable,
    formatPdfDate,
} from '../../lib/structuredPdf';

const frenchNumber = (value: number) =>
    Number(value).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function EvaluationDetail() {
    const { id } = useParams<{ id: string }>();
    const { getEvaluation } = useEvaluations();
    const [evaluation, setEvaluation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const downloadBulletin = (student: any) => {
        if (!evaluation || !student) return;
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        const date = formatPdfDate();
        addDocumentHeading(pdf, 'Bulletin — ' + student.name, [
            'Salle : ' + (evaluation.salleName || '—'),
            (evaluation.title || evaluation.subject || 'Évaluation') +
                ' · ' +
                (evaluation.date || ''),
            'Année scolaire ' + (evaluation.schoolYearId || '—'),
        ]);
        addStructuredTable(pdf, {
            startY: 49,
            head: [
                ['Matière', 'Note / 20', 'Coefficient', 'Note × coefficient'],
            ],
            body: (student.rows || []).map((row: any) => [
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
                (student.average === null
                    ? '—'
                    : frenchNumber(student.average) + ' / 20'),
            17,
            y + 11,
        );
        addDocumentFooters(pdf, date);
        pdf.save(
            'bulletin-' +
                student.name.replace(/\s+/g, '-') +
                '-' +
                evaluation.id +
                '.pdf',
        );
    };

    const handleViewBulletin = (student: any) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getEvaluation(id);
                setEvaluation(data);
            } catch (e: any) {
                setError(e.message || 'Erreur lors du chargement');
            } finally {
                setLoading(false);
            }
        };
        void loadData();
    }, [id, getEvaluation]);

    if (loading) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Chargement..." />
                <p className="text-gray-500">Chargement...</p>
            </div>
        );
    }

    if (!evaluation) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Évaluation introuvable" />
                <p className="text-gray-500">Évaluation introuvable.</p>
                <Link to="/evaluations" className="text-brand-500 underline">
                    Retour
                </Link>
            </div>
        );
    }

    const isPending = ['en attente', 'En attente de notes'].includes(
        evaluation.evaluation?.status || evaluation.status,
    );
    const students = evaluation.students || [];
    const evaluationData = evaluation.evaluation || evaluation;

    return (
        <>
            <PageMeta
                title={`${evaluationData.title || 'Bulletins'} — ${evaluationData.salleName}`}
                description="Bulletins"
            />
            <PageBreadcrumb
                pageTitle={`${evaluationData.title || 'Bulletins'} — ${evaluationData.salleName} • ${evaluationData.date}`}
            />
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        {evaluationData.title || 'Bulletins'} —{' '}
                        {evaluationData.salleName} • {evaluationData.date}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isPending ? 'En attente de notes' : 'Notes saisies'} •
                        Année {evaluationData.schoolYearId}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/evaluations/${evaluationData.id}/saisie`}>
                        <Button>Saisir les notes</Button>
                    </Link>
                    <Link to="/evaluations">
                        <Button variant="outline">Retour</Button>
                    </Link>
                </div>
            </div>

            {isPending ? (
                <div className="rounded-2xl border bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <Badge color="warning">En attente de notes</Badge>
                    <p className="mt-2 text-sm text-gray-500">
                        Les notes seront saisies plus tard par les enseignants.
                    </p>
                </div>
            ) : (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
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
                                        Salle
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Moyenne
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
                                {students.length > 0 ? (
                                    students.map((student: any) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="py-3 font-medium">
                                                {student.name}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-500">
                                                {student.salleName}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm">
                                                <Badge
                                                    color={
                                                        student.average !==
                                                            null &&
                                                        student.average >= 10
                                                            ? 'success'
                                                            : student.average !==
                                                                null
                                                              ? 'error'
                                                              : 'light'
                                                    }
                                                    size="sm"
                                                >
                                                    {student.average !== null
                                                        ? frenchNumber(
                                                              student.average,
                                                          ) + ' / 20'
                                                        : '—'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleViewBulletin(
                                                            student,
                                                        )
                                                    }
                                                >
                                                    Voir bulletin
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="py-6 text-center text-sm text-gray-500"
                                        >
                                            Aucun élève avec des notes
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-800">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                Bulletin de {selectedStudent.name}
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Fermer
                            </Button>
                        </div>
                        <p className="mb-4 text-sm text-gray-500">
                            {evaluationData.salleName} ·{' '}
                            {evaluationData.title || evaluationData.subject} ·{' '}
                            {evaluationData.date}
                        </p>
                        <p className="mb-4 text-sm">
                            Moyenne générale pondérée :{' '}
                            <strong>
                                {selectedStudent.average !== null
                                    ? frenchNumber(selectedStudent.average) +
                                      ' / 20'
                                    : '—'}
                            </strong>
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
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
                                    {(selectedStudent.rows || []).map(
                                        (row: any, index: number) => (
                                            <tr key={`${row.subject}-${index}`}>
                                                <td className="px-5 py-3 text-gray-800 dark:text-gray-200">
                                                    {row.subject}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {frenchNumber(row.note)}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {frenchNumber(
                                                        row.coefficient,
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right font-medium">
                                                    {frenchNumber(
                                                        row.note *
                                                            row.coefficient,
                                                    )}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Fermer
                            </Button>
                            <Button
                                onClick={() =>
                                    downloadBulletin(selectedStudent)
                                }
                            >
                                Télécharger le bulletin
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
