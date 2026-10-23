import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useMemo,
} from 'react';

import { useSchoolStructure } from './SchoolStructureContext';
import { buildEcheancier } from '../lib/echeancier';

export interface Tarif {
    id: string;
    salleId: string;
    schoolYearId: string;
    salleLabel?: string;
    schoolYearLabel?: string;
    fraisInscription: number;
    mensualite: number;
    nombreMois?: number;
}

export interface EnrollmentPayment {
    id: string;
    inscriptionId: string;
    amount: number;
    date: string; // YYYY-MM-DD
    type: 'total' | 'partiel' | 'inscription' | 'mensualité';
    status: 'payé' | 'partiel' | 'impayé';
    reference?: string;
}

export function formatFCFA(n: number): string {
    return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

interface EnrollmentContextValue {
    tarifs: Tarif[];
    inscriptions: Inscription[];
    payments: EnrollmentPayment[];
    students: Student[];
    // Tarif
    createTarif: (data: Omit<Tarif, 'id'> & { id?: string }) => Promise<{
        ok: boolean;
        error?: string;
        tarif?: Tarif;
    }>;
    updateTarif: (
        id: string,
        data: Partial<Tarif>,
    ) => Promise<{ ok: boolean; error?: string }>;
    deleteTarif: (id: string) => Promise<{ ok: boolean; error?: string }>;
    getTarifForSalleYear: (
        salleId: string,
        schoolYearId: string,
    ) => Tarif | undefined;
    // Inscription
    createInscription: (data: {
        studentId: string;
        salleId: string;
        schoolYearId: string;
        tarifId?: string;
        dateInscription?: string;
        nombreMois?: number;
    }) => Promise<{
        ok: boolean;
        error?: string;
        inscription?: Inscription;
    }>;
    reinscrire: (
        studentId: string,
        data: {
            salleId: string;
            schoolYearId: string;
            dateInscription?: string;
            nombreMois?: number;
        },
    ) => Promise<{
        ok: boolean;
        error?: string;
        inscription?: Inscription;
    }>;
    updateInscriptionStatut: (
        id: string,
        statut: InscriptionStatut,
    ) => Promise<{ ok: boolean; error?: string }>;
    updateInscriptionMonths: (
        id: string,
        nombreMois: number,
    ) => Promise<{ ok: boolean; error?: string }>;
    pauseInscription: (id: string) => Promise<{ ok: boolean; error?: string }>;
    reactivateInscription: (
        id: string,
    ) => Promise<{ ok: boolean; error?: string }>;
    createStudent: (data: {
        name: string;
        parentName: string;
        parentWhatsApp: string;
        language?: 'espagnol' | 'allemand';
    }) => Promise<{
        ok: boolean;
        error?: string;
        student?: Student;
    }>;
    updateStudent: (
        id: string,
        data: Partial<
            Pick<Student, 'name' | 'parentName' | 'parentWhatsApp' | 'language'>
        >,
    ) => Promise<{ ok: boolean; error?: string }>;
    deleteStudent: (id: string) => Promise<{ ok: boolean; error?: string }>;
    // Paiement
    createPayment: (data: {
        inscriptionId: string;
        amount: number;
        date?: string;
        type?: 'total' | 'partiel' | 'inscription' | 'mensualité';
    }) => Promise<{
        ok: boolean;
        error?: string;
        payment?: EnrollmentPayment;
        newSolde: number;
    }>;
    getPaymentsForInscription: (inscriptionId: string) => EnrollmentPayment[];
    getSoldeForInscription: (inscriptionId: string) => number;
    getTotalDuForInscription: (inscriptionId: string) => number;
    // Dérivés
    getInscriptionsForStudent: (studentId: string) => Inscription[];
    getInscriptionActuelle: (studentId: string) => Inscription | undefined;
    getDettes: () => Array<{
        inscription: Inscription;
        student: Student;
        salle: Salle | undefined;
        schoolYear: SchoolYear | undefined;
        tarif: Tarif | undefined;
        totalDu: number;
        totalPaye: number;
        solde: number;
        monthlyDue: number;
        monthlySolde: number;
        statut: InscriptionStatut;
    }>;
    // Helpers
    getStudentById: (id: string) => Student | undefined;
}

const EnrollmentContext = createContext<EnrollmentContextValue | undefined>(
    undefined,
);

function getCsrfToken(): string {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
    );
}

export const EnrollmentProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { salles: liveSalles, schoolYears: liveSchoolYears } =
        useSchoolStructure();
    const [students, setStudents] = useState<Student[]>(() => []);
    const [tarifs, setTarifs] = useState<Tarif[]>(() => []);
    const [inscriptions, setInscriptions] = useState<Inscription[]>(() => []);
    const [payments, setPayments] = useState<EnrollmentPayment[]>(() => []);

    useEffect(() => {
        const loadLiveEnrollment = async () => {
            try {
                const [studentsRes, tarifsRes] = await Promise.all([
                    fetch('/web/students', {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    }),
                    fetch('/web/tarifs', {
                        credentials: 'include',
                        headers: { Accept: 'application/json' },
                    }),
                ]);

                if (studentsRes.ok) {
                    const studentsPayload = await studentsRes.json();
                    const studentList = Array.isArray(studentsPayload?.students)
                        ? studentsPayload.students
                        : Array.isArray(studentsPayload?.data)
                          ? studentsPayload.data
                          : [];
                    setStudents(
                        studentList.map((student: any) => ({
                            id: String(student.id ?? student.studentId ?? ''),
                            code: String(student.code ?? ''),
                            name: String(
                                student.name ?? student.student?.name ?? '',
                            ),
                            parentName: String(
                                student.parentName ?? student.parent_name ?? '',
                            ),
                            parentWhatsApp: String(
                                student.parentWhatsApp ??
                                    student.parent_whatsapp ??
                                    '',
                            ),
                            roomId: String(
                                student.roomId ??
                                    student.room_id ??
                                    'non-renseigne',
                            ),
                            enrollmentStatus: (student.enrollmentStatus ??
                                student.enrollment_status ??
                                'validée') as Student['enrollmentStatus'],
                            language:
                                student.language === 'espagnol' ||
                                student.language === 'allemand'
                                    ? student.language
                                    : undefined,
                        })),
                    );

                    const inscriptionList = Array.isArray(
                        studentsPayload?.inscriptions,
                    )
                        ? studentsPayload.inscriptions
                        : Array.isArray(studentsPayload?.data?.inscriptions)
                          ? studentsPayload.data.inscriptions
                          : [];
                    setInscriptions(
                        inscriptionList.map((inscription: any) => ({
                            id: String(inscription.id ?? ''),
                            studentId: String(
                                inscription.studentId ??
                                    inscription.student_id ??
                                    '',
                            ),
                            salleId: String(
                                inscription.salleId ??
                                    inscription.salle_id ??
                                    '',
                            ),
                            schoolYearId: String(
                                inscription.schoolYearId ??
                                    inscription.school_year_id ??
                                    '',
                            ),
                            tarifId: String(
                                inscription.tarifId ??
                                    inscription.tarif_id ??
                                    '',
                            ),
                            statut: (inscription.statut ??
                                'Validée') as Inscription['statut'],
                            dateInscription:
                                inscription.dateInscription ??
                                inscription.date_inscription ??
                                new Date().toISOString().slice(0, 10),
                            nombreMois: Number(
                                inscription.nombreMois ??
                                    inscription.nombre_mois ??
                                    9,
                            ),
                            createdAt:
                                inscription.createdAt ??
                                inscription.created_at ??
                                new Date().toISOString().slice(0, 10),
                        })),
                    );

                    const paymentList = Array.isArray(studentsPayload?.payments)
                        ? studentsPayload.payments
                        : Array.isArray(studentsPayload?.data?.payments)
                          ? studentsPayload.data.payments
                          : [];
                    setPayments(
                        paymentList.map((payment: any) => ({
                            id: String(payment.id ?? ''),
                            inscriptionId: String(
                                payment.inscriptionId ??
                                    payment.inscription_id ??
                                    '',
                            ),
                            amount: Number(payment.amount ?? 0),
                            date: String(
                                payment.date ??
                                    payment.paid_at ??
                                    new Date().toISOString().slice(0, 10),
                            ),
                            type:
                                payment.type === 'inscription' ||
                                payment.type === 'mensualité'
                                    ? payment.type
                                    : payment.type === 'partiel'
                                      ? 'partiel'
                                      : 'total',
                            status:
                                payment.status === 'payé' ||
                                payment.status === 'partiel' ||
                                payment.status === 'impayé'
                                    ? payment.status
                                    : 'payé',
                            reference: payment.reference ?? payment.code,
                        })),
                    );
                }

                if (tarifsRes.ok) {
                    const tarifPayload = await tarifsRes.json();
                    const list = Array.isArray(tarifPayload?.tarifs)
                        ? tarifPayload.tarifs
                        : Array.isArray(tarifPayload?.data)
                          ? tarifPayload.data
                          : [];
                    setTarifs(
                        list.map((tarif: any) => ({
                            id: String(tarif.id ?? ''),
                            salleId: String(
                                tarif.salleId ?? tarif.salle_id ?? '',
                            ),
                            schoolYearId: String(
                                tarif.schoolYearId ??
                                    tarif.school_year_id ??
                                    '',
                            ),
                            salleLabel: String(
                                tarif.salleLabel ?? tarif.salle?.name ?? '',
                            ),
                            schoolYearLabel: String(
                                tarif.schoolYearLabel ??
                                    tarif.schoolYear?.label ??
                                    '',
                            ),
                            fraisInscription: Number(
                                tarif.fraisInscription ?? 0,
                            ),
                            mensualite: Number(tarif.mensualite ?? 0),
                            nombreMois: Number(
                                tarif.nombreMois ?? tarif.nombre_mois ?? 9,
                            ),
                        })),
                    );
                }
            } catch {
                // Une réponse de service défaillante ne doit pas effacer les
                // données déjà chargées par les autres services.
            }
        };

        void loadLiveEnrollment();
    }, []);

    const getTarifForSalleYear = useCallback(
        (salleId: string, schoolYearId: string) =>
            tarifs.find(
                (t) => t.salleId === salleId && t.schoolYearId === schoolYearId,
            ),
        [tarifs],
    );

    const getTotalDuForInscription = useCallback(
        (inscriptionId: string) => {
            const ins = inscriptions.find((i) => i.id === inscriptionId);
            if (!ins) return 0;
            const tarif =
                tarifs.find((t) => t.id === ins.tarifId) ||
                tarifs.find(
                    (t) =>
                        t.salleId === ins.salleId &&
                        t.schoolYearId === ins.schoolYearId,
                );
            if (!tarif) return 0;
            return tarif.fraisInscription + tarif.mensualite * 9;
        },
        [inscriptions, tarifs],
    );

    const getPaymentsForInscription = useCallback(
        (inscriptionId: string) =>
            payments.filter((p) => p.inscriptionId === inscriptionId),
        [payments],
    );

    const getSoldeForInscription = useCallback(
        (inscriptionId: string) => {
            const totalDu = getTotalDuForInscription(inscriptionId);
            const totalPaye = payments
                .filter(
                    (p) =>
                        p.inscriptionId === inscriptionId &&
                        p.status !== 'impayé',
                )
                .reduce((s, p) => s + p.amount, 0);
            const solde = totalDu - totalPaye;
            return solde < 0 ? 0 : solde;
        },
        [payments, getTotalDuForInscription],
    );

    const getInscriptionsForStudent = useCallback(
        (studentId: string) =>
            inscriptions
                .filter((i) => i.studentId === studentId)
                .sort((a, b) => b.schoolYearId.localeCompare(a.schoolYearId)),
        [inscriptions],
    );

    const getInscriptionActuelle = useCallback(
        (studentId: string) => {
            const list = getInscriptionsForStudent(studentId);
            const activeYearId = liveSchoolYears.find((y) => y.isActive)?.id;
            const active = activeYearId
                ? list.find(
                      (i) => String(i.schoolYearId) === String(activeYearId),
                  )
                : undefined;
            return active || list[0];
        },
        [getInscriptionsForStudent, liveSchoolYears],
    );

    const getStudentById = useCallback(
        (id: string) => {
            const normalizedId = /^\d+$/.test(id) ? String(Number(id)) : id;
            return (
                students.find((student) => student.code === id) ??
                students.find((student) => student.id === normalizedId)
            );
        },
        [students],
    );

    const createTarif = useCallback(
        async (data: Omit<Tarif, 'id'> & { id?: string }) => {
            const salleId = data.salleId;
            const schoolYearId = data.schoolYearId;
            if (!salleId || !schoolYearId)
                return {
                    ok: false,
                    error: 'Salle et année scolaire obligatoires.',
                };
            const activeYear = liveSchoolYears.find((y) => y.isActive);
            if (activeYear && schoolYearId !== activeYear.id) {
                return {
                    ok: false,
                    error: `Seule l'année scolaire active (${activeYear.label}) peut être utilisée.`,
                };
            }
            if (
                tarifs.some(
                    (t) =>
                        t.salleId === salleId &&
                        t.schoolYearId === schoolYearId,
                )
            )
                return {
                    ok: false,
                    error: 'Un tarif existe déjà pour cette salle et cette année.',
                };
            if (
                typeof data.fraisInscription !== 'number' ||
                data.fraisInscription < 0
            )
                return { ok: false, error: "Frais d'inscription invalide." };
            if (typeof data.mensualite !== 'number' || data.mensualite <= 0)
                return { ok: false, error: 'Mensualité doit être positive.' };
            try {
                const response = await fetch('/web/tarifs', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        salle_id: salleId,
                        school_year_id: schoolYearId,
                        frais_inscription: data.fraisInscription,
                        mensualite: data.mensualite,
                        nombre_mois: data.nombreMois ?? 9,
                    }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    return {
                        ok: false,
                        error:
                            payload.message || 'Impossible de créer le tarif.',
                    };
                }

                const saved = payload.tarif ?? payload.data ?? {};
                const newTarif: Tarif = {
                    id: String(saved.id ?? data.id ?? ''),
                    salleId,
                    schoolYearId,
                    salleLabel:
                        saved.salleLabel ??
                        data.salleLabel ??
                        liveSalles.find((salle) => String(salle.id) === salleId)
                            ?.name,
                    schoolYearLabel:
                        saved.schoolYearLabel ??
                        data.schoolYearLabel ??
                        liveSchoolYears.find(
                            (year) => String(year.id) === schoolYearId,
                        )?.label,
                    fraisInscription: Math.round(data.fraisInscription),
                    mensualite: Math.round(data.mensualite),
                    nombreMois: data.nombreMois ?? 9,
                };
                setTarifs((prev) => [...prev, newTarif]);
                return { ok: true, tarif: newTarif };
            } catch {
                return {
                    ok: false,
                    error: 'Erreur réseau lors de la création du tarif.',
                };
            }
        },
        [tarifs, liveSalles, liveSchoolYears],
    );

    const updateTarif = useCallback(
        async (id: string, data: Partial<Tarif>) => {
            const t = tarifs.find((x) => x.id === id);
            if (!t) return { ok: false, error: 'Tarif introuvable.' };
            if (data.salleId && data.schoolYearId) {
                const dup = tarifs.some(
                    (x) =>
                        x.id !== id &&
                        x.salleId === data.salleId &&
                        x.schoolYearId === data.schoolYearId,
                );
                if (dup) return { ok: false, error: 'Doublon salle/année.' };
            }
            if (
                data.mensualite !== undefined &&
                (typeof data.mensualite !== 'number' || data.mensualite <= 0)
            )
                return { ok: false, error: 'Mensualité positive requise.' };
            if (
                data.fraisInscription !== undefined &&
                (typeof data.fraisInscription !== 'number' ||
                    data.fraisInscription < 0)
            )
                return { ok: false, error: 'Frais invalide.' };
            try {
                const response = await fetch(
                    `/web/tarifs/${encodeURIComponent(id)}`,
                    {
                        method: 'PUT',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-XSRF-TOKEN': getCsrfToken(),
                        },
                        body: JSON.stringify({
                            salle_id: data.salleId ?? t.salleId,
                            school_year_id: data.schoolYearId ?? t.schoolYearId,
                            frais_inscription:
                                data.fraisInscription ?? t.fraisInscription,
                            mensualite: data.mensualite ?? t.mensualite,
                            nombre_mois: data.nombreMois ?? t.nombreMois ?? 9,
                        }),
                    },
                );
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    return {
                        ok: false,
                        error:
                            payload.message ||
                            'Impossible de modifier le tarif.',
                    };
                }

                const updatedSalleId = String(data.salleId ?? t.salleId);
                const updatedSchoolYearId = String(
                    data.schoolYearId ?? t.schoolYearId,
                );
                const salleLabel = liveSalles.find(
                    (salle) => String(salle.id) === updatedSalleId,
                )?.name;
                const schoolYearLabel = liveSchoolYears.find(
                    (year) => String(year.id) === updatedSchoolYearId,
                )?.label;

                setTarifs((prev) =>
                    prev.map((x) =>
                        x.id === id
                            ? {
                                  ...x,
                                  ...data,
                                  salleId: updatedSalleId,
                                  schoolYearId: updatedSchoolYearId,
                                  salleLabel: salleLabel ?? x.salleLabel,
                                  schoolYearLabel:
                                      schoolYearLabel ?? x.schoolYearLabel,
                                  mensualite:
                                      data.mensualite !== undefined
                                          ? Math.round(data.mensualite)
                                          : x.mensualite,
                                  fraisInscription:
                                      data.fraisInscription !== undefined
                                          ? Math.round(data.fraisInscription)
                                          : x.fraisInscription,
                                  nombreMois:
                                      data.nombreMois !== undefined
                                          ? data.nombreMois
                                          : x.nombreMois,
                              }
                            : x,
                    ),
                );
                return { ok: true };
            } catch {
                return {
                    ok: false,
                    error: 'Erreur réseau lors de la modification du tarif.',
                };
            }
        },
        [tarifs, liveSalles, liveSchoolYears],
    );

    const deleteTarif = useCallback(async (id: string) => {
        try {
            const response = await fetch(
                `/web/tarifs/${encodeURIComponent(id)}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                },
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                return {
                    ok: false,
                    error:
                        payload.message || 'Impossible de supprimer ce tarif.',
                };
            }

            setTarifs((previous) =>
                previous.filter((tarif) => tarif.id !== id),
            );
            return { ok: true };
        } catch {
            return {
                ok: false,
                error: 'Erreur réseau lors de la suppression du tarif.',
            };
        }
    }, []);

    const createStudent = useCallback(
        async (data: {
            name: string;
            parentName: string;
            parentWhatsApp: string;
            language?: 'espagnol' | 'allemand';
        }) => {
            if (!data.name.trim())
                return { ok: false, error: 'Nom complet obligatoire.' };
            if (!data.parentName.trim())
                return { ok: false, error: 'Nom du parent obligatoire.' };
            if (!data.parentWhatsApp.trim())
                return { ok: false, error: 'Contact WhatsApp obligatoire.' };

            try {
                const res = await fetch('/web/students', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        name: data.name,
                        parentName: data.parentName,
                        parentWhatsApp: data.parentWhatsApp,
                        language: data.language,
                    }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error:
                            payload.message ||
                            "Erreur lors de la création de l'élève.",
                    };
                }

                const createdStudent =
                    payload.student || payload.data || payload;
                const mappedStudent: Student = {
                    id: String(createdStudent.id ?? ''),
                    code: String(createdStudent.code ?? ''),
                    name: String(createdStudent.name ?? data.name.trim()),
                    parentName: String(
                        createdStudent.parentName ?? data.parentName.trim(),
                    ),
                    parentWhatsApp: String(
                        createdStudent.parentWhatsApp ??
                            data.parentWhatsApp.trim(),
                    ),
                    roomId: String(createdStudent.roomId ?? 'non-renseigne'),
                    enrollmentStatus: (createdStudent.enrollmentStatus ??
                        'validée') as Student['enrollmentStatus'],
                    language:
                        createdStudent.language === 'espagnol' ||
                        createdStudent.language === 'allemand'
                            ? createdStudent.language
                            : undefined,
                };
                setStudents((prev) => [...prev, mappedStudent]);
                return { ok: true, student: mappedStudent };
            } catch (error: any) {
                return {
                    ok: false,
                    error:
                        error?.message ||
                        "Erreur lors de la création de l'élève.",
                };
            }
        },
        [],
    );

    const updateStudent = useCallback(
        async (
            id: string,
            data: Partial<
                Pick<
                    Student,
                    'name' | 'parentName' | 'parentWhatsApp' | 'language'
                >
            >,
        ) => {
            try {
                const res = await fetch(`/web/students/${id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify(data),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error: payload.message || 'Mise à jour impossible.',
                    };
                }
                const updated = payload.student || {};
                setStudents((prev) =>
                    prev.map((student) =>
                        student.id === id
                            ? {
                                  ...student,
                                  name:
                                      updated.name ?? data.name ?? student.name,
                                  parentName:
                                      updated.parentName ??
                                      data.parentName ??
                                      student.parentName,
                                  parentWhatsApp:
                                      updated.parentWhatsApp ??
                                      data.parentWhatsApp ??
                                      student.parentWhatsApp,
                                  language:
                                      updated.language ??
                                      data.language ??
                                      student.language,
                              }
                            : student,
                    ),
                );
                return { ok: true };
            } catch (error: any) {
                return {
                    ok: false,
                    error: error?.message || 'Mise à jour impossible.',
                };
            }
        },
        [],
    );

    const deleteStudent = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/web/students/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                return {
                    ok: false,
                    error: payload.message || 'Archivage impossible.',
                };
            }
            setStudents((prev) => prev.filter((student) => student.id !== id));
            return { ok: true };
        } catch (error: any) {
            return {
                ok: false,
                error: error?.message || 'Archivage impossible.',
            };
        }
    }, []);

    const createInscription = useCallback(
        async (data: {
            studentId: string;
            salleId: string;
            schoolYearId: string;
            tarifId?: string;
            dateInscription?: string;
            nombreMois?: number;
        }) => {
            if (!data.studentId || !data.salleId || !data.schoolYearId)
                return { ok: false, error: 'Champs obligatoires manquants.' };
            const activeYear = liveSchoolYears.find((y) => y.isActive);
            if (activeYear && data.schoolYearId !== activeYear.id) {
                return {
                    ok: false,
                    error: `Seule l'année scolaire active (${activeYear.label}) peut être utilisée.`,
                };
            }
            const exists = inscriptions.some(
                (i) =>
                    i.studentId === data.studentId &&
                    i.schoolYearId === data.schoolYearId &&
                    i.salleId === data.salleId,
            );
            if (exists)
                return {
                    ok: false,
                    error: 'Inscription déjà existante pour cet élève, cette année et cette salle.',
                };

            try {
                const res = await fetch('/web/inscriptions', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        student_id: data.studentId,
                        salle_id: data.salleId,
                        school_year_id: data.schoolYearId,
                        tarif_id: data.tarifId,
                        date_inscription: data.dateInscription,
                        nombre_mois: data.nombreMois,
                    }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error:
                            payload.message || "Erreur lors de l'inscription.",
                    };
                }

                const created = payload.inscription || payload.data || payload;
                const newIns: Inscription = {
                    id: String(
                        created.id ??
                            `ins-${data.studentId}-${data.schoolYearId}-${Date.now()}`,
                    ),
                    studentId: String(created.studentId ?? data.studentId),
                    salleId: String(created.salleId ?? data.salleId),
                    schoolYearId: String(
                        created.schoolYearId ?? data.schoolYearId,
                    ),
                    statut: (created.statut ??
                        'En attente de paiement') as Inscription['statut'],
                    tarifId: String(created.tarifId ?? data.tarifId ?? ''),
                    dateInscription:
                        created.dateInscription ??
                        data.dateInscription ??
                        new Date().toISOString().slice(0, 10),
                    nombreMois: Number(
                        created.nombreMois ??
                            created.nombre_mois ??
                            data.nombreMois ??
                            9,
                    ),
                    createdAt:
                        created.createdAt ??
                        new Date().toISOString().slice(0, 10),
                };
                setInscriptions((prev) => [...prev, newIns]);
                return { ok: true, inscription: newIns };
            } catch (error: any) {
                return {
                    ok: false,
                    error: error?.message || "Erreur lors de l'inscription.",
                };
            }
        },
        [inscriptions, liveSchoolYears],
    );

    const reinscrire = useCallback(
        async (
            studentId: string,
            data: {
                salleId: string;
                schoolYearId: string;
                dateInscription?: string;
            },
        ) => {
            // ne crée pas un nouvel élève, crée une nouvelle inscription
            return createInscription({
                studentId,
                salleId: data.salleId,
                schoolYearId: data.schoolYearId,
                dateInscription: data.dateInscription,
            });
        },
        [createInscription],
    );

    const updateInscriptionStatut = useCallback(
        async (id: string, statut: InscriptionStatut) => {
            try {
                const res = await fetch(`/web/inscriptions/${id}/statut`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ statut }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error: payload.message || 'Mise à jour impossible.',
                    };
                }
                setInscriptions((prev) =>
                    prev.map((inscription) =>
                        inscription.id === id
                            ? { ...inscription, statut }
                            : inscription,
                    ),
                );
                return { ok: true };
            } catch (error: any) {
                return {
                    ok: false,
                    error: error?.message || 'Mise à jour impossible.',
                };
            }
        },
        [],
    );

    const updateInscriptionMonths = useCallback(
        async (id: string, nombreMois: number) => {
            try {
                const res = await fetch(`/web/inscriptions/${id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ nombre_mois: nombreMois }),
                });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error:
                            payload.message ||
                            'Modification de la durée impossible.',
                    };
                }
                setInscriptions((previous) =>
                    previous.map((inscription) =>
                        inscription.id === id
                            ? { ...inscription, nombreMois }
                            : inscription,
                    ),
                );
                return { ok: true };
            } catch (error: any) {
                return {
                    ok: false,
                    error:
                        error?.message ||
                        'Modification de la durée impossible.',
                };
            }
        },
        [],
    );

    const pauseInscription = useCallback(
        async (id: string) => updateInscriptionStatut(id, 'En pause'),
        [updateInscriptionStatut],
    );
    const reactivateInscription = useCallback(
        async (id: string) => {
            const ins = inscriptions.find((i) => i.id === id);
            if (!ins) return { ok: false, error: 'Inscription introuvable.' };
            // réactivation -> Validée si déjà payé partiellement, sinon En attente
            const solde = getSoldeForInscription(id);
            const totalDu = getTotalDuForInscription(id);
            const next: InscriptionStatut =
                solde === 0
                    ? 'Validée'
                    : solde < totalDu
                      ? 'Validée'
                      : 'En attente de paiement';
            // si était En pause, on restaure Validée
            return updateInscriptionStatut(id, next);
        },
        [
            inscriptions,
            getSoldeForInscription,
            getTotalDuForInscription,
            updateInscriptionStatut,
        ],
    );

    const createPayment = useCallback(
        async (data: {
            inscriptionId: string;
            amount: number;
            date?: string;
            type?: 'total' | 'partiel' | 'inscription' | 'mensualité';
        }) => {
            const ins = inscriptions.find((i) => i.id === data.inscriptionId);
            if (!ins)
                return {
                    ok: false,
                    error: 'Inscription introuvable.',
                    newSolde: 0,
                };
            if (
                typeof data.amount !== 'number' ||
                isNaN(data.amount) ||
                data.amount <= 0
            )
                return {
                    ok: false,
                    error: 'Montant invalide.',
                    newSolde: getSoldeForInscription(data.inscriptionId),
                };
            const soldeBefore = getSoldeForInscription(data.inscriptionId);
            if (data.amount > soldeBefore)
                return {
                    ok: false,
                    error: `Montant supérieur au solde dû (${formatFCFA(soldeBefore)}).`,
                    newSolde: soldeBefore,
                };
            let payload: any;
            try {
                const res = await fetch('/web/payments', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        inscription_id: data.inscriptionId,
                        amount: Math.round(data.amount),
                        date: data.date,
                        type:
                            data.type === 'inscription'
                                ? 'inscription'
                                : 'mensualité',
                    }),
                });
                payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return {
                        ok: false,
                        error: payload.message || 'Paiement impossible.',
                        newSolde: soldeBefore,
                    };
                }
            } catch (error: any) {
                return {
                    ok: false,
                    error: error?.message || 'Paiement impossible.',
                    newSolde: soldeBefore,
                };
            }
            const createdPayment = payload.payment || {};
            const newPayment: EnrollmentPayment = {
                id: String(createdPayment.id ?? ''),
                inscriptionId: String(
                    createdPayment.inscriptionId ?? data.inscriptionId,
                ),
                amount: Number(createdPayment.amount ?? data.amount),
                date: String(
                    createdPayment.date ??
                        data.date ??
                        new Date().toISOString().slice(0, 10),
                ),
                type:
                    createdPayment.type === 'inscription' ? 'partiel' : 'total',
                status:
                    createdPayment.status === 'partiel' ||
                    createdPayment.status === 'impayé'
                        ? createdPayment.status
                        : 'payé',
                reference: createdPayment.code,
            };
            setPayments((prev) => [...prev, newPayment]);
            const totalDu = getTotalDuForInscription(data.inscriptionId);
            const totalPayeAfter = [
                ...payments.filter(
                    (p) =>
                        p.inscriptionId === data.inscriptionId &&
                        p.status !== 'impayé',
                ),
                newPayment,
            ].reduce((s, p) => s + p.amount, 0);
            const newSolde = Math.max(0, totalDu - totalPayeAfter);
            // auto passage En attente -> Validée si paiement partiel/total
            if (ins.statut === 'En attente de paiement' && data.amount > 0) {
                setInscriptions((prev) =>
                    prev.map((item) =>
                        item.id === data.inscriptionId
                            ? { ...item, statut: 'Validée' }
                            : item,
                    ),
                );
            }
            return {
                ok: true,
                payment: newPayment,
                newSolde: Number(payload.newSolde ?? newSolde),
            };
        },
        [
            inscriptions,
            payments,
            getSoldeForInscription,
            getTotalDuForInscription,
            updateInscriptionStatut,
        ],
    );

    const getDettes = useCallback(() => {
        return inscriptions
            .map((ins) => {
                const student = students.find((s) => s.id === ins.studentId);
                const salle = liveSalles.find((s) => s.id === ins.salleId);
                const schoolYear = liveSchoolYears.find(
                    (y) => y.id === ins.schoolYearId,
                );
                const tarif =
                    tarifs.find((t) => t.id === ins.tarifId) ||
                    tarifs.find(
                        (t) =>
                            t.salleId === ins.salleId &&
                            t.schoolYearId === ins.schoolYearId,
                    );
                const echeancier = buildEcheancier(
                    {
                        dateInscription: ins.dateInscription,
                        fraisInscription: tarif?.fraisInscription ?? 0,
                        mensualite: tarif?.mensualite ?? 0,
                        nombreMois: ins.nombreMois ?? tarif?.nombreMois ?? 9,
                    },
                    tarif,
                    payments
                        .filter((payment) => payment.inscriptionId === ins.id)
                        .map((payment) => ({
                            amount: payment.amount,
                            date: payment.date,
                            status: payment.status,
                            type: payment.type,
                        })),
                );
                return {
                    inscription: ins,
                    student: student!,
                    salle,
                    schoolYear,
                    tarif,
                    totalDu: echeancier.dueToDate,
                    totalPaye: echeancier.paidToDate,
                    solde: echeancier.currentDue,
                    monthlyDue: echeancier.currentDue,
                    monthlySolde:
                        echeancier.currentDue > 0
                            ? Math.max(
                                  0,
                                  echeancier.currentDue - echeancier.paidToDate,
                              )
                            : 0,
                    statut: ins.statut,
                };
            })
            .filter((x) => !!x.student)
            .sort((a, b) => b.solde - a.solde);
    }, [
        inscriptions,
        tarifs,
        payments,
        getTotalDuForInscription,
        liveSalles,
        liveSchoolYears,
    ]);

    const value = useMemo(
        () => ({
            tarifs,
            inscriptions,
            payments,
            students,
            createTarif,
            updateTarif,
            deleteTarif,
            getTarifForSalleYear,
            createStudent,
            updateStudent,
            deleteStudent,
            createInscription,
            reinscrire,
            updateInscriptionStatut,
            updateInscriptionMonths,
            pauseInscription,
            reactivateInscription,
            createPayment,
            getPaymentsForInscription,
            getSoldeForInscription,
            getTotalDuForInscription,
            getInscriptionsForStudent,
            getInscriptionActuelle,
            getDettes,
            getStudentById,
        }),
        [
            tarifs,
            inscriptions,
            payments,
            createTarif,
            updateTarif,
            deleteTarif,
            getTarifForSalleYear,
            createStudent,
            updateStudent,
            deleteStudent,
            createInscription,
            reinscrire,
            updateInscriptionStatut,
            updateInscriptionMonths,
            pauseInscription,
            reactivateInscription,
            createPayment,
            getPaymentsForInscription,
            getSoldeForInscription,
            getTotalDuForInscription,
            getInscriptionsForStudent,
            getInscriptionActuelle,
            getDettes,
            getStudentById,
        ],
    );

    return (
        <EnrollmentContext.Provider value={value}>
            {children}
        </EnrollmentContext.Provider>
    );
};

export const useEnrollment = () => {
    const ctx = useContext(EnrollmentContext);
    if (!ctx)
        throw new Error('useEnrollment must be used within EnrollmentProvider');
    return ctx;
};
