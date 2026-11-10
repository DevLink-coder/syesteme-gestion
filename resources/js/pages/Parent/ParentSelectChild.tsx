import { useEffect, useState } from 'react';
import PageMeta from '../../components/common/PageMeta';

interface ParentChild {
    code: string;
    name: string;
    language: string | null;
    url: string;
}

export default function ParentSelectChild() {
    const [children, setChildren] = useState<ParentChild[] | null>(null);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('sgcr_parent_children');
            const parsed = raw ? JSON.parse(raw) : [];
            setChildren(Array.isArray(parsed) ? parsed : []);
        } catch {
            setChildren([]);
        }
    }, []);

    useEffect(() => {
        if (children !== null && children.length === 0) {
            window.location.href = '/parent-login';
        }
    }, [children]);

    if (!children || children.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900">
                Chargement…
            </div>
        );
    }

    return (
        <>
            <PageMeta
                title="Choisir un enfant | SGCR"
                description="Sélectionnez le profil de l'enfant à consulter."
            />
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
                <div className="w-full max-w-lg">
                    <div className="mb-6 text-center">
                        <h1 className="text-title-sm sm:text-title-md font-semibold text-gray-800 dark:text-white/90">
                            Choisissez un enfant
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Votre numéro est associé à {children.length} enfants.
                            Sélectionnez le profil que vous souhaitez consulter.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {children.map((child) => (
                            <button
                                key={child.code || child.name}
                                type="button"
                                onClick={() => {
                                    window.location.href = child.url;
                                }}
                                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white">
                                        {child.name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                        {child.language || 'Langue non renseignée'}
                                        {child.code ? ` · ${child.code}` : ''}
                                    </p>
                                </div>
                                <span className="text-brand-600 dark:text-brand-400 text-sm font-medium">
                                    Consulter →
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
