import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import { useToast } from '../../context/ToastContext';

interface Salle {
    id: string;
    name: string;
    code: string;
    roomId: string;
}

interface Student {
    id: string;
    name: string;
    code: string;
}

interface Subject {
    id: string;
    name: string;
    coefficient: number;
    note: number | null;
}

type View = 'salles' | 'students' | 'subjects';

export default function EvaluationSaisie() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();

    const [view, setView] = useState<View>('salles');
    const [evaluation, setEvaluation] = useState<any>(null);
    const [salles, setSalles] = useState<Salle[]>([]);
    const [selectedSalle, setSelectedSalle] = useState<Salle | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(
        null,
    );
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const loadSalles = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/web/evaluations/${id}/salles`, {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });
                if (!res.ok) throw new Error('Failed to load salles');
                const payload = await res.json();
                setEvaluation(payload.evaluation);
                setSalles(payload.salles);
            } catch (e: any) {
                setError(e.message || 'Erreur lors du chargement');
            } finally {
                setLoading(false);
            }
        };
        void loadSalles();
    }, [id]);

    const loadStudents = async (salle: Salle) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/web/evaluations/${id}/salles/${salle.id}/students`,
                {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                },
            );
            if (!res.ok) throw new Error('Failed to load students');
            const payload = await res.json();
            setStudents(payload.students);
            setSelectedSalle(salle);
            setView('students');
        } catch (e: any) {
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const loadSubjects = async (student: Student) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/web/evaluations/${id}/salles/${selectedSalle!.id}/students/${student.id}/subjects`,
                {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                },
            );
            if (!res.ok) throw new Error('Failed to load subjects');
            const payload = await res.json();
            setSubjects(payload.subjects);
            setSelectedStudent(student);
            setView('subjects');
        } catch (e: any) {
            setError(e.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleNoteChange = async (subjectId: string, value: string) => {
        const num = value === '' ? null : Number(value);
        if (num !== null && (!Number.isFinite(num) || num < 0 || num > 20)) {
            setError('La note doit être entre 0 et 20.');
            return;
        }
        setError(null);

        setSaving((prev) => ({ ...prev, [subjectId]: true }));

        try {
            const subject = subjects.find((s) => s.id === subjectId);
            const res = await fetch(`/web/evaluations/${id}/grades`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
                    ),
                },
                body: JSON.stringify({
                    student_id: selectedStudent!.id,
                    subject_id: subjectId,
                    subject_name: subject?.name,
                    note: num || 0,
                    coefficient: subject?.coefficient || 1,
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                setError(payload.message || "Erreur lors de l'enregistrement");
            } else {
                showToast('Note enregistrée avec succès', 'success');
                // Recharger les sujets
                await loadSubjects(selectedStudent!);
            }
        } catch (e: any) {
            setError(e.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving((prev) => ({ ...prev, [subjectId]: false }));
        }
    };

    const handleBack = () => {
        if (view === 'subjects') {
            setView('students');
            setSelectedStudent(null);
        } else if (view === 'students') {
            setView('salles');
            setSelectedSalle(null);
        }
    };

    if (loading && view === 'salles') {
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
                title={`Saisie notes — ${evaluation.title}`}
                description="Saisie des notes"
            />
            <PageBreadcrumb
                pageTitle={
                    view === 'salles'
                        ? `Saisie — ${evaluation.title}`
                        : view === 'students'
                          ? `${selectedSalle?.name} — Élèves`
                          : `${selectedStudent?.name} — Matières`
                }
            />
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        {view === 'salles'
                            ? `Saisie des notes — ${evaluation.title}`
                            : view === 'students'
                              ? selectedSalle?.name
                              : selectedStudent?.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {evaluation.date} • {evaluation.subject}
                    </p>
                </div>
                <div className="flex gap-2">
                    {view !== 'salles' && (
                        <Button variant="outline" onClick={handleBack}>
                            Retour
                        </Button>
                    )}
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
                {view === 'salles' && (
                    <>
                        <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">
                            Sélectionner une salle
                        </h3>
                        {loading ? (
                            <p className="text-gray-500">Chargement...</p>
                        ) : salles.length === 0 ? (
                            <p className="text-gray-500">
                                Aucune salle associée à cette évaluation
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {salles.map((salle) => (
                                    <button
                                        key={salle.id}
                                        onClick={() => loadStudents(salle)}
                                        className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                    >
                                        <div className="font-medium text-gray-800 dark:text-white">
                                            {salle.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {salle.code}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {view === 'students' && (
                    <>
                        <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">
                            Sélectionner un élève
                        </h3>
                        {loading ? (
                            <p className="text-gray-500">Chargement...</p>
                        ) : students.length === 0 ? (
                            <p className="text-gray-500">
                                Aucun élève dans cette salle
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {students.map((student) => (
                                    <button
                                        key={student.id}
                                        onClick={() => loadSubjects(student)}
                                        className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                    >
                                        <div className="font-medium text-gray-800 dark:text-white">
                                            {student.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {student.code}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {view === 'subjects' && (
                    <>
                        <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">
                            Matières de {selectedStudent?.name}
                        </h3>
                        {loading ? (
                            <p className="text-gray-500">Chargement...</p>
                        ) : subjects.length === 0 ? (
                            <p className="text-gray-500">
                                Aucune matière associée à cette salle
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
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
                                        {subjects.map((subject) => (
                                            <tr
                                                key={subject.id}
                                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-800 dark:text-white">
                                                        {subject.name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className="text-gray-600 dark:text-gray-300">
                                                        {subject.coefficient}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <Input
                                                        type="number"
                                                        value={
                                                            subject.note !==
                                                            null
                                                                ? String(
                                                                      subject.note,
                                                                  )
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            handleNoteChange(
                                                                subject.id,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="—"
                                                        className="h-9 text-center"
                                                        min="0"
                                                        max="20"
                                                        disabled={
                                                            saving[subject.id]
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
