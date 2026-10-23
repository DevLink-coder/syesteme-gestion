import { useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import StyledSelect from '../../components/ui/select/StyledSelect';
import { useToast } from '../../context/ToastContext';

interface TeacherEvaluation {
    id: string;
    title: string | null;
    roomId: string;
    salleName: string | null;
    date: string;
    subjects: Array<{ id: string; name: string }>;
}

interface GradeStudent {
    id: string;
    code: string;
    name: string;
    note: number | null;
    coefficient: number;
}

export default function SaisieNotes() {
    const { showToast } = useToast();
    const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
    const [students, setStudents] = useState<GradeStudent[]>([]);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [dirtyNotes, setDirtyNotes] = useState<Record<string, boolean>>({});
    const [evaluationsLoading, setEvaluationsLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedEvalId, setSelectedEvalId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

    const selectedEval = evaluations.find(
        (evaluation) => evaluation.id === selectedEvalId,
    );
    const selectedSubject = selectedEval?.subjects.find(
        (subject) => subject.id === selectedSubjectId,
    );

    useEffect(() => {
        let cancelled = false;
        fetch('/web/teacher-portal/evaluations', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message ||
                            'Impossible de charger les évaluations.',
                    );
                if (!cancelled)
                    setEvaluations(
                        Array.isArray(payload.data) ? payload.data : [],
                    );
            })
            .catch((loadError: any) => {
                if (!cancelled)
                    setError(
                        loadError.message ||
                            'Impossible de charger les évaluations.',
                    );
            })
            .finally(() => {
                if (!cancelled) setEvaluationsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedEvalId || !selectedSubjectId) {
            setStudents([]);
            setNotes({});
            setDirtyNotes({});
            return;
        }

        let cancelled = false;
        setStudentsLoading(true);
        setError(null);
        fetch(
            `/web/teacher-portal/evaluations/${selectedEvalId}/grades?subject_id=${selectedSubjectId}`,
            {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            },
        )
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message || 'Impossible de charger les élèves.',
                    );
                if (!cancelled) {
                    const roster = Array.isArray(payload.students)
                        ? payload.students
                        : [];
                    setStudents(roster);
                    setNotes(
                        Object.fromEntries(
                            roster.map((student: GradeStudent) => [
                                student.id,
                                student.note == null
                                    ? ''
                                    : String(student.note),
                            ]),
                        ),
                    );
                    setDirtyNotes({});
                }
            })
            .catch((loadError: any) => {
                if (!cancelled) {
                    setStudents([]);
                    setNotes({});
                    setError(
                        loadError.message ||
                            'Impossible de charger les élèves.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setStudentsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedEvalId, selectedSubjectId]);

    const handleSave = async () => {
        if (!selectedEval || !selectedSubject || saving) return;
        const changedStudents = students.filter(
            (student) => dirtyNotes[student.id],
        );
        if (changedStudents.length === 0) {
            setError('Aucune note modifiée.');
            return;
        }
        if (
            changedStudents.some(
                (student) =>
                    notes[student.id] === '' ||
                    Number.isNaN(Number(notes[student.id])),
            )
        ) {
            setError('Chaque note modifiée doit être comprise entre 0 et 20.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            for (const student of changedStudents) {
                const response = await fetch(
                    `/web/teacher-portal/evaluations/${selectedEval.id}/grades`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-XSRF-TOKEN': decodeURIComponent(
                                document.cookie.match(
                                    /XSRF-TOKEN=([^;]+)/,
                                )?.[1] || '',
                            ),
                        },
                        body: JSON.stringify({
                            student_id: student.id,
                            subject_id: selectedSubject.id,
                            note: Number(notes[student.id]),
                        }),
                    },
                );
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message ||
                            `Impossible d’enregistrer la note de ${student.name}.`,
                    );
            }
            setDirtyNotes({});
            showToast('Notes enregistrées.', 'success');
        } catch (saveError: any) {
            setError(
                saveError.message ||
                    'Erreur lors de l’enregistrement des notes.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Saisie des notes | Espace Enseignant"
                description="UC-11"
            />
            <PageBreadcrumb pageTitle="Saisie des notes" />

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="font-semibold text-gray-800 dark:text-white">
                    Saisie des notes
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    Seules les évaluations et matières qui vous sont affectées
                    sont disponibles.
                </p>
                {error && (
                    <p className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300 mt-3 rounded-lg border px-3 py-2 text-sm">
                        {error}
                    </p>
                )}

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Évaluation
                        </label>
                        <StyledSelect
                            value={selectedEvalId}
                            onChange={(v) => {
                                setSelectedEvalId(v);
                                setSelectedSubjectId('');
                                setError(null);
                            }}
                            placeholder={
                                evaluationsLoading
                                    ? 'Chargement...'
                                    : 'Choisir une évaluation'
                            }
                            options={evaluations.map((evaluation) => ({
                                value: evaluation.id,
                                label: `${evaluation.title || 'Évaluation'} — ${evaluation.salleName || evaluation.roomId} — ${evaluation.date}`,
                            }))}
                        />
                        {!evaluationsLoading && evaluations.length === 0 && (
                            <p className="mt-1 text-xs text-gray-400">
                                Aucune évaluation disponible pour vos
                                affectations.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Matière
                        </label>
                        <StyledSelect
                            value={selectedSubjectId}
                            onChange={(value) => {
                                setSelectedSubjectId(value);
                                setError(null);
                            }}
                            placeholder={
                                selectedEval
                                    ? 'Choisir une matière'
                                    : "Choisir d'abord une évaluation"
                            }
                            options={(selectedEval?.subjects || []).map(
                                (subject) => ({
                                    value: subject.id,
                                    label: subject.name,
                                }),
                            )}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={handleSave}
                            disabled={
                                !selectedEval ||
                                !selectedSubject ||
                                saving ||
                                !Object.values(dirtyNotes).some(Boolean)
                            }
                            className="w-full"
                        >
                            {saving
                                ? 'Enregistrement...'
                                : 'Enregistrer les notes'}
                        </Button>
                    </div>
                </div>
            </div>

            {selectedEval && selectedSubject && (
                <div className="mt-6 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold">
                            {selectedSubject.name} —{' '}
                            {selectedEval.salleName || selectedEval.roomId} •{' '}
                            {selectedEval.date}
                        </h4>
                        <Badge color="light" size="sm">
                            {students.length} élève(s)
                        </Badge>
                    </div>
                    {studentsLoading ? (
                        <p className="py-6 text-center text-sm text-gray-500">
                            Chargement des élèves...
                        </p>
                    ) : students.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            Aucun élève inscrit dans cette salle.
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800">
                                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                                            Élève
                                        </th>
                                        <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                                            Note /20
                                        </th>
                                        <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                                            Coefficient
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
                                    {students.map((student) => {
                                        return (
                                            <tr
                                                key={student.id}
                                                className="hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                                            >
                                                <td className="px-3 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {student.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {student.code}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="mx-auto max-w-[100px]">
                                                        <Input
                                                            type="number"
                                                            value={
                                                                notes[
                                                                    student.id
                                                                ] ?? ''
                                                            }
                                                            onChange={(e) => {
                                                                const value =
                                                                    e.target
                                                                        .value;
                                                                if (
                                                                    value !==
                                                                        '' &&
                                                                    (Number.isNaN(
                                                                        Number(
                                                                            value,
                                                                        ),
                                                                    ) ||
                                                                        Number(
                                                                            value,
                                                                        ) < 0 ||
                                                                        Number(
                                                                            value,
                                                                        ) > 20)
                                                                )
                                                                    return;
                                                                setNotes(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [student.id]:
                                                                            value,
                                                                    }),
                                                                );
                                                                setDirtyNotes(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [student.id]: true,
                                                                    }),
                                                                );
                                                            }}
                                                            placeholder="—"
                                                            min="0"
                                                            max="20"
                                                            step={0.25}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {student.coefficient}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
