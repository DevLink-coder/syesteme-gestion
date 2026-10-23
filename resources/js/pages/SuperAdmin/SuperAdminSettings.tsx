import { FormEvent, useEffect, useState } from 'react';

export default function SuperAdminSettings() {
    const [sms, setSms] = useState('0');
    const [whatsapp, setWhatsapp] = useState('0');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/web/superadmin/settings', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data) => {
                setSms(String(data.smsUnitCost ?? 0));
                setWhatsapp(String(data.whatsappUnitCost ?? 0));
            })
            .catch(() => setError('Impossible de charger les paramètres.'));
    }, []);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        const token =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content || '';
        try {
            const response = await fetch('/web/superadmin/settings', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                },
                body: JSON.stringify({
                    smsUnitCost: Number(sms),
                    whatsappUnitCost: Number(whatsapp),
                }),
            });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.message || 'Enregistrement impossible.');
            setMessage(data.message);
        } catch (saveError) {
            setError(
                saveError instanceof Error ? saveError.message : 'Erreur.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <header>
                <p className="text-brand-600 text-sm font-medium">
                    Administration centrale
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    Paramètres de la plateforme
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Tarifs unitaires utilisés pour estimer les dépenses
                    mensuelles de messagerie.
                </p>
            </header>
            {error && (
                <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                    {error}
                </p>
            )}
            {message && (
                <p
                    role="status"
                    className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300"
                >
                    {message}
                </p>
            )}
            <form
                onSubmit={save}
                className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
                <label className="block text-sm font-medium">
                    Coût unitaire SMS (FCFA)
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={sms}
                        onChange={(event) => setSms(event.target.value)}
                        className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-gray-900 focus:ring-2 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                </label>
                <label className="block text-sm font-medium">
                    Coût unitaire WhatsApp (FCFA)
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={whatsapp}
                        onChange={(event) => setWhatsapp(event.target.value)}
                        className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-gray-900 focus:ring-2 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500"
                    />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    L’estimation suppose un message par élève et par mois. Les
                    valeurs initiales sont nulles : saisissez vos tarifs
                    contractuels pour obtenir une estimation chiffrée.
                </p>
                <button
                    disabled={saving}
                    className="bg-brand-600 hover:bg-brand-700 dark:disabled:bg-brand-900 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </form>
        </div>
    );
}
