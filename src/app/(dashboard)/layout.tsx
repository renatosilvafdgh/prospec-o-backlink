'use client';

import { useState, useEffect, Suspense } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!mounted) return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
    );

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
