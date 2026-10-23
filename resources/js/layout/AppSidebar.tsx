import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

// Assume these icons are imported from an icon library
import {
    CalenderIcon,
    ChevronDownIcon,
    GridIcon,
    GroupIcon,
    HorizontaLDots,
    ListIcon,
    PageIcon,
    UserCircleIcon,
} from '../icons';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import SidebarWidget from './SidebarWidget';

type NavItem = {
    name: string;
    icon: React.ReactNode;
    path?: string;
    subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Menu Administrateur - accès complet
const adminNavItems: NavItem[] = [
    {
        icon: <GridIcon />,
        name: 'Tableau de bord',
        subItems: [{ name: 'Vision globale', path: '/dashboard', pro: false }],
    },
    {
        icon: <CalenderIcon />,
        name: 'Planning',
        path: '/calendar',
    },
    {
        icon: <ListIcon />,
        name: 'Structure pédagogique',
        subItems: [
            { name: 'Salles', path: '/salles', pro: false },
            { name: 'Enseignants', path: '/enseignants', pro: false },
            { name: 'Années scolaires', path: '/annees-scolaires', pro: false },
            { name: 'Matières', path: '/matieres', pro: false },
        ],
    },
    {
        icon: <GroupIcon />,
        name: 'Élèves',
        subItems: [
            { name: 'Liste des élèves', path: '/eleves', pro: false },
            { name: 'Tarifs', path: '/tarifs', pro: false },
            { name: 'Dettes / Relances', path: '/dettes', pro: false },
        ],
    },
    {
        icon: <CalenderIcon />,
        name: 'Présences',
        subItems: [
            {
                name: 'Vue consolidée & Alertes',
                path: '/presences',
                pro: false,
            },
        ],
    },
    {
        icon: <ListIcon />,
        name: 'Évaluations',
        subItems: [
            { name: 'Liste des évaluations', path: '/evaluations', pro: false },
        ],
    },
    {
        icon: <UserCircleIcon />,
        name: 'Espace Enseignant',
        subItems: [
            { name: 'Dashboard', path: '/enseignant', pro: false },
            {
                name: 'Emploi du temps',
                path: '/enseignant/emploi-du-temps',
                pro: false,
            },
            {
                name: 'Saisie des notes',
                path: '/enseignant/saisie-notes',
                pro: false,
            },
        ],
    },
    {
        icon: <UserCircleIcon />,
        name: 'Profil utilisateur',
        path: '/profile',
    },
];

// Menu Enseignant - accès limité
const teacherNavItems: NavItem[] = [
    {
        icon: <UserCircleIcon />,
        name: 'Espace Enseignant',
        subItems: [
            { name: 'Dashboard', path: '/enseignant', pro: false },
            {
                name: 'Emploi du temps',
                path: '/enseignant/emploi-du-temps',
                pro: false,
            },
            {
                name: 'Saisie des notes',
                path: '/enseignant/saisie-notes',
                pro: false,
            },
        ],
    },
    {
        icon: <UserCircleIcon />,
        name: 'Profil utilisateur',
        path: '/profile',
    },
];

const superAdminNavItems: NavItem[] = [
    { icon: <GridIcon />, name: 'Vue globale', path: '/superadmin' },
    { icon: <GroupIcon />, name: 'Centres', path: '/superadmin/centres' },
    { icon: <PageIcon />, name: "Journal d'audit", path: '/superadmin/audit' },
    {
        icon: <ListIcon />,
        name: 'Paramètres plateforme',
        path: '/superadmin/settings',
    },
    { icon: <UserCircleIcon />, name: 'Profil superadmin', path: '/profile' },
];
const centerAdminNavItems = adminNavItems;

const AppSidebar: React.FC = () => {
    const {
        isExpanded,
        isMobileOpen,
        isHovered,
        setIsHovered,
        closeMobileSidebar,
    } = useSidebar();
    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const leaveSelectedCenter = async () => {
        const csrf =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content || '';
        const response = await fetch('/web/superadmin/centers/exit', {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf,
            },
            body: JSON.stringify({}),
        });
        if (!response.ok) return;
        const saved = JSON.parse(localStorage.getItem('sgcr_user') || '{}');
        localStorage.setItem(
            'sgcr_user',
            JSON.stringify({ ...saved, centerId: null }),
        );
        window.dispatchEvent(new Event('auth:refresh'));
        window.location.assign('/superadmin');
    };

    const handleNavClick = (
        e: React.MouseEvent<HTMLAnchorElement>,
        path: string,
    ) => {
        // Fermeture synchrone avec navigation : 1 clic = nav + close
        if (isMobileOpen) {
            e.preventDefault();
            closeMobileSidebar();
            // navigate après fermeture, dans le même tick
            void navigate(path);
        }
        // si desktop, laisse Link faire son travail normal
    };

    const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) =>
        handleNavClick(e, '/');

    const [openSubmenu, setOpenSubmenu] = useState<{
        type: 'main' | 'others';
        index: number;
    } | null>(null);
    const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
        {},
    );
    const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Filtrer le menu - gère le cas non authentifié (évite crash #520) - après hooks pour #310
    if (!currentUser) return null;
    const isSuperAdmin = currentUser.role === 'superadmin';
    const inPlatformArea =
        isSuperAdmin &&
        (location.pathname.startsWith('/superadmin') ||
            currentUser.centerId == null);
    const navItems = isSuperAdmin
        ? inPlatformArea
            ? superAdminNavItems
            : centerAdminNavItems
        : currentUser.role === 'admin'
          ? adminNavItems
          : teacherNavItems;

    // const isActive = (path: string) => location.pathname === path;
    const isActive = useCallback(
        (path: string) => location.pathname === path,
        [location.pathname],
    );

    useEffect(() => {
        let submenuMatched = false;
        navItems.forEach((nav, index) => {
            if (nav.subItems) {
                nav.subItems.forEach((subItem) => {
                    if (isActive(subItem.path)) {
                        setOpenSubmenu({
                            type: 'main',
                            index,
                        });
                        submenuMatched = true;
                    }
                });
            }
        });

        if (!submenuMatched) {
            setOpenSubmenu(null);
        }
    }, [location, isActive, navItems]);

    useEffect(() => {
        if (openSubmenu !== null) {
            const key = `main-${openSubmenu.index}`;
            if (subMenuRefs.current[key]) {
                setSubMenuHeight((prevHeights) => ({
                    ...prevHeights,
                    [key]: subMenuRefs.current[key]?.scrollHeight || 0,
                }));
            }
        }
    }, [openSubmenu]);

    const handleSubmenuToggle = (index: number) => {
        setOpenSubmenu((prevOpenSubmenu) => {
            if (
                prevOpenSubmenu &&
                prevOpenSubmenu.type === 'main' &&
                prevOpenSubmenu.index === index
            ) {
                return null;
            }
            return { type: 'main', index };
        });
    };

    const renderMenuItems = (items: NavItem[]) => (
        <ul className="flex flex-col gap-4">
            {items.map((nav, index) => (
                <li key={nav.name}>
                    {nav.subItems ? (
                        <button
                            onClick={() => handleSubmenuToggle(index)}
                            className={`menu-item group overflow-hidden whitespace-nowrap ${
                                openSubmenu?.type === 'main' &&
                                openSubmenu?.index === index
                                    ? 'menu-item-active'
                                    : 'menu-item-inactive'
                            } cursor-pointer ${
                                !isExpanded && !isHovered
                                    ? 'lg:justify-center'
                                    : 'lg:justify-start'
                            }`}
                        >
                            <span
                                className={`menu-item-icon-size shrink-0 ${
                                    openSubmenu?.type === 'main' &&
                                    openSubmenu?.index === index
                                        ? 'menu-item-icon-active'
                                        : 'menu-item-icon-inactive'
                                }`}
                            >
                                {nav.icon}
                            </span>
                            {(isExpanded || isHovered || isMobileOpen) && (
                                <span className="menu-item-text min-w-0 flex-1 truncate text-left whitespace-nowrap">
                                    {nav.name}
                                </span>
                            )}
                            {(isExpanded || isHovered || isMobileOpen) && (
                                <ChevronDownIcon
                                    className={`ml-auto h-5 w-5 shrink-0 transition-transform duration-200 ${
                                        openSubmenu?.type === 'main' &&
                                        openSubmenu?.index === index
                                            ? 'text-brand-500 rotate-180'
                                            : ''
                                    }`}
                                />
                            )}
                        </button>
                    ) : (
                        nav.path && (
                            <Link
                                to={nav.path}
                                onClick={(e) => handleNavClick(e, nav.path!)}
                                className={`menu-item group overflow-hidden whitespace-nowrap ${
                                    isActive(nav.path)
                                        ? 'menu-item-active'
                                        : 'menu-item-inactive'
                                }`}
                            >
                                <span
                                    className={`menu-item-icon-size shrink-0 ${
                                        isActive(nav.path)
                                            ? 'menu-item-icon-active'
                                            : 'menu-item-icon-inactive'
                                    }`}
                                >
                                    {nav.icon}
                                </span>
                                {(isExpanded || isHovered || isMobileOpen) && (
                                    <span className="menu-item-text min-w-0 flex-1 truncate text-left whitespace-nowrap">
                                        {nav.name}
                                    </span>
                                )}
                            </Link>
                        )
                    )}
                    {nav.subItems &&
                        (isExpanded || isHovered || isMobileOpen) && (
                            <div
                                ref={(el) => {
                                    subMenuRefs.current[`main-${index}`] = el;
                                }}
                                className="overflow-hidden transition-all duration-300"
                                style={{
                                    height:
                                        openSubmenu?.type === 'main' &&
                                        openSubmenu?.index === index
                                            ? `${subMenuHeight[`main-${index}`]}px`
                                            : '0px',
                                }}
                            >
                                <ul className="mt-2 ml-9 space-y-1">
                                    {nav.subItems.map((subItem) => (
                                        <li key={subItem.name}>
                                            <Link
                                                to={subItem.path}
                                                onClick={(e) =>
                                                    handleNavClick(
                                                        e,
                                                        subItem.path,
                                                    )
                                                }
                                                className={`menu-dropdown-item overflow-hidden whitespace-nowrap ${
                                                    isActive(subItem.path)
                                                        ? 'menu-dropdown-item-active'
                                                        : 'menu-dropdown-item-inactive'
                                                }`}
                                            >
                                                {subItem.name}
                                                <span className="ml-auto flex items-center gap-1">
                                                    {subItem.new && (
                                                        <span
                                                            className={`ml-auto ${
                                                                isActive(
                                                                    subItem.path,
                                                                )
                                                                    ? 'menu-dropdown-badge-active'
                                                                    : 'menu-dropdown-badge-inactive'
                                                            } menu-dropdown-badge`}
                                                        >
                                                            new
                                                        </span>
                                                    )}
                                                    {subItem.pro && (
                                                        <span
                                                            className={`ml-auto ${
                                                                isActive(
                                                                    subItem.path,
                                                                )
                                                                    ? 'menu-dropdown-badge-active'
                                                                    : 'menu-dropdown-badge-inactive'
                                                            } menu-dropdown-badge`}
                                                        >
                                                            pro
                                                        </span>
                                                    )}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                </li>
            ))}
        </ul>
    );

    return (
        <aside
            className={`fixed top-16 left-0 z-40 flex h-[calc(100vh-4rem)] flex-col border-r border-gray-200 bg-white px-3 text-gray-900 transition-all duration-300 ease-in-out sm:px-5 lg:top-0 lg:h-screen dark:border-gray-800 dark:bg-gray-900 ${
                isExpanded || isMobileOpen
                    ? 'w-[85vw] max-w-[290px] sm:w-[290px]'
                    : isHovered
                      ? 'w-[85vw] max-w-[290px] sm:w-[290px]'
                      : 'w-[85vw] max-w-[90px] sm:w-[90px]'
            } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`flex py-8 ${
                    !isExpanded && !isHovered
                        ? 'lg:justify-center'
                        : 'justify-start'
                }`}
            >
                <Link to="/" onClick={handleLogoClick}>
                    {isExpanded || isHovered || isMobileOpen ? (
                        <>
                            <img
                                className="dark:hidden"
                                src="/images/logo/logo.svg"
                                alt="Logo"
                                width={150}
                                height={40}
                            />
                            <img
                                className="hidden dark:block"
                                src="/images/logo/logo-dark.svg"
                                alt="Logo"
                                width={150}
                                height={40}
                            />
                        </>
                    ) : (
                        <img
                            src="/images/logo/logo-icon.svg"
                            alt="Logo"
                            width={32}
                            height={32}
                        />
                    )}
                </Link>
            </div>
            <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
                <nav className="mb-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2
                                className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${
                                    !isExpanded && !isHovered
                                        ? 'lg:justify-center'
                                        : 'justify-start'
                                }`}
                            >
                                {isExpanded || isHovered || isMobileOpen ? (
                                    'Menu'
                                ) : (
                                    <HorizontaLDots className="size-6" />
                                )}
                            </h2>
                            {renderMenuItems(navItems)}
                            {isSuperAdmin &&
                                !inPlatformArea &&
                                (isExpanded || isHovered || isMobileOpen) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void leaveSelectedCenter()
                                        }
                                        className="border-brand-200 text-brand-700 hover:bg-brand-50 dark:text-brand-300 w-full rounded-lg border px-3 py-2 text-left text-sm font-medium dark:border-gray-700 dark:hover:bg-gray-800"
                                    >
                                        Retour à la plateforme
                                    </button>
                                )}
                        </div>
                    </div>
                </nav>
                {isExpanded || isHovered || isMobileOpen ? (
                    <SidebarWidget />
                ) : null}
            </div>
        </aside>
    );
};

export default AppSidebar;
