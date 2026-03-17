'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    MessageSquare,
    Search,
    ExternalLink,
    Loader2,
    Clock,
    Globe,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    Mail,
    Send,
    X,
    RefreshCw,
    Filter,
    Tag,
    Star,
    CheckCircle,
    Trash2,
    AlertCircle,
    StickyNote
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { toast } from 'sonner';

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default function InboxPage() {
    const [responses, setResponses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [availableThreads, setAvailableThreads] = useState<any[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [threadMessages, setThreadMessages] = useState<any[]>([]);
    const [threadSubject, setThreadSubject] = useState<string>('');
    const [loadingThread, setLoadingThread] = useState(false);
    const [loadingThreads, setLoadingThreads] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [mainTab, setMainTab] = useState<'inbox' | 'lixeira'>('inbox');
    const [readFilter, setReadFilter] = useState<'todos' | 'lidos' | 'nao_lidos'>('nao_lidos');
    const [classFilter, setClassFilter] = useState<string>('todos');
    const [isReplying, setIsReplying] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);
    const [commentBody, setCommentBody] = useState('');
    const [isSavingComment, setIsSavingComment] = useState(false);
    const supabase = createClient();

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        fetchResponses();
    }, []);

    useEffect(() => {
        if (replyingTo) {
            fetchThreadsList(replyingTo.email);
            setCommentBody(replyingTo.observacoes || '');
            setIsCommenting(false);
            // Marcar como lido se ainda não estiver
            if (!replyingTo.lido) {
                markAsRead(replyingTo.id);
            }
        } else {
            setAvailableThreads([]);
            setSelectedThreadId(null);
            setThreadMessages([]);
        }
    }, [replyingTo]);

    async function markAsRead(siteId: string) {
        try {
            await fetch('/api/inbox/update-site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId, lido: true })
            });
            // Atualizar lista local
            setResponses(prev => prev.map(r => r.id === siteId ? { ...r, lido: true } : r));
        } catch (error) {
            console.error('Erro ao marcar como lido:', error);
        }
    }

    async function moveToTrash(siteId: string) {
        try {
            await fetch('/api/inbox/update-site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId, classificacao_lead: 'descartado' })
            });
            // Atualizar lista local
            setResponses(prev => prev.map(r => r.id === siteId ? { ...r, classificacao_lead: 'descartado' } : r));
            if (replyingTo?.id === siteId) {
                setReplyingTo({ ...replyingTo, classificacao_lead: 'descartado' });
            }
        } catch (error) {
            console.error('Erro ao mover para lixeira:', error);
        }
    }

    async function updateClassification(siteId: string, classification: string | null) {
        try {
            await fetch('/api/inbox/update-site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId, classificacao_lead: classification })
            });
            // Atualizar lista local e estado atual
            setResponses(prev => prev.map(r => r.id === siteId ? { ...r, classificacao_lead: classification } : r));
            if (replyingTo?.id === siteId) {
                setReplyingTo({ ...replyingTo, classificacao_lead: classification });
            }
        } catch (error) {
            console.error('Erro ao atualizar classificação:', error);
        }
    }

    async function handleSaveComment() {
        if (!replyingTo) return;
        try {
            setIsSavingComment(true);
            const res = await fetch('/api/inbox/update-site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    siteId: replyingTo.id, 
                    observacoes: commentBody 
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Comentário salvo!');
                // Atualizar estados locais
                setResponses(prev => prev.map(r => r.id === replyingTo.id ? { ...r, observacoes: commentBody } : r));
                setReplyingTo({ ...replyingTo, observacoes: commentBody });
                setIsCommenting(false);
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error('Erro ao salvar comentário: ' + error.message);
        } finally {
            setIsSavingComment(false);
        }
    }

    useEffect(() => {
        if (selectedThreadId) {
            fetchThread(selectedThreadId);
        } else {
            setThreadMessages([]);
        }
    }, [selectedThreadId]);

    async function fetchThreadsList(email: string) {
        try {
            setLoadingThreads(true);
            const res = await fetch(`/api/inbox/threads?email=${email}`);
            const data = await res.json();
            if (data.threads) {
                setAvailableThreads(data.threads);
                // Se só tiver uma, seleciona automático
                if (data.threads.length === 1) {
                    setSelectedThreadId(data.threads[0].id);
                }
                setIsReplying(false); // Garante que começa fechado ao carregar nova lista
            }
        } catch (error) {
            console.error('Erro ao buscar lista de threads:', error);
        } finally {
            setLoadingThreads(false);
        }
    }

    async function fetchThread(threadId: string) {
        try {
            setLoadingThread(true);
            const res = await fetch(`/api/inbox/thread?threadId=${threadId}`);
            const data = await res.json();
            if (data.messages) {
                setThreadMessages(data.messages);
                setThreadSubject(data.subject || '');
                setIsReplying(false); // Garante que começa fechado ao abrir a thread
            }
        } catch (error) {
            console.error('Erro ao buscar thread:', error);
        } finally {
            setLoadingThread(false);
        }
    }

    // Auto-refresh a cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            // Apenas atualiza se não estiver com um modal aberto digitando resposta
            if (!replyingTo) {
                fetchResponses(false); // fetch sem loading state pesado
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [mainTab, readFilter, replyingTo]);

    async function fetchResponses(showLoading = true) {
        try {
            if (showLoading) setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sites')
                .select(`
                    *,
                    campanha:campanhas(nome_campanha)
                `)
                .eq('user_id', user.id)
                .in('status_contato', ['respondeu', 'invalid'])
                .order('ultimo_contato', { ascending: false });

            if (error) throw error;
            setResponses(data || []);
        } catch (error) {
            console.error('Erro ao buscar respostas:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    }

    async function handleSync() {
        try {
            setIsRefreshing(true);
            const response = await fetch(`/api/automation/replies`);
            const data = await response.json();
            if (data.success) {
                toast.success('Caixa de entrada atualizada!');
                await fetchResponses(); // Usa o loading normal para re-renderizar forte
            } else {
                toast.error('Erro ao sincronizar', { description: data.error });
            }
        } catch (error) {
            toast.error('Erro de conexão ao sincronizar');
        } finally {
            setIsRefreshing(false);
        }
    }

    async function handleSendReply(e: React.FormEvent) {
        e.preventDefault();
        if (!replyingTo || !replyBody.trim()) return;

        try {
            setIsSending(true);

            // Obter Message-ID da última mensagem para threading correto
            const lastMessage = threadMessages[threadMessages.length - 1];

            const res = await fetch('/api/inbox/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId: replyingTo.id,
                    body: replyBody,
                    lastMessageId: lastMessage?.messageId,
                    references: lastMessage?.messageId,
                    subject: threadSubject,
                    threadId: selectedThreadId // Envia a thread específica
                })
            });

            const data = await res.json();
            if (data.success) {
                // Atualização Otimista: Adicionar a mensagem ao chat imediatamente
                const newMessage = {
                    id: 'temp-' + Date.now(),
                    isMe: true,
                    body: replyBody,
                    date: new Date().toISOString(),
                    subject: threadSubject ? (threadSubject.toLowerCase().startsWith('re:') ? threadSubject : `Re: ${threadSubject}`) : '',
                    from: 'Você'
                };

                setThreadMessages(prev => [...prev, newMessage]);
                setReplyBody('');

                // Aguardar um pouco para o Gmail processar antes de recarregar a thread real
                setTimeout(() => {
                    if (selectedThreadId) fetchThread(selectedThreadId);
                }, 2000);
            } else {
                throw new Error(data.error || 'Falha ao enviar e-mail');
            }
        } catch (error: any) {
            alert('Erro ao enviar: ' + error.message);
        } finally {
            setIsSending(false);
        }
    }

    const filteredResponses = (responses || []).filter(r => {
        const url = r.url || '';
        const email = r.email || '';
        const matchesSearch = url.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Lógica de Lixeira: Itens com status 'invalid' ou classificação 'descartado'
        const isTrash = r.status_contato === 'invalid' || r.classificacao_lead === 'descartado';

        if (mainTab === 'lixeira') {
            if (!isTrash) return false;
        } else {
            // No Inbox principal, ocultamos o que é lixo
            if (isTrash) return false;
            
            const matchesRead = readFilter === 'todos' ? true : 
                              readFilter === 'lidos' ? r.lido === true : r.lido === false;
            
            const matchesClass = classFilter === 'todos' ? true : r.classificacao_lead === classFilter;
            
            if (!matchesRead || !matchesClass) return false;
        }

        return matchesSearch;
    });

    const classificationOptions = [
        { id: 'oportunidade', label: 'Chance de Parceria', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <Star className="w-4 h-4" /> },
        { id: 'aguardando', label: 'Aguardando Retorno', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: <Clock className="w-4 h-4" /> },
        { id: 'descartado', label: 'Não Serve', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: <X className="w-4 h-4" /> },
        { id: 'somente_pago', label: 'Somente Pago', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: <Mail className="w-4 h-4" /> },
        { id: 'parceria_fechada', label: 'Parceria Fechada', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: <CheckCircle className="w-4 h-4" /> },
    ];

    const isStale = (site: any) => {
        if (!site?.ultimo_contato) return false;
        
        // Regra: Somente alerta para 'oportunidade' (Chance de Parceria) e 'aguardando' (Aguardando Retorno)
        const allowedStatus = ['oportunidade', 'aguardando'];
        if (!allowedStatus.includes(site.classificacao_lead)) return false;

        const lastContact = new Date(site.ultimo_contato).getTime();
        const now = new Date().getTime();
        const diffDays = (now - lastContact) / (1000 * 60 * 60 * 24);
        return diffDays > 5;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Caixa de Entrada</h2>
                    <p className="text-muted-foreground mt-1">Sites que responderam à sua prospecção.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-600 hover:bg-slate-50 transition-all font-bold shadow-sm border border-slate-200"
                    >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        {isRefreshing ? 'Sincronizando...' : 'Sincronizar Mensagens'}
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {responses.length} Respostas
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start mb-6 border-b border-slate-100 pb-6">
                <div className="flex gap-8">
                    <button
                        onClick={() => setMainTab('inbox')}
                        className={`text-lg font-bold pb-2 transition-all relative ${mainTab === 'inbox' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Principais
                        {mainTab === 'inbox' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setMainTab('lixeira')}
                        className={`text-lg font-bold pb-2 transition-all relative ${mainTab === 'lixeira' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Lixeira
                        {mainTab === 'lixeira' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-full" />}
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center mb-2">
                {mainTab === 'inbox' && (
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto shrink-0">
                        <button
                            onClick={() => setReadFilter('nao_lidos')}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${readFilter === 'nao_lidos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Não Lidos
                        </button>
                        <button
                            onClick={() => setReadFilter('lidos')}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${readFilter === 'lidos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Lidos
                        </button>
                        <button
                            onClick={() => setReadFilter('todos')}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${readFilter === 'todos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Todos
                        </button>
                    </div>
                )}

                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Filtrar por domínio ou e-mail..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {mainTab === 'inbox' && (
                    <div className="w-full md:w-48 relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-900 appearance-none font-medium text-sm"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                        >
                            <option value="todos">Todas Categorias</option>
                            {classificationOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 animate-pulse font-medium">Buscando conversas...</p>
                </div>
            ) : filteredResponses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6 glass rounded-3xl border border-slate-200 bg-white/50">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                        <MessageSquare className="w-10 h-10 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Nenhuma resposta ainda</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            Assim que um site responder aos seus e-mails, ele aparecerá automaticamente aqui.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredResponses.map((site) => (
                        <div key={site.id}
                            onClick={() => setReplyingTo(site)}
                            className={`group p-6 rounded-3xl bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden cursor-pointer shadow-sm ${mainTab === 'lixeira' ? 'opacity-70 border-slate-100 grayscale-[0.3]' : (!site.lido ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-100 hover:border-indigo-300')}`}>
                            
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${mainTab === 'lixeira' ? 'bg-slate-300' : (!site.lido ? 'bg-indigo-600' : 'bg-emerald-500')}`} />
                            
                            {mainTab === 'inbox' && !site.lido && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600 animate-pulse bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                    Novo
                                </div>
                            )}

                            {site.status_contato === 'invalid' && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                                    E-mail Inválido
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                    <Globe className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold group-hover:text-indigo-600 transition-colors text-slate-900">{site.url}</h3>
                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 font-bold uppercase tracking-wider">
                                            {site.campanha?.nome_campanha || 'Campanha Direta'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 flex items-center gap-2 font-medium">
                                        <Mail className="w-3.5 h-3.5" />
                                        {site.email}
                                    </p>
                                    {site.classificacao_lead && (
                                        (() => {
                                            const opt = classificationOptions.find(o => o.id === site.classificacao_lead);
                                            if (!opt) return null;
                                            return (
                                                <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border w-fit ${opt.color}`}>
                                                    {opt.icon}
                                                    {opt.label}
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 md:gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                                        Último Contato
                                        {isStale(site) && (
                                            <AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" />
                                        )}
                                    </p>
                                    <div className={`flex items-center gap-1.5 text-sm font-semibold ${isStale(site) ? 'text-rose-600' : 'text-slate-700'}`}>
                                        <Clock className={`w-3.5 h-3.5 ${isStale(site) ? 'text-rose-400' : 'text-slate-400'}`} />
                                        {site.ultimo_contato ? new Date(site.ultimo_contato).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>

                                <div className="h-10 w-px bg-slate-100 hidden md:block" />

                                <div className="flex items-center gap-3">
                                    <button
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-100"
                                    >
                                        <Send className="w-4 h-4" />
                                        Ver Conversa
                                    </button>
                                    <a
                                        href={`https://mail.google.com/mail/u/0/#search/${site.email}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all font-bold text-sm"
                                        title="Abrir no Gmail"
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal renderizado via Portal para escapar do transform CSS do container */}
            {mounted && replyingTo && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto', backgroundColor: 'rgba(2,6,23,0.65)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
                        <div style={{ width: '100%', maxWidth: 800, backgroundColor: '#fff', borderRadius: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 80px)' }}>

                            {/* Header do Modal - Light */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    {selectedThreadId && availableThreads.length > 1 && (
                                        <button
                                            onClick={() => setSelectedThreadId(null)}
                                            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100 mr-2"
                                            title="Voltar para lista de conversas"
                                        >
                                            <RefreshCw className="w-5 h-5 rotate-180" />
                                        </button>
                                    )}
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm">
                                        <Globe className="w-7 h-7 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">{replyingTo.url}</h3>
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-medium text-slate-500">{replyingTo.email}</p>
                                            <div className="h-4 w-px bg-slate-200" />
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                                <select
                                                    className="text-sm font-bold text-slate-600 bg-transparent border-none p-0 outline-none cursor-pointer focus:text-indigo-600 hover:text-indigo-600 transition-colors"
                                                    value={replyingTo.classificacao_lead || ''}
                                                    onChange={(e) => updateClassification(replyingTo.id, e.target.value || null)}
                                                >
                                                    <option value="">Sem Classificação</option>
                                                    {classificationOptions.map(opt => (
                                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {mainTab === 'inbox' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveToTrash(replyingTo.id);
                                                setReplyingTo(null); // Fecha o modal
                                            }}
                                            className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-rose-500 border border-transparent hover:border-slate-100 mr-2"
                                            title="Mover para Lixeira"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsCommenting(!isCommenting)}
                                        className={cn(
                                            "p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-slate-100 mr-2",
                                            replyingTo.observacoes ? "text-emerald-500" : "text-slate-400 hover:text-indigo-600"
                                        )}
                                        title="Adicionar Comentário/Observação"
                                    >
                                        <StickyNote className="w-5 h-5" />
                                    </button>
                                    {selectedThreadId && (
                                        <a
                                            href={`https://mail.google.com/mail/u/0/#thread/${selectedThreadId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-100"
                                            title="Ver thread no Gmail"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-red-500 border border-transparent hover:border-slate-100"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Área de Comentário Expansível */}
                            {isCommenting && (
                                <div className="px-8 py-6 bg-amber-50/50 border-b border-amber-100/50 animate-in slide-in-from-top-4 duration-300 shrink-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <StickyNote className="w-3 h-3" /> Observações Internas
                                        </h4>
                                        <span className="text-[10px] text-amber-500 font-bold italic">Apenas você vê isso</span>
                                    </div>
                                    <textarea
                                        autoFocus
                                        className="w-full p-4 rounded-2xl bg-white border border-amber-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-sm text-slate-700 placeholder:text-slate-300 min-h-[100px] shadow-sm font-medium"
                                        placeholder="Escreva aqui detalhes importantes sobre este lead..."
                                        value={commentBody}
                                        onChange={(e) => setCommentBody(e.target.value)}
                                    />
                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={handleSaveComment}
                                            disabled={isSavingComment}
                                            className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isSavingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                            Salvar Observação
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Conteúdo: Lista de Threads ou Chat */}
                            {!selectedThreadId ? (
                                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 min-h-0 space-y-4">
                                    <div className="mb-6">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Conversas Encontradas</h4>
                                        <p className="text-xs text-slate-500 mt-1">Este site possui múltiplas threads de e-mail separadas. Selecione uma para visualizar e responder.</p>
                                    </div>
                                    {loadingThreads ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Buscando pastas...</p>
                                        </div>
                                    ) : availableThreads.map(thread => (
                                        <button
                                            key={thread.id}
                                            onClick={() => setSelectedThreadId(thread.id)}
                                            className="w-full text-left p-6 rounded-3xl bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden flex items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-extrabold text-slate-900 line-clamp-1">{thread.subject}</span>
                                                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                        {thread.snippet?.substring(0, 10)}...
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-1 font-medium">{thread.snippet}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Último e-mail</p>
                                                <p className="text-xs font-bold text-slate-700">{new Date(thread.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="w-1.5 h-full bg-indigo-500 absolute left-0 top-0 opacity-0 group-hover:opacity-100 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Corpo da Conversa (Chat) - Fundo Light */}
                                    <div className="flex-[2] overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/30 min-h-0">
                                        {loadingThread ? (
                                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                                <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Carregando histórico...</p>
                                            </div>
                                        ) : threadMessages.length === 0 ? (
                                            <div className="text-center py-20 text-slate-400 text-sm font-medium italic">
                                                Nenhuma mensagem encontrada nesta conversa.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-6">
                                                {threadMessages.map((msg, idx) => (
                                                    <div key={msg.id || idx} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                        <div className={`max-w-[90%] rounded-[1.5rem] p-4 md:p-5 shadow-sm ${msg.isMe
                                                            ? 'bg-indigo-600 !text-white border-indigo-700 rounded-tr-none shadow-indigo-200'
                                                            : 'bg-white text-slate-800 border-slate-200 border rounded-tl-none shadow-slate-100'
                                                            }`}>
                                                            {msg.subject && (
                                                                <h4 className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-2 pb-2 border-b ${msg.isMe ? 'border-white/20 text-indigo-100' : 'border-slate-100 text-slate-400'}`}>
                                                                    {msg.subject}
                                                                </h4>
                                                            )}
                                                            <div
                                                                className={`text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none ${msg.isMe ? 'prose-invert !text-white font-medium' : 'prose-slate text-slate-800'}`}
                                                                dangerouslySetInnerHTML={{ __html: msg.body }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] md:text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider px-2">
                                                            {msg.isMe ? 'VOCÊ • ' : (msg.from?.split('<')[0] || 'REMETENTE') + ' • '}
                                                            {new Date(msg.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Área de Resposta Dinâmica */}
                                    <div className={cn(
                                        "border-t border-slate-100 bg-white shrink-0 transition-all duration-300",
                                        isReplying ? "p-4 md:p-6" : "p-3 md:p-4"
                                    )}>
                                        {!isReplying ? (
                                            <div 
                                                onClick={() => setIsReplying(true)}
                                                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all text-slate-400 group"
                                            >
                                                <Send className="w-5 h-5 group-hover:text-indigo-600 transition-colors" />
                                                <span className="font-bold uppercase text-[11px] tracking-widest">Escrever uma resposta...</span>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSendReply} className="space-y-4 animate-in zoom-in-95 duration-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Sua Resposta</h4>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIsReplying(false)}
                                                        className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" /> Fechar
                                                    </button>
                                                </div>
                                                <div className="relative group">
                                                    <textarea
                                                        autoFocus
                                                        required
                                                        rows={4}
                                                        placeholder="Digite sua resposta de forma profissional..."
                                                        className="w-full px-6 py-5 rounded-[1.8rem] bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none pr-16 text-slate-900 placeholder:text-slate-400 font-medium"
                                                        value={replyBody}
                                                        onChange={e => setReplyBody(e.target.value)}
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isSending || !replyBody.trim()}
                                                        className="absolute right-4 bottom-4 w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 disabled:shadow-none"
                                                    >
                                                        {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1 uppercase tracking-widest">
                                                    <p className="flex items-center gap-1.5 line-clamp-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Vinculada à thread
                                                    </p>
                                                    <p className="text-indigo-400 whitespace-nowrap">
                                                        Premium Mode
                                                    </p>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
