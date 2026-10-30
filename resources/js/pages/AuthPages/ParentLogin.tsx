import { useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import AuthLayout from './AuthPageLayout';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/button/Button';
import { useToast } from '../../context/ToastContext';

export default function ParentLogin() {
    const [whatsapp, setWhatsapp] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleParentLogin = async () => {
        setError('');
        if (!whatsapp.trim()) {
            setError('Veuillez renseigner votre numéro WhatsApp.');
            return;
        }

        // Nettoyer le numéro (enlever +237 ou 237 si présent)
        const cleanNumber = whatsapp.trim().replace(/^(\+237|237)/, '');

        if (cleanNumber.length < 9) {
            setError('Numéro WhatsApp invalide (minimum 9 chiffres).');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/web/parent/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ whatsapp: cleanNumber }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    err.message || 'Aucun compte parent trouvé pour ce numéro.',
                );
            }

            const data = await res.json();
            if (data.url) {
                // Rediriger vers l'URL du lien parent
                window.location.href = data.url;
            } else {
                throw new Error('Erreur lors de la génération du lien.');
            }
        } catch (e: any) {
            const msg = e.message || 'Échec de connexion.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Connexion parent | SGCR"
                description="Connexion sécurisée pour les parents."
            />
            <AuthLayout>
                <div className="flex flex-1 flex-col">
                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
                        <div>
                            <div className="mb-5 sm:mb-8">
                                <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
                                    Espace Parent
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Entrez votre numéro WhatsApp pour accéder
                                    aux informations de votre enfant.
                                </p>
                            </div>

                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void handleParentLogin();
                                }}
                            >
                                <div className="space-y-6">
                                    <div>
                                        <Label>
                                            Numéro WhatsApp{' '}
                                            <span className="text-error-500">
                                                *
                                            </span>{' '}
                                        </Label>
                                        <Input
                                            type="tel"
                                            placeholder="6XXXXXXXX (sans +237)"
                                            value={whatsapp}
                                            onChange={(e) =>
                                                setWhatsapp(e.target.value)
                                            }
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Entrez uniquement les chiffres (ex:
                                            612345678)
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="text-error-600 dark:text-error-400 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <Button
                                            className="w-full"
                                            size="sm"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting
                                                ? 'Connexion…'
                                                : 'Accéder à mon espace'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </AuthLayout>
        </>
    );
}
