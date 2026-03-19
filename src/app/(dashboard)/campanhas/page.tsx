'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Trash2, Mail, Calendar, Zap, Clock, Loader2, X, Settings2, Info, BarChart3, Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { ModalPortal } from '@/components/ui/ModalPortal';

export default function CampanhasPage() {
    const [campanhas, setCampanhas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [templates, setTemplates] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingCampanha, setEditingCampanha] = useState<any | null>(null);


    const [newCampanha, setNewCampanha] = useState({
        nome_campanha: '',
        emails_por_dia: 50,
        intervalo_envio_segundos: 0,
        usar_intervalo_humano: false,
        template_inicial: '',
        template_followup: null as string | null,
        sequencia_followup: [] as { template_id: string; dias: number }[],
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
                    template_inicial_info:email_templates!campanhas_template_inicial_fkey(nome_template),
                    template_followup_info:email_templates!campanhas_template_followup_fkey(nome_template),
                    sites:sites(count)
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

    async function handleSaveCampanha(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (editingCampanha) {
                const { error } = await supabase
                    .from('campanhas')
                    .update({
                        ...newCampanha
                    })
                    .eq('id', editingCampanha.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('campanhas')
                    .insert([{
                        ...newCampanha,
                        user_id: user.id
                    }]);
                if (error) throw error;
            }

            setNewCampanha({
                nome_campanha: '',
                emails_por_dia: 50,
                intervalo_envio_segundos: 0,
                usar_intervalo_humano: false,
                template_inicial: '',
                template_followup: null,
                sequencia_followup: [],
                ativa: true
            });
            setEditingCampanha(null);
            setIsModalOpen(false);
            fetchCampanhas();
        } catch (error) {
            console.error('Erro ao salvar campanha:', error);
            alert('Erro ao salvar campanha.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleEditClick(campanha: any) {
        setEditingCampanha(campanha);
        setNewCampanha({
            nome_campanha: campanha.nome_campanha,
            emails_por_dia: campanha.emails_por_dia,
            intervalo_envio_segundos: campanha.intervalo_envio_segundos || 0,
            usar_intervalo_humano: campanha.usar_intervalo_humano || false,
            template_inicial: campanha.template_inicial,
            template_followup: campanha.template_followup || null,
            sequencia_followup: campanha.sequencia_followup || [],
            ativa: campanha.ativa
        });
        setIsModalOpen(true);
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {campanhas.map((campanha) => (
                        <div key={campanha.id} className="p-5 rounded-3xl glass border border-border flex flex-col gap-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
                            <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rotate-45 ${campanha.ativa ? 'bg-emerald-500/10' : 'bg-muted'}`} />

                            <div className="flex justify-between items-start relative z-10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900 truncate max-w-[120px]" title={campanha.nome_campanha}>{campanha.nome_campanha}</h3>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${campanha.ativa ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                            {campanha.ativa ? 'Ativa' : 'Pausada'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono uppercase tracking-tighter">
                                        ID: {campanha.id.split('-')[0]}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleEditClick(campanha)}
                                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all">
                                        <Settings2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => toggleStatus(campanha.id, campanha.ativa)}
                                        className={`p-2 rounded-xl transition-all ${campanha.ativa ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}>
                                        {campanha.ativa ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCampanha(campanha.id)}
                                        disabled={isDeleting === campanha.id}
                                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all"
                                    >
                                        {isDeleting === campanha.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Template Inicial</span>
                                    <span className="text-xs font-bold truncate text-slate-700">{campanha.template_inicial_info?.nome_template || '—'}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Sequência</span>
                                    <span className="text-xs font-bold truncate text-slate-700">
                                        {campanha.sequencia_followup?.length || 0} {campanha.sequencia_followup?.length === 1 ? 'Follow-up' : 'Follow-ups'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 text-[10px] border border-slate-100 text-slate-600">
                                    <Mail className="w-3 h-3 text-rose-500" />
                                    <span className="truncate">{campanha.sites?.[0]?.count || 0} e-mails</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 text-[10px] border border-slate-100 text-slate-600">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    <span className="truncate">{campanha.emails_por_dia}/dia</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 text-[10px] border border-slate-100 text-slate-600">
                                    <Calendar className="w-3 h-3 text-indigo-500" />
                                    <span className="truncate">Ciclo: {campanha.sequencia_followup?.reduce((acc: number, s: any) => acc + (s.dias || 0), 0) || 0}d</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 text-[10px] border border-slate-100 text-slate-600">
                                    <Clock className="w-3 h-3 text-sky-500" />
                                    <span className="truncate">{campanha.intervalo_envio_segundos > 0 ? (() => {
                                        const s = campanha.intervalo_envio_segundos;
                                        if (s >= 3600) return `${s / 3600}h`;
                                        if (s >= 60) return `${s / 60}m`;
                                        return `${s}s`;
                                    })() : 'sem delay'}</span>
                                </div>
                            </div>

                            <Link
                                href={`/campanhas/${campanha.id}`}
                                className="w-full py-2.5 mt-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all border border-indigo-200 flex items-center justify-center gap-2"
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Relatório Completo
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="w-full max-w-xl bg-[#0f172a] border border-slate-800/60 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <Settings2 className="w-5 h-5 text-white" />
                                    {editingCampanha ? 'Editar Campanha' : 'Criar Nova Campanha'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingCampanha(null);
                                        setNewCampanha({
                                            nome_campanha: '',
                                            emails_por_dia: 50,
                                            intervalo_envio_segundos: 0,
                                            usar_intervalo_humano: false,
                                            template_inicial: '',
                                            template_followup: null,
                                            sequencia_followup: [],
                                            ativa: true
                                        });
                                    }}
                                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveCampanha} className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-slate-900/50">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-300 ml-1">Nome da Campanha</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Ex: Prospecção Tech BR"
                                                className="w-full px-4 py-3.5 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                value={newCampanha.nome_campanha}
                                                onChange={e => setNewCampanha({ ...newCampanha, nome_campanha: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-300 ml-1">Envios por dia</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3.5 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                                value={newCampanha.emails_por_dia}
                                                onChange={e => setNewCampanha({ ...newCampanha, emails_por_dia: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 ml-1">Template Inicial (Primeiro Contato)</label>
                                        <select
                                            required
                                            className="w-full px-4 py-3.5 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                                            value={newCampanha.template_inicial}
                                            onChange={e => setNewCampanha({ ...newCampanha, template_inicial: e.target.value })}
                                        >
                                            <option value="">Selecione o template inicial</option>
                                            {templates.map(t => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
                                        </select>
                                    </div>

                                    <div className="pt-6 border-t border-slate-800/60">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-base font-bold flex items-center gap-2 text-white ml-1 uppercase tracking-wider">
                                                    <Clock className="w-5 h-5 text-indigo-400" /> Sequência de Follow-ups
                                                </h4>
                                                <p className="text-[11px] text-slate-500 ml-8 mt-1">Configure o que acontece se o destinatário não responder.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = newCampanha.sequencia_followup || [];
                                                    setNewCampanha({
                                                        ...newCampanha,
                                                        sequencia_followup: [...current, { template_id: '', dias: 3 }]
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-xs font-bold shadow-lg shadow-indigo-600/20"
                                            >
                                                <Plus className="w-4 h-4" /> Adicionar Passo
                                            </button>
                                        </div>

                                        {(newCampanha.sequencia_followup || []).length === 0 ? (
                                            <div className="p-8 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/40 text-center">
                                                <p className="text-slate-500 text-sm">Nenhum follow-up adicional configurado.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {newCampanha.sequencia_followup.map((step, idx) => (
                                                    <div key={idx} className="group relative grid grid-cols-[1fr,120px,auto] items-end gap-5 p-5 rounded-3xl bg-slate-900/60 border border-slate-800/60 hover:border-indigo-500/30 transition-all animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Template do Passo {idx + 1}</label>
                                                            <select
                                                                required
                                                                className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                                                                value={step.template_id}
                                                                onChange={e => {
                                                                    const newSeq = [...newCampanha.sequencia_followup];
                                                                    newSeq[idx].template_id = e.target.value;
                                                                    setNewCampanha({ ...newCampanha, sequencia_followup: newSeq });
                                                                }}
                                                            >
                                                                <option value="">Selecione o Template</option>
                                                                {templates.map(t => <option key={t.id} value={t.id}>{t.nome_template}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 text-center block">Após (dias)</label>
                                                            <input
                                                                required
                                                                type="number"
                                                                min="1"
                                                                className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white text-center text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all hover:bg-slate-800"
                                                                value={step.dias}
                                                                onChange={e => {
                                                                    const newSeq = [...newCampanha.sequencia_followup];
                                                                    newSeq[idx].dias = parseInt(e.target.value) || 0;
                                                                    setNewCampanha({ ...newCampanha, sequencia_followup: newSeq });
                                                                }}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newSeq = (newCampanha.sequencia_followup || []).filter((_, i) => i !== idx);
                                                                setNewCampanha({ ...newCampanha, sequencia_followup: newSeq });
                                                            }}
                                                            className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                                                            title="Remover passo"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-800/60">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-white ml-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-white" />
                                                Intervalo entre e-mails
                                            </label>
                                            <select
                                                className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
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
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 shadow-sm transition-all hover:border-indigo-500/30">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">Modo Envio Humano</p>
                                                    <p className="text-[10px] text-slate-400">Intervalos aleatórios de 3 a 12 min (Anti-Spam)</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setNewCampanha({ ...newCampanha, usar_intervalo_humano: !newCampanha.usar_intervalo_humano })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newCampanha.usar_intervalo_humano ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newCampanha.usar_intervalo_humano ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3 items-start backdrop-blur-sm">
                                            <Info className="w-5 h-5 text-white mt-0.5 shrink-0" />
                                            <p className="text-xs text-white leading-relaxed font-medium">A campanha processará automaticamente novos sites adicionados que ainda não foram contatados.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setEditingCampanha(null);
                                            setNewCampanha({
                                                nome_campanha: '',
                                                emails_por_dia: 50,
                                                intervalo_envio_segundos: 0,
                                                usar_intervalo_humano: false,
                                                template_inicial: '',
                                                template_followup: null,
                                                sequencia_followup: [],
                                                ativa: true
                                            });
                                        }}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-700/50 text-white font-bold hover:bg-slate-800 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {editingCampanha ? 'Salvar Alterações' : 'Criar Campanha'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

