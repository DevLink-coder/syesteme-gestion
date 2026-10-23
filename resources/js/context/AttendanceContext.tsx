import {
    createContext,
    useContext,
    useCallback,
    useState,
    useMemo,
} from 'react';

interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    parentName: string;
    parentWhatsApp: string;
    present: boolean | null;
    heureAppel: string | null;
    whatsappStatus: string | null;
}

interface AttendanceSalle {
    id: string;
    name: string;
    roomId: string;
    schoolYearId: string;
    statut: string;
    heure: string;
    presents: number;
    absents: number;
    notCalled: number;
    totalStudents: number;
    lastDate: string;
}

interface AttendanceDetail {
    salle: {
        id: string;
        name: string;
        roomId: string;
        schoolYearId: string;
        schoolYearLabel: string;
    };
    students: AttendanceRecord[];
    slots: any[];
    date: string;
}

interface AttendanceContextValue {
    sallesAttendance: AttendanceSalle[];
    loadAttendance: (date?: string) => Promise<void>;
    getSalleAttendance: (
        salleId: string,
        date?: string,
    ) => Promise<AttendanceDetail>;
    saveAttendance: (
        salleId: string,
        date: string,
        attendances: AttendanceRecord[],
    ) => Promise<{
        ok: boolean;
        error?: string;
    }>;
}

const AttendanceContext = createContext<AttendanceContextValue | undefined>(
    undefined,
);

function getCsrfToken(): string {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [sallesAttendance, setSallesAttendance] = useState<AttendanceSalle[]>(
        [],
    );

    const loadAttendance = useCallback(async (date?: string) => {
        try {
            const queryDate = date || new Date().toISOString().slice(0, 10);
            const res = await fetch(`/web/attendances?date=${queryDate}`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const payload = await res.json();
                const list = Array.isArray(payload?.salles)
                    ? payload.salles
                    : Array.isArray(payload?.data)
                      ? payload.data
                      : [];
                setSallesAttendance(list);
            }
        } catch (e) {
            console.error('Failed to load attendance:', e);
        }
    }, []);

    const getSalleAttendance = useCallback(
        async (salleId: string, date?: string) => {
            try {
                const queryDate = date || new Date().toISOString().slice(0, 10);
                const res = await fetch(
                    `/web/attendances/${salleId}?date=${queryDate}`,
                    {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    },
                );
                if (!res.ok) {
                    throw new Error('Failed to load salle attendance');
                }
                const payload = await res.json();
                return payload;
            } catch (e) {
                console.error('Failed to load salle attendance:', e);
                throw e;
            }
        },
        [],
    );

    const saveAttendance = useCallback(
        async (
            salleId: string,
            date: string,
            attendances: AttendanceRecord[],
        ) => {
            try {
                const res = await fetch('/web/attendances', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        salle_id: salleId,
                        date,
                        attendances: attendances.map((a) => ({
                            student_id: a.studentId,
                            present: a.present ?? false,
                            heure_appel: a.heureAppel,
                        })),
                    }),
                });
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
            sallesAttendance,
            loadAttendance,
            getSalleAttendance,
            saveAttendance,
        }),
        [sallesAttendance, loadAttendance, getSalleAttendance, saveAttendance],
    );

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    );
};

export const useAttendance = () => {
    const ctx = useContext(AttendanceContext);
    if (!ctx)
        throw new Error('useAttendance must be used within AttendanceProvider');
    return ctx;
};
