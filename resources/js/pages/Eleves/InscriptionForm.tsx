import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Input from '../../components/form/input/InputField';
import StyledSelect from '../../components/ui/select/StyledSelect';
import Button from '../../components/ui/button/Button';
import { useEnrollment, formatFCFA } from '../../context/EnrollmentContext';
import { useSchoolStructure } from '../../context/SchoolStructureContext';
import { useToast } from '../../context/ToastContext';

export default function InscriptionForm() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { createStudent, createInscription, getTarifForSalleYear } =
        useEnrollment();
    const { salles: ctxSalles, schoolYears: ctxYears } = useSchoolStructure();

    const schoolYears = ctxYears.map((y: any) => ({
        id: String(y.id),
        label: y.label,
        isActive: !!y.isActive,
    }));
    const salles = ctxSalles.map((s: any) => ({
        id: String(s.id),
        name: s.name,
        schoolYearId: String(s.schoolYearId),
        status: s.status,
    }));

    const activeSchoolYear =
        schoolYears.find((year: any) => year.isActive) ?? schoolYears[0];

    const [studentName, setStudentName] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentWhatsApp, setParentWhatsApp] = useState('');
    const [existingStudentId, setExistingStudentId] = useState<string>('');
    const [useExisting, setUseExisting] = useState(false);
    const [salleId, setSalleId] = useState('');
    const [schoolYearId, setSchoolYearId] = useState<string>(() =>
        activeSchoolYear ? String(activeSchoolYear.id) : '',
    );
    const [dateInscription, setDateInscription] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [nombreMois, setNombreMois] = useState<number>(9);
    const [error, setError] = useState<string | null>(null);
    const { students } = useEnrollment();

    useEffect(() => {
        if (!activeSchoolYear) return;
        const nextValue = String(activeSchoolYear.id);
        setSchoolYearId((current) =>
            current && schoolYears.some((year) => String(year.id) === current)
                ? current
                : nextValue,
        );
    }, [activeSchoolYear, schoolYears]);

    const tarif =
        salleId && schoolYearId
            ? getTarifForSalleYear(salleId, schoolYearId)
            : undefined;
    const totalDu = tarif
        ? tarif.fraisInscription + tarif.mensualite * nombreMois
        : 0;

    const handleSubmit = async () => {
        setError(null);
        let studentId = existingStudentId;
        let studentCode = students.find(
            (student) => student.id === studentId,
        )?.code;
        if (useExisting) {
            if (!studentId) {
                setError('Sélectionnez un élève existant.');
                return;
            }
        } else {
            if (
                !studentName.trim() ||
                !parentName.trim() ||
                !parentWhatsApp.trim()
            ) {
                setError('Nom, parent et WhatsApp obligatoires.');
                return;
            }
            if (
                !/^6\d{8}$/.test(
                    parentWhatsApp.replace(/\D/g, '').replace(/^237/, ''),
                )
            ) {
                setError(
                    'Saisissez un numéro camerounais de 9 chiffres commençant par 6.',
                );
                return;
            }
            const res = await createStudent({
                name: studentName,
                parentName,
                parentWhatsApp,
            });
            if (!res.ok) {
                setError(res.error || 'Erreur');
                return;
            }
            studentId = res.student!.id;
            studentCode = res.student!.code;
        }
        if (!salleId || !schoolYearId) {
            setError('Salle et année obligatoires.');
            return;
        }
        const res = await createInscription({
            studentId,
            salleId,
            schoolYearId,
            dateInscription,
            nombreMois,
        });
        if (!res.ok) {
            setError(res.error || 'Erreur');
            return;
        }
        showToast('Élève inscrit avec succès', 'success');
        void navigate(
            `/eleves/${encodeURIComponent(studentCode || studentId)}`,
        );
    };

    return (
        <>
            <PageMeta
                title="Inscription élève | UC-06"
                description="Inscription d'un élève"
            />
            <PageBreadcrumb pageTitle="Inscription d'un élève" />
            <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold">
                    Inscription — UC-06
                </h3>
                <p className="mb-4 text-xs text-gray-500">
                    Sélectionnez un élève existant ou créez un nouvel élève,
                    puis choisissez année, salle et tarif. Le doublon
                    élève+année+salle est bloqué.
                </p>
                {error && (
                    <div className="bg-error-50 text-error-600 mb-3 rounded px-3 py-2 text-sm">
                        {error}
                    </div>
                )}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={useExisting}
                            onChange={(e) => setUseExisting(e.target.checked)}
                        />{' '}
                        Utiliser un élève existant
                    </label>
                    {useExisting ? (
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Élève existant *
                            </label>
                            <StyledSelect
                                value={existingStudentId}
                                onChange={setExistingStudentId}
                                placeholder="Choisir un élève"
                                options={students.map((s) => ({
                                    value: s.id,
                                    label: `${s.name} (${s.id})`,
                                }))}
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    Nom complet *
                                </label>
                                <Input
                                    value={studentName}
                                    onChange={(e) =>
                                        setStudentName(e.target.value)
                                    }
                                    placeholder="Ex: Jean Dupont"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        Parent *
                                    </label>
                                    <Input
                                        type="tel"
                                        value={parentName}
                                        onChange={(e) =>
                                            setParentName(e.target.value)
                                        }
                                        placeholder="M. Dupont"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        WhatsApp parent *
                                    </label>
                                    <Input
                                        value={parentWhatsApp}
                                        onChange={(e) =>
                                            setParentWhatsApp(e.target.value)
                                        }
                                        placeholder="6XX XXX XXX"
                                        hint="Saisissez les 9 chiffres locaux. L’indicatif +237 sera ajouté automatiquement."
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Année scolaire *
                        </label>
                        <Input
                            value={
                                activeSchoolYear?.label ||
                                schoolYears.find(
                                    (year) => String(year.id) === schoolYearId,
                                )?.label ||
                                'Année scolaire'
                            }
                            disabled
                            className="cursor-not-allowed bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Année scolaire non modifiable — seule l'année active
                            est utilisée.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Salle *
                        </label>
                        <StyledSelect
                            value={salleId}
                            onChange={setSalleId}
                            placeholder="Choisir une salle"
                            options={salles
                                .filter(
                                    (s) =>
                                        s.status === 'active' &&
                                        s.schoolYearId ===
                                            (schoolYears.find((y) => y.isActive)
                                                ?.id || schoolYearId),
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
                            value={dateInscription}
                            onChange={(e) => setDateInscription(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">
                            Nombre de mois de cours *
                        </label>
                        <Input
                            type="number"
                            value={nombreMois}
                            onChange={(e) =>
                                setNombreMois(Number(e.target.value))
                            }
                            min="1"
                            max="12"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Durée de l'inscription (généralement 9 ou 10 mois)
                        </p>
                    </div>
                    {tarif && (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                            <p>
                                Tarif : Frais{' '}
                                {formatFCFA(tarif.fraisInscription)} +
                                Mensualité {formatFCFA(tarif.mensualite)}
                            </p>
                            <p>
                                Premier mois : Inscription (
                                {formatFCFA(tarif.fraisInscription)}) +
                                Mensualité ({formatFCFA(tarif.mensualite)})
                            </p>
                            <p className="text-xs text-gray-500">
                                Mois suivants : {formatFCFA(tarif.mensualite)}{' '}
                                par mois
                            </p>
                            <p className="font-semibold">
                                Total dû ({nombreMois} mois) :{' '}
                                {formatFCFA(totalDu)}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/eleves')}
                        >
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit}>
                            Enregistrer l'inscription
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
