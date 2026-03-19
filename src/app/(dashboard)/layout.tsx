'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import DashboardContainer from '@/components/layout/DashboardContainer';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-indigo-600">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return <DashboardContainer>{children}</DashboardContainer>;
}
