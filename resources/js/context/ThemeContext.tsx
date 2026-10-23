'use client';

import type React from 'react';
import {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
} from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [theme, setTheme] = useState<Theme>(() => {
        // Initialisation synchrone : localStorage > system preference > light
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('theme') as Theme | null;
                if (saved === 'light' || saved === 'dark') return saved;
                if (window.matchMedia('(prefers-color-scheme: dark)').matches)
                    return 'dark';
            } catch {}
        }
        return 'light';
    });

    // Applique la classe .dark immédiatement et à chaque changement
    const applyTheme = useCallback((t: Theme) => {
        const root = document.documentElement;
        if (t === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        try {
            localStorage.setItem('theme', t);
        } catch {}
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme, applyTheme]);

    // Synchronise si l'utilisateur change le thème système (quand aucun choix manuel)
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            try {
                const saved = localStorage.getItem('theme');
                if (!saved) setTheme(e.matches ? 'dark' : 'light');
            } catch {}
        };
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
