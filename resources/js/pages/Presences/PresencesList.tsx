import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
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
import { useAttendance } from '../../context/AttendanceContext';
import AlphabeticalSortControl, {
    sortAlphabetically,
    type AlphabeticalDirection,
} from '../../components/common/AlphabeticalSortControl';

interface TeacherAttendance {
    id: string;
    name: string;
    email: string;
    present: boolean | null;
    markedAt: string | null;
}

export default function PresencesList() {
    const { sallesAttendance, loadAttendance } = useAttendance();
    const [view, setView] = useState<'salles' | 'enseignants'>('salles');
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [sortDirection, setSortDirection] =
        useState<AlphabeticalDirection>('asc');
    const [teachers, setTeachers] = useState<TeacherAttendance[]>([]);
    const [teacherLoadError, setTeacherLoadError] = useState<string | null>(
        null,
    );
    const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);

    useEffect(() => {
        void loadAttendance(selectedDate);
    }, [selectedDate, loadAttendance]);

    useEffect(() => {
        if (view !== 'enseignants') return;

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
    }, [selectedDate, view]);

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
                        'Impossible d’enregistrer la présence de l’enseignant.',
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
                    : 'Impossible d’enregistrer la présence de l’enseignant.',
            );
        } finally {
            setSavingTeacherId(null);
        }
    };

    const overview = useMemo(
        () =>
            sortAlphabetically(
                sallesAttendance,
                (salle) => salle.name,
                sortDirection,
            ),
        [sallesAttendance, sortDirection],
    );

    return (
        <>
            <PageMeta
                title="Présences | Administration"
                description="Suivi des présences par salle"
            />
            <PageBreadcrumb pageTitle="Présences" />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {view === 'salles'
                            ? "Présences — Vue d'ensemble des salles"
                            : 'Présences des enseignants'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {view === 'salles'
                            ? "Statut de l'appel du jour pour chaque salle"
                            : 'Marquez chaque enseignant comme présent ou absent'}
                    </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <div className="flex gap-2">
                        <Button
                            variant={view === 'salles' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setView('salles')}
                        >
                            Salles
                        </Button>
                        <Button
                            variant={
                                view === 'enseignants' ? 'primary' : 'outline'
                            }
                            size="sm"
                            onClick={() => setView('enseignants')}
                        >
                            Enseignants
                        </Button>
                    </div>
                    {view === 'salles' && (
                        <AlphabeticalSortControl
                            value={sortDirection}
                            onChange={setSortDirection}
                        />
                    )}
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

            {view === 'salles' ? (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                            <TableRow>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Salle
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Statut de l'appel
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Heure de l'appel
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Présents / Absents
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Non appelés
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                >
                                    Total élèves
                                </TableCell>
                                <TableCell
                                    isHeader
                                    className="text-theme-xs py-3 text-right font-medium text-gray-500"
                                >
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {overview.map(
                                ({
                                    id,
                                    name,
                                    statut,
                                    heure,
                                    presents,
                                    absents,
                                    notCalled,
                                    totalStudents,
                                }) => (
                                    <TableRow
                                        key={id}
                                        className={
                                            statut === 'En retard'
                                                ? 'bg-error-50/50 dark:bg-error-500/5'
                                                : ''
                                        }
                                    >
                                        <TableCell className="py-3">
                                            <div className="font-medium text-gray-800 dark:text-white">
                                                {name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            {statut === 'Fait' && (
                                                <Badge
                                                    color="success"
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    Fait
                                                </Badge>
                                            )}
                                            {statut === 'Non fait' && (
                                                <Badge color="light" size="sm">
                                                    Non fait
                                                </Badge>
                                            )}
                                            {statut === 'En retard' && (
                                                <Badge color="error" size="sm">
                                                    En retard
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {heure}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <span className="inline-flex items-center gap-2 text-sm">
                                                <span className="text-success-600 font-medium">
                                                    {presents} présents
                                                </span>
                                                <span className="text-gray-300">
                                                    /
                                                </span>
                                                <span className="text-error-600 font-medium">
                                                    {absents} absents
                                                </span>
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3 text-sm text-gray-500">
                                            {notCalled}
                                        </TableCell>
                                        <TableCell className="py-3 text-sm text-gray-500">
                                            {totalStudents}
                                        </TableCell>
                                        <TableCell className="py-3 text-right">
                                            <Link
                                                to={`/presences/${id}`}
                                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                            >
                                                Voir le détail
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ),
                            )}
                        </TableBody>
                    </Table>
                </div>
                {overview.length === 0 && (
                    <p className="mt-3 text-center text-sm text-gray-500">
                        Aucune salle trouvée pour cette date.
                    </p>
                )}
                </div>
            ) : (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    {teacherLoadError && (
                        <p className="mb-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300">
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
                                            {teacher.present === null ? (
                                                <Badge color="light" size="sm">
                                                    Non marqué
                                                </Badge>
                                            ) : teacher.present ? (
                                                <Badge
                                                    color="success"
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    Présent
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    color="error"
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    Absent
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant={
                                                        teacher.present === true
                                                            ? 'primary'
                                                            : 'outline'
                                                    }
                                                    size="sm"
                                                    disabled={
                                                        savingTeacherId ===
                                                            teacher.id ||
                                                        teacher.present === true
                                                    }
                                                    onClick={() =>
                                                        void markTeacherAttendance(
                                                            teacher.id,
                                                            true,
                                                        )
                                                    }
                                                >
                                                    Présent
                                                </Button>
                                                <Button
                                                    variant={
                                                        teacher.present ===
                                                        false
                                                            ? 'primary'
                                                            : 'outline'
                                                    }
                                                    size="sm"
                                                    disabled={
                                                        savingTeacherId ===
                                                            teacher.id ||
                                                        teacher.present ===
                                                            false
                                                    }
                                                    onClick={() =>
                                                        void markTeacherAttendance(
                                                            teacher.id,
                                                            false,
                                                        )
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
                    {teachers.length === 0 && !teacherLoadError && (
                        <p className="mt-3 text-center text-sm text-gray-500">
                            Aucun enseignant trouvé dans ce centre.
                        </p>
                    )}
                </div>
            )}
        </>
    );
}
