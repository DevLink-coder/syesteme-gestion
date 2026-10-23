import { useState, useMemo, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import { Modal } from '../components/ui/modal';
import { useModal } from '../hooks/useModal';
import PageMeta from '../components/common/PageMeta';
import StyledSelect from '../components/ui/select/StyledSelect';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
    addDocumentFooters,
    addDocumentHeading,
    addStructuredTable,
    formatPdfDate,
    formatPdfTime,
} from '../lib/structuredPdf';

export type DayOfWeek =
    | 'Lundi'
    | 'Mardi'
    | 'Mercredi'
    | 'Jeudi'
    | 'Vendredi'
    | 'Samedi'
    | 'Dimanche';
export interface Slot {
    id: number | string;
    code?: string;
    roomId: string;
    salle_id?: number;
    day: DayOfWeek;
    start_time?: string;
    end_time?: string;
    startTime?: string;
    endTime?: string;
    subject: string;
    subject_name?: string;
    teacherId?: string;
    teacher_id?: number;
    week_start?: string | null;
    weekStart?: string | null;
}

const ROOM_LABELS: Record<string, string> = {
    troisieme: 'Troisième',
    secondeC: 'Seconde C',
    premiereC: 'Première C',
    premiereD: 'Première D',
    terminaleC: 'Terminale C',
    terminaleD: 'Terminale D',
};
const DAYS: DayOfWeek[] = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche',
];
const SUBJECT_COLORS: Record<string, string> = {
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
};
function subjectColor(s: string) {
    return SUBJECT_COLORS[s] || '#667085';
}
function timeToMinutes(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function getCsrf() {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export default function Calendar() {
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const [sallesList, setSallesList] = useState<any[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string>('troisieme');
    const [allSlots, setAllSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(false);
    const [dbTeachers, setDbTeachers] = useState<any[]>([]);
    const [isExportingAll, setIsExportingAll] = useState(false);

    useEffect(() => {
        fetch('/web/salles', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any[]) => {
                if (Array.isArray(data)) {
                    setSallesList(data);
                    if (data.length === 0) {
                        setAllSlots([]);
                        return;
                    }
                    const exists = data.some(
                        (s: any) => s.room_id === selectedRoom,
                    );
                    if (!exists) setSelectedRoom(data[0].room_id);
                }
            })
            .catch(() => {});
        fetch('/web/teachers', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any) => {
                const arr = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                      ? data.data
                      : [];
                if (arr.length) setDbTeachers(arr);
            })
            .catch(() => {});
    }, []);

    const {
        isOpen: isSlotOpen,
        openModal: openSlotModal,
        closeModal: closeSlotModal,
    } = useModal();
    const {
        isOpen: isReuseOpen,
        openModal: openReuseModal,
        closeModal: closeReuseModal,
    } = useModal();
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [formSubject, setFormSubject] = useState('');
    const [formTeacher, setFormTeacher] = useState('');
    const [formDay, setFormDay] = useState<DayOfWeek>('Lundi');
    const [formStart, setFormStart] = useState('08:00');
    const [formEnd, setFormEnd] = useState('09:30');
    const [formWeek, setFormWeek] = useState<string>(() =>
        new Date(2026, 8, 14).toISOString().slice(0, 10),
    );
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isReusing, setIsReusing] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const d = new Date(2026, 8, 14);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const teacherName = useMemo(
        () => (id: string | number) => {
            const t = dbTeachers.find(
                (x: any) =>
                    String(x.id) === String(id) ||
                    String(x.code) === String(id),
            );
            return t ? t.name : String(id);
        },
        [dbTeachers],
    );

    const teachers = useMemo(() => dbTeachers, [dbTeachers]);
    const [subjectsForRoom, setSubjectsForRoom] = useState<any[]>([]);

    useEffect(() => {
        const salle = sallesList.find((s: any) => s.room_id === selectedRoom);
        if (!salle) {
            setSubjectsForRoom([]);
            return;
        }
        fetch(`/web/salles/${salle.code || salle.id}/matieres`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any[]) =>
                setSubjectsForRoom(
                    (data || []).map((m: any) => ({
                        name: m.name,
                        coefficient: m.coefficient,
                        optionale: !!m.optionale,
                    })),
                ),
            )
            .catch(() => setSubjectsForRoom([]));
    }, [selectedRoom, sallesList]);

    const fetchSlots = useCallback(async () => {
        setLoading(true);
        try {
            const weekStr = currentWeekStart.toISOString().slice(0, 10);
            const res = await fetch(
                `/web/timetable?room_id=${selectedRoom}&week_start=${weekStr}`,
                {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                },
            );
            if (res.ok) {
                const data = await res.json();
                const mapped: Slot[] = data.map((r: any) => ({
                    id: r.id,
                    code: r.code,
                    roomId: r.room_id,
                    day: r.day as DayOfWeek,
                    startTime: r.start_time?.slice(0, 5),
                    endTime: r.end_time?.slice(0, 5),
                    start_time: r.start_time,
                    end_time: r.end_time,
                    subject: r.subject_name || r.subject,
                    teacherId: String(r.teacher_id),
                    week_start: r.week_start,
                    weekStart: r.week_start,
                }));
                setAllSlots(mapped);
            }
        } catch {}
        setLoading(false);
    }, [selectedRoom, currentWeekStart]);

    useEffect(() => {
        void fetchSlots();
    }, [fetchSlots]);

    useEffect(() => {
        const local = (roomsMap as any)[selectedRoom];
        if (local && local.length) {
            return;
        }
        const salle = sallesList.find((s: any) => s.room_id === selectedRoom);
        if (!salle) {
            return;
        }
        fetch(`/web/salles/${salle.code || salle.id}/matieres`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any[]) => {
                // Not stored globally since we use local for the form
                (data || []).map((m: any) => ({
                    name: m.name,
                    coefficient: m.coefficient,
                    optionale: !!m.optionale,
                }));
            })
            .catch(() => {});
    }, [selectedRoom, sallesList]);

    const resetSlotForm = useCallback(() => {
        setEditingId(null);
        setFormSubject(subjectsForRoom[0]?.name || '');
        setFormTeacher(teachers[0]?.code || '');
        setFormDay('Lundi');
        setFormStart('08:00');
        setFormEnd('09:30');
        setFormWeek(currentWeekStart.toISOString().slice(0, 10));
        setFormError(null);
    }, [subjectsForRoom, currentWeekStart, teachers]);

    const openCreate = useCallback(() => {
        resetSlotForm();
        setFormSubject(subjectsForRoom[0]?.name || '');
        openSlotModal();
    }, [resetSlotForm, openSlotModal, subjectsForRoom]);
    const openEdit = useCallback(
        (slotId: string | number) => {
            const sl = allSlots.find((s) => String(s.id) === String(slotId));
            if (!sl) return;
            setEditingId(sl.id);
            setFormSubject(sl.subject);
            setFormTeacher(String(sl.teacherId || sl.teacher_id));
            setFormDay(sl.day as DayOfWeek);
            setFormStart(sl.startTime || sl.start_time?.slice(0, 5) || '08:00');
            setFormEnd(sl.endTime || sl.end_time?.slice(0, 5) || '09:30');
            setFormWeek(
                (sl as any).week_start ||
                    (sl as any).weekStart ||
                    currentWeekStart.toISOString().slice(0, 10),
            );
            setFormError(null);
            openSlotModal();
        },
        [allSlots, openSlotModal, currentWeekStart],
    );

    const handleSave = async () => {
        if (isSaving) return;
        if (!formSubject) {
            setFormError('Choisissez une matière.');
            return;
        }
        if (timeToMinutes(formEnd) <= timeToMinutes(formStart)) {
            setFormError("L'heure de fin doit être après le début.");
            return;
        }
        if (!formWeek) {
            setFormError('Choisissez une semaine.');
            return;
        }
        setIsSaving(true);

        const salleObj = sallesList.find(
            (s: any) => s.room_id === selectedRoom,
        );
        const salle_id = salleObj ? salleObj.id : 1;
        const school_year_id = salleObj ? salleObj.school_year_id : 3;
        const foundTeacher = dbTeachers.find(
            (x: any) =>
                String(x.code) === String(formTeacher) ||
                String(x.id) === String(formTeacher),
        );
        const teacherDbId = foundTeacher ? foundTeacher.id : 1;

        const payload: any = {
            salle_id,
            room_id: selectedRoom,
            day: formDay,
            start_time: formStart,
            end_time: formEnd,
            subject: formSubject,
            teacher_id: teacherDbId,
            week_start: formWeek,
            school_year_id,
        };

        try {
            const url = editingId
                ? `/web/timetable/${editingId}`
                : '/web/timetable';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setFormError(data.message || 'Erreur');
                showToast(data.message || 'Erreur', 'error');
                return;
            }
            showToast(
                editingId
                    ? 'Créneau modifié avec succès'
                    : 'Créneau ajouté avec succès',
                'success',
            );
            closeSlotModal();
            resetSlotForm();
            void fetchSlots();
        } catch (e: any) {
            setFormError(e.message);
            showToast(e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId || isSaving) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/web/timetable/${editingId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'X-XSRF-TOKEN': getCsrf(),
                    Accept: 'application/json',
                },
            });
            if (!res.ok) throw new Error('Suppression échouée');
            showToast('Créneau supprimé', 'success');
            closeSlotModal();
            resetSlotForm();
            void fetchSlots();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReuseLastWeek = async () => {
        if (isReusing) return;
        setIsReusing(true);
        const weekStr = currentWeekStart.toISOString().slice(0, 10);
        const salleObj = sallesList.find(
            (s: any) => s.room_id === selectedRoom,
        );
        const salle_id = salleObj ? salleObj.id : 1;
        const school_year_id = salleObj ? salleObj.school_year_id : 3;
        try {
            const res = await fetch('/web/timetable/reuse-last-week', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrf(),
                },
                body: JSON.stringify({
                    room_id: selectedRoom,
                    week_start: weekStr,
                    salle_id,
                    school_year_id,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 409) {
                showToast(
                    data.message || 'Cette semaine a déjà des créneaux.',
                    'info',
                );
                return;
            }
            if (!res.ok) {
                showToast(data.message || 'Erreur', 'error');
                return;
            }
            if (data.count === 0) {
                showToast(
                    "Aucun emploi du temps la semaine passée à réutiliser. Aucun créneau n'y figure.",
                    'info',
                );
                return;
            }
            showToast(data.message, 'success');
            closeReuseModal();
            void fetchSlots();
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsReusing(false);
        }
    };

    const handleExportPdf = () => {
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const salleName =
            sallesList.find((s: any) => s.room_id === selectedRoom)?.name ||
            ROOM_LABELS[selectedRoom] ||
            selectedRoom;
        const date = formatPdfDate();
        addDocumentHeading(
            pdf,
            'Emploi du temps — ' + salleName,
            [
                'Année scolaire 2026-2027',
                'Semaine du ' +
                    currentWeekStart.toLocaleDateString('fr-FR') +
                    ' · Généré le ' +
                    date,
            ],
            currentUser?.centerName || undefined,
        );
        const weekdays = DAYS.slice(0, 5);
        const times = Array.from(
            new Set(
                slotsForExport.map(
                    (slot) =>
                        formatPdfTime(slot.startTime || slot.start_time) +
                        '-' +
                        formatPdfTime(slot.endTime || slot.end_time),
                ),
            ),
        ).sort(
            (a, b) =>
                timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]),
        );
        const body = times.map((time) => {
            const [start, end] = time.split('-');
            return [
                start + '–' + end,
                ...weekdays.map((day) => {
                    const slot = slotsForExport.find(
                        (candidate) =>
                            candidate.day === day &&
                            formatPdfTime(
                                candidate.startTime || candidate.start_time,
                            ) === start &&
                            formatPdfTime(
                                candidate.endTime || candidate.end_time,
                            ) === end,
                    );
                    if (!slot) return '—';
                    const teacherId = slot.teacherId || slot.teacher_id;
                    return (
                        (slot.subject || '') +
                        (teacherId ? '\n' + teacherName(teacherId) : '')
                    );
                }),
            ];
        });
        addStructuredTable(pdf, {
            startY: 44,
            head: [['Horaire', ...weekdays]],
            body,
            styles: { fontSize: 10, minCellHeight: 11, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 28 } },
        });
        addDocumentFooters(pdf, date);
        pdf.save('emploi-du-temps-' + selectedRoom + '-2026-2027.pdf');
        showToast('PDF téléchargé', 'success');
    };

    const handleExportAllPdf = async () => {
        if (!sallesList.length) {
            showToast('Aucune salle à exporter.', 'info');
            return;
        }
        setIsExportingAll(true);
        try {
            const weekStart = currentWeekStart.toISOString().slice(0, 10);
            const scheduleGroups = await Promise.all(
                sallesList.map(async (salle: any) => {
                    const response = await fetch(
                        '/web/timetable?salle_id=' +
                            encodeURIComponent(String(salle.id)) +
                            '&week_start=' +
                            weekStart,
                        {
                            credentials: 'include',
                            headers: { Accept: 'application/json' },
                        },
                    );
                    if (!response.ok)
                        throw new Error(
                            'Impossible de charger tous les emplois du temps.',
                        );
                    const result = await response.json();
                    return (Array.isArray(result) ? result : []).map(
                        (slot: any) => ({
                            salleName: slot.salle_name || salle.name,
                            day: slot.day as DayOfWeek,
                            start: formatPdfTime(slot.start_time),
                            end: formatPdfTime(slot.end_time),
                            subject:
                                slot.subject_label ||
                                slot.subject_name ||
                                slot.subject ||
                                '',
                            teacher:
                                slot.teacher_name ||
                                teacherName(slot.teacher_id),
                        }),
                    );
                }),
            );
            const rows = scheduleGroups
                .flat()
                .sort(
                    (a, b) =>
                        a.salleName.localeCompare(b.salleName, 'fr') ||
                        DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
                        timeToMinutes(a.start) - timeToMinutes(b.start),
                );
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const date = formatPdfDate();
            addDocumentHeading(
                pdf,
                'Emplois du temps — Toutes les salles',
                [
                    'Année scolaire 2026-2027',
                    'Semaine du ' +
                        currentWeekStart.toLocaleDateString('fr-FR') +
                        ' · Généré le ' +
                        date,
                ],
                currentUser?.centerName || undefined,
            );
            addStructuredTable(pdf, {
                startY: 44,
                head: [['Salle', 'Jour', 'Horaire', 'Matière', 'Enseignant']],
                body: rows.map((row) => [
                    row.salleName,
                    row.day,
                    row.start + '–' + row.end,
                    row.subject,
                    row.teacher,
                ]),
                styles: {
                    fontSize: 9,
                    cellPadding: 2.2,
                    minCellHeight: 8,
                    valign: 'middle',
                },
                columnStyles: {
                    0: { cellWidth: 48 },
                    1: { cellWidth: 28 },
                    2: { cellWidth: 31 },
                    3: { cellWidth: 85 },
                    4: { cellWidth: 75 },
                },
            });
            addDocumentFooters(pdf, date);
            pdf.save(
                'emplois-du-temps-toutes-les-salles-' + weekStart + '.pdf',
            );
            showToast(rows.length + ' créneau(x) exporté(s).', 'success');
        } catch (error: any) {
            showToast(
                error?.message || 'Erreur lors de la création du PDF.',
                'error',
            );
        } finally {
            setIsExportingAll(false);
        }
    };

    const slotsForExport = useMemo(() => {
        const weekStr = currentWeekStart.toISOString().slice(0, 10);
        return allSlots
            .filter((s) => {
                const w = (s as any).week_start || (s as any).weekStart;
                if (!w) return true;
                return w === weekStr;
            })
            .sort((a, b) => {
                const dayOrder =
                    DAYS.indexOf(a.day as DayOfWeek) -
                    DAYS.indexOf(b.day as DayOfWeek);
                if (dayOrder !== 0) return dayOrder;
                return (
                    timeToMinutes(a.startTime || a.start_time!.slice(0, 5)) -
                    timeToMinutes(b.startTime || b.start_time!.slice(0, 5))
                );
            });
    }, [allSlots, currentWeekStart]);

    const uniqueTimes = useMemo(() => {
        const set = new Set(
            slotsForExport.map(
                (s) =>
                    `${s.startTime || s.start_time!.slice(0, 5)}-${s.endTime || s.end_time!.slice(0, 5)}`,
            ),
        );
        return Array.from(set).sort(
            (a, b) =>
                timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]),
        );
    }, [slotsForExport]);

    function cellFor(day: DayOfWeek, timeKey: string) {
        const [st, en] = timeKey.split('-');
        return slotsForExport.find(
            (s) =>
                s.day === day &&
                (s.startTime || s.start_time?.slice(0, 5)) === st &&
                (s.endTime || s.end_time?.slice(0, 5)) === en,
        );
    }

    return (
        <>
            <PageMeta
                title="Emploi du temps | Centre 2026-2027"
                description="Gestion emploi du temps par salle"
            />
            <div className="mb-4 flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-3 lg:flex-row lg:items-center lg:justify-between dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Salle :
                    </label>
                    <StyledSelect
                        value={selectedRoom}
                        onChange={(v) => setSelectedRoom(v as string)}
                        placeholder={
                            sallesList.length
                                ? 'Choisir une salle'
                                : 'Aucune salle — créez-en une'
                        }
                        options={sallesList.map((s: any) => ({
                            value: s.room_id,
                            label: s.name,
                        }))}
                        className="min-w-[160px]"
                    />
                    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                        {loading
                            ? 'Chargement...'
                            : `${slotsForExport.length} créneaux — 2026-2027`}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
                    <button
                        onClick={openCreate}
                        className="bg-brand-500 hover:bg-brand-600 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm sm:w-auto"
                    >
                        Ajouter un créneau
                    </button>
                    <button
                        onClick={openReuseModal}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                        Réutiliser la semaine passée
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                        Télécharger le PDF
                    </button>
                    <button
                        onClick={() => void handleExportAllPdf()}
                        disabled={isExportingAll}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                        {isExportingAll
                            ? 'Préparation…'
                            : 'Télécharger tous les emplois du temps'}
                    </button>
                </div>
            </div>

            <div className="w-full max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="fc-toolbar-chunk flex items-center gap-2 self-start">
                        <div className="fc-button-group inline-flex rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentWeekStart(
                                        (d) =>
                                            new Date(d.getTime() - 604800000),
                                    )
                                }
                                className="fc-prev-button inline-flex h-9 w-9 items-center justify-center border-r border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                            >
                                <span>‹</span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentWeekStart(
                                        (d) =>
                                            new Date(d.getTime() + 604800000),
                                    )
                                }
                                className="fc-next-button inline-flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-50 dark:text-gray-300"
                            >
                                <span>›</span>
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
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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

                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                    <div className="w-full max-w-full bg-white p-6 text-gray-800 dark:bg-gray-950 dark:text-gray-100">
                        <div className="mb-4 flex items-end justify-between border-b pb-3 dark:border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold dark:text-white">
                                    Emploi du temps —{' '}
                                    {sallesList.find(
                                        (s: any) => s.room_id === selectedRoom,
                                    )?.name ||
                                        ROOM_LABELS[selectedRoom] ||
                                        selectedRoom}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Année scolaire 2026-2027 — Semaine du{' '}
                                    {currentWeekStart.toLocaleDateString(
                                        'fr-FR',
                                    )}
                                </p>
                            </div>
                            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                                {slotsForExport.length} créneaux
                                <br />
                                Généré le{' '}
                                {new Date().toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                        <div className="hidden overflow-hidden lg:block">
                            <table className="w-full table-fixed border-collapse text-xs">
                                <thead>
                                    <tr>
                                        <th className="w-[110px] border bg-gray-50 px-2 py-2 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                            Horaire
                                        </th>
                                        {DAYS.map((d) => (
                                            <th
                                                key={d}
                                                className="border bg-gray-50 px-1 py-2 text-center font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                            >
                                                {d.slice(0, 3)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {uniqueTimes.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="border px-3 py-8 text-center text-gray-400 dark:border-gray-700"
                                            >
                                                Aucun créneau pour cette
                                                semaine. Cliquez sur "Ajouter un
                                                créneau" ou "Réutiliser la
                                                semaine passée".
                                            </td>
                                        </tr>
                                    ) : (
                                        uniqueTimes.map((tk) => (
                                            <tr
                                                key={tk}
                                                className="odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-gray-800"
                                            >
                                                <td className="border bg-gray-50 px-2 py-2 text-xs font-medium whitespace-nowrap text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {tk.replace('-', ' – ')}
                                                </td>
                                                {DAYS.map((d) => {
                                                    const sl = cellFor(d, tk);
                                                    if (!sl)
                                                        return (
                                                            <td
                                                                key={d}
                                                                className="border px-1 py-1 dark:border-gray-700"
                                                            ></td>
                                                        );
                                                    return (
                                                        <td
                                                            key={d}
                                                            className="border px-1 py-1 text-center dark:border-gray-700"
                                                        >
                                                            <div
                                                                onClick={() =>
                                                                    openEdit(
                                                                        String(
                                                                            sl.id,
                                                                        ),
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded px-1 py-1 text-[11px] leading-tight font-medium text-white hover:opacity-90"
                                                                style={{
                                                                    backgroundColor:
                                                                        subjectColor(
                                                                            sl.subject,
                                                                        ),
                                                                }}
                                                                title="Modifier le créneau"
                                                            >
                                                                <div className="truncate font-semibold">
                                                                    {sl.subject}
                                                                </div>
                                                                <div className="truncate text-[10px] opacity-90">
                                                                    {teacherName(
                                                                        String(
                                                                            sl.teacherId ||
                                                                                sl.teacher_id,
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="space-y-3 lg:hidden">
                            {DAYS.map((day) => {
                                const slotsForDay = uniqueTimes
                                    .map((tk) => ({
                                        tk,
                                        slot: cellFor(day as any, tk),
                                    }))
                                    .filter((x) => x.slot);
                                if (slotsForDay.length === 0) return null;
                                return (
                                    <div
                                        key={day}
                                        className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                            {day}
                                        </div>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {slotsForDay.map(({ tk, slot }) => (
                                                <div
                                                    key={tk}
                                                    className="flex items-center justify-between gap-2 px-3 py-2"
                                                >
                                                    <span className="w-24 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {tk.replace('-', ' – ')}
                                                    </span>
                                                    <div
                                                        onClick={() =>
                                                            openEdit(
                                                                String(
                                                                    slot!.id,
                                                                ),
                                                            )
                                                        }
                                                        className="flex-1 cursor-pointer rounded px-2 py-1 text-center text-xs font-medium text-white hover:opacity-90"
                                                        style={{
                                                            backgroundColor:
                                                                subjectColor(
                                                                    slot!
                                                                        .subject,
                                                                ),
                                                        }}
                                                    >
                                                        <span className="font-semibold">
                                                            {slot!.subject}
                                                        </span>{' '}
                                                        <span className="opacity-80">
                                                            —{' '}
                                                            {teacherName(
                                                                String(
                                                                    slot!
                                                                        .teacherId ||
                                                                        slot!
                                                                            .teacher_id,
                                                                ),
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-[11px] text-gray-400">
                            Chaque case = 1 créneau. Couleur = matière. Cliquez
                            pour modifier.
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isSlotOpen}
                onClose={() => {
                    closeSlotModal();
                    resetSlotForm();
                }}
                className="max-h-[70vh] max-w-[640px] overflow-y-auto p-6 lg:max-h-[65vh] lg:p-8"
            >
                <h5 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white">
                    {editingId ? 'Modifier le créneau' : 'Ajouter un créneau'}
                </h5>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Salle :{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        {ROOM_LABELS[selectedRoom]}
                    </span>{' '}
                    — semaine du {formWeek}
                </p>
                <div className="grid gap-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Matière
                        </label>
                        <StyledSelect
                            value={formSubject}
                            onChange={setFormSubject}
                            placeholder="Choisir une matière"
                            options={subjectsForRoom.map((s) => ({
                                value: s.name,
                                label: `${s.name} (coef. ${s.coefficient}${s.optionale ? ', optionnelle' : ''})`,
                            }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Enseignant
                        </label>
                        <StyledSelect
                            value={formTeacher}
                            onChange={setFormTeacher}
                            placeholder={
                                teachers.length
                                    ? 'Choisir un enseignant'
                                    : 'Chargement...'
                            }
                            options={teachers.map((t: any) => {
                                const uniq =
                                    [
                                        ...new Set(
                                            (t.teaches || []).map(
                                                (x: any) => x.subject,
                                            ),
                                        ),
                                    ]
                                        .slice(0, 3)
                                        .join(', ') || '—';
                                return {
                                    value: String(t.code || t.id),
                                    label: `${t.name}${t.status !== 'active' ? ` — ${t.status}` : ''} (${uniq})`,
                                };
                            })}
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Jour
                        </label>
                        <StyledSelect
                            value={formDay}
                            onChange={(v) => setFormDay(v as DayOfWeek)}
                            placeholder="Choisir un jour"
                            options={DAYS.map((d) => ({ value: d, label: d }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                            Semaine *
                        </label>
                        <input
                            type="date"
                            value={formWeek}
                            onChange={(e) => setFormWeek(e.target.value)}
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Lundi de la semaine concernée
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                Début
                            </label>
                            <input
                                type="time"
                                value={formStart}
                                onChange={(e) => setFormStart(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                                Fin
                            </label>
                            <input
                                type="time"
                                value={formEnd}
                                onChange={(e) => setFormEnd(e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    {formError && (
                        <div className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400 rounded-lg border px-3 py-2 text-sm">
                            {formError}
                        </div>
                    )}
                    <p className="text-xs text-gray-400">
                        RG-03 : un enseignant ne peut pas avoir deux créneaux
                        qui se chevauchent.
                    </p>
                </div>
                <div className="mt-6 flex justify-between gap-3">
                    <div>
                        {editingId && (
                            <button
                                onClick={handleDelete}
                                disabled={isSaving}
                                className="border-error-300 text-error-700 hover:bg-error-50 dark:border-error-700 dark:text-error-400 rounded-lg border bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800"
                            >
                                Supprimer
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                closeSlotModal();
                                resetSlotForm();
                            }}
                            disabled={isSaving}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving
                                ? '...'
                                : editingId
                                  ? 'Enregistrer'
                                  : 'Créer'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isReuseOpen}
                onClose={closeReuseModal}
                className="max-h-[50vh] max-w-[520px] overflow-y-auto p-6"
            >
                <h5 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
                    Réutiliser la semaine passée ?
                </h5>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Êtes-vous sûr de vouloir réutiliser l'emploi du temps de la
                    semaine passée cette semaine ?<br />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        Semaine du{' '}
                        {new Date(
                            new Date(currentWeekStart).getTime() - 604800000,
                        ).toLocaleDateString('fr-FR')}{' '}
                        → {currentWeekStart.toLocaleDateString('fr-FR')}
                    </span>{' '}
                    pour{' '}
                    <span className="font-medium">
                        {ROOM_LABELS[selectedRoom]}
                    </span>
                    .
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={closeReuseModal}
                        disabled={isReusing}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleReuseLastWeek}
                        disabled={isReusing}
                        className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isReusing ? '...' : 'Confirmer'}
                    </button>
                </div>
            </Modal>
        </>
    );
}

// roomsMap moved inline to avoid mock import
const roomsMap: Record<
    string,
    { name: string; coefficient: number; optionale: boolean }[]
> = {
    troisieme: [
        { name: 'Mathématiques', coefficient: 4, optionale: false },
        { name: 'Français', coefficient: 4, optionale: false },
        { name: 'Anglais', coefficient: 3, optionale: false },
        {
            name: 'Physique-Chimie-Technologie',
            coefficient: 2,
            optionale: false,
        },
        { name: 'SVT', coefficient: 2, optionale: false },
        { name: 'ECM', coefficient: 2, optionale: false },
        { name: 'EPS', coefficient: 1, optionale: false },
        { name: 'Espagnol', coefficient: 2, optionale: true },
        { name: 'Allemand', coefficient: 2, optionale: true },
    ],
    secondeC: [
        { name: 'Mathématiques', coefficient: 4, optionale: false },
        {
            name: 'Physique-Chimie-Technologie',
            coefficient: 3,
            optionale: false,
        },
        { name: 'SVT', coefficient: 2, optionale: false },
        { name: 'Français', coefficient: 3, optionale: false },
        { name: 'Anglais', coefficient: 2, optionale: false },
        { name: 'Histoire-Géo', coefficient: 2, optionale: false },
        { name: 'Informatique', coefficient: 1, optionale: false },
        { name: 'EPS', coefficient: 1, optionale: false },
    ],
    premiereC: [
        { name: 'Mathématiques', coefficient: 6, optionale: false },
        { name: 'Physique', coefficient: 5, optionale: false },
        { name: 'Chimie', coefficient: 4, optionale: false },
        { name: 'SVT', coefficient: 2, optionale: false },
        { name: 'Français/Philosophie', coefficient: 2, optionale: false },
        { name: 'Anglais', coefficient: 2, optionale: false },
        { name: 'Histoire-Géo', coefficient: 2, optionale: false },
        { name: 'Informatique', coefficient: 2, optionale: false },
        { name: 'EPS', coefficient: 1, optionale: false },
    ],
    premiereD: [
        { name: 'Mathématiques', coefficient: 4, optionale: false },
        { name: 'SVT', coefficient: 5, optionale: false },
        { name: 'Physique', coefficient: 4, optionale: false },
        { name: 'Chimie', coefficient: 4, optionale: false },
        { name: 'Français/Philosophie', coefficient: 2, optionale: false },
        { name: 'Anglais', coefficient: 2, optionale: false },
        { name: 'Histoire-Géo', coefficient: 2, optionale: false },
        { name: 'Informatique', coefficient: 2, optionale: false },
        { name: 'EPS', coefficient: 1, optionale: false },
    ],
    terminaleC: [
        { name: 'Mathématiques', coefficient: 6, optionale: false },
        { name: 'Physique', coefficient: 5, optionale: false },
        { name: 'Chimie', coefficient: 4, optionale: false },
        { name: 'SVT', coefficient: 2, optionale: false },
        { name: 'Français/Philosophie', coefficient: 2, optionale: false },
        { name: 'Anglais', coefficient: 2, optionale: false },
        { name: 'Histoire-Géo', coefficient: 2, optionale: false },
        { name: 'Informatique', coefficient: 2, optionale: false },
        { name: 'EPS', coefficient: 1, optionale: false },
    ],
    terminaleD: [
        { name: 'Mathématiques', coefficient: 4, optionale: false },
        { name: 'SVT', coefficient: 5, optionale: false },
        { name: 'Physique', coefficient: 4, optionale: false },
        { name: 'Chimie', coefficient: 4, optionale: false },
        { name: 'Français/Philosophie', coefficient: 2, optionale: false },
        { name: 'Anglais', coefficient: 2, optionale: false },
        { name: 'Histoire-Géo', coefficient: 2, optionale: false },
        { name: 'Informatique', coefficient: 2, optionale: false },
        { name: 'EPS', coefficient: 1, optionale: false },
    ],
};
