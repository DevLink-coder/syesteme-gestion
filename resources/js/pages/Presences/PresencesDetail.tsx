import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
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
import { useToast } from '../../context/ToastContext';

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

export default function PresencesDetail() {
    const { salleId } = useParams<{ salleId: string }>();
    const { getSalleAttendance, saveAttendance } = useAttendance();
    const { showToast } = useToast();

    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [salleData, setSalleData] = useState<any>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<
        AttendanceRecord[]
    >([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getSalleAttendance(salleId!, selectedDate);
                setSalleData(data.salle);
                setAttendanceRecords(
                    data.students.map((s: any) => ({
                        id: s.id,
                        studentId: s.id,
                        studentName: s.name,
                        parentName: s.parentName,
                        parentWhatsApp: s.parentWhatsApp,
                        present: s.present,
                        heureAppel: s.heureAppel,
                        whatsappStatus: s.whatsappStatus,
                    })),
                );
            } catch (e: any) {
                setError(e.message || 'Erreur lors du chargement');
            } finally {
                setLoading(false);
            }
        };
        if (salleId) {
            void loadData();
        }
    }, [salleId, selectedDate, getSalleAttendance]);

    const toggleAttendance = (studentId: string) => {
        setAttendanceRecords((prev) =>
            prev.map((rec) => {
                if (rec.studentId === studentId) {
                    const newPresent =
                        rec.present === null ? true : !rec.present;
                    return {
                        ...rec,
                        present: newPresent,
                        heureAppel:
                            rec.heureAppel ||
                            (newPresent
                                ? new Date().toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : null),
                    };
                }
                return rec;
            }),
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const result = await saveAttendance(
                salleId!,
                selectedDate,
                attendanceRecords,
            );
            if (!result.ok) {
                setError(result.error || "Erreur lors de l'enregistrement");
            } else {
                showToast('Appel enregistré avec succès', 'success');
            }
        } catch (e: any) {
            setError(e.message || "Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Chargement..." />
                <p className="text-sm text-gray-500">Chargement...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Erreur" />
                <div className="bg-error-50 text-error-600 border-error-200 mb-4 rounded-lg border p-4">
                    {error}
                </div>
                <Link to="/presences" className="text-brand-500 underline">
                    Retour aux présences
                </Link>
            </div>
        );
    }

    if (!salleData) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Salle introuvable" />
                <p className="text-sm text-gray-500">Salle introuvable.</p>
                <Link to="/presences" className="text-brand-500 underline">
                    Retour aux présences
                </Link>
            </div>
        );
    }

    const presentsCount = attendanceRecords.filter(
        (r) => r.present === true,
    ).length;
    const absentsCount = attendanceRecords.filter(
        (r) => r.present === false,
    ).length;
    const notCalledCount = attendanceRecords.filter(
        (r) => r.present === null,
    ).length;

    return (
        <>
            <PageMeta
                title={`${salleData.name} | Détail présences`}
                description={`Détail des présences pour ${salleData.name}`}
            />
            <PageBreadcrumb pageTitle={salleData.name} />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Détail — {salleData.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {salleData.schoolYearLabel || salleData.schoolYearId} •
                        Séance du {selectedDate}
                    </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="focus:border-brand-500 focus:ring-brand-500/20 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:outline-none sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    />
                    <Link to="/presences">
                        <Button variant="outline">
                            Retour à la vue d'ensemble
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800/[0.02]">
                <p>
                    <span className="font-medium">Résumé :</span>{' '}
                    {presentsCount} présents, {absentsCount} absents,{' '}
                    {notCalledCount} non appelés
                </p>
            </div>

            {attendanceRecords.some((record) => record.present !== null) && (
                <div className="border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900 dark:bg-brand-500/10 dark:text-brand-300 mb-4 rounded-lg border px-4 py-3 text-sm">
                    L’appel est déjà enregistré. Modifiez les statuts puis
                    cliquez sur « Mettre à jour l’appel » pour sauvegarder les
                    changements.
                </div>
            )}
            <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                {attendanceRecords.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Aucun élève inscrit dans cette salle.
                    </p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                                    <TableRow>
                                        <TableCell
                                            isHeader
                                            className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                        >
                                            Élève
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
                                            Heure d'appel
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="text-theme-xs py-3 text-left font-medium text-gray-500"
                                        >
                                            Contact parent
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
                                    {attendanceRecords.map((rec) => {
                                        return (
                                            <TableRow key={rec.studentId}>
                                                <TableCell className="py-3">
                                                    <div className="font-medium text-gray-800 dark:text-white">
                                                        {rec.studentName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {rec.present === true ? (
                                                        <Badge
                                                            color="success"
                                                            size="sm"
                                                        >
                                                            Présent
                                                        </Badge>
                                                    ) : rec.present ===
                                                      false ? (
                                                        <Badge
                                                            color="error"
                                                            size="sm"
                                                        >
                                                            Absent
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            color="light"
                                                            size="sm"
                                                        >
                                                            Non appelé
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3 text-sm text-gray-500">
                                                    {rec.heureAppel || '—'}
                                                </TableCell>
                                                <TableCell className="py-3 text-sm text-gray-500">
                                                    {rec.parentWhatsApp || '—'}
                                                </TableCell>
                                                <TableCell className="py-3 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            toggleAttendance(
                                                                rec.studentId,
                                                            )
                                                        }
                                                    >
                                                        {rec.present === null
                                                            ? 'Marquer présent'
                                                            : rec.present
                                                              ? 'Marquer absent'
                                                              : 'Marquer présent'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving
                                    ? 'Enregistrement...'
                                    : attendanceRecords.some(
                                            (record) => record.present !== null,
                                        )
                                      ? "Mettre à jour l'appel"
                                      : "Enregistrer l'appel"}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
