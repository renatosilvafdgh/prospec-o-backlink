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
    Loader2,
    AlertTriangle,
    Trash2,
    ShieldAlert
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function CampanhaReportPage() {
    const params = useParams();
    const router = useRouter();
    const [campanha, setCampanha] = useState<any>(null);
    const [stats, setStats] = useState({ total: 0, sucesso: 0, erro: 0, respondidos: 0 });
    const [logs, setLogs] = useState<any[]>([]);
    const [invalidEmails, setInvalidEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
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

            // 4. Buscar e-mails inválidos detectados
            const { data: invalidData } = await supabase
                .from('invalid_emails')
                .select('*, site:sites(url, email)')
                .eq('campanha_id', id)
                .order('data_deteccao', { ascending: false });
            
            setInvalidEmails(invalidData || []);

        } catch (error) {
            console.error('Erro ao buscar relatório:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemoveInvalidEmails() {
        if (!confirm('Deseja realmente remover todos os e-mails inválidos desta campanha? Isso alterará o status dos sites para evitar novos envios.')) return;

        try {
            setActionLoading(true);
            const id = params.id as string;
            
            // 1. Identificar sites com bounce nesta campanha
            const siteIds = invalidEmails.map(ie => ie.site_id).filter(Boolean);

            if (siteIds.length === 0) {
                toast.info('Nenhum e-mail inválido vinculado a sites encontrado.');
                return;
            }

            // 2. Atualizar status dos sites para 'invalid' (exclui da campanha)
            const { error: updateError } = await supabase
                .from('sites')
                .update({ 
                    status_contato: 'invalid',
                    campanha_id: null // Opcional: remover da campanha atual
                })
                .in('id', siteIds);

            if (updateError) throw updateError;

            toast.success(`${siteIds.length} e-mails removidos com sucesso.`);
            fetchReportData();
        } catch (error: any) {
            console.error('Erro ao remover e-mails inválidos:', error);
            toast.error('Ocorreu um erro ao processar a remoção.');
        } finally {
            setActionLoading(false);
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

            {/* E-mails Inválidos Section */}
            {invalidEmails.length > 0 && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="px-6 py-4 border-b border-destructive/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            <div>
                                <h3 className="font-bold text-destructive">E-mails Inválidos Detectados</h3>
                                <p className="text-xs text-destructive/80">Estes endereços retornaram erro permanente do servidor.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRemoveInvalidEmails}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-destructive text-white rounded-xl hover:bg-destructive/90 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Remover todos da campanha
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-destructive/10">
                                {invalidEmails.map((ie) => (
                                    <tr key={ie.id} className="hover:bg-destructive/10 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-destructive">{ie.email}</div>
                                            <div className="text-[10px] text-destructive/70">{ie.site?.url}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-[10px] font-bold uppercase tracking-tight bg-destructive/10 px-2 py-0.5 rounded text-destructive border border-destructive/20">
                                                {ie.tipo_erro.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-destructive/80 text-xs italic">
                                            {ie.motivo || 'Sem detalhes do servidor'}
                                        </td>
                                        <td className="px-6 py-3 text-right text-destructive/60 tabular-nums text-[10px]">
                                            {new Date(ie.data_deteccao).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
