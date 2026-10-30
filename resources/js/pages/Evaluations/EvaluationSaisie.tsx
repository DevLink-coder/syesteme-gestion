import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import { useEvaluations } from '../../context/EvaluationsContext';
import { useToast } from '../../context/ToastContext';

interface Student {
    id: string;
    name: string;
    note: number | null;
    coefficient: number | null;
    subjectName: string | null;
    subjectId: string | null;
}

export default function EvaluationSaisie() {
    const { id } = useParams<{ id: string }>();
    const { getEvaluationGrades, saveGrade } = useEvaluations();
    const { showToast } = useToast();

    const [evaluation, setEvaluation] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getEvaluationGrades(id);
                setEvaluation(data.evaluation);
                setStudents(data.students);
            } catch (e: any) {
                setError(e.message || 'Erreur lors du chargement');
            } finally {
                setLoading(false);
            }
        };
        void loadData();
    }, [id, getEvaluationGrades]);

    const handleNoteChange = async (
        studentId: string,
        value: string,
        subjectId: string | null,
        subjectName: string | null,
    ) => {
        const num = value === '' ? null : Number(value);
        if (num !== null && (!Number.isFinite(num) || num < 0 || num > 20)) {
            setError('La note doit être entre 0 et 20.');
            return;
        }
        setError(null);

        setSaving((prev) => ({ ...prev, [studentId]: true }));

        try {
            const result = await saveGrade(
                id!,
                studentId,
                num || 0,
                1,
                subjectId,
                subjectName || evaluation.subject,
            );
            if (!result.ok) {
                setError(result.error || "Erreur lors de l'enregistrement");
            } else {
                showToast('Note enregistrée avec succès', 'success');
                // Recharger les données
                const data = await getEvaluationGrades(id!);
                setStudents(data.students);
            }
        } catch (e: any) {
            setError(e.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving((prev) => ({ ...prev, [studentId]: false }));
        }
    };

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

    return (
        <>
            <PageMeta
                title={`Saisie notes — ${evaluation.salleName}`}
                description="Saisie des notes"
            />
            <PageBreadcrumb
                pageTitle={`Saisie — ${evaluation.salleName} • ${evaluation.date}`}
            />
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        Saisie des notes — {evaluation.salleName}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {evaluation.title ? `${evaluation.title} • ` : ''}
                        Évaluation du {evaluation.date} • {evaluation.subject}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/evaluations/${evaluation.id}`}>
                        <Button variant="outline">Voir bulletins</Button>
                    </Link>
                    <Link to="/evaluations">
                        <Button variant="outline">Retour liste</Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="border-error-200 bg-error-50 text-error-700 mb-3 rounded-lg border px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Salle:</span>
                            <span className="ml-2 font-medium text-gray-800 dark:text-white">
                                {evaluation.salleName}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Matière:</span>
                            <span className="ml-2 font-medium text-gray-800 dark:text-white">
                                {evaluation.subject}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50 dark:bg-gray-800">
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    Élève
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    Salle
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                    Matière
                                </th>
                                <th className="px-3 py-2 text-center font-medium text-gray-500">
                                    Coefficient
                                </th>
                                <th className="px-3 py-2 text-center font-medium text-gray-500">
                                    Note
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {students.map((student) => (
                                <tr
                                    key={student.id}
                                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                                >
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-gray-800 dark:text-white">
                                            {student.name}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-gray-600 dark:text-gray-300">
                                            {evaluation.salleName}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-gray-600 dark:text-gray-300">
                                            {student.subjectName ||
                                                evaluation.subject}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="text-gray-600 dark:text-gray-300">
                                            {student.coefficient ?? 1}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <Input
                                            type="number"
                                            value={
                                                student.note !== null
                                                    ? String(student.note)
                                                    : ''
                                            }
                                            onChange={(e) =>
                                                handleNoteChange(
                                                    student.id,
                                                    e.target.value,
                                                    student.subjectId,
                                                    student.subjectName,
                                                )
                                            }
                                            placeholder="—"
                                            className="h-9 text-center"
                                            min="0"
                                            max="20"
                                            disabled={saving[student.id]}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    Saisie administrateur — notes entre 0 et 20. Enregistrement
                    automatique.
                </p>
            </div>
        </>
    );
}
