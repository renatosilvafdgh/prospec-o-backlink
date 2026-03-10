'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Mail,
    Send,
    MessageSquare,
    TrendingUp,
    Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DashboardPage() {
    const [stats, setStats] = useState([
        { label: 'Total de Sites', value: '0', icon: Users, color: 'text-blue-500' },
        { label: 'E-mails Hoje', value: '0', icon: Send, color: 'text-indigo-500' },
        { label: 'Respostas', value: '0', icon: MessageSquare, color: 'text-emerald-500' },
        { label: 'Taxa de Resposta', value: '0%', icon: TrendingUp, color: 'text-amber-500' },
    ]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Total de Sites
            const { count: totalSites } = await supabase
                .from('sites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // 2. E-mails enviados hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: sentToday } = await supabase
                .from('email_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('data_envio', today.toISOString());

            // 3. Respostas
            const { count: responses } = await supabase
                .from('sites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status_contato', 'respondeu');

            // Calcular taxa de resposta
            const { count: totalSent } = await supabase
                .from('email_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // 4. Aberturas e Cliques (Total)
            const { data: interactionData } = await supabase
                .from('email_logs')
                .select('aberturas, cliques')
                .eq('user_id', user.id);

            const totalOpenings = interactionData?.reduce((acc, curr) => acc + (curr.aberturas || 0), 0) || 0;
            const totalClicks = interactionData?.reduce((acc, curr) => acc + (curr.cliques || 0), 0) || 0;

            setStats([
                { label: 'Total de Sites', value: totalSites?.toLocaleString() || '0', icon: Users, color: 'text-blue-500' },
                { label: 'E-mails Hoje', value: sentToday?.toLocaleString() || '0', icon: Send, color: 'text-indigo-500' },
                { label: 'Aberturas', value: totalOpenings.toLocaleString(), icon: Mail, color: 'text-emerald-500' },
                { label: 'Cliques', value: totalClicks.toLocaleString(), icon: TrendingUp, color: 'text-amber-500' },
            ]);

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Bem-vindo de volta! Aqui está um resumo da sua prospecção.</p>
                </div>
                {loading && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mb-2" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="p-6 rounded-2xl glass card-hover flex flex-col justify-between h-32 border border-border">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className="mt-2 text-2xl font-bold">
                            {loading ? '...' : stat.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl glass border border-border h-80 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-semibold">Gráfico de Atividade</p>
                        <p className="text-sm text-muted-foreground">Em breve: Acompanhe seu progresso diário.</p>
                    </div>
                </div>
                <div className="p-6 rounded-2xl glass border border-border h-80 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Mail className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="font-semibold">Campanhas Recentes</p>
                        <p className="text-sm text-muted-foreground">Em breve: Resumo das últimas automações.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

