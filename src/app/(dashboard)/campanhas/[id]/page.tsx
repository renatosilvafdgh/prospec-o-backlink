'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Mail,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    Users,
    BarChart3,
    Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function CampanhaReportPage() {
    const params = useParams();
    const router = useRouter();
    const [campanha, setCampanha] = useState<any>(null);
    const [stats, setStats] = useState({ total: 0, sucesso: 0, erro: 0, respondidos: 0 });
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (params.id) {
            fetchReportData();
        }
    }, [params.id]);

    async function fetchReportData() {
        try {
            setLoading(true);
            const id = params.id as string;

            // 1. Buscar dados da campanha
            const { data: campData } = await supabase
                .from('campanhas')
                .select('*, template_inicial:email_templates!campanhas_template_inicial_fkey(nome_template)')
                .eq('id', id)
                .single();

            setCampanha(campData);

            // 2. Buscar logs
            const { data: logData } = await supabase
                .from('email_logs')
                .select('*, site:sites(url, email)')
                .eq('campanha_id', id)
                .order('data_envio', { ascending: false });

            setLogs(logData || []);

            // 3. Calcular Stats
            const total = logData?.length || 0;
            const sucesso = logData?.filter(l => l.status_envio === 'sucesso').length || 0;
            const erro = total - sucesso;
            const respondidos = logData?.filter(l => l.respondeu).length || 0;

            setStats({ total, sucesso, erro, respondidos });

        } catch (error) {
            console.error('Erro ao buscar relatório:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Gerando relatório...</p>
            </div>
        );
    }

    if (!campanha) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold">Campanha não encontrada</h2>
                <button onClick={() => router.back()} className="text-primary mt-4 flex items-center gap-2 mx-auto">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
            </div>
        );
    }

    const taxaConversao = stats.total > 0 ? ((stats.respondidos / stats.total) * 100).toFixed(1) : '0';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Campanhas
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{campanha.nome_campanha}</h2>
                    <p className="text-muted-foreground mt-1">Status detalhado da performance de outreach.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/50 rounded-xl border border-border">
                    <span className={`w-2 h-2 rounded-full ${campanha.ativa ? 'bg-emerald-500' : 'bg-muted'}`} />
                    <span className="text-sm font-medium">{campanha.ativa ? 'Em andamento' : 'Pausada'}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl glass border border-border">
                    <div className="flex items-center gap-3 mb-2 text-primary">
                        <Mail className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Total Enviados</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.total}</div>
                </div>
                <div className="p-6 rounded-2xl glass border border-border">
                    <div className="flex items-center gap-3 mb-2 text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Entregues</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.sucesso}</div>
                </div>
                <div className="p-6 rounded-2xl glass border border-border">
                    <div className="flex items-center gap-3 mb-2 text-amber-500">
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Taxa Resp.</span>
                    </div>
                    <div className="text-3xl font-bold">{taxaConversao}%</div>
                </div>
                <div className="p-6 rounded-2xl glass border border-border">
                    <div className="flex items-center gap-3 mb-2 text-indigo-500">
                        <Users className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Respostas</span>
                    </div>
                    <div className="text-3xl font-bold">{stats.respondidos}</div>
                </div>
            </div>

            {/* Listagem de Logs */}
            <div className="rounded-2xl glass border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Atividade Recente
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    {logs.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground">
                            Nenhum envio registrado ainda para esta campanha.
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                                    <th className="px-6 py-4 tracking-wider">Destinatário</th>
                                    <th className="px-6 py-4 tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 tracking-wider text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{log.site?.url}</div>
                                            <div className="text-xs text-muted-foreground">{log.site?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${log.status_envio === 'sucesso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                                {log.status_envio.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="capitalize">{log.tipo.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                                            {new Date(log.data_envio).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
