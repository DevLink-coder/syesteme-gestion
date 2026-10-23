import Badge from '../ui/badge/Badge';
import { useAuth } from '../../context/AuthContext';

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

/** Initiales pour l'avatar placeholder (image générique, pas de vraie photo). */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

export default function UserMetaCard() {
    const { currentUser } = useAuth();
    if (!currentUser) return null;
    const isAdmin = currentUser.role === 'admin';
    const status = currentUser.status ?? 'active';

    return (
        <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex w-full flex-col items-center gap-5 xl:flex-row">
                    {/* Avatar placeholder — image générique (initiales), pas de vraie photo */}
                    <div className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 text-xl font-bold dark:border-gray-800">
                        {initials(currentUser.name)}
                    </div>

                    <div className="order-2 text-center xl:order-1 xl:text-left">
                        <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                            {currentUser.name}
                        </h4>
                        <div className="flex flex-col items-center gap-2 xl:flex-row xl:items-center xl:gap-3">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isAdmin ? 'Administrateur' : 'Enseignant'}
                            </p>
                            {/* Statut : uniquement pertinent pour un enseignant.
                  L'admin est toujours actif par règle RG-01 — pas de statut affiché. */}
                            {!isAdmin && (
                                <>
                                    <div className="hidden h-3.5 w-px bg-gray-300 xl:block dark:bg-gray-700"></div>
                                    <Badge
                                        color={statusColor[status] ?? 'light'}
                                        size="sm"
                                    >
                                        {statusLabel[status] ?? status}
                                    </Badge>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    {currentUser.id}
                </span>
            </div>
        </div>
    );
}
