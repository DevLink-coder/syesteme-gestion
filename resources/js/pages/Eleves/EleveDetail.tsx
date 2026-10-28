import { useParams, Link, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Badge from '../../components/ui/badge/Badge';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import StyledSelect from '../../components/ui/select/StyledSelect';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Modal } from '../../components/ui/modal';
import { useEnrollment, formatFCFA } from '../../context/EnrollmentContext';
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { useEvaluations } from '../../context/EvaluationsContext';
import { useAttendance } from '../../context/AttendanceContext';
import { buildEcheancier } from '../../lib/echeancier';
import { useAlertModal } from '../../context/AlertModalContext';

export default function EleveDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlertModal();
    const {
        getStudentById,
        getInscriptionsForStudent,
        getInscriptionActuelle,
        getPaymentsForInscription,
        getSoldeForInscription,
        getTarifForSalleYear,
        createPayment,
        pauseInscription,
        reactivateInscription,
        createInscription,
        reinscrire,
        updateInscriptionMonths,
        updateStudent,
        deleteStudent,
    } = useEnrollment();
    const { salles: ctxSalles, schoolYears: ctxYears } = useSchoolStructure();
    const { evaluations, loadEvaluations } = useEvaluations();
    const { loadAttendance, getSalleAttendance, sallesAttendance } = useAttendance();
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

    const salles = ctxSalles.map((s: any) => ({
        id: String(s.id),
        roomId: String(s.roomId),
        name: s.name,
        schoolYearId: String(s.schoolYearId),
        status: s.status,
    }));
    const schoolYears = ctxYears.map((y: any) => ({
        id: String(y.id),
        label: y.label,
        isActive: !!y.isActive,
    }));

    const student = id ? getStudentById(id) : undefined;
    const inscriptions = student ? getInscriptionsForStudent(student.id) : [];
    const actuelle = student ? getInscriptionActuelle(student.id) : undefined;

    const [activeTab, setActiveTab] = useState<
        'actuelle' | 'historique' | 'paiements' | 'notes' | 'presences'
    >('actuelle');
    const [isPayOpen, setIsPayOpen] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payError, setPayError] = useState<string | null>(null);
    const [payObjet, setPayObjet] = useState<'mois' | 'inscription' | 'total'>(
        'mois',
    );
    const [isPauseConfirm, setIsPauseConfirm] = useState<string | null>(null);
    const activeYearId = schoolYears.find((y: any) => y.isActive)?.id ?? '';

    useEffect(() => {
        if (!activeYearId) return;
        setReinsYear((c) =>
            schoolYears.some((y: any) => String(y.id) === String(c))
                ? c
                : String(activeYearId),
        );
        setInsYear((c) =>
            schoolYears.some((y: any) => String(y.id) === String(c))
                ? c
                : String(activeYearId),
        );
    }, [activeYearId]);

    useEffect(() => {
        void loadEvaluations();
    }, [loadEvaluations]);

    useEffect(() => {
        if (!student) return;
        const loadStudentAttendance = async () => {
            const allRecords: any[] = [];
            for (const ins of inscriptions) {
                try {
                    const salleData = await getSalleAttendance(ins.salleId);
                    if (salleData?.students) {
                        const studentRecords = salleData.students
                            .filter((s: any) => s.id === student.id)
                            .map((s: any) => ({
                                id: `${s.id}-${salleData.date}`,
                                studentId: s.id,
                                date: salleData.date,
                                roomId: salleData.salle.roomId,
                                present: s.present,
                            }));
                        allRecords.push(...studentRecords);
                    }
                } catch (e) {
                    console.error('Failed to load attendance for salle:', ins.salleId, e);
                }
            }
            setAttendanceRecords(allRecords);
        };
        void loadStudentAttendance();
    }, [student, inscriptions, getSalleAttendance]);

    const [isReinsOpen, setIsReinsOpen] = useState(false);
    const [reinsSalle, setReinsSalle] = useState('');
    const [reinsYear, setReinsYear] = useState('');
    const [reinsDate, setReinsDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [reinsError, setReinsError] = useState<string | null>(null);
    const [isInscriptionOpen, setIsInscriptionOpen] = useState(false);
    const [insSalle, setInsSalle] = useState('');
    const [insYear, setInsYear] = useState('');
    const [insDate, setInsDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [parentShareLink, setParentShareLink] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editParent, setEditParent] = useState('');
    const [editWhatsApp, setEditWhatsApp] = useState('');
    const [editMonths, setEditMonths] = useState('9');
    const [editError, setEditError] = useState<string | null>(null);
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const openEdit = () => {
        if (!student) return;
        setEditName(student.name);
        setEditParent(student.parentName);
        setEditWhatsApp(
            student.parentWhatsApp.replace(/\D/g, '').replace(/^237/, ''),
        );
        setEditMonths(String(actuelle?.nombreMois ?? 9));
        setEditError(null);
        setIsEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!student) return;
        if (!editName.trim() || !editParent.trim() || !editWhatsApp.trim()) {
            setEditError('Nom, parent et WhatsApp obligatoires.');
            return;
        }
        const nombreMois = Number(editMonths);
        if (
            actuelle &&
            (!Number.isInteger(nombreMois) || nombreMois < 1 || nombreMois > 12)
        ) {
            setEditError('Le nombre de mois doit être compris entre 1 et 12.');
            return;
        }
        const res = await updateStudent(student.id, {
            name: editName.trim(),
            parentName: editParent.trim(),
            parentWhatsApp: editWhatsApp.trim(),
        });
        if (!res.ok) {
            setEditError(res.error || 'Erreur');
            return;
        }
        if (actuelle) {
            const monthsResult = await updateInscriptionMonths(
                actuelle.id,
                nombreMois,
            );
            if (!monthsResult.ok) {
                setEditError(
                    monthsResult.error ||
                        'Impossible de modifier le nombre de mois.',
                );
                return;
            }
        }
        setIsEditOpen(false);
        setToast('Informations de l’élève mises à jour.');
    };

    const handleDelete = async () => {
        if (!student) return;
        const res = await deleteStudent(student.id);
        if (!res.ok) {
            setToast(res.error || 'Suppression impossible.');
            return;
        }
        setToast('Élève archivé.');
        setTimeout(() => navigate('/eleves'), 600);
    };

    const handlePay = async (inscriptionId: string) => {
        const amount = Number(payAmount);
        if (isNaN(amount) || amount <= 0) {
            setPayError('Montant invalide.');
            return;
        }
        const res = await createPayment({
            inscriptionId,
            amount,
            type:
                payObjet === 'inscription' ? 'inscription' : 'mensualit\u00e9',
        });
        if (!res.ok) {
            setPayError(res.error || 'Erreur');
            return;
        }
        setToast(`Paiement de ${payAmount} FCFA enregistré.`);
        setIsPayOpen(null);
        setPayAmount('');
        setPayError(null);
    };

    const handleReinscrire = async () => {
        if (!student) return;
        if (!reinsSalle || !reinsYear) {
            setReinsError('Salle et année obligatoires.');
            return;
        }
        const res = await reinscrire(student.id, {
            salleId: reinsSalle,
            schoolYearId: reinsYear,
            dateInscription: reinsDate,
        });
        if (!res.ok) {
            setReinsError(res.error || 'Erreur');
            return;
        }
        setIsReinsOpen(false);
        setReinsError(null);
    };

    const handleNewInscription = async () => {
        if (!student) return;
        if (!insSalle || !insYear) {
            showAlert('Veuillez renseigner les champs obligatoires.');
            return;
        }
        const res = await createInscription({
            studentId: student.id,
            salleId: insSalle,
            schoolYearId: insYear,
            dateInscription: insDate,
        });
        if (!res.ok) showAlert(res.error || 'Une erreur est survenue.');
        else setIsInscriptionOpen(false);
    };

    if (!student) {
        return (
            <div className="p-6">
                <PageBreadcrumb pageTitle="Élève introuvable" />
                <p className="text-gray-500">Élève introuvable.</p>
                <Link to="/eleves" className="text-brand-500 underline">
                    Retour
                </Link>
            </div>
        );
    }

    const copyParentLink = async () => {
        let generatedUrl = '';
        try {
            const csrf = decodeURIComponent(
                document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
            );
            const response = await fetch(
                `/web/students/${encodeURIComponent(student.id)}/parent-link`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': csrf,
                    },
                },
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.url) {
                showAlert(
                    payload.message || 'Impossible de créer le lien parent.',
                );
                return;
            }
            generatedUrl = payload.url;
            setParentShareLink(payload.url);
            await navigator.clipboard.writeText(payload.url);
        } catch {
            showAlert(
                generatedUrl
                    ? `Le lien est créé, mais la copie automatique a échoué. Copiez-le manuellement :\n${generatedUrl}`
                    : 'Le lien parent n’a pas pu être créé.',
            );
            return;
        }
        setToast('Lien copié dans le presse-papiers');
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <>
            <PageMeta
                title={`${student.name} | Fiche élève`}
                description="Fiche élève historique"
            />
            <PageBreadcrumb pageTitle={student.name} />

            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-3 text-2xl font-semibold text-gray-800 dark:text-white">
                        {student.name}
                        <span className="text-sm font-normal text-gray-400">
                            {student.code || student.id}
                        </span>
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Parent : {student.parentName} • {student.parentWhatsApp}{' '}
                        {student.language
                            ? `• Langue : ${student.language}`
                            : ''}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/eleves')}
                    >
                        Retour
                    </Button>
                    <Button variant="outline" onClick={openEdit}>
                        Modifier
                    </Button>
                    <Button onClick={() => navigate('/eleves/nouveau')}>
                        Nouvelle inscription
                    </Button>
                    <Button onClick={() => setIsReinsOpen(true)}>
                        Réinscription
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShareModalOpen(true)}
                    >
                        🔗 Partager lien parent
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsDeleteConfirm(true)}
                    >
                        Archiver
                    </Button>
                </div>
            </div>

            {actuelle && (
                <div className="mb-4 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">
                        Situation actuelle
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="text-xs text-gray-500">Statut</p>
                            <p className="mt-1">
                                <Badge
                                    color={
                                        actuelle.statut === 'Valid\u00e9e'
                                            ? 'success'
                                            : actuelle.statut === 'En pause'
                                              ? 'warning'
                                              : 'error'
                                    }
                                    size="sm"
                                >
                                    {actuelle.statut}
                                </Badge>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Salle</p>
                            <p className="font-medium">
                                {salles.find((s) => s.id === actuelle.salleId)
                                    ?.name || 'Sans salle'}
                            </p>
                        </div>
                        {(() => {
                            const tarif = getTarifForSalleYear(
                                actuelle.salleId,
                                actuelle.schoolYearId,
                            );
                            const ech = buildEcheancier(
                                {
                                    dateInscription: actuelle.dateInscription,
                                    fraisInscription:
                                        tarif?.fraisInscription ?? 0,
                                    mensualite: tarif?.mensualite ?? 0,
                                    nombreMois:
                                        actuelle.nombreMois ??
                                        tarif?.nombreMois ??
                                        9,
                                },
                                tarif,
                                getPaymentsForInscription(actuelle.id),
                            );
                            return (
                                <div>
                                    <p className="text-xs text-gray-500">
                                        Paiement du mois ({ech.currentLabel})
                                    </p>
                                    <p className="font-semibold">
                                        {ech.isClean ? (
                                            <span className="text-success-600">
                                                Payé — rien à payer
                                            </span>
                                        ) : (
                                            <span className="text-error-600">
                                                Non payé —{' '}
                                                {formatFCFA(ech.currentDue)}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Tarif : inscription{' '}
                                        {formatFCFA(
                                            tarif?.fraisInscription ?? 0,
                                        )}{' '}
                                        + mensualité{' '}
                                        {formatFCFA(tarif?.mensualite ?? 0)}
                                    </p>
                                </div>
                            );
                        })()}
                        <div className="flex flex-col gap-2">
                            <Button
                                size="sm"
                                onClick={() => setIsPayOpen(actuelle.id)}
                            >
                                Enregistrer un paiement
                            </Button>
                            {actuelle.statut === 'En pause' ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        void reactivateInscription(
                                            actuelle.id,
                                        ).then((r) => {
                                            if (!r.ok)
                                                setToast(r.error || 'Erreur');
                                            else
                                                setToast(
                                                    'Inscription réactivée.',
                                                );
                                        })
                                    }
                                >
                                    Réactiver
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setIsPauseConfirm(actuelle.id)
                                    }
                                >
                                    Mettre en pause
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!actuelle && (
                <div className="border-warning-300 bg-warning-50 mb-4 rounded-2xl border p-5">
                    <h3 className="font-semibold text-gray-800">
                        ⚠ Sans salle affectée
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                        Un élève appartient obligatoirement à une salle. Créez
                        une inscription pour affecter {student.name} à une
                        salle.
                    </p>
                    <div className="mt-3">
                        <Button
                            size="sm"
                            onClick={() => setIsInscriptionOpen(true)}
                        >
                            Affecter à une salle
                        </Button>
                    </div>
                </div>
            )}

            <div className="mb-4 flex gap-2 overflow-x-auto border-b">
                <button
                    onClick={() => setActiveTab('historique')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'historique' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Historique inscriptions
                </button>
                <button
                    onClick={() => setActiveTab('paiements')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'paiements' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Paiements
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'notes' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Notes
                </button>
                <button
                    onClick={() => setActiveTab('presences')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'presences' ? 'border-brand-500 text-brand-600 border-b-2' : 'text-gray-500'}`}
                >
                    Présences
                </button>
            </div>

            {activeTab === 'historique' && (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 font-semibold">
                        Historique des inscriptions
                    </h3>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-y">
                                <TableRow>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Année
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Salle
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Statut
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Date
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Reste à payer
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y">
                                {inscriptions.map((ins) => (
                                    <TableRow key={ins.id}>
                                        <TableCell className="py-2">
                                            {ins.schoolYearId}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {salles.find(
                                                (s) => s.id === ins.salleId,
                                            )?.name || ins.salleId}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <Badge
                                                size="sm"
                                                color={
                                                    ins.statut ===
                                                    'Valid\u00e9e'
                                                        ? 'success'
                                                        : ins.statut ===
                                                            'En pause'
                                                          ? 'warning'
                                                          : 'error'
                                                }
                                            >
                                                {ins.statut}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {ins.dateInscription}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {formatFCFA(
                                                getSoldeForInscription(ins.id),
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {ins.statut === 'En pause' ? (
                                                <button
                                                    onClick={() =>
                                                        void reactivateInscription(
                                                            ins.id,
                                                        ).then((r) => {
                                                            if (!r.ok)
                                                                setToast(
                                                                    r.error ||
                                                                        'Erreur',
                                                                );
                                                            else
                                                                setToast(
                                                                    'Inscription réactivée.',
                                                                );
                                                        })
                                                    }
                                                    className="bg-success-50 text-success-700 rounded px-2 py-1 text-xs"
                                                >
                                                    Réactiver
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        setIsPauseConfirm(
                                                            ins.id,
                                                        )
                                                    }
                                                    className="bg-warning-50 text-warning-700 rounded px-2 py-1 text-xs"
                                                >
                                                    Pause
                                                </button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {activeTab === 'paiements' && (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 font-semibold">Échéancier mensuel</h3>
                    {inscriptions.map((ins) => {
                        const tarif = getTarifForSalleYear(
                            ins.salleId,
                            ins.schoolYearId,
                        );
                        const ech = buildEcheancier(
                            {
                                dateInscription: ins.dateInscription,
                                fraisInscription: tarif?.fraisInscription ?? 0,
                                mensualite: tarif?.mensualite ?? 0,
                                nombreMois:
                                    ins.nombreMois ?? tarif?.nombreMois ?? 9,
                            },
                            tarif,
                            getPaymentsForInscription(ins.id),
                        );
                        return (
                            <div key={`ech-${ins.id}`} className="mb-5">
                                <p className="mb-1 text-sm font-medium">
                                    {ins.schoolYearId} —{' '}
                                    {
                                        salles.find((s) => s.id === ins.salleId)
                                            ?.name
                                    }{' '}
                                    ({ins.statut}){' '}
                                    {ech.isClean ? (
                                        <span className="text-success-600">
                                            — Payé ce mois
                                        </span>
                                    ) : (
                                        <span className="text-error-600">
                                            — Non payé ce mois :{' '}
                                            {formatFCFA(ech.currentDue)} (
                                            {ech.currentLabel})
                                        </span>
                                    )}
                                </p>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="border-y">
                                            <TableRow>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Échéance
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Date due
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Montant
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Payé
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Reste
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Statut
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y">
                                            {ech.cycles.map((c) => (
                                                <TableRow key={c.index}>
                                                    <TableCell className="py-2">
                                                        {c.label}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {c.dueDate}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {formatFCFA(c.amount)}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {formatFCFA(c.paid)}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {formatFCFA(c.solde)}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Badge
                                                            size="sm"
                                                            color={
                                                                c.status ===
                                                                'payee'
                                                                    ? 'success'
                                                                    : c.status ===
                                                                        'partielle'
                                                                      ? 'warning'
                                                                      : c.status ===
                                                                          'impayee'
                                                                        ? 'error'
                                                                        : 'light'
                                                            }
                                                        >
                                                            {c.status ===
                                                            'payee'
                                                                ? 'Payée'
                                                                : c.status ===
                                                                    'partielle'
                                                                  ? 'Partielle'
                                                                  : c.status ===
                                                                      'impayee'
                                                                    ? 'En retard'
                                                                    : 'À venir'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        );
                    })}
                    <h3 className="mb-3 font-semibold">
                        Historique des paiements
                    </h3>
                    {inscriptions.map((ins) => {
                        const pays = getPaymentsForInscription(ins.id);
                        if (pays.length === 0) return null;
                        return (
                            <div key={ins.id} className="mb-4">
                                <p className="mb-1 text-sm font-medium">
                                    {ins.schoolYearId} —{' '}
                                    {
                                        salles.find((s) => s.id === ins.salleId)
                                            ?.name
                                    }{' '}
                                    ({ins.statut}) — Reste à payer{' '}
                                    {formatFCFA(getSoldeForInscription(ins.id))}
                                </p>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="border-y">
                                            <TableRow>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Date
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Montant
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Type
                                                </TableCell>
                                                <TableCell
                                                    isHeader
                                                    className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                >
                                                    Référence
                                                </TableCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y">
                                            {pays.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="py-2">
                                                        {p.date}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {formatFCFA(p.amount)}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Badge
                                                            size="sm"
                                                            color={
                                                                p.status ===
                                                                'pay\u00e9'
                                                                    ? 'success'
                                                                    : p.status ===
                                                                        'partiel'
                                                                      ? 'warning'
                                                                      : 'error'
                                                            }
                                                        >
                                                            {p.type} •{' '}
                                                            {p.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {p.reference}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 font-semibold">Notes</h3>
                    {evaluations.filter((ev) => ev.grades[student.id])
                        .length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune note.</p>
                    ) : (
                        evaluations
                            .filter((ev) => ev.grades[student.id])
                            .map((ev) => (
                                <div key={ev.id} className="mb-3">
                                    <p className="text-sm font-medium">
                                        {ev.roomId} — {ev.date} • {ev.subject}
                                    </p>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="border-y">
                                                <TableRow>
                                                    <TableCell
                                                        isHeader
                                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                    >
                                                        Matière
                                                    </TableCell>
                                                    <TableCell
                                                        isHeader
                                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                    >
                                                        Note
                                                    </TableCell>
                                                    <TableCell
                                                        isHeader
                                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                                    >
                                                        Coefficient
                                                    </TableCell>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="divide-y">
                                                {Object.entries(
                                                    ev.grades[student.id] || {},
                                                ).map(([mat, val]: any) => (
                                                    <TableRow key={mat}>
                                                        <TableCell className="py-2">
                                                            {mat}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {val.note}/20
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {val.coefficient}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            )}

            {activeTab === 'presences' && (
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-3 font-semibold">Présences</h3>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-y">
                                <TableRow>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Date
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Salle
                                    </TableCell>
                                    <TableCell
                                        isHeader
                                        className="text-theme-xs py-2 text-left font-medium text-gray-500"
                                    >
                                        Statut
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y">
                                {attendanceRecords
                                    .filter((a) => a.studentId === student.id)
                                    .map((a) => (
                                        <TableRow key={a.id}>
                                            <TableCell className="py-2">
                                                {a.date}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                {salles.find((s) => s.roomId === a.roomId)?.name || a.roomId}{' '}
                                                •{' '}
                                                {inscriptions.find(
                                                    (ins) =>
                                                        ins.studentId ===
                                                            student.id &&
                                                        salles.find(
                                                            (s) =>
                                                                s.roomId ===
                                                                    a.roomId &&
                                                                s.id ===
                                                                    ins.salleId,
                                                        )?.id === ins.salleId,
                                                )?.schoolYearId || ''}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Badge
                                                    size="sm"
                                                    color={
                                                        a.present
                                                            ? 'success'
                                                            : 'error'
                                                    }
                                                >
                                                    {a.present
                                                        ? 'Présent'
                                                        : 'Absent'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                    {attendanceRecords.filter((a) => a.studentId === student.id)
                        .length === 0 && (
                        <p className="text-sm text-gray-500">
                            Aucune présence.
                        </p>
                    )}
                </div>
            )}

            <Modal
                isOpen={!!isPayOpen}
                onClose={() => setIsPayOpen(null)}
                className="max-w-[480px] p-6"
            >
                {isPayOpen &&
                    (() => {
                        const ins = inscriptions.find(
                            (i) => i.id === isPayOpen,
                        );
                        if (!ins) return null;
                        const solde = getSoldeForInscription(ins.id);
                        const tarif = getTarifForSalleYear(
                            ins.salleId,
                            ins.schoolYearId,
                        );
                        const ech = buildEcheancier(
                            {
                                dateInscription: ins.dateInscription,
                                fraisInscription: tarif?.fraisInscription ?? 0,
                                mensualite: tarif?.mensualite ?? 0,
                                nombreMois:
                                    ins.nombreMois ?? tarif?.nombreMois ?? 9,
                            },
                            tarif,
                            getPaymentsForInscription(ins.id),
                        );
                        return (
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold">
                                    Enregistrer un paiement
                                </h3>
                                <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                                    <p>
                                        Montant restant à payer (
                                        {ech.currentLabel}) :{' '}
                                        <span className="font-semibold">
                                            {formatFCFA(ech.currentDue)}
                                        </span>{' '}
                                        {ech.isClean ? (
                                            <span className="text-success-600 font-medium">
                                                — Rien à payer
                                            </span>
                                        ) : (
                                            <span className="text-error-600 font-medium">
                                                — Non payé
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Dont frais d'inscription :{' '}
                                        {formatFCFA(ech.fraisDue)} • Mensualité{' '}
                                        {ech.currentMoisLabel} :{' '}
                                        {formatFCFA(ech.moisDue)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Tarif : inscription{' '}
                                        {formatFCFA(
                                            tarif?.fraisInscription ?? 0,
                                        )}{' '}
                                        + mensualité{' '}
                                        {formatFCFA(tarif?.mensualite ?? 0)}
                                    </p>
                                </div>
                                {payError && (
                                    <div className="bg-error-50 text-error-600 rounded px-3 py-2 text-sm">
                                        {payError}
                                    </div>
                                )}
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Payer pour *
                                    </label>
                                    <StyledSelect
                                        value={payObjet}
                                        onChange={(v) => {
                                            const objet =
                                                v === 'inscription'
                                                    ? 'inscription'
                                                    : v === 'total'
                                                      ? 'total'
                                                      : 'mois';
                                            setPayObjet(objet);
                                            setPayAmount(
                                                String(
                                                    objet === 'total'
                                                        ? solde
                                                        : objet ===
                                                            'inscription'
                                                          ? ech.fraisDue
                                                          : ech.moisDue,
                                                ),
                                            );
                                        }}
                                        options={[
                                            ...(ech.fraisDue > 0
                                                ? [
                                                      {
                                                          value: 'inscription',
                                                          label: `Frais d'inscription — ${formatFCFA(ech.fraisDue)}`,
                                                      },
                                                  ]
                                                : []),
                                            {
                                                value: 'mois',
                                                label: `Mensualité ${ech.currentMoisLabel} — ${formatFCFA(ech.moisDue)}`,
                                            },
                                            {
                                                value: 'total',
                                                label: `Payer le reste — ${formatFCFA(solde)}`,
                                            },
                                        ]}
                                    />
                                    <p className="mt-1 text-xs text-gray-400">
                                        Au 1er mois, on peut payer la mensualité
                                        d'abord et revenir payer l'inscription
                                        ensuite (ou l'inverse).
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Montant *
                                    </label>
                                    <Input
                                        type="number"
                                        value={payAmount}
                                        onChange={(e) =>
                                            setPayAmount(e.target.value)
                                        }
                                        placeholder="Ex: 10000"
                                    />
                                    <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                                        <span>
                                            Reste après paiement :{' '}
                                            {formatFCFA(
                                                Math.max(
                                                    0,
                                                    solde -
                                                        (Number(payAmount) ||
                                                            0),
                                                ),
                                            )}{' '}
                                            —{' '}
                                            {Number(payAmount) >= solde &&
                                            solde > 0
                                                ? 'Paiement total'
                                                : 'Paiement partiel'}
                                        </span>
                                        {solde > 0 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPayAmount(String(solde))
                                                }
                                                className="text-brand-600 hover:underline"
                                            >
                                                Payer tout le reste
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsPayOpen(null)}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={() => void handlePay(ins.id)}
                                    >
                                        Valider le paiement
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
            </Modal>

            <Modal
                isOpen={!!isPauseConfirm}
                onClose={() => setIsPauseConfirm(null)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-2 font-semibold">
                    Mettre en pause l'inscription ?
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                    L'inscription sera mise en pause. Facturation et relances
                    suspendues jusqu'à réactivation. L'historique est conservé.
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsPauseConfirm(null)}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={() => {
                            if (isPauseConfirm)
                                void pauseInscription(isPauseConfirm).then(
                                    (r) => {
                                        if (!r.ok)
                                            setToast(r.error || 'Erreur');
                                        else
                                            setToast(
                                                'Inscription mise en pause.',
                                            );
                                    },
                                );
                            setIsPauseConfirm(null);
                        }}
                    >
                        Confirmer la pause
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={isReinsOpen}
                onClose={() => setIsReinsOpen(false)}
                className="max-w-[480px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    Réinscription — ne crée pas un nouvel élève
                </h3>
                <p className="mb-3 text-xs text-gray-500">
                    Conserve l'historique. Crée une nouvelle inscription pour{' '}
                    {student.name}.
                </p>
                {reinsError && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {reinsError}
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nouvelle année *
                        </label>
                        <Input
                            value={
                                schoolYears.find(
                                    (year) =>
                                        String(year.id) ===
                                        String(activeYearId),
                                )?.label || 'Aucune année scolaire active'
                            }
                            disabled
                            className="cursor-not-allowed bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salle *
                        </label>
                        <StyledSelect
                            value={reinsSalle}
                            onChange={setReinsSalle}
                            placeholder="Choisir une salle"
                            options={salles
                                .filter(
                                    (s) =>
                                        s.status === 'active' &&
                                        s.schoolYearId === activeYearId,
                                )
                                .map((s) => ({
                                    value: s.id,
                                    label: s.name,
                                }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Date d'inscription
                        </label>
                        <Input
                            type="date"
                            value={reinsDate}
                            onChange={(e) => setReinsDate(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsReinsOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleReinscrire}>Réinscrire</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isInscriptionOpen}
                onClose={() => setIsInscriptionOpen(false)}
                className="max-w-[480px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    Nouvelle inscription — élève existant
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salle *
                        </label>
                        <StyledSelect
                            value={insSalle}
                            onChange={setInsSalle}
                            placeholder="Choisir une salle"
                            options={salles
                                .filter((s) => s.status === 'active')
                                .map((s) => ({
                                    value: s.id,
                                    label: s.name,
                                }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Année *
                        </label>
                        <StyledSelect
                            value={insYear}
                            onChange={setInsYear}
                            placeholder="Année"
                            options={schoolYears.map((y) => ({
                                value: y.id,
                                label: y.label,
                            }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Date
                        </label>
                        <Input
                            type="date"
                            value={insDate}
                            onChange={(e) => setInsDate(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsInscriptionOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleNewInscription}>Créer</Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                className="max-w-[520px] p-6"
            >
                <h3 className="mb-4 text-lg font-semibold">
                    Lien sécurisé pour le parent de {student.name}
                </h3>
                <p className="mb-3 text-sm text-gray-500">
                    Copiez ce lien et envoyez-le au parent (WhatsApp, email,
                    SMS). Le lien contient un token simulé et donne accès au
                    bulletin et à la situation de paiement.
                </p>
                <div className="mb-3 rounded-lg border bg-gray-50 p-3 font-mono text-sm break-all text-gray-800 dark:border-gray-700 dark:bg-gray-800">
                    {parentShareLink ||
                        'Le lien sécurisé apparaîtra ici après sa génération.'}
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShareModalOpen(false)}
                    >
                        Fermer
                    </Button>
                    <Button onClick={copyParentLink}>Copier le lien</Button>
                </div>
            </Modal>

            <Modal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                className="max-w-[480px] p-6"
            >
                <h3 className="mb-3 text-lg font-semibold">
                    Modifier — {student.name}
                </h3>
                {editError && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {editError}
                    </div>
                )}
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nom complet *
                        </label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Parent *
                            </label>
                            <Input
                                value={editParent}
                                onChange={(e) => setEditParent(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                WhatsApp parent *
                            </label>
                            <Input
                                type="tel"
                                value={editWhatsApp}
                                onChange={(e) =>
                                    setEditWhatsApp(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nombre de mois de cours
                        </label>
                        <Input
                            type="number"
                            min="1"
                            max="12"
                            value={editMonths}
                            onChange={(event) =>
                                setEditMonths(event.target.value)
                            }
                            disabled={!actuelle}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            {actuelle
                                ? 'Durée appliquée à l’inscription en cours (de 1 à 12 mois).'
                                : 'Aucune inscription en cours à modifier.'}
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salle
                        </label>
                        <Input
                            value={
                                actuelle
                                    ? `${salles.find((s) => s.id === actuelle.salleId)?.name || actuelle.salleId} • ${actuelle.schoolYearId}`
                                    : 'Sans salle — créez une inscription'
                            }
                            disabled
                            className="cursor-not-allowed bg-gray-100"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Un élève appartient obligatoirement à une salle : la
                            salle se change via (Ré)inscription, pas ici.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={() => void handleEditSave()}>
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteConfirm}
                onClose={() => setIsDeleteConfirm(false)}
                className="max-w-[420px] p-6"
            >
                <h3 className="mb-2 font-semibold">Archiver l’élève ?</h3>
                <p className="mb-4 text-sm text-gray-500">
                    {student.name} sera archivé avec son historique
                    (inscriptions, paiements conservés).
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsDeleteConfirm(false)}
                    >
                        Annuler
                    </Button>
                    <Button onClick={() => void handleDelete()}>
                        Confirmer
                    </Button>
                </div>
            </Modal>

            {toast && (
                <div className="animate-slide-up bg-brand-500 fixed right-4 bottom-4 z-50 rounded-lg px-4 py-2 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}
        </>
    );
}
