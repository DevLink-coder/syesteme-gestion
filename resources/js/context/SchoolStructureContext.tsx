import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from 'react';

// import { initialSalles, initialSchoolYears } from '../data/mock/salles';
const initialSalles: any[] = [];
const initialSchoolYears: any[] = [];

interface SchoolStructureContextValue {
    salles: Salle[];
    schoolYears: SchoolYear[];
    // Salles
    createSalle: (
        data: Omit<Salle, 'id' | 'createdAt' | 'subjects'> & {
            subjects?: SubjectCoeff[];
        },
    ) => { ok: boolean; error?: string; salle?: Salle };
    updateSalle: (
        id: string,
        data: Partial<
            Pick<
                Salle,
                | 'name'
                | 'schoolYearId'
                | 'status'
                | 'principalTeacherId'
                | 'roomId'
            >
        >,
    ) => { ok: boolean; error?: string };
    archiveSalle: (id: string) => void;
    unarchiveSalle: (id: string) => void;
    // Matières par salle
    addSubjectToSalle: (
        salleId: string,
        subject: SubjectCoeff,
    ) => { ok: boolean; error?: string };
    updateCoefficient: (
        salleId: string,
        subjectName: string,
        coefficient: number,
    ) => { ok: boolean; error?: string };
    removeSubjectFromSalle: (
        salleId: string,
        subjectName: string,
    ) => { ok: boolean; error?: string };
    // Années
    createSchoolYear: (data: Omit<SchoolYear, 'id'> & { id: string }) => {
        ok: boolean;
        error?: string;
    };
    updateSchoolYear: (
        id: string,
        data: Partial<SchoolYear>,
    ) => { ok: boolean; error?: string };
    setActiveYear: (id: string) => void;
    archiveSchoolYear: (id: string) => { ok: boolean; error?: string };
    // derived helpers
    getSalleById: (id: string) => Salle | undefined;
    getStudentsForSalle: (salle: Salle) => any[];
    getTimetableForSalle: (salle: Salle) => any[];
    getMoyenneForSalle: (salle: Salle) => number | null;
    isSchoolYearUsed: (id: string) => boolean;
    getActiveYear: () => SchoolYear | undefined;
}

const SchoolStructureContext = createContext<
    SchoolStructureContextValue | undefined
>(undefined);

export const SchoolStructureProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [salles, setSalles] = useState<Salle[]>(() =>
        JSON.parse(JSON.stringify(initialSalles)),
    );
    const [schoolYears, setSchoolYears] = useState<SchoolYear[]>(() =>
        JSON.parse(JSON.stringify(initialSchoolYears)),
    );

    useEffect(() => {
        let cancelled = false;

        const loadSchoolStructure = async () => {
            try {
                const [sallesResponse, yearsResponse] = await Promise.all([
                    fetch('/web/salles', {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    }),
                    fetch('/web/school-years?per_page=100', {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    }),
                ]);

                const [sallePayload, yearPayload] = await Promise.all([
                    sallesResponse.ok ? sallesResponse.json() : [],
                    yearsResponse.ok ? yearsResponse.json() : { data: [] },
                ]);
                if (cancelled) return;

                const salleList = Array.isArray(sallePayload)
                    ? sallePayload
                    : Array.isArray(sallePayload?.data)
                      ? sallePayload.data
                      : [];
                const yearList = Array.isArray(yearPayload?.data)
                    ? yearPayload.data
                    : Array.isArray(yearPayload)
                      ? yearPayload
                      : [];

                setSalles(
                    salleList.map((salle: any) => ({
                        id: String(salle.id ?? salle.code ?? ''),
                        roomId: String(salle.roomId ?? salle.room_id ?? ''),
                        name: String(salle.name ?? ''),
                        schoolYearId: String(
                            salle.schoolYearId ?? salle.school_year_id ?? '',
                        ),
                        status: salle.status ?? 'active',
                        principalTeacherId:
                            (salle.principalTeacherId ??
                            salle.principal_teacher_id)
                                ? String(
                                      salle.principalTeacherId ??
                                          salle.principal_teacher_id,
                                  )
                                : undefined,
                        subjects: Array.isArray(salle.subjects)
                            ? salle.subjects
                            : [],
                        createdAt: salle.createdAt ?? salle.created_at ?? '',
                    })),
                );
                setSchoolYears(
                    yearList.map((year: any) => ({
                        id: String(year.id ?? year.code ?? ''),
                        code: String(year.code ?? year.id ?? ''),
                        label: String(year.label ?? year.name ?? ''),
                        startDate: year.startDate ?? year.start_date ?? '',
                        endDate: year.endDate ?? year.end_date ?? '',
                        isActive: Boolean(year.isActive ?? year.is_active),
                        isArchived: Boolean(
                            year.isArchived ?? year.is_archived,
                        ),
                    })),
                );
            } catch {
                // Keep any already loaded/created context values if the API is unavailable.
            }
        };

        void loadSchoolStructure();
        return () => {
            cancelled = true;
        };
    }, []);

    const getSalleById = useCallback(
        (id: string) => salles.find((s) => s.id === id),
        [salles],
    );

    const isSchoolYearUsed = useCallback(
        (id: string) => salles.some((s) => s.schoolYearId === id),
        [salles],
    );

    const getActiveYear = useCallback(
        () => schoolYears.find((y) => y.isActive),
        [schoolYears],
    );

    const createSalle = useCallback(
        (
            data: Omit<Salle, 'id' | 'createdAt' | 'subjects'> & {
                subjects?: SubjectCoeff[];
            },
        ) => {
            const active = schoolYears.find((y) => y.isActive);
            if (active && data.schoolYearId !== active.id) {
                return {
                    ok: false,
                    error: `Seule l'année scolaire active (${active.label}) peut être utilisée.`,
                };
            }
            // unicité : même nom + même année scolaire
            const exists = salles.some(
                (s) =>
                    s.name.trim().toLowerCase() ===
                        data.name.trim().toLowerCase() &&
                    s.schoolYearId === data.schoolYearId,
            );
            if (exists)
                return {
                    ok: false,
                    error: 'Une salle avec ce nom existe déjà pour cette année scolaire.',
                };
            if (!data.name.trim())
                return { ok: false, error: 'Le nom est obligatoire.' };
            if (!data.schoolYearId)
                return {
                    ok: false,
                    error: "L'année scolaire est obligatoire.",
                };
            if (!data.roomId)
                return {
                    ok: false,
                    error: 'Le niveau/classe est obligatoire.',
                };
            const newSalle: Salle = {
                id: `salle-${data.roomId}-${data.schoolYearId}-${Date.now()}`,
                roomId: data.roomId,
                name: data.name.trim(),
                schoolYearId: data.schoolYearId,
                status: data.status || 'active',
                principalTeacherId: data.principalTeacherId,
                subjects: data.subjects ? [...data.subjects] : [],
                createdAt: new Date().toISOString().slice(0, 10),
            };
            setSalles((prev) => [...prev, newSalle]);
            return { ok: true, salle: newSalle };
        },
        [salles, schoolYears],
    );

    const updateSalle = useCallback(
        (
            id: string,
            data: Partial<
                Pick<
                    Salle,
                    | 'name'
                    | 'schoolYearId'
                    | 'status'
                    | 'principalTeacherId'
                    | 'roomId'
                >
            >,
        ) => {
            const target = salles.find((s) => s.id === id);
            if (!target) return { ok: false, error: 'Salle introuvable.' };
            const newName =
                data.name !== undefined ? data.name.trim() : target.name;
            const newYear =
                data.schoolYearId !== undefined
                    ? data.schoolYearId
                    : target.schoolYearId;
            if (!newName)
                return { ok: false, error: 'Le nom est obligatoire.' };
            const active = schoolYears.find((y) => y.isActive);
            if (active && newYear !== active.id) {
                return {
                    ok: false,
                    error: `Seule l'année scolaire active (${active.label}) peut être utilisée.`,
                };
            }
            const duplicate = salles.some(
                (s) =>
                    s.id !== id &&
                    s.name.trim().toLowerCase() === newName.toLowerCase() &&
                    s.schoolYearId === newYear,
            );
            if (duplicate)
                return {
                    ok: false,
                    error: 'Une salle avec ce nom existe déjà pour cette année scolaire.',
                };
            setSalles((prev) =>
                prev.map((s) =>
                    s.id === id
                        ? {
                              ...s,
                              ...data,
                              name: newName,
                              schoolYearId: newYear,
                          }
                        : s,
                ),
            );
            return { ok: true };
        },
        [salles, schoolYears],
    );

    const archiveSalle = useCallback((id: string) => {
        setSalles((prev) =>
            prev.map((s) =>
                s.id === id ? { ...s, status: 'archivée' as const } : s,
            ),
        );
    }, []);

    const unarchiveSalle = useCallback((id: string) => {
        setSalles((prev) =>
            prev.map((s) =>
                s.id === id ? { ...s, status: 'active' as const } : s,
            ),
        );
    }, []);

    const addSubjectToSalle = useCallback(
        (salleId: string, subject: SubjectCoeff) => {
            const salle = salles.find((s) => s.id === salleId);
            if (!salle) return { ok: false, error: 'Salle introuvable.' };
            if (
                salle.subjects.some(
                    (m) => m.name.toLowerCase() === subject.name.toLowerCase(),
                )
            ) {
                return {
                    ok: false,
                    error: 'Cette matière est déjà associée à la salle.',
                };
            }
            if (!subject.name.trim())
                return { ok: false, error: 'Matière obligatoire.' };
            if (
                typeof subject.coefficient !== 'number' ||
                isNaN(subject.coefficient) ||
                subject.coefficient <= 0
            ) {
                return {
                    ok: false,
                    error: 'Coefficient doit être un nombre positif.',
                };
            }
            setSalles((prev) =>
                prev.map((s) =>
                    s.id === salleId
                        ? { ...s, subjects: [...s.subjects, { ...subject }] }
                        : s,
                ),
            );
            return { ok: true };
        },
        [salles],
    );

    const updateCoefficient = useCallback(
        (salleId: string, subjectName: string, coefficient: number) => {
            if (
                typeof coefficient !== 'number' ||
                isNaN(coefficient) ||
                coefficient <= 0
            ) {
                return {
                    ok: false,
                    error: 'Coefficient doit être un nombre positif.',
                };
            }
            setSalles((prev) =>
                prev.map((s) =>
                    s.id === salleId
                        ? {
                              ...s,
                              subjects: s.subjects.map((m) =>
                                  m.name === subjectName
                                      ? { ...m, coefficient }
                                      : m,
                              ),
                          }
                        : s,
                ),
            );
            return { ok: true };
        },
        [],
    );

    const removeSubjectFromSalle = useCallback(
        (salleId: string, subjectName: string) => {
            setSalles((prev) =>
                prev.map((s) =>
                    s.id === salleId
                        ? {
                              ...s,
                              subjects: s.subjects.filter(
                                  (m) => m.name !== subjectName,
                              ),
                          }
                        : s,
                ),
            );
            return { ok: true };
        },
        [],
    );

    // Années scolaires
    const createSchoolYear = useCallback(
        (data: Omit<SchoolYear, 'id'> & { id: string }) => {
            const id = data.id.trim();
            if (!id)
                return {
                    ok: false,
                    error: 'Identifiant requis (ex: 2027-2028).',
                };
            if (schoolYears.some((y) => y.id === id))
                return { ok: false, error: 'Cette année existe déjà.' };
            if (!data.label.trim())
                return { ok: false, error: 'Libellé obligatoire.' };
            const newYear: SchoolYear = {
                id,
                code: id,
                label: data.label.trim(),
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: !!data.isActive,
                isArchived: !!data.isArchived,
            };
            setSchoolYears((prev) => {
                let next = [...prev, newYear];
                if (newYear.isActive) {
                    next = next.map((y) =>
                        y.id === newYear.id ? y : { ...y, isActive: false },
                    );
                }
                return next;
            });
            return { ok: true };
        },
        [schoolYears],
    );

    const updateSchoolYear = useCallback(
        (id: string, data: Partial<SchoolYear>) => {
            const target = schoolYears.find((y) => y.id === id);
            if (!target) return { ok: false, error: 'Année introuvable.' };
            if (data.label !== undefined && !data.label.trim())
                return { ok: false, error: 'Libellé obligatoire.' };
            if (
                data.id &&
                data.id !== id &&
                schoolYears.some((y) => y.id === data.id)
            )
                return { ok: false, error: 'Identifiant déjà utilisé.' };
            setSchoolYears((prev) =>
                prev.map((y) => {
                    if (y.id !== id) return y;
                    return {
                        ...y,
                        ...data,
                        label: data.label ? data.label.trim() : y.label,
                    };
                }),
            );
            // activation unique gérée via setActiveYear si isActive change
            if (data.isActive) {
                setSchoolYears((prev) =>
                    prev.map((y) =>
                        y.id === (data.id || id)
                            ? { ...y, isActive: true }
                            : { ...y, isActive: false },
                    ),
                );
            }
            return { ok: true };
        },
        [schoolYears],
    );

    const setActiveYear = useCallback((id: string) => {
        setSchoolYears((prev) =>
            prev.map((y) => ({ ...y, isActive: y.id === id })),
        );
    }, []);

    const archiveSchoolYear = useCallback(
        (id: string) => {
            if (isSchoolYearUsed(id))
                return {
                    ok: false,
                    error: "Impossible d'archiver : des salles utilisent cette année.",
                };
            const target = schoolYears.find((y) => y.id === id);
            if (!target) return { ok: false, error: 'Année introuvable.' };
            if (target.isActive)
                return {
                    ok: false,
                    error: "Impossible d'archiver l'année active.",
                };
            setSchoolYears((prev) =>
                prev.map((y) => (y.id === id ? { ...y, isArchived: true } : y)),
            );
            return { ok: true };
        },
        [isSchoolYearUsed, schoolYears],
    );

    const getStudentsForSalle = useCallback((salle: Salle) => {
        const salleStudents = (salle as Salle & { students?: any[] }).students;
        return Array.isArray(salleStudents) ? salleStudents : [];
    }, []);

    const getTimetableForSalle = useCallback((salle: Salle) => {
        const salleSlots = (salle as Salle & { slots?: any[] }).slots;
        return Array.isArray(salleSlots) ? salleSlots : [];
    }, []);

    const getMoyenneForSalle = useCallback((_salle: Salle) => null, []);

    const value = useMemo(
        () => ({
            salles,
            schoolYears,
            createSalle,
            updateSalle,
            archiveSalle,
            unarchiveSalle,
            addSubjectToSalle,
            updateCoefficient,
            removeSubjectFromSalle,
            createSchoolYear,
            updateSchoolYear,
            setActiveYear,
            archiveSchoolYear,
            getSalleById,
            getStudentsForSalle,
            getTimetableForSalle,
            getMoyenneForSalle,
            isSchoolYearUsed,
            getActiveYear,
        }),
        [
            salles,
            schoolYears,
            createSalle,
            updateSalle,
            archiveSalle,
            unarchiveSalle,
            addSubjectToSalle,
            updateCoefficient,
            removeSubjectFromSalle,
            createSchoolYear,
            updateSchoolYear,
            setActiveYear,
            archiveSchoolYear,
            getSalleById,
            getStudentsForSalle,
            getTimetableForSalle,
            getMoyenneForSalle,
            isSchoolYearUsed,
            getActiveYear,
        ],
    );

    return (
        <SchoolStructureContext.Provider value={value}>
            {children}
        </SchoolStructureContext.Provider>
    );
};

export const useSchoolStructure = () => {
    const ctx = useContext(SchoolStructureContext);
    if (!ctx)
        throw new Error(
            'useSchoolStructure must be used within SchoolStructureProvider',
        );
    return ctx;
};
