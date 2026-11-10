import { useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import AuthLayout from './AuthPageLayout';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/button/Button';
import { useToast } from '../../context/ToastContext';
import { postJson } from '../../lib/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        if (!email.trim()) {
            showToast('Veuillez renseigner votre email.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = await postJson('/forgot-password', {
                email: email.trim(),
            });
            setSent(true);
            showToast(data.message, 'success');
        } catch (e: any) {
            showToast(e.message || 'Une erreur est survenue.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Mot de passe oublié | SGCR"
                description="Réinitialisez votre mot de passe par email."
            />
            <AuthLayout>
                <div className="flex flex-1 flex-col">
                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
                        <div>
                            <div className="mb-5 sm:mb-8">
                                <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
                                    Mot de passe oublié ?
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {sent
                                        ? 'Consultez votre boîte mail pour réinitialiser votre mot de passe.'
                                        : "Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe."}
                                </p>
                            </div>

                            {!sent ? (
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void handleSubmit();
                                    }}
                                >
                                    <div className="space-y-6">
                                        <div>
                                            <Label>
                                                Email{' '}
                                                <span className="text-error-500">
                                                    *
                                                </span>{' '}
                                            </Label>
                                            <Input
                                                type="email"
                                                placeholder="direction@college-liberte.cm"
                                                value={email}
                                                onChange={(e) =>
                                                    setEmail(e.target.value)
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
                                                    ? 'Envoi en cours…'
                                                    : 'Envoyer le lien'}
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            ) : null}

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
