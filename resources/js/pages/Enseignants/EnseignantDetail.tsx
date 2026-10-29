import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import PageMeta from '../../components/common/PageMeta';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Modal } from '../../components/ui/modal';
import { useTeachers } from '../../context/TeachersContext';
// import { ROOM_LABELS } from '../../data/mock/stats';
const ROOM_LABELS: Record<string, string> = {};
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { useAlertModal } from '../../context/AlertModalContext';
import {
    addDocumentFooters,
    addDocumentHeading,
    addStructuredTable,
    formatPdfDate,
} from '../../lib/structuredPdf';

const statusLabel: Record<string, string> = {
    active: 'Actif',
    suspended: 'Suspendu',
    expelled: 'Renvoyé',
};
const statusColor: Record<string, 'success' | 'warning' | 'error'> = {
    active: 'success',
    suspended: 'warning',
    expelled: 'error',
};

const DAYS_G = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche',
] as const;
type DayG = (typeof DAYS_G)[number];
const SUBJECT_COLORS_G: Record<string, string> = {
    Mathématiques: '#465FFF',
    Français: '#12B76A',
    Anglais: '#F79009',
    'Physique-Chimie-Technologie': '#7A5AF8',
    Physique: '#7A5AF8',
    Chimie: '#EE46BC',
    SVT: '#039855',
    ECM: '#026AA2',
    'Histoire-Géo': '#026AA2',
    EPS: '#F04438',
    Espagnol: '#F79009',
    Allemand: '#363F72',
    Informatique: '#0BA5EC',
    'Français/Philosophie': '#12B76A',
};
function subjectColorG(s: string) {
    return SUBJECT_COLORS_G[s] || '#667085';
}
function timeToMinutesG(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export default function EnseignantDetail() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const { showAlert } = useAlertModal();
    const navigate = useNavigate();
    const {
        getTeacherById,
        suspendTeacher,
        expelTeacher,
        reactivateTeacher,
        getHistory,
    } = useTeachers();
    const { salles } = useSchoolStructure();
    const [teacherState, setTeacherState] = useState<any>(() =>
        id ? getTeacherById(id) : null,
    );
    const [teacherLoading, setTeacherLoading] = useState(!teacherState);
    useEffect(() => {
        if (teacherState || !id) return;
        fetch(`/web/teachers/${id}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data && data.id) {
                    setTeacherState({
                        id: String(data.id),
                        code: data.code,
                        name: data.name,
                        email: data.email,
                        role: data.role,
                        status: data.status,
                        teaches: (data.teaches || []).map((t: any) => ({
                            subject: t.subject,
                            roomId: t.roomId,
                            coefficient: t.coefficient,
                        })),
                        createdAt: data.created_at?.slice(0, 10) || '',
                        attendances: data.attendances || [],
                    });
                }
                setTeacherLoading(false);
            })
            .catch(() => setTeacherLoading(false));
    }, [id, teacherState]);
    const teacher = teacherState;

    const [pendingAction, setPendingAction] = useState<
        'suspend' | 'expel' | null
    >(null);
    const [reason, setReason] = useState('');
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const d = new Date(2026, 8, 14);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const { showToast } = useToast();
    const [slots, setSlots] = useState<any[]>([]);
    useEffect(() => {
        if (!teacher) return;
        const codeToId: Record<string, number> = {
            't-01': 2,
            't-02': 3,
            't-03': 4,
            't-04': 5,
            't-05': 6,
            't-06': 7,
            't-07': 8,
            't-08': 9,
        };
        const dbId = codeToId[teacher.id] || 2;
        const weekStr = currentWeekStart.toISOString().slice(0, 10);
        fetch(`/web/timetable?teacher_id=${dbId}&week_start=${weekStr}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any[]) => {
                const mapped = (data || []).map((r: any) => ({
                    id: r.id,
                    day: r.day,
                    startTime: r.start_time?.slice(0, 5),
                    endTime: r.end_time?.slice(0, 5),
                    subject: r.subject_name,
                    roomId: r.room_id,
                }));
                setSlots(mapped);
            })
            .catch(() => setSlots([]));
    }, [teacher, currentWeekStart]);

    const handleExportPdf = () => {
        if (!teacher) return;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const date = formatPdfDate();
        addDocumentHeading(
            pdf,
            'Emploi du temps — ' + teacher.name,
            [
                'Année scolaire 2026-2027',
                slots.length + ' créneaux · Généré le ' + date,
            ],
            currentUser?.centerName || undefined,
        );
        const orderedDays = DAYS_G.slice(0, 5);
        const body = [...slots]
            .sort(
                (a, b) =>
                    orderedDays.indexOf(a.day) - orderedDays.indexOf(b.day) ||
                    timeToMinutesG(a.startTime) - timeToMinutesG(b.startTime),
            )
            .map((slot) => {
                const room = salles.find(
                    (item: any) =>
                        String(item.roomId) === String(slot.roomId) ||
                        String(item.id) === String(slot.roomId),
                );
                return [
                    slot.day,
                    slot.startTime + '–' + slot.endTime,
                    room?.name || slot.roomId,
                    slot.subject || '—',
                    teacher.name,
                ];
            });
        addStructuredTable(pdf, {
            startY: 39,
            head: [['Jour', 'Horaire', 'Salle', 'Matière', 'Enseignant']],
            body,
            styles: { fontSize: 10 },
        });
        addDocumentFooters(pdf, date);
        pdf.save(`emploi-du-temps-${teacher.id}-2026-2027.pdf`);
        showToast('PDF téléchargé', 'success');
    };

    if (teacherLoading) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Chargement..." />
                <p className="text-gray-500">Chargement de l'enseignant...</p>
            </div>
        );
    }
    if (!teacher) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Enseignant introuvable" />
                <p className="text-gray-500">Enseignant introuvable.</p>
                <Link to="/enseignants" className="text-brand-500 underline">
                    Retour à la liste
                </Link>
            </div>
        );
    }

    const history = getHistory(teacher.id);
    const matieres = teacher.teaches;

    const handleAction = () => {
        if (!pendingAction) return;
        if (pendingAction === 'suspend') {
            const res = suspendTeacher(teacher.id, reason || undefined);
            if (!res.ok) showToast(res.error || 'Erreur', 'error');
            else showToast('Enseignant suspendu', 'success');
        } else {
            const res = expelTeacher(teacher.id, reason || undefined);
            if (!res.ok) showToast(res.error || 'Erreur', 'error');
            else showToast('Enseignant renvoyé', 'success');
        }
        setPendingAction(null);
        setReason('');
    };

    const impactedSlots = slots;

    return (
        <>
            <PageMeta
                title={`${teacher.name} | Fiche enseignant`}
                description="Fiche enseignant"
            />
            <PageBreadcrumb pageTitle={teacher.name} />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-3 text-2xl font-semibold text-gray-800 dark:text-white">
                        {teacher.name}
                        <Badge color={statusColor[teacher.status] || 'light'}>
                            {statusLabel[teacher.status] || teacher.status}
                        </Badge>
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {teacher.id} • Créé le {teacher.createdAt} •{' '}
                        {teacher.role}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/enseignants')}
                    >
                        Retour
                    </Button>
                    {teacher.status === 'active' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setPendingAction('suspend')}
                            >
                                Suspendre
                            </Button>
                            <Button onClick={() => setPendingAction('expel')}>
                                Renvoyer
                            </Button>
                        </>
                    )}
                    {teacher.status === 'suspended' && (
                        <Button
                            onClick={() => {
                                const r = reactivateTeacher(teacher.id);
                                if (!r.ok)
                                    showAlert(
                                        r.error || 'Une erreur est survenue.',
                                    );
                            }}
                        >
                            Réactiver
                        </Button>
                    )}
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Matières assignées</p>
                    <p className="mt-1 text-2xl font-semibold">
                        {matieres.length}
                    </p>
                </div>
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Créneaux</p>
                    <p className="mt-1 text-2xl font-semibold">
                        {slots.length}
                    </p>
                </div>
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Salles concernées</p>
                    <p className="mt-1 text-2xl font-semibold">
                        {new Set(matieres.map((m: any) => m.roomId)).size}
                    </p>
                </div>
            </div>

            <div className="mb-4 rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                    Matières assignées
                </h3>
                {matieres.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Aucune matière assignée.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                                <TableRow>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Matière
                                    </TableCell>
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
                                        Année scolaire
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Coefficient
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {matieres.map((m: any, idx: number) => {
                                    const salle = salles.find(
                                        (s) => s.roomId === m.roomId,
                                    );
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell className="py-3 font-medium">
                                                {m.subject}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {(ROOM_LABELS as any)[
                                                    m.roomId
                                                ] || m.roomId}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {salle?.schoolYearId ||
                                                    '2026–2027'}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {m.coefficient}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="mb-4 w-full max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <div className="w-full max-w-full bg-white p-6 dark:bg-gray-950 dark:text-gray-100">
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="fc-toolbar-chunk flex items-center gap-2 self-start">
                                <div className="fc-button-group inline-flex rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentWeekStart(
                                                (d) =>
                                                    new Date(
                                                        d.getTime() - 604800000,
                                                    ),
                                            )
                                        }
                                        title="Précédent"
                                        aria-label="Précédent"
                                        className="fc-prev-button fc-button fc-button-primary inline-flex h-9 w-9 items-center justify-center border-r border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <span
                                            className="fc-icon fc-icon-chevron-left"
                                            role="img"
                                        >
                                            ‹
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCurrentWeekStart(
                                                (d) =>
                                                    new Date(
                                                        d.getTime() + 604800000,
                                                    ),
                                            )
                                        }
                                        title="Suivant"
                                        aria-label="Suivant"
                                        className="fc-next-button fc-button fc-button-primary inline-flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        <span
                                            className="fc-icon fc-icon-chevron-right"
                                            role="img"
                                        >
                                            ›
                                        </span>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const t = new Date();
                                        const day = t.getDay();
                                        const diff = day === 0 ? -6 : 1 - day;
                                        const m = new Date(t);
                                        m.setDate(t.getDate() + diff);
                                        m.setHours(0, 0, 0, 0);
                                        setCurrentWeekStart(m);
                                    }}
                                    title="Aujourd'hui"
                                    className="fc-today-button fc-button fc-button-primary rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                    Aujourd'hui
                                </button>
                            </div>
                            <div className="fc-toolbar-chunk self-end sm:self-auto">
                                <h2 className="fc-toolbar-title text-sm font-semibold text-gray-800 sm:text-base dark:text-white">
                                    {(() => {
                                        const m = [
                                            'janv.',
                                            'févr.',
                                            'mars',
                                            'avr.',
                                            'mai',
                                            'juin',
                                            'juil.',
                                            'août',
                                            'sept.',
                                            'oct.',
                                            'nov.',
                                            'déc.',
                                        ];
                                        const mon = new Date(currentWeekStart);
                                        const dim = new Date(mon);
                                        dim.setDate(mon.getDate() + 6);
                                        const d1 = mon.getDate(),
                                            d2 = dim.getDate(),
                                            m1 = mon.getMonth(),
                                            m2 = dim.getMonth(),
                                            y1 = mon.getFullYear(),
                                            y2 = dim.getFullYear();
                                        if (y1 !== y2)
                                            return `semaine du ${d1} ${m[m1]} ${y1} au ${d2} ${m[m2]} ${y2}`;
                                        if (m1 !== m2)
                                            return `semaine du ${d1} ${m[m1]} au ${d2} ${m[m2]} ${y1}`;
                                        return `semaine du ${d1} au ${d2} ${m[m1]} ${y1}`;
                                    })()}
                                </h2>
                            </div>
                        </div>
                        <div className="mt-4 mb-4 flex items-end justify-between border-b pb-3">
                            <div>
                                <h2 className="text-lg font-bold">
                                    Emploi du temps — {teacher.name}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Année scolaire 2026-2027 — Semaine type
                                    (Lundi à Dimanche)
                                </p>
                            </div>
                            <div className="text-right text-xs text-gray-500">
                                <div>
                                    {slots.length} créneaux
                                    <br />
                                    Généré le{' '}
                                    {new Date().toLocaleDateString('fr-FR')}
                                </div>
                                <button
                                    onClick={handleExportPdf}
                                    className="mt-2 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                    Télécharger le PDF
                                </button>
                            </div>
                        </div>
                        {slots.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-500">
                                Aucun créneau pour cet enseignant.
                            </p>
                        ) : (
                            <>
                                {(() => {
                                    const uniqueTimes = Array.from(
                                        new Set(
                                            slots.map(
                                                (s) =>
                                                    `${s.startTime}-${s.endTime}`,
                                            ),
                                        ),
                                    ).sort(
                                        (a, b) =>
                                            timeToMinutesG(a.split('-')[0]) -
                                            timeToMinutesG(b.split('-')[0]),
                                    );
                                    const cellFor = (day: DayG, tk: string) => {
                                        const [st, en] = tk.split('-');
                                        return slots.find(
                                            (s) =>
                                                s.day === day &&
                                                s.startTime === st &&
                                                s.endTime === en,
                                        );
                                    };
                                    return (
                                        <>
                                            <div className="hidden overflow-hidden lg:block">
                                                <table className="w-full table-fixed border-collapse text-xs">
                                                    <thead>
                                                        <tr>
                                                            <th className="w-[110px] border bg-gray-50 px-2 py-2 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                                Horaire
                                                            </th>
                                                            {DAYS_G.map((d) => (
                                                                <th
                                                                    key={d}
                                                                    className="border bg-gray-50 px-1 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                                >
                                                                    {d.slice(
                                                                        0,
                                                                        3,
                                                                    )}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {uniqueTimes.map(
                                                            (tk) => (
                                                                <tr
                                                                    key={tk}
                                                                    className="odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-white/[0.02]"
                                                                >
                                                                    <td className="border bg-gray-50 px-2 py-2 text-xs font-medium whitespace-nowrap text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                                        {tk.replace(
                                                                            '-',
                                                                            ' – ',
                                                                        )}
                                                                    </td>
                                                                    {DAYS_G.map(
                                                                        (d) => {
                                                                            const sl =
                                                                                cellFor(
                                                                                    d,
                                                                                    tk,
                                                                                );
                                                                            if (
                                                                                !sl
                                                                            )
                                                                                return (
                                                                                    <td
                                                                                        key={
                                                                                            d
                                                                                        }
                                                                                        className="border px-1 py-1 dark:border-gray-700"
                                                                                    ></td>
                                                                                );
                                                                            const salle =
                                                                                salles.find(
                                                                                    (
                                                                                        s,
                                                                                    ) =>
                                                                                        s.roomId ===
                                                                                        sl.roomId,
                                                                                );
                                                                            return (
                                                                                <td
                                                                                    key={
                                                                                        d
                                                                                    }
                                                                                    className="border px-1 py-1 text-center dark:border-gray-700"
                                                                                >
                                                                                    <div
                                                                                        className="rounded px-1 py-1 text-[11px] leading-tight font-medium text-white"
                                                                                        style={{
                                                                                            backgroundColor:
                                                                                                subjectColorG(
                                                                                                    sl.subject,
                                                                                                ),
                                                                                        }}
                                                                                    >
                                                                                        <div className="truncate font-semibold">
                                                                                            {
                                                                                                sl.subject
                                                                                            }
                                                                                        </div>
                                                                                        <div className="truncate text-[10px] opacity-90">
                                                                                            {salle
                                                                                                ? salle.name
                                                                                                : (
                                                                                                      ROOM_LABELS as any
                                                                                                  )[
                                                                                                      sl
                                                                                                          .roomId
                                                                                                  ] ||
                                                                                                  sl.roomId}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        },
                                                                    )}
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="space-y-3 lg:hidden">
                                                {DAYS_G.map((day) => {
                                                    const slotsForDay =
                                                        uniqueTimes
                                                            .map((tk) => ({
                                                                tk,
                                                                slot: cellFor(
                                                                    day,
                                                                    tk,
                                                                ),
                                                            }))
                                                            .filter(
                                                                (x) => x.slot,
                                                            );
                                                    if (
                                                        slotsForDay.length === 0
                                                    )
                                                        return null;
                                                    return (
                                                        <div
                                                            key={day}
                                                            className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                                {day}
                                                            </div>
                                                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                {slotsForDay.map(
                                                                    ({
                                                                        tk,
                                                                        slot,
                                                                    }) => {
                                                                        const salle =
                                                                            salles.find(
                                                                                (
                                                                                    s,
                                                                                ) =>
                                                                                    s.roomId ===
                                                                                    slot!
                                                                                        .roomId,
                                                                            );
                                                                        return (
                                                                            <div
                                                                                key={
                                                                                    tk
                                                                                }
                                                                                className="flex items-center justify-between gap-2 px-3 py-2"
                                                                            >
                                                                                <span className="w-24 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                                    {tk.replace(
                                                                                        '-',
                                                                                        ' – ',
                                                                                    )}
                                                                                </span>
                                                                                <div
                                                                                    className="flex-1 rounded px-2 py-1 text-center text-xs font-medium text-white"
                                                                                    style={{
                                                                                        backgroundColor:
                                                                                            subjectColorG(
                                                                                                slot!
                                                                                                    .subject,
                                                                                            ),
                                                                                    }}
                                                                                >
                                                                                    <span className="font-semibold">
                                                                                        {
                                                                                            slot!
                                                                                                .subject
                                                                                        }
                                                                                    </span>{' '}
                                                                                    <span className="opacity-80">
                                                                                        —{' '}
                                                                                        {salle
                                                                                            ? salle.name
                                                                                            : slot!
                                                                                                  .roomId}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    );
                                })()}
                                <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                                    Chaque case = 1 créneau récurrent
                                    hebdomadaire. Couleur = matière.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                    Historique des statuts
                </h3>
                {history.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Aucun changement — enseignant toujours actif depuis la
                        création.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                                <TableRow>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Date
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Ancien
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Nouveau
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Raison
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Acteur
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {history.map((h, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="py-3 text-sm">
                                            {new Date(h.date).toLocaleString(
                                                'fr-FR',
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge
                                                color={
                                                    statusColor[h.from] ||
                                                    'light'
                                                }
                                                size="sm"
                                            >
                                                {statusLabel[h.from]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge
                                                color={
                                                    statusColor[h.to] || 'light'
                                                }
                                                size="sm"
                                            >
                                                {statusLabel[h.to]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {h.reason || '—'}
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {h.actor || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                    Historique des présences
                </h3>
                {(!teacher.attendances || teacher.attendances.length === 0) ? (
                    <p className="text-sm text-gray-500">
                        Aucune présence enregistrée.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                                <TableRow>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Date
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Statut
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Marqué par
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Heure d'enregistrement
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {teacher.attendances.map((a: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="py-3 text-sm">
                                            {new Date(a.date).toLocaleDateString(
                                                'fr-FR',
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge
                                                color={a.present ? 'success' : 'error'}
                                                size="sm"
                                            >
                                                {a.present ? 'Présent' : 'Absent'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {a.marked_by || '—'}
                                        </TableCell>
                                        <TableCell className="py-3 text-sm">
                                            {a.updated_at 
                                                ? new Date(a.updated_at).toLocaleString('fr-FR')
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                className="max-w-[560px] p-6"
            >
                {pendingAction && (
                    <>
                        <h3 className="mb-2 text-lg font-semibold">
                            {pendingAction === 'suspend'
                                ? "Suspendre l'enseignant ?"
                                : "Renvoyer l'enseignant ?"}
                        </h3>
                        <div className="border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10 mb-3 rounded-lg border p-3">
                            <p className="text-warning-800 text-sm font-medium">
                                Cet enseignant intervient actuellement sur{' '}
                                {impactedSlots.length} créneau
                                {impactedSlots.length !== 1 ? 'x' : ''}.{' '}
                                {pendingAction === 'suspend'
                                    ? 'La suspension'
                                    : 'Le renvoi'}{' '}
                                aura un impact sur ces créneaux.
                            </p>
                            {impactedSlots.length > 0 && (
                                <div className="mt-2 max-h-[180px] overflow-y-auto rounded bg-white p-2 dark:bg-gray-900">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-left text-gray-500">
                                                <th className="py-1">
                                                    Matière
                                                </th>
                                                <th className="py-1">Salle</th>
                                                <th className="py-1">Jour</th>
                                                <th className="py-1">
                                                    Horaire
                                                </th>
                                                <th className="py-1">Année</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {impactedSlots.map((c) => (
                                                <tr
                                                    key={c.id}
                                                    className="border-t"
                                                >
                                                    <td className="py-1">
                                                        {c.subject}
                                                    </td>
                                                    <td className="py-1">
                                                        {(ROOM_LABELS as any)[
                                                            c.roomId
                                                        ] || c.roomId}
                                                    </td>
                                                    <td className="py-1">
                                                        {c.day}
                                                    </td>
                                                    <td className="py-1">
                                                        {c.startTime}–
                                                        {c.endTime}
                                                    </td>
                                                    <td className="py-1">
                                                        2026–2027
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-gray-600">
                                Les créneaux ne seront pas supprimés
                                automatiquement.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Raison (optionnel)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-20 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white"
                                placeholder="Motif..."
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setPendingAction(null)}
                            >
                                Annuler
                            </Button>
                            <Button onClick={handleAction}>
                                {pendingAction === 'suspend'
                                    ? 'Confirmer la suspension'
                                    : 'Confirmer le renvoi'}
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </>
    );
}
