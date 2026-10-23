import { BoxIconLine, GroupIcon } from '../../icons';
import { useDashboardData } from '../../lib/dashboard';

export default function EcommerceMetrics() {
    const { dashboard } = useDashboardData();
    const activeStudentsCount = Number(
        dashboard.activeStudents ?? dashboard.students ?? 0,
    );
    const activeTeachersCount = Number(dashboard.teachers ?? 0);
    const attendanceRate = Number(dashboard.attendanceRate ?? 0);
    const roomsCount = Number(dashboard.salles ?? 0);

    const cards = [
        {
            label: 'Élèves actifs',
            value: String(activeStudentsCount),
            icon: (
                <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
            ),
        },
        {
            label: 'Enseignants actifs',
            value: String(activeTeachersCount),
            icon: (
                <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
            ),
        },
        {
            label: "Taux d'assiduité global",
            value: `${Number(attendanceRate).toFixed(1).replace('.', ',')} %`,
            icon: (
                <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />
            ),
        },
        {
            label: 'Nombre de salles',
            value: String(roomsCount),
            icon: (
                <BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />
            ),
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-700 dark:bg-gray-800"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                        {c.icon}
                    </div>

                    <div className="mt-5 flex items-end justify-between">
                        <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {c.label}
                            </span>
                            <h4 className="text-title-sm mt-2 font-bold text-gray-800 dark:text-white/90">
                                {c.value}
                            </h4>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
