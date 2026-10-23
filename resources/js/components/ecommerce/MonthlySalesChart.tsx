import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';
import { MoreDotIcon } from '../../icons';
import { useMemo, useState } from 'react';
import { useDashboardData } from '../../lib/dashboard';

export default function MonthlySalesChart() {
    const { dashboard } = useDashboardData();
    const monthly = useMemo(
        () => (Array.isArray(dashboard.monthly) ? dashboard.monthly : []),
        [dashboard.monthly],
    );
    const categories = useMemo(
        () => monthly.map((m: any) => m.label || m.key || 'N/A'),
        [monthly],
    );
    const data = useMemo(
        () => monthly.map((m: any) => Number(m.total || 0)),
        [monthly],
    );

    const maxValue = Math.max(1, ...data);
    const [isOpen, setIsOpen] = useState(false);

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 sm:px-6 sm:pt-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Paiements encaissés (mensuel)
                </h3>
                <div className="relative inline-block">
                    <button
                        className="dropdown-toggle"
                        onClick={toggleDropdown}
                    >
                        <MoreDotIcon className="size-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                    </button>
                    <Dropdown
                        isOpen={isOpen}
                        onClose={closeDropdown}
                        className="w-40 p-2"
                    >
                        <DropdownItem
                            onItemClick={closeDropdown}
                            className="flex w-full rounded-lg text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        >
                            Voir plus
                        </DropdownItem>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            className="flex w-full rounded-lg text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                        >
                            Supprimer
                        </DropdownItem>
                    </Dropdown>
                </div>
            </div>

            <div className="custom-scrollbar max-w-full overflow-x-auto">
                <div className="-ml-5 min-w-[650px] pl-2 xl:min-w-full">
                    <div
                        className="relative grid h-[180px] grid-cols-12 items-end gap-3 border-b border-gray-200 px-4 dark:border-gray-700"
                        role="img"
                        aria-label="Paiements encaissés par mois"
                    >
                        {[25, 50, 75].map((tick) => (
                            <div
                                key={tick}
                                className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-gray-200 dark:border-gray-700"
                                style={{ bottom: `${tick}%` }}
                            />
                        ))}
                        {data.map((value, index) => {
                            const height = Math.max(
                                2,
                                (value / maxValue) * 100,
                            );
                            return (
                                <div
                                    key={`${categories[index]}-${index}`}
                                    className="z-10 flex h-full min-w-0 flex-col items-center justify-end gap-2"
                                >
                                    <div
                                        className="bg-brand-500 w-full max-w-8 rounded-t-md transition-[height]"
                                        style={{ height: `${height}%` }}
                                        title={`${categories[index]}: ${value.toLocaleString('fr-FR')} FCFA`}
                                    />
                                    <span className="max-w-full truncate text-[10px] text-gray-500 dark:text-gray-400">
                                        {categories[index]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
