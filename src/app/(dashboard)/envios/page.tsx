'use client';

import { useState, useEffect } from 'react';
import {
    Mail,
    Calendar,
    CheckCircle2,
    XCircle,
    Search,
    Loader2,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function EnviosPage() {
    const [mounted, setMounted] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 30;
    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        fetchLogs(currentPage);
    }, [currentPage]);

    async function fetchLogs(page: number) {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const from = page * pageSize;
            const to = from + pageSize - 1;

            // 1. Buscar a contagem total para paginação
            const { count, error: countError } = await supabase
                .from('email_logs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (countError) throw countError;
            setTotalCount(count || 0);

            // 2. Buscar os dados paginados
            const { data, error } = await supabase
                .from('email_logs')
                .select(`
                    *,
                    site:sites(url, email),
                    campanha:campanhas(nome_campanha)
                `)
                .eq('user_id', user.id)
                .order('data_envio', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.site?.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Histórico de Envios</h2>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Mostrando {logs.length} de {totalCount} e-mails enviados.
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar nesta página..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-2xl glass border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-muted-foreground animate-pulse">Carregando histórico...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Mail className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Nenhum envio registrado</h3>
                                <p className="text-muted-foreground">Os e-mails enviados pelas suas automações aparecerão aqui.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Destinatário / Campanha</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tipo</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-accent/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-foreground text-sm">{log.site?.url}</div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 opacity-80">
                                                    {log.campanha?.nome_campanha || 'Envio Manual'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs capitalize font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                                    {log.tipo.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {log.status_envio?.includes('sucesso') ? (
                                                    <div className="inline-flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Sucesso
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 text-destructive bg-destructive/10 px-2.5 py-1 rounded-full text-[11px] font-bold border border-destructive/20" title={log.status_envio}>
                                                        <XCircle className="w-3 h-3" />
                                                        Erro
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="text-xs font-medium text-foreground">
                                                    {new Date(log.data_envio).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground opacity-70">
                                                    {new Date(log.data_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Controles de Paginação */}
                            <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between">
                                <div className="text-xs text-muted-foreground font-medium">
                                    Página <span className="text-foreground">{currentPage + 1}</span> de <span className="text-foreground">{totalPages || 1}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                        disabled={currentPage === 0 || loading}
                                        className="p-2 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Página Anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage >= totalPages - 1 || loading}
                                        className="p-2 rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        title="Próxima Página"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
