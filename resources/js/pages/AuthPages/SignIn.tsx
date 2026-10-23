import PageMeta from '../../components/common/PageMeta';
import AuthLayout from './AuthPageLayout';
import SignInForm from '../../components/auth/SignInForm';

export default function SignIn() {
    return (
        <>
            <PageMeta
                title="Connexion admin | SGCR"
                description="Connexion sécurisée de l'administrateur du centre de répétition."
            />
            <AuthLayout>
                <SignInForm />
            </AuthLayout>
        </>
    );
}
