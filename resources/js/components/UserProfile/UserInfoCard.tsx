import { useState, useEffect } from 'react';
import Button from '../ui/button/Button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { useAuth } from '../../context/AuthContext';

const localPhone = (value?: string) =>
    String(value || '')
        .replace(/\D/g, '')
        .replace(/^237/, '');

export default function UserInfoCard() {
    const { currentUser, updateUser } = useAuth();
    const [name, setName] = useState(currentUser?.name ?? '');
    const [email, setEmail] = useState(currentUser?.email ?? '');
    const [telephone, setTelephone] = useState(
        localPhone(currentUser?.telephone),
    );
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [lastUserId, setLastUserId] = useState(currentUser?.id ?? '');

    useEffect(() => {
        if (currentUser && currentUser.id !== lastUserId) {
            setLastUserId(currentUser.id);
            setName(currentUser.name);
            setEmail(currentUser.email);
            setTelephone(localPhone(currentUser.telephone));
            setSaved(false);
        }
    }, [currentUser, lastUserId]);

    if (!currentUser) return null;

    const handleSave = async () => {
        if (saving) return;
        if (telephone.trim() && !/^6\d{8}$/.test(localPhone(telephone))) {
            setError(
                'Saisissez un numéro camerounais de 9 chiffres commençant par 6.',
            );
            return;
        }
        if (newPassword && newPassword !== newPasswordConfirmation) {
            setError(
                'La confirmation du nouveau mot de passe ne correspond pas.',
            );
            return;
        }
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const response = await fetch('/web/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '',
                    ),
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    telephone: telephone.trim(),
                    ...(newPassword
                        ? {
                              current_password: currentPassword,
                              new_password: newPassword,
                              new_password_confirmation:
                                  newPasswordConfirmation,
                          }
                        : {}),
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const validationError = Object.values(payload.errors || {})[0];
                throw new Error(
                    Array.isArray(validationError)
                        ? String(validationError[0])
                        : payload.message ||
                              'Impossible de mettre à jour le profil.',
                );
            }

            updateUser(currentUser.id, {
                name: payload.user?.name || name.trim(),
                email: payload.user?.email || email.trim(),
                telephone: payload.user?.telephone || telephone.trim(),
            });
            setTelephone(localPhone(payload.user?.telephone || telephone));
            setCurrentPassword('');
            setNewPassword('');
            setNewPasswordConfirmation('');
            setSaved(true);
        } catch (saveError: any) {
            setError(
                saveError.message || 'Impossible de mettre à jour le profil.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl border border-gray-200 p-5 lg:p-6 dark:border-gray-800">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 lg:mb-6 dark:text-white/90">
                        Informations personnelles
                    </h4>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Nom
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {currentUser.name}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Rôle
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {currentUser.role === 'admin'
                                    ? 'Administrateur'
                                    : 'Enseignant'}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Adresse e-mail
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {currentUser.email}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Téléphone
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {currentUser.telephone}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-auto">
                    <h5 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Modifier les coordonnées
                    </h5>
                    <form
                        className="grid grid-cols-1 gap-4 md:grid-cols-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void handleSave();
                        }}
                    >
                        <div>
                            <Label htmlFor="profile-name">Nom complet</Label>
                            <Input
                                id="profile-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nom complet"
                            />
                        </div>
                        <div>
                            <Label htmlFor="profile-email">E-mail</Label>
                            <Input
                                id="profile-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="prenom.nom@college-liberte.cm"
                            />
                        </div>
                        <div>
                            <Label htmlFor="profile-phone">Téléphone</Label>
                            <Input
                                id="profile-phone"
                                type="tel"
                                value={telephone}
                                onChange={(e) => setTelephone(e.target.value)}
                                placeholder="6XX XXX XXX"
                                hint="9 chiffres locaux; +237 sera ajouté automatiquement."
                            />
                        </div>
                        <div className="border-t border-gray-200 pt-4 md:col-span-2 dark:border-gray-700">
                            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Changer le mot de passe (facultatif)
                            </p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <Label htmlFor="profile-current-password">
                                        Mot de passe actuel
                                    </Label>
                                    <Input
                                        id="profile-current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(e.target.value)
                                        }
                                        autoComplete="current-password"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="profile-new-password">
                                        Nouveau mot de passe
                                    </Label>
                                    <Input
                                        id="profile-new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(e.target.value)
                                        }
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="profile-new-password-confirmation">
                                        Confirmer le nouveau mot de passe
                                    </Label>
                                    <Input
                                        id="profile-new-password-confirmation"
                                        type="password"
                                        value={newPasswordConfirmation}
                                        onChange={(e) =>
                                            setNewPasswordConfirmation(
                                                e.target.value,
                                            )
                                        }
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        </div>
                        {error && (
                            <p className="text-error-600 dark:text-error-400 text-sm md:col-span-2">
                                {error}
                            </p>
                        )}
                        {saved && (
                            <p className="text-success-600 dark:text-success-400 text-sm md:col-span-2">
                                Profil enregistré.
                            </p>
                        )}
                        <div className="flex justify-end md:col-span-2">
                            <Button size="sm" disabled={saving}>
                                {saving
                                    ? 'Enregistrement...'
                                    : 'Enregistrer les modifications'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
