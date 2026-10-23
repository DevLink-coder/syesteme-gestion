import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import { useToast } from '../../context/ToastContext';

type PresenceState = Record<string, boolean>;

interface AttendanceSlot {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    roomId: string;
    salleName: string;
}

function getTodayKey() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}

export default function AppelPresence() {
    const { slotId } = useParams();
    const { showToast } = useToast();
    const [date, setDate] = useState(getTodayKey);
    const [slot, setSlot] = useState<AttendanceSlot | null>(null);
    const [eleves, setEleves] = useState<
        Array<{ id: string; code: string; name: string }>
    >([]);
    const [presences, setPresences] = useState<PresenceState>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSaved, setHasSaved] = useState(false);

    useEffect(() => {
        if (!slotId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`/web/teacher-portal/slots/${slotId}/attendance?date=${date}`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const payload = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(
                        payload.message || 'Impossible de charger l’appel.',
                    );
                if (!cancelled) {
                    const roster = Array.isArray(payload.students)
                        ? payload.students
                        : [];
                    setSlot(payload.slot);
                    setEleves(roster);
                    setPresences(
                        Object.fromEntries(
                            roster.map((student: any) => [
                                student.id,
                                student.present !== false,
                            ]),
                        ),
                    );
                    setHasSaved(Boolean(payload.hasSaved));
                }
            })
            .catch((loadError: any) => {
                if (!cancelled) {
                    setSlot(null);
                    setEleves([]);
                    setError(
                        loadError.message || 'Impossible de charger l’appel.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [slotId, date]);

    const togglePresence = (studentId: string) => {
        setPresences((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    const handleValider = async () => {
        if (!slot || saving || eleves.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(
                `/web/teacher-portal/slots/${slot.id}/attendance`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': decodeURIComponent(
                            document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ||
                                '',
                        ),
                    },
                    body: JSON.stringify({
                        date,
                        attendances: eleves.map((student) => ({
                            student_id: student.id,
                            present: presences[student.id] !== false,
                        })),
                    }),
                },
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error(
                    payload.message || 'Impossible d’enregistrer l’appel.',
                );
            setHasSaved(true);
            showToast('Appel enregistré.', 'success');
        } catch (saveError: any) {
            setError(saveError.message || 'Impossible d’enregistrer l’appel.');
        } finally {
            setSaving(false);
        }
    };

    const nbAbsents = useMemo(
        () => eleves.filter((student) => !presences[student.id]).length,
        [presences, eleves],
    );
    const nbPresents = eleves.length - nbAbsents;

    if (loading) {
        return (
            <p className="p-6 text-sm text-gray-500">
                Chargement de l’appel...
            </p>
        );
    }

    if (!slot) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Appel indisponible" />
                <p className="text-gray-500">
                    {error || 'Créneau introuvable ou non assigné.'}
                </p>
                <Link to="/enseignant" className="text-brand-500 underline">
                    Retour
                </Link>
            </div>
        );
    }

    return (
        <>
            <PageMeta
                title={`Appel — ${slot.subject} | Espace Enseignant`}
                description="Interface d'appel UC-10"
            />
            <PageBreadcrumb pageTitle={`Appel — ${slot.subject}`} />

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <label className="block text-sm font-medium">
                    Date de l’appel
                    <input
                        type="date"
                        value={date}
                        onChange={(event) => {
                            setDate(event.target.value);
                            setHasSaved(false);
                        }}
                        className="mt-1 block h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Les présences sont enregistrées dans le dossier de la salle.
                </p>
            </div>

            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                {error && (
                    <p className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300 mb-3 rounded-lg border px-3 py-2 text-sm">
                        {error}
                    </p>
                )}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Appel — {slot.subject} —{' '}
                            {slot.salleName || slot.roomId}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {slot.day} {slot.startTime}–{slot.endTime} •{' '}
                            {slot.salleName || slot.roomId} • {eleves.length}{' '}
                            élèves
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            color={hasSaved ? 'success' : 'warning'}
                            size="sm"
                        >
                            {hasSaved ? 'Enregistré' : 'Non enregistré'}
                        </Badge>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                                    Élève
                                </th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                                    Présence
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
                            {eleves.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                    >
                                        Aucun élève inscrit dans cette salle.
                                    </td>
                                </tr>
                            ) : (
                                eleves.map((el) => {
                                    const isPresent = presences[el.id] ?? true;
                                    return (
                                        <tr
                                            key={el.id}
                                            className="hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                                        >
                                            <td className="px-3 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {el.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {el.code}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        togglePresence(el.id)
                                                    }
                                                    disabled={saving}
                                                    className={`inline-flex min-w-[90px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${isPresent ? 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20 ring-1' : 'bg-error-50 text-error-700 ring-error-200 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20 ring-1'}`}
                                                >
                                                    {isPresent
                                                        ? 'Présent'
                                                        : 'Absent'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-gray-500">
                        {nbPresents} présents • {nbAbsents} absents sur{' '}
                        {eleves.length}
                    </p>
                    <Button
                        onClick={handleValider}
                        disabled={saving || eleves.length === 0}
                    >
                        {saving ? 'Enregistrement...' : 'Valider l’appel'}
                    </Button>
                </div>
                {hasSaved && (
                    <p className="mt-2 text-xs text-gray-400">
                        Dernier enregistrement confirmé pour le{' '}
                        {new Date(`${date}T12:00:00`).toLocaleDateString(
                            'fr-FR',
                        )}
                        .
                    </p>
                )}
            </div>
        </>
    );
}
