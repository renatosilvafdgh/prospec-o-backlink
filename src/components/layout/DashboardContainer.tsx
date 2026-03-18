'use client';

import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardContainer({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <main className="flex-1 overflow-y-auto px-8 py-8">
                <Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    </div>
                }>
                    {children}
                </Suspense>
            </main>
            <Toaster position="top-right" richColors />
        </div>
    );
}
