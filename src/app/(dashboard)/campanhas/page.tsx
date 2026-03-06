'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trash2, Mail, Calendar, Zap, Clock, Loader2, X, Settings2, Info, BarChart3 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function CampanhasPage() {
    const [campanhas, setCampanhas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [templates, setTemplates] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const [newCampanha, setNewCampanha] = useState({
        nome_campanha: '',
        emails_por_dia: 50,
        intervalo_followup_dias: 3,
        intervalo_envio_segundos: 0,
        template_inicial: '',
        template_followup: '',
        ativa: true
    });

    const supabase = createClient();

    useEffect(() => {
        fetchCampanhas();
        fetchTemplates();
    }, []);

    async function fetchTemplates() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('email_templates').select('id, nome_template').eq('user_id', user.id);
        setTemplates(data || []);
    }

    async function fetchCampanhas() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('campanhas')
                .select(`
                    *,
                    template_inicial:email_templates!campanhas_template_inicial_fkey(nome_template),
                    template_followup:email_templates!campanhas_template_followup_fkey(nome_template)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampanhas(data || []);
        } catch (error) {
            console.error('Erro ao buscar campanhas:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddCampanha(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('campanhas')
                .insert([{
                    ...newCampanha,
                    user_id: user.id
                }]);

            if (error) throw error;

            setNewCampanha({
                nome_campanha: '',
                emails_por_dia: 50,
                intervalo_followup_dias: 3,
                intervalo_envio_segundos: 0,
                template_inicial: '',
                template_followup: '',
                ativa: true
            });
            setIsModalOpen(false);
            fetchCampanhas();
        } catch (error) {
            console.error('Erro ao salvar campanha:', error);
            alert('Erro ao salvar campanha.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteCampanha(id: string) {
        if (!confirm('Excluir esta campanha?')) return;
        try {
            setIsDeleting(id);
            const { error } = await supabase.from('campanhas').delete().eq('id', id);
            if (error) throw error;
            setCampanhas(campanhas.filter(c => c.id !== id));
        } catch (error) {
            console.error('Erro ao excluir:', error);
        } finally {
            setIsDeleting(null);
        }
    }

    async function toggleStatus(id: string, currentStatus: boolean) {
        try {
            const { error } = await supabase
                .from('campanhas')
                .update({ ativa: !currentStatus })
                .eq('id', id);
            if (error) throw error;
            setCampanhas(campanhas.map(c => c.id === id ? { ...c, ativa: !currentStatus } : c));
        } catch (error) {
            console.error('Erro ao alternar status:', error);
        }
    }

    async function processAutomation() {
        try {
            setIsProcessing(true);
            const res = await fetch('/api/automation/process');
            const data = await res.json();

            if (data.success) {
                alert(`Sucesso! ${data.totalProcessed} e-mails foram processados.`);
                fetchCampanhas();
            } else {
                alert('Erro ao processar: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao disparar automação:', error);
            alert('Falha ao conectar com o serviço de automação.');
        } finally {
            setIsProcessing(false);
        }
    }

    async function syncReplies() {
        try {
            setIsProcessing(true);
            const res = await fetch('/api/automation/replies');
            const data = await res.json();

            if (data.success) {
                const totalEmails = data.details.reduce((acc: number, d: any) => acc + d.messagesChecked, 0);
                const emailsSeen = data.details.flatMap((d: any) => d.emailsSeen).join('\n');
                const registered = data.details.flatMap((d: any) => d.registeredEmails).join(', ');
                const matches = data.details.reduce((acc: number, d: any) => acc + d.matchesFound, 0);

                alert(
                    `📊 Relatório de Sincronização:\n\n` +
                    `✅ Mensagens no Gmail: ${totalEmails}\n` +
                    `🔗 Correspondências: ${matches}\n\n` +
                    `👀 Vistos recentemente (Remetente | Assunto):\n${emailsSeen || 'Nenhum'}\n\n` +
                    `📝 Cadastrados nos seus Sites:\n${registered || 'Nenhum'}\n\n` +
                    `💡 DICA: Se o e-mail de resposta está em "Vistos" mas não em "Cadastrados", você precisa corrigir o e-mail do site!`
                );
                fetchCampanhas();
            } else {
                alert('Erro ao sincronizar respostas.');
            }
        } catch (e) {
            console.error(e);
            alert('Falha na sincronização.');
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Campanhas</h2>
                    <p className="text-muted-foreground mt-1">Configure suas automações de outreach e follow-ups.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={processAutomation}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-border bg-card hover:bg-accent transition-all font-bold text-sm"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-emerald-500" />}
                        Disparar Automação Agora
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white hover:opacity-90 transition-all font-bold shadow-lg shadow-indigo-600/25"
                    >
                        <Plus className="w-5 h-5" />
                        Criar Campanha
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-muted-foreground animate-pulse">Carregando suas campanhas...</p>
                </div>
            ) : campanhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6 glass rounded-2xl border border-border">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Zap className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Nenhuma campanha encontrada</h3>
                        <p className="text-muted-foreground">Crie sua primeira campanha para iniciar o envio automático de e-mails.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold hover:underline">
                        Criar nova campanha
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {campanhas.map((campanha) => (
                        <div key={campanha.id} className="p-8 rounded-3xl glass border border-border flex flex-col gap-6 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rotate-45 ${campanha.ativa ? 'bg-emerald-500/10' : 'bg-muted'}`} />

                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold">{campanha.nome_campanha}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${campanha.ativa ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                            {campanha.ativa ? 'Ativa' : 'Pausada'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-mono text-xs uppercase">
                                        ID: {campanha.id.split('-')[0]}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleStatus(campanha.id, campanha.ativa)}
                                        className={`p-3 rounded-xl transition-all ${campanha.ativa ? 'bg-muted hover:bg-accent text-foreground' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'}`}>
                                        {campanha.ativa ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCampanha(campanha.id)}
                                        disabled={isDeleting === campanha.id}
                                        className="p-3 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                                    >
                                        {isDeleting === campanha.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-accent/30 border border-border flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Template Inicial</span>
                                    <span className="text-sm font-bold truncate">{campanha.template_inicial?.nome_template || 'Não definido'}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-accent/30 border border-border flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Follow-up</span>
                                    <span className="text-sm font-bold truncate">{campanha.template_followup?.nome_template || 'Não definido'}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 text-xs border border-border">
                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{campanha.emails_por_dia} e-mails/dia</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 text-xs border border-border">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Follow-up {campanha.intervalo_followup_dias} dias</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 text-xs border border-border">
                                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                                    <span>Intervalo: {campanha.intervalo_envio_segundos > 0 ? (() => {
                                        const s = campanha.intervalo_envio_segundos;
                                        if (s >= 3600) return `${s / 3600}h`;
                                        if (s >= 60) return `${s / 60} min`;
                                        return `${s}s`;
                                    })() : 'sem delay'}</span>
                                </div>
                            </div>

                            <Link
                                href={`/campanhas/${campanha.id}`}
                                className="w-full py-4 mt-2 rounded-2xl bg-primary/5 hover:bg-primary/10 text-indigo-600 font-bold transition-all border border-primary/20 flex items-center justify-center gap-2"
                            >
                                <BarChart3 className="w-4 h-4" />
                                Relatório da Campanha
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-indigo-600" />
                                Criar Nova Campanha
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCampanha} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Campanha</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Prospecção Tech BR"
                                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                    value={newCampanha.nome_campanha}
                                    onChange={e => setNewCampanha({ ...newCampanha, nome_campanha: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Template Inicial</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                        value={newCampanha.template_inicial}
                                        onChange={e => setNewCampanha({ ...newCampanha, template_inicial: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Template Follow-up</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                        value={newCampanha.template_followup}
                                        onChange={e => setNewCampanha({ ...newCampanha, template_followup: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Envios por dia</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                        value={newCampanha.emails_por_dia}
                                        onChange={e => setNewCampanha({ ...newCampanha, emails_por_dia: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dias para Follow-up</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                        value={newCampanha.intervalo_followup_dias}
                                        onChange={e => setNewCampanha({ ...newCampanha, intervalo_followup_dias: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-sky-500" />
                                    Intervalo entre e-mails
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                    value={newCampanha.intervalo_envio_segundos}
                                    onChange={e => setNewCampanha({ ...newCampanha, intervalo_envio_segundos: parseInt(e.target.value) })}
                                >
                                    <option value={0}>Sem delay (mais rápido)</option>
                                    <option value={10}>10 segundos</option>
                                    <option value={30}>30 segundos</option>
                                    <option value={60}>1 minuto</option>
                                    <option value={120}>2 minutos</option>
                                    <option value={300}>5 minutos</option>
                                    <option value={600}>10 minutos</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Tempo de espera entre o disparo de cada e-mail.</p>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3 items-start">
                                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-200/70">A campanha processará automaticamente novos sites adicionados que ainda não foram contatados.</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-all">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Campanha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

