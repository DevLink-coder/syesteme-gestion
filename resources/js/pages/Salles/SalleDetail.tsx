import { useParams, Link, useNavigate } from 'react-router';
import { useMemo, useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import jsPDF from 'jspdf';
import PageMeta from '../../components/common/PageMeta';
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
import { useSchoolStructure } from '../../context/SchoolStructureContext';
// import { teachers } from '../../data/mock/users';
const teachers: any[] = [];
import { Modal } from '../../components/ui/modal';
import Input from '../../components/form/input/InputField';
import { useSubjects } from '../../context/SubjectsContext';
import StyledSelect from '../../components/ui/select/StyledSelect';
import {
    addDocumentFooters,
    addDocumentHeading,
    addStructuredTable,
    formatPdfDate,
    formatPdfTime,
} from '../../lib/structuredPdf';

const DAYS_EDT = [
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche',
] as const;
type DayEdt = (typeof DAYS_EDT)[number];
const SUBJECT_COLORS_EDT: Record<string, string> = {
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
function subjectColorEdt(s: string) {
    return SUBJECT_COLORS_EDT[s] || '#667085';
}
function timeToMinutesEdt(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function teacherNameEdt(id: string | number) {
    const idToCode: Record<string, string> = {
        '2': 't-01',
        '3': 't-02',
        '4': 't-03',
        '5': 't-04',
        '6': 't-05',
        '7': 't-06',
        '8': 't-07',
        '9': 't-08',
    };
    const code = idToCode[String(id)] || String(id);
    const t = teachers.find((x) => x.id === code || x.id === String(id));
    return t ? t.name : String(id);
}

export default function SalleDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        getSalleById,
        getStudentsForSalle,
        getMoyenneForSalle,
        schoolYears,
        addSubjectToSalle,
        updateCoefficient,
        removeSubjectFromSalle,
        archiveSalle,
        unarchiveSalle,
    } = useSchoolStructure();

    const [salle, setSalle] = useState<any>(() =>
        id ? getSalleById(id) : null,
    );
    const [salleLoading, setSalleLoading] = useState(!salle);
    useEffect(() => {
        if (!id) return;
        // Essaie d'abord le mock, sinon fetch backend (pour les salles créées via CRUD)
        if (salle) return;
        fetch(`/web/salles/${id}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data && data.id) {
                    // Normalise pour correspondre au type Salle mock
                    setSalle({
                        id: String(data.id),
                        code: data.code,
                        roomId: data.room_id,
                        name: data.name,
                        schoolYearId: String(data.school_year_id),
                        status: data.status,
                        principalTeacherId: data.principal_teacher_id
                            ? String(data.principal_teacher_id)
                            : undefined,
                        subjects: [], // sera rempli via /matieres
                        students: Array.isArray(data.students)
                            ? data.students.map((student: any) => ({
                                  id: String(student.id),
                                  code: student.code,
                                  name: student.name,
                                  roomId: data.room_id,
                                  language: student.language,
                                  parentName: student.parent_name,
                                  parentWhatsApp: student.parent_whatsapp,
                              }))
                            : [],
                        createdAt: data.created_at?.slice(0, 10) || '',
                    });
                }
                setSalleLoading(false);
            })
            .catch(() => setSalleLoading(false));
    }, [id, salle]);

    const [activeTab, setActiveTab] = useState<'eleves' | 'edt' | 'matieres'>(
        'eleves',
    );
    const [isAddMatOpen, setIsAddMatOpen] = useState(false);
    const [newMatName, setNewMatName] = useState('Mathématiques');
    const [customMatName, setCustomMatName] = useState('');
    const { subjects: mockGlobalSubjects, addSubject } = useSubjects();
    const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
    const [newCoef, setNewCoef] = useState<string>('2');
    const [matError, setMatError] = useState<string | null>(null);
    const [editCoef, setEditCoef] = useState<Record<string, string>>({});
    const [confirmDeleteMat, setConfirmDeleteMat] = useState<string | null>(
        null,
    );
    const [confirmArchive, setConfirmArchive] = useState(false);
    const [isSubmittingMat, setIsSubmittingMat] = useState(false);
    const [isRemovingMat, setIsRemovingMat] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const d = new Date(2026, 8, 14);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [dbTeachers, setDbTeachers] = useState<any[]>([]);
    useEffect(() => {
        fetch('/web/teachers', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((response) => (response.ok ? response.json() : []))
            .then((payload) =>
                setDbTeachers(
                    Array.isArray(payload)
                        ? payload
                        : Array.isArray(payload?.data)
                          ? payload.data
                          : [],
                ),
            )
            .catch(() => setDbTeachers([]));
    }, []);
    const handleExportPdf = () => {
        if (!salle) return;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const date = formatPdfDate();
        const yearLabel =
            schoolYear?.label || salle.schoolYearId || '2026-2027';
        addDocumentHeading(pdf, 'Emploi du temps — ' + salle.name, [
            'Année scolaire ' + yearLabel,
            'Semaine du ' +
                currentWeekStart.toLocaleDateString('fr-FR') +
                ' · Généré le ' +
                date,
        ]);
        const weekdays = DAYS_EDT.slice(0, 5);
        const times = Array.from(
            new Set(
                timetable.map(
                    (slot: any) =>
                        formatPdfTime(slot.startTime) +
                        '-' +
                        formatPdfTime(slot.endTime),
                ),
            ),
        ).sort(
            (a, b) =>
                timeToMinutesEdt(a.split('-')[0]) -
                timeToMinutesEdt(b.split('-')[0]),
        );
        const body = times.map((time) => {
            const [start, end] = time.split('-');
            return [
                start + '–' + end,
                ...weekdays.map((day) => {
                    const slot = timetable.find(
                        (candidate: any) =>
                            candidate.day === day &&
                            candidate.startTime === start &&
                            candidate.endTime === end,
                    );
                    if (!slot) return '—';
                    const teacher = dbTeachers.find(
                        (candidate: any) =>
                            String(candidate.id) === String(slot.teacherId) ||
                            String(candidate.code) === String(slot.teacherId),
                    );
                    return (
                        slot.subject +
                        '\n' +
                        (teacher?.name || teacherNameEdt(slot.teacherId))
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
        pdf.save('emploi-du-temps-' + salle.roomId + '-2026-2027.pdf');
        showToast('PDF téléchargé', 'success');
    };

    const [timetable, setTimetable] = useState<any[]>([]);
    const [matieres, setMatieres] = useState<any[]>([]);
    const { showToast } = useToast();
    useEffect(() => {
        if (!salle) return;
        const weekStr = currentWeekStart.toISOString().slice(0, 10);
        fetch(`/web/timetable?room_id=${salle.roomId}&week_start=${weekStr}`, {
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
                    teacherId: String(r.teacher_id),
                    roomId: r.room_id,
                }));
                setTimetable(mapped);
            })
            .catch(() => setTimetable([]));
    }, [salle?.roomId, currentWeekStart]);

    // Fetch matières depuis le backend (remplace le mock salle.subjects)
    useEffect(() => {
        if (!salle) return;
        const salleIdForApi = (salle as any).code || salle.id;
        fetch(`/web/salles/${salleIdForApi}/matieres`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any[]) => {
                const mapped = (data || []).map((m: any) => ({
                    name: m.name,
                    coefficient: m.coefficient,
                    optionale: !!m.optionale,
                }));
                setMatieres(mapped);
                // Synchronise aussi salle.subjects pour les compteurs
                (salle as any).subjects = mapped;
            })
            .catch(() => setMatieres([]));
    }, [salle?.id, salle?.code, activeTab]);

    // Fetch toutes les matières globales depuis le backend
    useEffect(() => {
        fetch('/web/subjects', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: any) => {
                const list = Array.isArray(data.data) ? data.data : [];
                setGlobalSubjects(list);
            })
            .catch(() => setGlobalSubjects([]));
    }, []);

    const students = salle ? getStudentsForSalle(salle) : [];
    const moyenne = salle ? getMoyenneForSalle(salle) : null;
    const _principal = salle
        ? teachers.find((t) => t.id === salle.principalTeacherId)
        : null;
    const slotsForEdt = useMemo(() => {
        if (!salle) return [];
        return [...timetable].sort(
            (a, b) =>
                DAYS_EDT.indexOf(a.day as DayEdt) -
                    DAYS_EDT.indexOf(b.day as DayEdt) ||
                timeToMinutesEdt(a.startTime) - timeToMinutesEdt(b.startTime),
        );
    }, [timetable, salle]);
    const uniqueTimesEdt = useMemo(() => {
        const set = new Set(
            slotsForEdt.map((s) => `${s.startTime}-${s.endTime}`),
        );
        return Array.from(set).sort(
            (a, b) =>
                timeToMinutesEdt(a.split('-')[0]) -
                timeToMinutesEdt(b.split('-')[0]),
        );
    }, [slotsForEdt]);
    const cellForEdt = (day: DayEdt, timeKey: string) => {
        const [st, en] = timeKey.split('-');
        return slotsForEdt.find(
            (s) => s.day === day && s.startTime === st && s.endTime === en,
        );
    };
    const schoolYear = salle
        ? schoolYears.find((y) => y.id === salle.schoolYearId)
        : null;
    const isArchived = salle ? salle.status === 'archivée' : false;

    if (salleLoading) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Chargement..." />
                <p className="text-gray-500">Chargement de la salle...</p>
            </div>
        );
    }
    if (!salle) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Salle introuvable" />
                <p className="text-gray-500">Salle introuvable.</p>
                <Link to="/salles" className="text-brand-500 underline">
                    Retour à la liste
                </Link>
            </div>
        );
    }

    const handleAddMat = async () => {
        if (isSubmittingMat) return;
        setIsSubmittingMat(true);
        const coef = Number(newCoef);
        const isCustom = !!customMatName.trim();
        const effectiveName = isCustom
            ? customMatName.trim()
            : newMatName.trim();
        if (!effectiveName) {
            setMatError('Nom de matière requis.');
            setIsSubmittingMat(false);
            return;
        }
        if (effectiveName.length < 2) {
            setMatError('Le nom doit contenir au moins 2 caractères.');
            setIsSubmittingMat(false);
            return;
        }
        // Essaie d'abord le backend (pour les salles créées via CRUD), sinon fallback mock
        const salleIdForApi = (salle as any).code || salle.id;
        try {
            const res = await fetch(`/web/salles/${salleIdForApi}/matieres`, {
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
                    name: effectiveName,
                    coefficient: coef,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                // Fallback mock si 404 (salle mock)
                const mockRes = addSubjectToSalle(salle.id, {
                    name: effectiveName,
                    coefficient: coef,
                });
                if (!mockRes.ok) {
                    setMatError(data.message || mockRes.error || 'Erreur');
                    showToast(
                        data.message || mockRes.error || 'Erreur',
                        'error',
                    );
                    setIsSubmittingMat(false);
                    return;
                }
            } else {
                showToast('Matière ajoutée avec succès', 'success');
            }
        } catch {
            const mockRes = addSubjectToSalle(salle.id, {
                name: effectiveName,
                coefficient: coef,
            });
            if (!mockRes.ok) {
                setMatError(mockRes.error || 'Erreur');
                showToast(mockRes.error || 'Erreur', 'error');
                setIsSubmittingMat(false);
                return;
            }
            showToast('Matière ajoutée (mock)', 'success');
        }
        if (
            isCustom &&
            !globalSubjects.some(
                (s) => s.name.toLowerCase() === effectiveName.toLowerCase(),
            )
        ) {
            addSubject(effectiveName, coef);
        }
        if (isCustom) setNewMatName(effectiveName);
        setIsAddMatOpen(false);
        setMatError(null);
        setCustomMatName('');
        setNewCoef('2');
        // Recharge les matières depuis le backend si possible
        try {
            const r = await fetch(`/web/salles/${salleIdForApi}/matieres`, {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (r.ok) {
                const mats = await r.json();
                const mapped = mats.map((m: any) => ({
                    name: m.name,
                    coefficient: m.coefficient,
                    optionale: !!m.optionale,
                }));
                setMatieres(mapped);
                (salle as any).subjects = mapped;
            }
        } catch {}
        setIsSubmittingMat(false);
    };

    const handleUpdateCoef = async (matName: string) => {
        const raw = editCoef[matName];
        if (raw === undefined) return;
        const coef = Number(raw);
        const salleIdForApi = (salle as any).code || salle.id;
        try {
            const res = await fetch(
                `/web/salles/${salleIdForApi}/matieres/${encodeURIComponent(matName)}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': decodeURIComponent(
                            document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ||
                                '',
                        ),
                    },
                    body: JSON.stringify({ coefficient: coef }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // Fallback mock
                const mockRes = updateCoefficient(salle.id, matName, coef);
                if (!mockRes.ok) {
                    showToast(
                        data.message || mockRes.error || 'Erreur',
                        'error',
                    );
                    return;
                }
            }
            showToast('Coefficient mis à jour', 'success');
        } catch {
            const mockRes = updateCoefficient(salle.id, matName, coef);
            if (!mockRes.ok) {
                showToast(mockRes.error || 'Erreur', 'error');
                return;
            }
            showToast('Coefficient mis à jour (mock)', 'success');
        }
        setEditCoef((prev) => {
            const n = { ...prev };
            delete n[matName];
            return n;
        });
    };

    return (
        <>
            <PageMeta
                title={`${salle.name} | Fiche salle`}
                description="Fiche détaillée salle"
            />
            <PageBreadcrumb pageTitle={salle.name} />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-3 text-2xl font-semibold text-gray-800 dark:text-white">
                        {salle.name}
                        <Badge color={isArchived ? 'warning' : 'success'}>
                            {salle.status}
                        </Badge>
                        {schoolYear?.isActive && (
                            <Badge color="primary">Année active</Badge>
                        )}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {schoolYear?.label || salle.schoolYearId} • Créée le{' '}
                        {salle.createdAt}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/salles')}
                    >
                        Retour liste
                    </Button>
                    {isArchived ? (
                        <Button onClick={() => unarchiveSalle(salle.id)}>
                            Restaurer
                        </Button>
                    ) : (
                        <Button onClick={() => setConfirmArchive(true)}>
                            Archiver
                        </Button>
                    )}
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Élèves inscrits</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white">
                        {students.length}
                    </p>
                </div>
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Matières</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white">
                        {matieres.length}
                    </p>
                </div>
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Moyenne générale</p>
                    {moyenne === null ? (
                        <p className="mt-1 text-sm font-medium text-gray-400">
                            Données insuffisantes
                        </p>
                    ) : (
                        <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white">
                            {moyenne.toFixed(2).replace('.', ',')} / 20
                        </p>
                    )}
                </div>
            </div>

            <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('eleves')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'eleves' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Élèves inscrits
                </button>
                <button
                    onClick={() => setActiveTab('edt')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'edt' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Emploi du temps
                </button>
                <button
                    onClick={() => setActiveTab('matieres')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'matieres' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Matières et coefficients
                </button>
            </div>

            {activeTab === 'eleves' && (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                        Élèves inscrits ({students.length})
                    </h3>
                    {students.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Aucun élève inscrit.
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
                                            Nom complet
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                        >
                                            Identifiant
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
                                            Parent
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                        >
                                            Contact
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {students.map((st) => (
                                        <TableRow key={st.id}>
                                            <TableCell className="py-3 font-medium text-gray-800 dark:text-white">
                                                {st.name}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-500">
                                                {st.id}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge
                                                    color={
                                                        st.enrollmentStatus ===
                                                        'validée'
                                                            ? 'success'
                                                            : 'warning'
                                                    }
                                                    size="sm"
                                                >
                                                    {st.enrollmentStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {st.parentName}
                                            </TableCell>
                                            <TableCell className="py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {st.parentWhatsApp}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'edt' && (
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
                                                            d.getTime() -
                                                                604800000,
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
                                                            d.getTime() +
                                                                604800000,
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
                                            const diff =
                                                day === 0 ? -6 : 1 - day;
                                            const m = new Date(t);
                                            m.setDate(t.getDate() + diff);
                                            m.setHours(0, 0, 0, 0);
                                            setCurrentWeekStart(m);
                                        }}
                                        title="Aujourd'hui"
                                        className="fc-today-button fc-button fc-button-primary rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        Aujourd&apos;hui
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
                                            const mon = new Date(
                                                currentWeekStart,
                                            );
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
                                    <h2 className="text-lg font-bold dark:text-white">
                                        Emploi du temps — {salle.name}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Année scolaire{' '}
                                        {schoolYear?.label ||
                                            salle.schoolYearId}{' '}
                                        — Semaine du{' '}
                                        {currentWeekStart.toLocaleDateString(
                                            'fr-FR',
                                        )}
                                    </p>
                                </div>
                                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                                    <div>{timetable.length} créneaux</div>
                                    <button
                                        onClick={handleExportPdf}
                                        className="mt-2 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        Télécharger le PDF
                                    </button>
                                </div>
                            </div>
                            {timetable.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-500">
                                    Aucun créneau.
                                </p>
                            ) : (
                                <>
                                    <div className="hidden overflow-hidden lg:block">
                                        <table className="w-full table-fixed border-collapse text-xs">
                                            <thead>
                                                <tr>
                                                    <th className="w-[110px] border bg-gray-50 px-2 py-2 text-left font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        Horaire
                                                    </th>
                                                    {DAYS_EDT.map((d) => (
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
                                                {uniqueTimesEdt.map((tk) => (
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
                                                        {DAYS_EDT.map((d) => {
                                                            const sl =
                                                                cellForEdt(
                                                                    d as DayEdt,
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
                                                                                subjectColorEdt(
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
                                                                            {teacherNameEdt(
                                                                                sl.teacherId,
                                                                            )}
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
                                    <div className="space-y-3 lg:hidden">
                                        {DAYS_EDT.map((day) => {
                                            const slotsForDay = uniqueTimesEdt
                                                .map((tk) => ({
                                                    tk,
                                                    slot: cellForEdt(
                                                        day as DayEdt,
                                                        tk,
                                                    ),
                                                }))
                                                .filter((x) => x.slot);
                                            if (slotsForDay.length === 0)
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
                                                            ({ tk, slot }) => (
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
                                                                                subjectColorEdt(
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
                                                                            {teacherNameEdt(
                                                                                slot!
                                                                                    .teacherId,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                                        Chaque case = 1 créneau récurrent
                                        hebdomadaire. Couleur = matière.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'matieres' && (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Matières et coefficients (EF-08/09)
                        </h3>
                        <Button size="sm" onClick={() => setIsAddMatOpen(true)}>
                            Ajouter une matière
                        </Button>
                    </div>
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
                                        Enseignant assigné
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Coefficient
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                    >
                                        Optionnelle
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-3 text-right font-medium text-gray-500"
                                    >
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {matieres.map((m) => {
                                    const enseignants = teachers.filter((t) =>
                                        t.teaches?.some(
                                            (x: { subject?: string; roomId?: string }) =>
                                                x.subject === m.name &&
                                                x.roomId === salle.roomId,
                                        ),
                                    );
                                    return (
                                        <TableRow key={m.name}>
                                            <TableCell className="py-3">
                                                <div className="font-medium text-gray-800 dark:text-white">
                                                    {m.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {enseignants.length > 0 ? (
                                                        enseignants
                                                            .map((t) => t.name)
                                                            .join(', ')
                                                    ) : (
                                                        <span className="italic">
                                                            Aucun enseignant
                                                            assigné
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-sm">
                                                {enseignants.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {enseignants.map(
                                                            (t) => (
                                                                <span
                                                                    key={t.id}
                                                                    className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                                                >
                                                                    {t.name}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                {editCoef[m.name] !==
                                                undefined ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={0.5}
                                                            value={
                                                                editCoef[m.name]
                                                            }
                                                            onChange={(e) =>
                                                                setEditCoef(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [m.name]:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            className="focus:border-brand-300 focus:ring-brand-500/20 h-9 w-20 rounded-lg border border-gray-300 bg-white px-2 text-sm shadow-sm focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateCoef(
                                                                    m.name,
                                                                )
                                                            }
                                                            className="bg-brand-500 hover:bg-brand-600 inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                                                        >
                                                            Enregistrer
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setEditCoef(
                                                                    (prev) => {
                                                                        const n =
                                                                            {
                                                                                ...prev,
                                                                            };
                                                                        delete n[
                                                                            m
                                                                                .name
                                                                        ];
                                                                        return n;
                                                                    },
                                                                )
                                                            }
                                                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                        >
                                                            Annuler
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex min-w-[28px] justify-center rounded-md bg-gray-50 px-2 py-1 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-700">
                                                            {m.coefficient}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                setEditCoef(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [m.name]:
                                                                            String(
                                                                                m.coefficient,
                                                                            ),
                                                                    }),
                                                                )
                                                            }
                                                            className="border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-sm"
                                                        >
                                                            Modifier
                                                        </button>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge
                                                    color={
                                                        m.optionale
                                                            ? 'warning'
                                                            : 'light'
                                                    }
                                                    size="sm"
                                                >
                                                    {m.optionale
                                                        ? 'Oui'
                                                        : 'Non'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        setConfirmDeleteMat(
                                                            m.name,
                                                        )
                                                    }
                                                    className="bg-error-50 text-error-600 hover:bg-error-100 rounded px-2 py-1 text-xs"
                                                >
                                                    Retirer
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    {matieres.length === 0 && (
                        <p className="mt-3 text-sm text-gray-500">
                            Aucune matière associée.
                        </p>
                    )}
                </div>
            )}

            <Modal
                isOpen={isAddMatOpen}
                onClose={() => {
                    setIsAddMatOpen(false);
                    setCustomMatName('');
                }}
                className="max-w-[480px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">
                    Ajouter une matière
                </h3>
                <p className="mb-3 text-xs text-gray-500">
                    Choisissez une matière existante ou saisissez une nouvelle.
                </p>
                {matError && (
                    <div className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 mb-3 rounded-lg border px-3 py-2 text-sm">
                        {matError}
                    </div>
                )}
                <div className="space-y-4">
                    {(() => {
                        const salleSubjectNames = new Set(
                            matieres.map((m) => m.name),
                        );
                        const availableSubjects = globalSubjects.filter(
                            (s) => !salleSubjectNames.has(s.name),
                        );
                        return (
                            <>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Matière existante
                                    </label>
                                    <StyledSelect
                                        value={newMatName}
                                        onChange={(v) => {
                                            setNewMatName(v);
                                            const found = globalSubjects.find(
                                                (s) => s.name === v,
                                            );
                                            if (found)
                                                setNewCoef(
                                                    String(found.coefficient),
                                                );
                                        }}
                                        placeholder="Choisir une matière"
                                        options={availableSubjects.map(
                                            (opt) => ({
                                                value: opt.name,
                                                label: `${opt.name} (coef ${opt.coefficient})`,
                                            }),
                                        )}
                                    />
                                </div>
                            </>
                        );
                    })()}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Ou saisir une nouvelle matière
                        </label>
                        <Input
                            value={customMatName}
                            onChange={(e) => setCustomMatName(e.target.value)}
                            placeholder="Ex: Philosophie, Arts plastiques..."
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Si remplie, cette saisie sera utilisée à la place de
                            la sélection ci-dessus.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Coefficient *
                        </label>
                        <Input
                            type="number"
                            value={newCoef}
                            onChange={(e) => setNewCoef(e.target.value)}
                            placeholder="2"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Valeur positive (ex: 1, 2, 4.5)
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddMatOpen(false);
                                setCustomMatName('');
                            }}
                            disabled={isSubmittingMat}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleAddMat}
                            disabled={isSubmittingMat}
                        >
                            {isSubmittingMat ? '...' : 'Ajouter'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!confirmDeleteMat}
                onClose={() => setConfirmDeleteMat(null)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-2 font-semibold">Retirer la matière ?</h3>
                <p className="mb-4 text-sm text-gray-500">
                    Retirer{' '}
                    <span className="font-medium text-gray-800">
                        {confirmDeleteMat}
                    </span>{' '}
                    de la salle {salle.name} ? La matière globale ne sera pas
                    supprimée.
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setConfirmDeleteMat(null)}
                        disabled={isRemovingMat}
                    >
                        Annuler
                    </Button>
                    <Button
                        disabled={isRemovingMat}
                        onClick={async () => {
                            if (!confirmDeleteMat || isRemovingMat) return;
                            setIsRemovingMat(true);
                            const salleIdForApi =
                                (salle as any).code || salle.id;
                            try {
                                const res = await fetch(
                                    `/web/salles/${salleIdForApi}/matieres/${encodeURIComponent(confirmDeleteMat)}`,
                                    {
                                        method: 'DELETE',
                                        credentials: 'include',
                                        headers: {
                                            'X-XSRF-TOKEN': decodeURIComponent(
                                                document.cookie.match(
                                                    /XSRF-TOKEN=([^;]+)/,
                                                )?.[1] || '',
                                            ),
                                            Accept: 'application/json',
                                        },
                                    },
                                );
                                if (res && !res.ok) {
                                    const data = await res
                                        .json()
                                        .catch(() => ({}));
                                    const mockRes = removeSubjectFromSalle(
                                        salle.id,
                                        confirmDeleteMat,
                                    );
                                    if (!mockRes.ok) {
                                        showToast(
                                            data.message ||
                                                mockRes.error ||
                                                'Erreur',
                                            'error',
                                        );
                                        setIsRemovingMat(false);
                                        return;
                                    }
                                }
                                showToast(
                                    'Matière retirée avec succès',
                                    'success',
                                );
                                try {
                                    const r = await fetch(
                                        `/web/salles/${salleIdForApi}/matieres`,
                                        {
                                            credentials: 'include',
                                            headers: {
                                                Accept: 'application/json',
                                            },
                                        },
                                    );
                                    if (r && r.ok) {
                                        const mats = await r.json();
                                        const mapped = mats.map((m: any) => ({
                                            name: m.name,
                                            coefficient: m.coefficient,
                                            optionale: !!m.optionale,
                                        }));
                                        setMatieres(mapped);
                                        (salle as any).subjects = mapped;
                                    }
                                } catch {}
                            } catch {
                                const mockRes = removeSubjectFromSalle(
                                    salle.id,
                                    confirmDeleteMat,
                                );
                                if (!mockRes.ok) {
                                    showToast(
                                        mockRes.error || 'Erreur',
                                        'error',
                                    );
                                    setIsRemovingMat(false);
                                    return;
                                }
                                showToast('Matière retirée (mock)', 'success');
                                const mats = (salle as any).subjects || [];
                                setMatieres([...mats]);
                            }
                            setIsRemovingMat(false);
                            setConfirmDeleteMat(null);
                        }}
                    >
                        {isRemovingMat ? '...' : 'Confirmer'}
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={confirmArchive}
                onClose={() => setConfirmArchive(false)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-2 font-semibold">Archiver la salle ?</h3>
                <p className="mb-4 text-sm text-gray-500">
                    Archiver {salle.name} conservera élèves, matières et emploi
                    du temps.
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setConfirmArchive(false)}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={() => {
                            archiveSalle(salle.id);
                            setConfirmArchive(false);
                        }}
                    >
                        Archiver
                    </Button>
                </div>
            </Modal>
        </>
    );
}
