import { useState } from 'react';
import { EyeCloseIcon, EyeIcon } from '../../icons';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import Checkbox from '../form/input/Checkbox';
import Button from '../ui/button/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router';

export default function SignInForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleSignIn = async () => {
        setError('');
        if (!email.trim() || !password.trim()) {
            setError('Veuillez renseigner email et mot de passe.');
            return;
        }
        setIsSubmitting(true);
        try {
            await login(email.trim(), password, isChecked);
            showToast('Connexion réussie', 'success');
            setTimeout(() => {
                const raw = localStorage.getItem('sgcr_user');
                const u = raw ? JSON.parse(raw) : null;
                const destination =
                    u?.role === 'superadmin'
                        ? '/superadmin'
                        : u?.role === 'admin'
                          ? '/dashboard'
                          : '/enseignant';
                window.location.assign(
                    u?.centerSlug
                        ? `/${u.centerSlug}${destination}`
                        : destination,
                );
            }, 300);
        } catch (e: any) {
            const msg = e.message || 'Échec de connexion.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
                <div>
                    <div className="mb-5 sm:mb-8">
                        <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
                            Connexion
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Entrez vos identifiants pour vous connecter!
                        </p>
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSignIn();
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
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>
                                    Mot de passe{' '}
                                    <span className="text-error-500">
                                        *
                                    </span>{' '}
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        placeholder="Entrez votre mot de passe"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                    />
                                    <span
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute top-1/2 right-4 z-30 -translate-y-1/2 cursor-pointer"
                                    >
                                        {showPassword ? (
                                            <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                                        ) : (
                                            <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                                        )}
                                    </span>
                                </div>
                            </div>

                            {error && (
                                <div className="text-error-600 dark:text-error-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="remember-me"
                                        checked={isChecked}
                                        onChange={setIsChecked}
                                    />
                                    <label
                                        htmlFor="remember-me"
                                        className="text-theme-sm block cursor-pointer font-normal text-gray-700 dark:text-gray-400"
                                    >
                                        Rester connecté
                                    </label>
                                </div>
                            </div>
                            <div>
                                <Button
                                    className="w-full"
                                    size="sm"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? 'Connexion…'
                                        : 'Se connecter'}
                                </Button>
                            </div>
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => navigate('/parent-login')}
                                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-sm"
                                >
                                    Je suis un parent
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
