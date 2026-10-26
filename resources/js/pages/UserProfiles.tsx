import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import UserMetaCard from '../components/UserProfile/UserMetaCard';
import UserInfoCard from '../components/UserProfile/UserInfoCard';
import { useAuth } from '../context/AuthContext';

export default function UserProfiles() {
    const { currentUser } = useAuth();
    if (!currentUser) return null;

    return (
        <>
            <PageMeta
                title="Mon profil | Gestion scolaire"
                description="Profil de l'utilisateur connecté"
            />
            <PageBreadcrumb pageTitle="Mon profil" />
            <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7 dark:text-white/90">
                    {currentUser.role === 'admin'
                        ? 'Profil administrateur'
                        : 'Profil enseignant'}
                </h3>
                <div className="space-y-6">
                    <UserMetaCard />
                    <UserInfoCard />
                </div>
            </div>
        </>
    );
}
