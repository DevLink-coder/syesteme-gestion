import { useOutletContext } from 'react-router';
import Badge from '../../components/ui/badge/Badge';

function money(value: number) {
    return `${Math.round(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function currentMonthLabel(value: string) {
    const date = new Date(`${value}-01T12:00:00`);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function ParentSolde() {
    const data = useOutletContext<any>();
    const account = data?.account;

    if (!account) {
        return (
            <div className="rounded-2xl border bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <h2 className="font-semibold text-gray-800 dark:text-white">
                    Aucune inscription active
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    Les frais de {data.student.name} seront affichés lorsqu’une
                    inscription active sera disponible.
                </p>
            </div>
        );
    }

    const upToDate = account.monthlyBalance <= 0;

    return (
        <section className="rounded-2xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Frais de {currentMonthLabel(account.month)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {account.salleName} · {account.schoolYearLabel}
                    </p>
                </div>
                <Badge color={upToDate ? 'success' : 'warning'} size="md">
                    {upToDate ? 'À jour' : 'Paiement à effectuer'}
                </Badge>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                    <p className="text-xs text-gray-500">
                        Montant prévu ce mois
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {money(account.monthlyDue)}
                    </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                    <p className="text-xs text-gray-500">
                        Montant réglé ce mois
                    </p>
                    <p className="text-success-600 mt-1 text-lg font-semibold">
                        {money(account.monthlyPaid)}
                    </p>
                </div>
                <div
                    className={`rounded-xl p-4 ${upToDate ? 'bg-success-50 dark:bg-success-500/10' : 'bg-warning-50 dark:bg-warning-500/10'}`}
                >
                    <p className="text-xs text-gray-500">
                        Reste à payer ce mois
                    </p>
                    <p
                        className={`mt-1 text-lg font-bold ${upToDate ? 'text-success-700' : 'text-warning-700'}`}
                    >
                        {money(account.monthlyBalance)}
                    </p>
                </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
                Consultation uniquement. Pour toute question sur un paiement,
                veuillez contacter l’administration du centre.
            </p>
        </section>
    );
}
