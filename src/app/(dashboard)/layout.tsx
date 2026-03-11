import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto px-8 py-8">
                {children}
            </main>
            <Toaster position="top-right" richColors />
        </div>
    );
}
