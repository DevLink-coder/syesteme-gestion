import { useEffect, useMemo, useRef, useState } from 'react';
import flatpickr from 'flatpickr';
import ChartTab, { PeriodKey } from '../common/ChartTab';
import { CalenderIcon } from '../../icons';
import { useDashboardData } from '../../lib/dashboard';

const fallbackAttendance = [{ label: 'Aucune donnée', rate: 0 }];

export default function StatisticsChart() {
    const { dashboard } = useDashboardData();
    const datePickerRef = useRef<HTMLInputElement>(null);
    const [period, setPeriod] = useState<PeriodKey>('monthly');

    const periodData = useMemo(() => {
        const attendanceTrend = Array.isArray(dashboard.attendanceTrend)
            ? dashboard.attendanceTrend
            : fallbackAttendance;

        if (period === 'quarterly') {
            return attendanceTrend.length
                ? attendanceTrend
                : fallbackAttendance;
        }
        if (period === 'annually') {
            return attendanceTrend.length
                ? attendanceTrend
                : fallbackAttendance;
        }
        return attendanceTrend.length ? attendanceTrend : fallbackAttendance;
    }, [period]);

    const categories = useMemo(
        () => periodData.map((d) => d.label),
        [periodData],
    );
    const values = useMemo(
        () => periodData.map((d) => Math.round(d.rate * 10) / 10),
        [periodData],
    );

    useEffect(() => {
        if (!datePickerRef.current) return;

        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);

        const fp = flatpickr(datePickerRef.current, {
            mode: 'range',
            static: true,
            monthSelectorType: 'static',
            dateFormat: 'M d',
            defaultDate: [sevenDaysAgo, today],
            clickOpens: true,
            prevArrow:
                '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            nextArrow:
                '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        });

        return () => {
            if (!Array.isArray(fp)) {
                fp.destroy();
            }
        };
    }, []);

    const chartWidth = 1000;
    const chartHeight = 300;
    const points = values.map((value, index) => {
        const x =
            values.length < 2
                ? chartWidth / 2
                : 55 + (index * 890) / (values.length - 1);
        const y = 20 + ((100 - Math.max(0, Math.min(100, value))) / 100) * 220;
        return { x, y, value, label: categories[index] };
    });
    return (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 sm:px-6 sm:pt-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:justify-between">
                <div className="w-full">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Évolution de l&apos;assiduité
                    </h3>
                    <p className="text-theme-sm mt-1 text-gray-500 dark:text-gray-400">
                        Taux de présence par séance, en %
                    </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                    <ChartTab value={period} onChange={setPeriod} />
                    <div className="relative inline-flex items-center">
                        <CalenderIcon className="pointer-events-none absolute top-1/2 left-1/2 z-10 size-5 -translate-x-1/2 -translate-y-1/2 text-gray-500 lg:top-1/2 lg:left-3 lg:translate-x-0 lg:-translate-y-1/2 dark:text-gray-400" />
                        <input
                            ref={datePickerRef}
                            className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 bg-white text-sm font-medium text-transparent outline-none lg:h-auto lg:w-40 lg:py-2 lg:pr-3 lg:pl-10 lg:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:lg:text-gray-300"
                            placeholder="Choisir une période"
                        />
                    </div>
                </div>
            </div>

            <div className="custom-scrollbar max-w-full overflow-x-auto">
                <div className="min-w-[1000px] xl:min-w-full">
                    <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="h-[310px] w-full"
                        role="img"
                        aria-label="Taux de pr?sence par s?ance"
                    >
                        {[0, 25, 50, 75, 100].map((tick) => {
                            const y = 20 + ((100 - tick) / 100) * 220;
                            return (
                                <g key={tick}>
                                    <line
                                        x1="48"
                                        x2="960"
                                        y1={y}
                                        y2={y}
                                        stroke="currentColor"
                                        className="text-gray-200 dark:text-gray-700"
                                        strokeDasharray="4 5"
                                    />
                                    <text
                                        x="40"
                                        y={y + 4}
                                        textAnchor="end"
                                        className="fill-gray-500 text-[12px]"
                                    >
                                        {tick}%
                                    </text>
                                </g>
                            );
                        })}
                        <polyline
                            points={points
                                .map(({ x, y }) => `${x},${y}`)
                                .join(' ')}
                            fill="none"
                            stroke="#465fff"
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        {points.map(({ x, y, value, label }, index) => (
                            <g key={`${label}-${index}`}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill="#465fff"
                                    stroke="white"
                                    strokeWidth="2"
                                >
                                    <title>{`${label}: ${value.toFixed(1).replace('.', ',')} %`}</title>
                                </circle>
                                {points.length <= 12 && (
                                    <text
                                        x={x}
                                        y="270"
                                        textAnchor="middle"
                                        className="fill-gray-500 text-[11px]"
                                    >
                                        {label}
                                    </text>
                                )}
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
        </div>
    );
}
