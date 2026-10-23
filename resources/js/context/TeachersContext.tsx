import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
} from 'react';

// import { initialTeachers } from '../data/mock/users';
const initialTeachers: any[] = [];
const timetable: any[] = [];

export type TeacherStatus = 'active' | 'suspended' | 'expelled';

export interface StatusHistoryEntry {
    from: TeacherStatus;
    to: TeacherStatus;
    date: string; // ISO
    reason?: string;
    actor?: string;
}

export interface Teacher extends User {
    // extend User but ensure status is TeacherStatus
    status: TeacherStatus;
    createdAt: string;
    history: StatusHistoryEntry[];
}

function toTeacherStatus(s: string): TeacherStatus {
    if (s === 'suspended') return 'suspended';
    if (s === 'expelled') return 'expelled';
    return 'active';
}

interface TeachersContextValue {
    teachers: Teacher[];
    getTeacherById: (id: string) => Teacher | undefined;
    getSlotsForTeacher: (teacherId: string) => typeof timetable;
    createTeacher: (data: { name: string; teaches?: User['teaches'] }) => {
        ok: boolean;
        error?: string;
        teacher?: Teacher;
    };
    suspendTeacher: (
        id: string,
        reason?: string,
    ) => { ok: boolean; error?: string; impactedSlots: typeof timetable };
    expelTeacher: (
        id: string,
        reason?: string,
    ) => { ok: boolean; error?: string; impactedSlots: typeof timetable };
    reactivateTeacher: (id: string) => { ok: boolean; error?: string };
    getHistory: (id: string) => StatusHistoryEntry[];
}

const TeachersContext = createContext<TeachersContextValue | undefined>(
    undefined,
);

export const TeachersProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [teachersState, setTeachersState] = useState<Teacher[]>(() =>
        initialTeachers
            .map((t) => ({
                ...t,
                status: toTeacherStatus(t.status),
                createdAt: '2026-08-15',
                history: [
                    {
                        from: 'active',
                        to: toTeacherStatus(t.status),
                        date: '2026-08-15T08:00:00.000Z',
                        actor: 'Système',
                        reason: 'Import initial',
                    },
                ].filter((h) => h.from !== h.to) as StatusHistoryEntry[],
                // if status is active, history empty (no change)
                // we keep history empty for active to avoid fake entry
            }))
            .map((t) => ({
                ...t,
                history: t.status === 'active' ? [] : t.history,
            })),
    );

    const getTeacherById = useCallback(
        (id: string) => teachersState.find((t) => t.id === id),
        [teachersState],
    );

    const getSlotsForTeacher = useCallback((teacherId: string) => {
        return timetable.filter((slot) => slot.teacherId === teacherId);
    }, []);

    const createTeacher = useCallback(
        (data: { name: string; teaches?: User['teaches'] }) => {
            const name = data.name.trim();
            if (!name) return { ok: false, error: 'Le nom est obligatoire.' };
            if (name.length < 2)
                return {
                    ok: false,
                    error: 'Le nom doit contenir au moins 2 caractères.',
                };
            if (
                teachersState.some(
                    (t) => t.name.trim().toLowerCase() === name.toLowerCase(),
                )
            ) {
                return {
                    ok: false,
                    error: 'Un enseignant avec ce nom existe déjà.',
                };
            }
            const newId = `t-${String(teachersState.length + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
            const newTeacher: Teacher = {
                id: newId,
                name,
                role: 'teacher',
                status: 'active',
                email: `contact@college-liberte.cm`,
                telephone: '—',
                teaches: data.teaches || [],
                createdAt: new Date().toISOString().slice(0, 10),
                history: [],
            };
            setTeachersState((prev) => [...prev, newTeacher]);
            return { ok: true, teacher: newTeacher };
        },
        [teachersState],
    );

    const pushHistory = (
        teacher: Teacher,
        to: TeacherStatus,
        reason?: string,
    ): StatusHistoryEntry => {
        const entry: StatusHistoryEntry = {
            from: teacher.status,
            to,
            date: new Date().toISOString(),
            reason: reason || undefined,
            actor: 'Administrateur',
        };
        return entry;
    };

    const suspendTeacher = useCallback(
        (id: string, reason?: string) => {
            const teacher = teachersState.find((t) => t.id === id);
            if (!teacher)
                return {
                    ok: false,
                    error: 'Enseignant introuvable.',
                    impactedSlots: [] as typeof timetable,
                };
            if (teacher.status === 'suspended')
                return {
                    ok: false,
                    error: 'Enseignant déjà suspendu.',
                    impactedSlots: getSlotsForTeacher(id),
                };
            if (teacher.status === 'expelled')
                return {
                    ok: false,
                    error: 'Un enseignant renvoyé ne peut pas être suspendu.',
                    impactedSlots: getSlotsForTeacher(id),
                };
            const impactedSlots = getSlotsForTeacher(id);
            const entry = pushHistory(teacher, 'suspended', reason);
            setTeachersState((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              status: 'suspended' as TeacherStatus,
                              history: [...t.history, entry],
                          }
                        : t,
                ),
            );
            return { ok: true, impactedSlots };
        },
        [teachersState, getSlotsForTeacher],
    );

    const expelTeacher = useCallback(
        (id: string, reason?: string) => {
            const teacher = teachersState.find((t) => t.id === id);
            if (!teacher)
                return {
                    ok: false,
                    error: 'Enseignant introuvable.',
                    impactedSlots: [] as typeof timetable,
                };
            if (teacher.status === 'expelled')
                return {
                    ok: false,
                    error: 'Enseignant déjà renvoyé.',
                    impactedSlots: getSlotsForTeacher(id),
                };
            const impactedSlots = getSlotsForTeacher(id);
            const entry = pushHistory(teacher, 'expelled', reason);
            setTeachersState((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              status: 'expelled' as TeacherStatus,
                              history: [...t.history, entry],
                          }
                        : t,
                ),
            );
            return { ok: true, impactedSlots };
        },
        [teachersState, getSlotsForTeacher],
    );

    const reactivateTeacher = useCallback(
        (id: string) => {
            const teacher = teachersState.find((t) => t.id === id);
            if (!teacher)
                return { ok: false, error: 'Enseignant introuvable.' };
            if (teacher.status !== 'suspended')
                return {
                    ok: false,
                    error: 'Seuls les enseignants suspendus peuvent être réactivés.',
                };
            const entry = pushHistory(teacher, 'active');
            setTeachersState((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              status: 'active' as TeacherStatus,
                              history: [...t.history, entry],
                          }
                        : t,
                ),
            );
            return { ok: true };
        },
        [teachersState],
    );

    const getHistory = useCallback(
        (id: string) => teachersState.find((t) => t.id === id)?.history || [],
        [teachersState],
    );

    const value = useMemo(
        () => ({
            teachers: teachersState,
            getTeacherById,
            getSlotsForTeacher,
            createTeacher,
            suspendTeacher,
            expelTeacher,
            reactivateTeacher,
            getHistory,
        }),
        [
            teachersState,
            getTeacherById,
            getSlotsForTeacher,
            createTeacher,
            suspendTeacher,
            expelTeacher,
            reactivateTeacher,
            getHistory,
        ],
    );

    return (
        <TeachersContext.Provider value={value}>
            {children}
        </TeachersContext.Provider>
    );
};

export const useTeachers = () => {
    const ctx = useContext(TeachersContext);
    if (!ctx)
        throw new Error('useTeachers must be used within TeachersProvider');
    return ctx;
};
