import type { ChangeEvent } from 'react';

export type AlphabeticalDirection = 'asc' | 'desc';

export function sortAlphabetically<T>(
    items: T[],
    getLabel: (item: T) => string,
    direction: AlphabeticalDirection,
): T[] {
    const factor = direction === 'asc' ? 1 : -1;
    return [...items].sort(
        (a, b) =>
            factor *
            getLabel(a).localeCompare(getLabel(b), 'fr', {
                sensitivity: 'base',
                numeric: true,
            }),
    );
}

export default function AlphabeticalSortControl({
    value,
    onChange,
}: {
    value: AlphabeticalDirection;
    onChange: (value: AlphabeticalDirection) => void;
}) {
    return (
        <select
            aria-label="Ordre alphabétique"
            value={value}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onChange(event.target.value as AlphabeticalDirection)
            }
            className="focus:border-brand-500 focus:ring-brand-500/10 min-w-[130px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:ring-2 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
        </select>
    );
}
