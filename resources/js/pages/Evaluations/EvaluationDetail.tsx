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

export default function EvaluationDetail() {
    const { id } = useParams<{ id: string }>();
    const { getEvaluation } = useEvaluations();
    const [evaluation, setEvaluation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getEvaluation(id);
                setEvaluation(data.evaluation);
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
        evaluation.status,
    );

    return (
        <>
            <PageMeta
                title={`${evaluation.title || 'Bulletins'} — ${evaluation.salleName}`}
                description="Bulletins"
            />
            <PageBreadcrumb
                pageTitle={`${evaluation.title || 'Bulletins'} — ${evaluation.salleName} • ${evaluation.date}`}
            />
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        {evaluation.title || 'Bulletins'} —{' '}
                        {evaluation.salleName} • {evaluation.date}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isPending ? 'En attente de notes' : 'Notes saisies'} •
                        Année {evaluation.schoolYearId}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/evaluations/${evaluation.id}/saisie`}>
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
                                        Matière
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Note
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Coefficient
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {evaluation.grades &&
                                evaluation.grades.length > 0 ? (
                                    evaluation.grades.map((grade: any) => (
                                        <TableRow key={grade.id}>
                                            <TableCell className="py-3 font-medium">
                                                {grade.studentName}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-500">
                                                {grade.subjectName}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm">
                                                <Badge
                                                    color={
                                                        grade.note >= 10
                                                            ? 'success'
                                                            : 'error'
                                                    }
                                                    size="sm"
                                                >
                                                    {grade.note
                                                        .toFixed(2)
                                                        .replace('.', ',')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-500">
                                                {grade.coefficient}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="py-6 text-center text-sm text-gray-500"
                                        >
                                            Aucune note saisie
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </>
    );
}
