import {
    createContext,
    useContext,
    useCallback,
    useState,
    useMemo,
} from 'react';

interface Evaluation {
    id: string;
    title: string | null;
    salleId: string;
    roomId: string;
    salleName: string;
    date: string;
    subject: string;
    status: string;
    nbMatieres: number;
    nbEleves: number;
    isPending: boolean;
    schoolYearId: string;
}

interface EvaluationDetail {
    evaluation: {
        id: string;
        title: string | null;
        salleId: string;
        roomId: string;
        salleName: string;
        date: string;
        subject: string;
        status: string;
        schoolYearId: string;
    };
    grades: Array<{
        id: string;
        studentId: string;
        studentName: string;
        subjectId: string;
        subjectName: string;
        note: number;
        coefficient: number;
        gradedBy: string;
        syncedAt: string;
    }>;
}

interface EvaluationsContextValue {
    evaluations: Evaluation[];
    loadEvaluations: (schoolYearId?: string) => Promise<void>;
    getEvaluation: (id: string) => Promise<EvaluationDetail>;
    createEvaluation: (data: {
        title: string;
        salleId: string;
        date: string;
        subjects: string[];
        schoolYearId: string;
    }) => Promise<{
        ok: boolean;
        error?: string;
        evaluation?: Evaluation;
    }>;
    getEvaluationGrades: (evaluationId: string) => Promise<{
        evaluation: any;
        students: Array<{
            id: string;
            name: string;
            note: number | null;
            coefficient: number | null;
            subjectName: string | null;
        }>;
    }>;
    saveGrade: (
        evaluationId: string,
        studentId: string,
        note: number,
        coefficient?: number,
    ) => Promise<{
        ok: boolean;
        error?: string;
    }>;
}

const EvaluationsContext = createContext<EvaluationsContextValue | undefined>(
    undefined,
);

function getCsrfToken(): string {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export const EvaluationsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);

    const loadEvaluations = useCallback(async (schoolYearId?: string) => {
        try {
            const query = schoolYearId ? `?school_year_id=${schoolYearId}` : '';
            const res = await fetch(`/web/evaluations${query}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const payload = await res.json();
                const list = Array.isArray(payload?.evaluations)
                    ? payload.evaluations
                    : Array.isArray(payload?.data)
                      ? payload.data
                      : [];
                setEvaluations(list);
            }
        } catch (e) {
            console.error('Failed to load evaluations:', e);
        }
    }, []);

    const getEvaluation = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/web/evaluations/${id}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) {
                throw new Error('Failed to load evaluation');
            }
            const payload = await res.json();
            return payload;
        } catch (e) {
            console.error('Failed to load evaluation:', e);
            throw e;
        }
    }, []);

    const createEvaluation = useCallback(
        async (data: {
            title: string;
            salleId: string;
            date: string;
            subjects: string[];
            schoolYearId: string;
        }) => {
            try {
                const res = await fetch('/web/evaluations', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        title: data.title,
                        salle_id: data.salleId,
                        date: data.date,
                        subjects: data.subjects,
                        school_year_id: data.schoolYearId,
                    }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error: payload.message || 'Erreur lors de la création.',
                    };
                }
                return {
                    ok: true,
                    evaluation: payload.evaluation,
                };
            } catch (error: any) {
                return {
                    ok: false,
                    error: error?.message || 'Erreur lors de la création.',
                };
            }
        },
        [],
    );

    const getEvaluationGrades = useCallback(async (evaluationId: string) => {
        try {
            const res = await fetch(`/web/evaluations/${evaluationId}/grades`, {
                credentials: 'include',
                headers: { accept: 'application/json' },
            });
            if (!res.ok) {
                throw new Error('Failed to load evaluation grades');
            }
            const payload = await res.json();
            return payload;
        } catch (e) {
            console.error('Failed to load evaluation grades:', e);
            throw e;
        }
    }, []);

    const saveGrade = useCallback(
        async (
            evaluationId: string,
            studentId: string,
            note: number,
            coefficient: number = 1,
        ) => {
            try {
                const res = await fetch(
                    `/web/evaluations/${evaluationId}/grades`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-XSRF-TOKEN': getCsrfToken(),
                        },
                        body: JSON.stringify({
                            student_id: studentId,
                            note,
                            coefficient,
                        }),
                    },
                );
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error:
                            payload.message ||
                            "Erreur lors de l'enregistrement.",
                    };
                }
                return { ok: true };
            } catch (error: any) {
                return {
                    ok: false,
                    error: error?.message || "Erreur lors de l'enregistrement.",
                };
            }
        },
        [],
    );

    const value = useMemo(
        () => ({
            evaluations,
            loadEvaluations,
            getEvaluation,
            createEvaluation,
            getEvaluationGrades,
            saveGrade,
        }),
        [
            evaluations,
            loadEvaluations,
            getEvaluation,
            createEvaluation,
            getEvaluationGrades,
            saveGrade,
        ],
    );

    return (
        <EvaluationsContext.Provider value={value}>
            {children}
        </EvaluationsContext.Provider>
    );
};

export const useEvaluations = () => {
    const ctx = useContext(EvaluationsContext);
    if (!ctx)
        throw new Error(
            'useEvaluations must be used within EvaluationsProvider',
        );
    return ctx;
};
