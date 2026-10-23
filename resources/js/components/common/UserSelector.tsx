import { useAuth } from '../../context/AuthContext';
import StyledSelect from '../ui/select/StyledSelect';

/**
 * Sélecteur global "Connecté en tant que" — vit dans le header de l'application.
 * Liste complète : l'administrateur + les 8 enseignants.
 */
export default function UserSelector() {
    const { currentUser, setCurrentUserId, users } = useAuth();
    if (!currentUser) return null;

    return (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <span className="hidden text-xs font-medium whitespace-nowrap text-gray-500 xl:block">
                Connecté en tant que :
            </span>
            <div className="max-w-[180px] min-w-[140px] sm:max-w-[240px] sm:min-w-[180px]">
                <StyledSelect
                    value={currentUser.id}
                    onChange={setCurrentUserId}
                    options={users.map((u) => ({
                        value: u.id,
                        label:
                            u.role === 'admin'
                                ? `${u.name} — Admin`
                                : `${u.name} (${u.id})`,
                    }))}
                    placeholder="Choisir un utilisateur"
                />
            </div>
        </div>
    );
}
