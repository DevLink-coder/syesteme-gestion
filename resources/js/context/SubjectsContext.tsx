import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
} from 'react';

const initialAll: any[] = [];

interface GlobalSubject {
    name: string;
    coefficient: number;
}

interface SubjectsContextValue {
    subjects: GlobalSubject[];
    addSubject: (
        name: string,
        coefficient?: number,
    ) => { ok: boolean; error?: string };
    renameSubject: (
        oldName: string,
        newName: string,
    ) => { ok: boolean; error?: string };
    removeSubject: (name: string) => { ok: boolean; error?: string };
    updateCoefficient: (
        name: string,
        coefficient: number,
    ) => { ok: boolean; error?: string };
}

const SubjectsContext = createContext<SubjectsContextValue | undefined>(
    undefined,
);

export const SubjectsProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [subjects, setSubjects] = useState<GlobalSubject[]>(() =>
        initialAll
            .map((s) => ({ name: s.name, coefficient: s.coefficient }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    );

    const addSubject = useCallback(
        (name: string, coefficient: number = 2) => {
            const trimmed = name.trim();
            if (!trimmed) return { ok: false, error: 'Nom requis.' };
            if (trimmed.length < 2)
                return { ok: false, error: 'Au moins 2 caractères.' };
            if (
                subjects.some(
                    (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
                )
            )
                return { ok: false, error: 'Matière déjà existante.' };
            if (
                typeof coefficient !== 'number' ||
                isNaN(coefficient) ||
                coefficient <= 0
            )
                return { ok: false, error: 'Coefficient positif requis.' };
            setSubjects((prev) =>
                [
                    ...prev,
                    { name: trimmed, coefficient: Math.round(coefficient) },
                ].sort((a, b) => a.name.localeCompare(b.name)),
            );
            return { ok: true };
        },
        [subjects],
    );

    const renameSubject = useCallback(
        (oldName: string, newName: string) => {
            const trimmed = newName.trim();
            if (!trimmed) return { ok: false, error: 'Nom requis.' };
            if (
                subjects.some(
                    (s) =>
                        s.name.toLowerCase() === trimmed.toLowerCase() &&
                        s.name.toLowerCase() !== oldName.toLowerCase(),
                )
            )
                return {
                    ok: false,
                    error: 'Une autre matière porte déjà ce nom.',
                };
            setSubjects((prev) =>
                prev
                    .map((s) =>
                        s.name === oldName ? { ...s, name: trimmed } : s,
                    )
                    .sort((a, b) => a.name.localeCompare(b.name)),
            );
            return { ok: true };
        },
        [subjects],
    );

    const removeSubject = useCallback((name: string) => {
        setSubjects((prev) => prev.filter((s) => s.name !== name));
        return { ok: true };
    }, []);

    const updateCoefficient = useCallback(
        (name: string, coefficient: number) => {
            if (
                typeof coefficient !== 'number' ||
                isNaN(coefficient) ||
                coefficient <= 0
            )
                return { ok: false, error: 'Coefficient positif requis.' };
            setSubjects((prev) =>
                prev.map((s) =>
                    s.name === name
                        ? { ...s, coefficient: Math.round(coefficient) }
                        : s,
                ),
            );
            return { ok: true };
        },
        [],
    );

    const value = useMemo(
        () => ({
            subjects,
            addSubject,
            renameSubject,
            removeSubject,
            updateCoefficient,
        }),
        [subjects, addSubject, renameSubject, removeSubject, updateCoefficient],
    );

    return (
        <SubjectsContext.Provider value={value}>
            {children}
        </SubjectsContext.Provider>
    );
};

export const useSubjects = () => {
    const ctx = useContext(SubjectsContext);
    if (!ctx)
        throw new Error('useSubjects must be used within SubjectsProvider');
    return ctx;
};
