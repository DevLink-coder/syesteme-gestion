import { useEffect, useState } from 'react';
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

interface TeacherAttendance {
    id: string;
    name: string;
    email: string;
    present: boolean | null;
    markedAt: string | null;
}

export default function PresencesEnseignant() {
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [teachers, setTeachers] = useState<TeacherAttendance[]>([]);
    const [teacherLoadError, setTeacherLoadError] = useState<string | null>(
        null,
    );
    const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setTeacherLoadError(null);
        fetch(`/web/teacher-attendances?date=${selectedDate}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(
                        payload.message ||
                            'Impossible de charger les présences des enseignants.',
                    );
                }
                if (!cancelled) {
                    setTeachers(
                        Array.isArray(payload.teachers) ? payload.teachers : [],
                    );
                }
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setTeacherLoadError(
                        error instanceof Error
                            ? error.message
                            : 'Impossible de charger les présences des enseignants.',
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedDate]);

    const markTeacherAttendance = async (
        teacherId: string,
        present: boolean,
    ) => {
        setSavingTeacherId(teacherId);
        setTeacherLoadError(null);
        try {
            const response = await fetch('/web/teacher-attendances', {
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
                    teacher_id: teacherId,
                    date: selectedDate,
                    present,
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    payload.message ||
                        "Impossible d'enregistrer la présence de l'enseignant.",
                );
            }
            setTeachers((current) =>
                current.map((teacher) =>
                    teacher.id === teacherId ? payload.teacher : teacher,
                ),
            );
        } catch (error: unknown) {
            setTeacherLoadError(
                error instanceof Error
                    ? error.message
                    : "Impossible d'enregistrer la présence de l'enseignant.",
            );
        } finally {
            setSavingTeacherId(null);
        }
    };

    return (
        <>
            <PageMeta
                title="Présences Enseignants | Administration"
                description="Suivi des présences des enseignants"
            />
            <PageBreadcrumb pageTitle="Présences — Enseignant" />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Présences — Vue d'ensemble des enseignants
                    </h2>
                    <p className="text-sm text-gray-500">
                        Marquez chaque enseignant comme présent ou absent
                    </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <button
                            type="button"
                            onClick={() => {
                                const date = new Date(selectedDate);
                                date.setDate(date.getDate() - 1);
                                setSelectedDate(
                                    date.toISOString().slice(0, 10),
                                );
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-r border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const date = new Date(selectedDate);
                                date.setDate(date.getDate() + 1);
                                setSelectedDate(
                                    date.toISOString().slice(0, 10),
                                );
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-50 dark:text-gray-300"
                        >
                            ›
                        </button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setSelectedDate(
                                new Date().toISOString().slice(0, 10),
                            )
                        }
                    >
                        Aujourd'hui
                    </Button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="focus:border-brand-500 focus:ring-brand-500/20 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:outline-none sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    />
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                {teacherLoadError && (
                    <p className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300 mb-3 rounded-lg border px-3 py-2 text-sm">
                        {teacherLoadError}
                    </p>
                )}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="py-3 text-left text-sm font-medium text-gray-500"
                                >
                                    Enseignant
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="py-3 text-left text-sm font-medium text-gray-500"
                                >
                                    Statut
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="py-3 text-right text-sm font-medium text-gray-500"
                                >
                                    Marquer la présence
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {teachers.map((teacher) => (
                                <TableRow key={teacher.id}>
                                    <TableCell className="py-3">
                                        <div className="font-medium text-gray-800 dark:text-white">
                                            {teacher.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {teacher.email}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        {teacher.present === true && (
                                            <Badge color="success" size="sm">
                                                Présent
                                            </Badge>
                                        )}
                                        {teacher.present === false && (
                                            <Badge color="error" size="sm">
                                                Absent
                                            </Badge>
                                        )}
                                        {teacher.present === null && (
                                            <Badge color="light" size="sm">
                                                Non marqué
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant={
                                                    teacher.present === true
                                                        ? 'primary'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    markTeacherAttendance(
                                                        teacher.id,
                                                        true,
                                                    )
                                                }
                                                disabled={
                                                    savingTeacherId ===
                                                    teacher.id
                                                }
                                            >
                                                Présent
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={
                                                    teacher.present === false
                                                        ? 'primary'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    markTeacherAttendance(
                                                        teacher.id,
                                                        false,
                                                    )
                                                }
                                                disabled={
                                                    savingTeacherId ===
                                                    teacher.id
                                                }
                                            >
                                                Absent
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {teachers.length === 0 && (
                    <p className="mt-3 text-center text-sm text-gray-500">
                        Aucun enseignant trouvé pour cette date.
                    </p>
                )}
            </div>
        </>
    );
}
