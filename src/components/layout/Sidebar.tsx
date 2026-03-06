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
    MessageSquare
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

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
    const supabase = createClient();
    const router = useRouter();

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/');
    }

    return (
        <aside style={{
            width: 240,
            minWidth: 240,
            height: '100vh',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
        }}>
            {/* Logo */}
            <div style={{ padding: '20px 20px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: '#eef2ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Mail style={{ width: 16, height: 16, color: '#4f46e5' }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        Prospector AI
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '0 16px 8px' }} />

            {/* Nav */}
            <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '9px 12px',
                                borderRadius: 8,
                                textDecoration: 'none',
                                fontWeight: 500,
                                fontSize: 14,
                                borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                                backgroundColor: isActive ? '#eef2ff' : 'transparent',
                                color: isActive ? '#3730a3' : '#64748b',
                                transition: 'background-color 0.15s, color 0.15s',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                                    (e.currentTarget as HTMLElement).style.color = '#1e293b';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = '#64748b';
                                }
                            }}
                        >
                            <item.icon style={{
                                width: 17, height: 17, flexShrink: 0,
                                color: isActive ? '#4f46e5' : '#94a3b8',
                            }} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom — Logout */}
            <div style={{ padding: '12px 12px 20px', borderTop: '1px solid #f1f5f9' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 12px', borderRadius: 8,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        fontWeight: 500, fontSize: 14, color: '#94a3b8',
                        transition: 'background-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                        (e.currentTarget as HTMLElement).style.color = '#dc2626';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                    }}
                >
                    <LogOut style={{ width: 17, height: 17 }} />
                    Sair
                </button>
            </div>
        </aside>
    );
}
