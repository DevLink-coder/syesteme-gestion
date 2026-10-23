import Badge from '../ui/badge/Badge';
import { useAuth } from '../../context/AuthContext';
// import { initialSalles } from '../../data/mock/salles';
const initialSalles: any[] = [];

/**
 * Ancienne "Adresse" — repurposée en "Informations professionnelles".
 * Enseignant : matières enseignées + salles associées (lecture seule — gérées par l'admin via l'écran Enseignants).
 * Admin : pas de matières propres → message simple (compte administrateur, accès complet).
 */
export default function UserAddressCard() {
    const { currentUser } = useAuth();
    if (!currentUser) return null;

    if (currentUser.role === 'admin') {
        return (
            <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
                <h4 className="text-lg font-semibold text-gray-800 lg:mb-6 dark:text-white/90">
                    Informations professionnelles
                </h4>
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
                    <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M10 1.667a4.167 4.167 0 0 0-4.167 4.166v1.25H5a1.667 1.667 0 0 0-1.667 1.667v7.5A1.667 1.667 0 0 0 5 17.917h10a1.667 1.667 0 0 0 1.667-1.667v-7.5A1.667 1.667 0 0 0 15 7.083h-.833v-1.25A4.167 4.167 0 0 0 10 1.667ZM12.5 7.083h-5v-1.25a2.5 2.5 0 1 1 5 0v1.25Z"
                                fill="currentColor"
                            />
                        </svg>
                    </span>
                    <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            Compte administrateur — accès complet
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            Aucune matière propre : la gestion des enseignants
                            et de leurs affectations se fait via l'écran
                            Enseignants.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Enseignant : regroupe par matière avec les salles associées (lecture seule)
    const bySubject = new Map<string, RoomId[]>();
    (currentUser.teaches ?? []).forEach((t) => {
        if (!t.subject || !t.roomId) return;
        const rooms = bySubject.get(t.subject) ?? [];
        if (!rooms.includes(t.roomId)) rooms.push(t.roomId);
        bySubject.set(t.subject, rooms);
    });

    return (
        <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Informations professionnelles
                </h4>
                <Badge color="light" size="sm">
                    Lecture seule
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                {Array.from(bySubject.entries()).map(([subject, roomIds]) => (
                    <div key={subject}>
                        <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                            {subject}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {roomIds.map((roomId) => {
                                const salle = initialSalles.find(
                                    (s) => s.roomId === roomId,
                                );
                                return (
                                    <span
                                        key={roomId}
                                        className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                    >
                                        {salle ? salle.name : roomId}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-5 text-xs text-gray-400 dark:text-gray-500">
                Affectations gérées par l'administration via l'écran
                Enseignants.
            </p>
        </div>
    );
}
