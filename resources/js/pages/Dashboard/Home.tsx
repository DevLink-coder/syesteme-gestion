import EcommerceMetrics from '../../components/ecommerce/EcommerceMetrics';
import MonthlySalesChart from '../../components/ecommerce/MonthlySalesChart';
import StatisticsChart from '../../components/ecommerce/StatisticsChart';
import RecentOrders from '../../components/ecommerce/RecentOrders';

import PageMeta from '../../components/common/PageMeta';

export default function Home() {
    return (
        <>
            <PageMeta
                title="Tableau de bord | Centre de répétition"
                description="Tableau de bord administratif : élèves, enseignants, paiements et assiduité"
            />
            <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 space-y-6">
                    <EcommerceMetrics />

                    <StatisticsChart />
                </div>

                <div className="col-span-12">
                    <MonthlySalesChart />
                </div>

                <div className="col-span-12">
                    <RecentOrders />
                </div>
            </div>
        </>
    );
}
