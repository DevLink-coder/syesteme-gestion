import { useState } from 'react';
import PageMeta from '../../components/common/PageMeta';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/button/Button';
import Badge from '../../components/ui/badge/Badge';
import StyledSelect from '../../components/ui/select/StyledSelect';

export default function ParametresGeneraux() {
    // EF-23b : délai de tolérance — valeur par défaut 45 min
    // NOTE: Ce paramètre devra être branché sur la logique de la page Présences (calcul En retard)
    // une fois le backend en place. Pour l'instant, la page Présences utilise sa propre constante
    // DELAI_TOLERANCE_MINUTES = 15. Ce champ simule la future configuration centralisée.
    const [delai, setDelai] = useState('45');
    const [delaiSaved, setDelaiSaved] = useState(false);

    // Configuration du service de notification — purement visuel, sans appel réseau réel
    const [canal, setCanal] = useState('whatsapp');
    const [apiKey, setApiKey] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const handleSaveDelai = () => {
        setDelaiSaved(true);
        setTimeout(() => setDelaiSaved(false), 2000);
    };

    const handleTestConnection = () => {
        // Simulation visuelle uniquement
        if (!apiKey.trim()) return;
        setIsConnected(true);
        setTimeout(() => setIsConnected(false), 3000);
    };

    return (
        <>
            <PageMeta
                title="Paramètres généraux | Administration"
                description="Configuration générale"
            />
            <PageBreadcrumb pageTitle="Paramètres généraux" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* EF-23b */}
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        Délai de tolérance d'appel — EF-23b
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        À partir de quand une salle sans appel enregistré passe
                        au statut “En retard” sur la page Présences.
                    </p>
                    <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Délai (minutes) *
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="max-w-[160px] flex-1">
                                <Input
                                    type="number"
                                    value={delai}
                                    onChange={(e) => setDelai(e.target.value)}
                                    placeholder="45"
                                    min="1"
                                />
                            </div>
                            <span className="text-sm text-gray-500">
                                minutes
                            </span>
                            <Button onClick={handleSaveDelai}>
                                Enregistrer
                            </Button>
                        </div>
                        {delaiSaved && (
                            <p className="text-success-600 mt-2 text-sm">
                                Valeur enregistrée (simulation locale).
                            </p>
                        )}
                        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800">
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                                Note pour le branchement futur
                            </p>
                            <p className="mt-1">
                                Ce champ devra être branché sur la logique{' '}
                                <code>Présences</code> (
                                <code>DELAI_TOLERANCE_MINUTES</code>) une fois
                                le backend en place. Actuellement la page
                                Présences utilise sa propre constante isolée (15
                                min) — ce paramètre n'est pas encore
                                interconnecté, juste configuré ici.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Configuration du service de notification */}
                <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            Service de notification
                        </h3>
                        {isConnected ? (
                            <Badge color="success" size="sm">
                                Connecté
                            </Badge>
                        ) : (
                            <Badge color="light" size="sm">
                                Non configuré
                            </Badge>
                        )}
                    </div>
                    <p className="mb-4 text-sm text-gray-500">
                        Choix du canal et clé API du fournisseur tiers —
                        purement visuel, sans appel réseau réel.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Canal
                            </label>
                            <StyledSelect
                                value={canal}
                                onChange={setCanal}
                                options={[
                                    {
                                        value: 'whatsapp',
                                        label: 'WhatsApp via fournisseur tiers',
                                    },
                                    { value: 'sms', label: 'SMS de secours' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                Clé API du fournisseur
                            </label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk_... / wha_..."
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Champ masqué comme un mot de passe.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleTestConnection}
                            >
                                Tester la connexion
                            </Button>
                            <Button
                                onClick={() => setIsConnected(!!apiKey.trim())}
                            >
                                Enregistrer
                            </Button>
                        </div>
                        {isConnected && (
                            <p className="text-success-600 text-sm">
                                Connexion simulée réussie.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
