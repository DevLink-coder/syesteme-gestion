import { useMemo, useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import jsPDF from 'jspdf';
import {
    addDocumentFooters,
    addDocumentHeading,
    addStructuredTable,
    formatPdfDate,
} from '../../lib/structuredPdf';

const DAYS = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche',
] as const;
type Day = (typeof DAYS)[number];

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
    'Français/Philosophie': '#12B76A',
};
function subjectColor(s: string) {
    return SUBJECT_COLORS[s] || '#667085';
}
function timeToMinutes(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export default function EmploiDuTempsEnseignant() {
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const d = new Date();
        const offset = d.getDay() === 0 ? -6 : 1 - d.getDay();
        d.setDate(d.getDate() + offset);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [slots, setSlots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const weekStr = currentWeekStart.toISOString().slice(0, 10);
        fetch(`/web/teacher-portal/timetable?week_start=${weekStr}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message ||
                            'Impossible de charger votre emploi du temps.',
                    );
                if (!cancelled)
                    setSlots(Array.isArray(payload.slots) ? payload.slots : []);
            })
            .catch((loadError: any) => {
                if (!cancelled) {
                    setSlots([]);
                    setError(
                        loadError.message ||
                            'Impossible de charger votre emploi du temps.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [currentWeekStart]);

    const handleExportPdf = () => {
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const date = formatPdfDate();
        addDocumentHeading(
            pdf,
            'Emploi du temps — ' + (currentUser?.name || 'Enseignant'),
            [
                slots[0]?.schoolYearLabel || 'Année scolaire',
                'Semaine du ' +
                    currentWeekStart.toLocaleDateString('fr-FR') +
                    ' · Généré le ' +
                    date,
            ],
            currentUser?.centerName || undefined,
        );
        const body = [...slots]
            .sort(
                (a, b) =>
                    DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
                    timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
            )
            .map((slot) => [
                slot.day,
                slot.startTime + '–' + slot.endTime,
                slot.roomName || slot.roomId || '—',
                slot.subject || '—',
                currentUser?.name || '—',
            ]);
        addStructuredTable(pdf, {
            startY: 39,
            head: [['Jour', 'Horaire', 'Salle', 'Matière', 'Enseignant']],
            body,
            styles: { fontSize: 10 },
        });
        addDocumentFooters(pdf, date);
        pdf.save(
            `emploi-du-temps-${currentUser?.id}-${currentWeekStart.toISOString().slice(0, 10)}.pdf`,
        );
        showToast('PDF téléchargé', 'success');
    };

    const uniqueTimes = useMemo(() => {
        const set = new Set(slots.map((s) => `${s.startTime}-${s.endTime}`));
        return Array.from(set).sort(
            (a, b) =>
                timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]),
        );
    }, [slots]);

    const cellFor = (day: Day, tk: string) => {
        const [st, en] = tk.split('-');
        return slots.find(
            (s) => s.day === day && s.startTime === st && s.endTime === en,
        );
    };

    return (
        <>
            <PageMeta
                title="Emploi du temps personnel | Espace Enseignant"
                description="EDT personnel"
            />
            <PageBreadcrumb pageTitle="Emploi du temps personnel" />

            <div className="w-full max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="fc-toolbar-chunk flex items-center gap-2 self-start">
                        <div className="fc-button-group inline-flex rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentWeekStart(
                                        (d: Date) =>
                                            new Date(d.getTime() - 604800000),
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
                                        (d: Date) =>
                                            new Date(d.getTime() + 604800000),
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
                    <div className="flex items-center gap-2 self-end sm:self-auto">
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
                        <button
                            onClick={handleExportPdf}
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                            Télécharger le PDF
                        </button>
                    </div>
                </div>
                {loading ? (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Chargement de votre emploi du temps...
                    </p>
                ) : error ? (
                    <p className="text-error-600 dark:text-error-400 py-8 text-center text-sm">
                        {error}
                    </p>
                ) : slots.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Aucun créneau pour cet enseignant.
                    </p>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                        <div className="w-full max-w-full bg-white p-6 dark:bg-gray-950 dark:text-gray-100">
                            <div className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Emploi du temps — {currentUser?.name}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {slots[0]?.schoolYearLabel ||
                                            'Année scolaire'}{' '}
                                        — du{' '}
                                        {currentWeekStart.toLocaleDateString(
                                            'fr-FR',
                                        )}{' '}
                                        au{' '}
                                        {new Date(
                                            currentWeekStart.getTime() +
                                                6 * 86400000,
                                        ).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                                    {slots.length} créneaux
                                </div>
                            </div>
                            {/* Desktop : tableau avec scroll uniquement dans ce tableau */}
                            <div className="custom-scrollbar hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-[800px] table-fixed border-collapse text-xs">
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
                                        {uniqueTimes.map((tk) => (
                                            <tr
                                                key={tk}
                                                className="odd:bg-white even:bg-gray-50/50 dark:odd:bg-gray-900 dark:even:bg-white/[0.02]"
                                            >
                                                <td className="border bg-gray-50 px-2 py-2 text-xs font-medium whitespace-nowrap text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {tk.replace('-', ' – ')}
                                                </td>
                                                {DAYS.map((d) => {
                                                    const sl = cellFor(
                                                        d as Day,
                                                        tk,
                                                    );
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
                                                                className="rounded px-1 py-1 text-[11px] leading-tight font-medium text-white"
                                                                style={{
                                                                    backgroundColor:
                                                                        subjectColor(
                                                                            sl.subject,
                                                                        ),
                                                                }}
                                                            >
                                                                <div className="truncate font-semibold">
                                                                    {sl.subject}
                                                                </div>
                                                                <div className="truncate text-[10px] opacity-90">
                                                                    {sl.roomName ||
                                                                        sl.roomId}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile : jours en en-tête */}
                            <div className="space-y-3 lg:hidden">
                                {DAYS.map((day) => {
                                    const slotsForDay = uniqueTimes
                                        .map((tk) => ({
                                            tk,
                                            slot: cellFor(day as Day, tk),
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
                                                {slotsForDay.map(
                                                    ({ tk, slot }) => {
                                                        return (
                                                            <div
                                                                key={tk}
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
                                                                            subjectColor(
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
                                                                        {slot!
                                                                            .roomName ||
                                                                            slot!
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
                            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                                Lecture seule — création/modification réservée à
                                l'admin.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
