import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types/auth';

// import { mockUsers } from '../data/mock/users';
const mockUsers: any[] = [];

const STORAGE_TOKEN = 'sgcr_token';
const STORAGE_USER = 'sgcr_user';

function decodeHtmlEntities(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
}

interface AuthContextValue {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    users: User[];
    login: (
        email: string,
        password: string,
        remember?: boolean,
    ) => Promise<void>;
    logout: () => Promise<void>;
    setCurrentUserId: (id: string) => void; // compat mock
    updateUser: (
        id: string,
        patch: Partial<Pick<User, 'name' | 'email' | 'telephone'>>,
    ) => void;
    currentUserId: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapBackendUser(u: any): User {
    return {
        id: u.code || String(u.id),
        name: decodeHtmlEntities(String(u.name || '')),
        role:
            u.role === 'superadmin'
                ? 'superadmin'
                : u.role === 'admin'
                  ? 'admin'
                  : 'teacher',
        centerId: u.selected_center_id ?? u.center_id ?? null,
        centerSlug: u.center_slug ?? null,
        centerName: u.center_name ?? null,
        status: u.status || 'active',
        email: u.email,
        telephone: u.telephone || '',
        teaches: [],
    };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_USER);
            if (raw) {
                const stored = JSON.parse(raw);
                if (stored?.name) stored.name = decodeHtmlEntities(stored.name);
                return stored;
            }
            // Fallback SPA initial auth injected via Blade
            const w = window as any;
            if (w.__AUTH__ && w.__AUTH__.id) {
                return mapBackendUser(w.__AUTH__);
            }
        } catch {}
        return null;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const refreshAuth = () => {
            setIsLoading(true);
            void fetch('/me', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            })
                .then(async (r) => {
                    if (r.ok) {
                        const data = await r.json();
                        if (data && data.id) {
                            const mapped = mapBackendUser(data);
                            setCurrentUser(mapped);
                            localStorage.setItem(
                                STORAGE_USER,
                                JSON.stringify(mapped),
                            );
                        } else {
                            setCurrentUser(null);
                            localStorage.removeItem(STORAGE_USER);
                            localStorage.removeItem(STORAGE_TOKEN);
                        }
                    } else {
                        setCurrentUser(null);
                        localStorage.removeItem(STORAGE_USER);
                        localStorage.removeItem(STORAGE_TOKEN);
                    }
                })
                .catch(() => {})
                .finally(() => setIsLoading(false));
        };

        refreshAuth();
        window.addEventListener('auth:refresh', refreshAuth);
        return () => window.removeEventListener('auth:refresh', refreshAuth);
    }, []);

    const login = async (email: string, password: string, remember = false) => {
        setIsLoading(true);
        try {
            // Récupère le CSRF cookie Sanctum (web)
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
            const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
            const token = csrf ? decodeURIComponent(csrf) : '';

            const res = await fetch('/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': token,
                },
                body: JSON.stringify({ email, password, remember }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    err.message ||
                        err.errors?.email?.[0] ||
                        'Identifiants incorrects',
                );
            }

            const data = await res.json().catch(() => ({}));
            // La SPA utilise la session web; le serveur ne remet aucun jeton bearer au navigateur.
            let user: User | null = null;
            if (data.user) {
                user = mapBackendUser(data.user);
                localStorage.removeItem(STORAGE_TOKEN);
            } else {
                // Si réponse est une redirection Inertia, on fetch /me
                const meRes = await fetch('/me', {
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    user = mapBackendUser(meData);
                }
            }

            if (user) {
                setCurrentUser(user);
                localStorage.setItem(STORAGE_USER, JSON.stringify(user));
                window.dispatchEvent(new Event('auth:login'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
            const csrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
            const token = csrf ? decodeURIComponent(csrf) : '';
            await fetch('/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': token,
                },
            });
        } catch {}
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem('currentUserId');
        window.dispatchEvent(new Event('auth:logout'));
    };

    // Compat mock : setCurrentUserId pour les quick logins restés en mock (on garde pour les autres pages non branchées)
    const setCurrentUserId = (id: string) => {
        const found = mockUsers.find((u) => u.id === id);
        if (found) {
            setCurrentUser(found);
            localStorage.setItem(STORAGE_USER, JSON.stringify(found));
        }
    };

    const updateUser = (
        id: string,
        patch: Partial<Pick<User, 'name' | 'email' | 'telephone'>>,
    ) => {
        if (currentUser && currentUser.id === id) {
            const updated = { ...currentUser, ...patch };
            setCurrentUser(updated);
            localStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        }
    };

    // Pour le sélecteur header, on expose la liste mock + l'utilisateur réel s'il n'y est pas
    const users: User[] = (() => {
        const list = [...mockUsers];
        if (currentUser && !list.some((u) => u.id === currentUser.id)) {
            list.unshift(currentUser);
        }
        return list;
    })();

    return (
        <AuthContext.Provider
            value={{
                currentUser,
                isAuthenticated: !!currentUser,
                isLoading,
                users,
                login,
                logout,
                setCurrentUserId,
                updateUser,
                currentUserId: currentUser?.id ?? null,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export function useCurrentTeacher(): {
    currentTeacher: User | null;
    currentTeacherId: string | null;
} {
    const { currentUser } = useAuth();
    if (!currentUser) return { currentTeacher: null, currentTeacherId: null };
    return { currentTeacher: currentUser, currentTeacherId: currentUser.id };
}
