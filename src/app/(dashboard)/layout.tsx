import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const DashboardContainer = dynamic(
    () => import('@/components/layout/DashboardContainer'),
    { 
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-screen bg-background text-indigo-600">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        )
    }
);

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardContainer>{children}</DashboardContainer>;
}
