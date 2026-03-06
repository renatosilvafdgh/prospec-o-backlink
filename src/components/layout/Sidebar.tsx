'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    Globe,
    Mail,
    Layout,
    History,
    Settings,
    LogOut,
    ChevronRight,
    MessageSquare
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const menuItems = [
    { icon: BarChart3, label: 'Dashboard', href: '/dashboard' },
    { icon: Globe, label: 'Sites', href: '/sites' },
    { icon: Layout, label: 'Campanhas', href: '/campanhas' },
    { icon: MessageSquare, label: 'Inbox', href: '/inbox' },
    { icon: Mail, label: 'Templates', href: '/templates' },
    { icon: History, label: 'Envios', href: '/envios' },
    { icon: Settings, label: 'Configurações', href: '/configuracoes' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-screen border-r border-border bg-card/50 flex flex-col glass">
            <div className="p-6">
                <h1 className="text-2xl font-bold gradient-text focus:outline-none">
                    Prospector
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
                            <span className="font-medium">{item.label}</span>
                            {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto border-t border-border">
                <button className="flex items-center gap-3 w-full px-4 py-3 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/10">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
}
