import { useCallback, useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
}

const DISMISSED_KEY = 'educore-install-prompt-dismissed';

function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export default function InstallAppPrompt() {
    const [open, setOpen] = useState(false);
    const [installPrompt, setInstallPrompt] =
        useState<InstallPromptEvent | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);

    const close = useCallback(() => {
        sessionStorage.setItem(DISMISSED_KEY, '1');
        setOpen(false);
    }, []);

    useEffect(() => {
        if (isStandalone() || sessionStorage.getItem(DISMISSED_KEY)) return;

        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as InstallPromptEvent);
        };
        const onAppInstalled = () => {
            sessionStorage.setItem(DISMISSED_KEY, '1');
            setOpen(false);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        const timer = window.setTimeout(() => setOpen(true), 700);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener(
                'beforeinstallprompt',
                onBeforeInstallPrompt,
            );
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    const install = async () => {
        if (showInstructions) {
            close();
            return;
        }

        if (!installPrompt) {
            setShowInstructions(true);
            return;
        }

        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setInstallPrompt(null);
        if (choice.outcome === 'accepted') close();
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') close();
            }}
            role="presentation"
        >
            <section
                aria-labelledby="educore-install-title"
                aria-describedby="educore-install-description"
                aria-modal="true"
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl shadow-slate-950/20 dark:border-gray-700 dark:bg-gray-900"
                role="dialog"
            >
                <div className="from-brand-500 via-brand-600 absolute inset-x-0 top-0 h-36 bg-gradient-to-br to-indigo-700" />
                <button
                    aria-label="Fermer"
                    className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    onClick={close}
                    type="button"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                    >
                        <path
                            d="m6 6 12 12M18 6 6 18"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>

                <div className="relative px-7 pt-8 pb-7 text-center sm:px-9">
                    <img
                        src="/icons/educore-192.png"
                        alt=""
                        className="mx-auto h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-gray-900"
                    />
                    <p className="text-brand-600 dark:text-brand-400 mt-4 text-xs font-semibold tracking-[0.22em] uppercase">
                        EduCore
                    </p>
                    <h2
                        id="educore-install-title"
                        className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
                    >
                        Emportez EduCore avec vous
                    </h2>
                    <p
                        id="educore-install-description"
                        className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
                    >
                        Installez l’application sur votre appareil pour
                        retrouver votre plateforme scolaire rapidement, depuis
                        votre écran d’accueil.
                    </p>

                    {showInstructions && (
                        <div className="border-brand-100 bg-brand-50 text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-100 mt-5 rounded-xl border p-4 text-left text-sm">
                            <p className="font-semibold">
                                Installation depuis votre navigateur
                            </p>
                            <p className="mt-1 leading-5">
                                Ouvrez le menu du navigateur, puis choisissez «
                                Installer l’application » ou « Ajouter à l’écran
                                d’accueil ».
                            </p>
                        </div>
                    )}

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                        <button
                            className="focus-visible:ring-brand-500 rounded-xl px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:outline-none dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                            onClick={close}
                            type="button"
                        >
                            Plus tard
                        </button>
                        <button
                            className="bg-brand-600 shadow-brand-600/20 hover:bg-brand-700 focus-visible:ring-brand-500 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-gray-900"
                            onClick={() => void install()}
                            type="button"
                        >
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                            >
                                <path
                                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            {showInstructions
                                ? 'Compris'
                                : installPrompt
                                  ? 'Installer EduCore'
                                  : 'Comment installer ?'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
