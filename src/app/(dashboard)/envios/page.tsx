'use client';

import { useState, useEffect } from 'react';
import {
    Mail,
    Calendar,
    CheckCircle2,
    XCircle,
    Search,
    Loader2,
    ArrowUpRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function EnviosPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const supabase = createClient();

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('email_logs')
                .select(`
                    *,
                    site:sites(url, email),
                    campanha:campanhas(nome_campanha)
                `)
                .eq('user_id', user.id)
                .order('data_envio', { ascending: false });

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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Histórico de Envios</h2>
                <p className="text-muted-foreground mt-1">Acompanhe todos os e-mails enviados pelas suas campanhas.</p>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por site ou tipo..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destinatário / Campanha</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-accent/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">{log.site?.url}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                {log.campanha?.nome_campanha || 'Envio Manual'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm capitalize">{log.tipo.replace('_', ' ')}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {log.status_envio === 'sucesso' ? (
                                                <div className="flex items-center justify-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Sucesso
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1.5 text-destructive bg-destructive/10 px-2 py-1 rounded-full text-xs font-medium border border-destructive/20">
                                                    <XCircle className="w-3 h-3" />
                                                    Erro
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-sm text-foreground">
                                                {new Date(log.data_envio).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(log.data_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
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
