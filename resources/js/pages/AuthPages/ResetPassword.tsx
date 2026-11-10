import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import PageMeta from '../../components/common/PageMeta';
import AuthLayout from './AuthPageLayout';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/button/Button';
import { useToast } from '../../context/ToastContext';
import { postJson } from '../../lib/api';

export default function ResetPassword() {
    const { token } = useParams<{ token: string }>();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') ?? '';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const invalidLink = !token || !email;

    const handleSubmit = async () => {
        if (password.length < 8) {
            showToast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
            return;
        }
        if (password !== passwordConfirmation) {
            showToast('Les deux mots de passe ne correspondent pas.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = await postJson('/reset-password', {
                email,
                token,
                password,
                password_confirmation: passwordConfirmation,
            });
            showToast(data.message || 'Mot de passe réinitialisé avec succès.', 'success');
            setTimeout(() => navigate('/signin'), 1200);
        } catch (e: any) {
            showToast(e.message || 'Lien invalide ou expiré.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Nouveau mot de passe | SGCR"
                description="Choisissez votre nouveau mot de passe."
            />
            <AuthLayout>
                <div className="flex flex-1 flex-col">
                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
                        <div>
                            <div className="mb-5 sm:mb-8">
                                <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
                                    Nouveau mot de passe
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {invalidLink
                                        ? 'Ce lien de réinitialisation est incomplet. Demandez un nouveau lien depuis la page de connexion.'
                                        : `Choisissez un nouveau mot de passe pour ${email}.`}
                                </p>
                            </div>

                            {!invalidLink && (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void handleSubmit();
                                    }}
                                >
                                    <div className="space-y-6">
                                        <div>
                                            <Label>
                                                Nouveau mot de passe{' '}
                                                <span className="text-error-500">
                                                    *
                                                </span>{' '}
                                            </Label>
                                            <Input
                                                type="password"
                                                placeholder="8 caractères minimum"
                                                value={password}
                                                onChange={(e) =>
                                                    setPassword(e.target.value)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label>
                                                Confirmer le mot de passe{' '}
                                                <span className="text-error-500">
                                                    *
                                                </span>{' '}
                                            </Label>
                                            <Input
                                                type="password"
                                                placeholder="Retapez le mot de passe"
                                                value={passwordConfirmation}
                                                onChange={(e) =>
                                                    setPasswordConfirmation(
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Button
                                                className="w-full"
                                                size="sm"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting
                                                    ? 'Réinitialisation…'
                                                    : 'Réinitialiser'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            )}

                            <div className="mt-6 text-center">
                                <button
                                    type="button"
                                    onClick={() =>
                                        window.location.assign('/signin')
                                    }
                                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-sm"
                                >
                                    Retour à la connexion
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthLayout>
        </>
    );
}
