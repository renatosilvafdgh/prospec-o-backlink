'use client';

import { useState, useEffect } from 'react';
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
    RefreshCw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function InboxPage() {
    const [responses, setResponses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
    const supabase = createClient();

    useEffect(() => {
        fetchResponses();
    }, []);

    useEffect(() => {
        if (replyingTo) {
            fetchThreadsList(replyingTo.email);
        } else {
            setAvailableThreads([]);
            setSelectedThreadId(null);
            setThreadMessages([]);
        }
    }, [replyingTo]);

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
            }
        } catch (error) {
            console.error('Erro ao buscar thread:', error);
        } finally {
            setLoadingThread(false);
        }
    }

    async function fetchResponses() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('sites')
                .select(`
                    *,
                    campanha:campanhas(nome_campanha)
                `)
                .eq('user_id', user.id)
                .eq('status_contato', 'respondeu')
                .order('ultimo_contato', { ascending: false });

            if (error) throw error;
            setResponses(data || []);
        } catch (error) {
            console.error('Erro ao buscar respostas:', error);
        } finally {
            setLoading(false);
        }
    }

    async function syncReplies() {
        try {
            setIsSyncing(true);
            const res = await fetch('/api/automation/replies');
            const data = await res.json();

            if (data.success) {
                const totalEmails = data.details.reduce((acc: number, d: any) => acc + d.messagesChecked, 0);
                const emailsSeen = data.details.flatMap((d: any) => d.emailsSeen).join('\n');
                const matches = data.details.reduce((acc: number, d: any) => acc + d.matchesFound, 0);

                alert(
                    `📊 Sincronização Concluída:\n\n` +
                    `✅ Mensagens no Gmail: ${totalEmails}\n` +
                    `🔗 Novas Respostas: ${matches}\n\n` +
                    `👀 Vistos recentemente:\n${emailsSeen || 'Nenhum'}`
                );
                fetchResponses();
            } else {
                alert('Erro ao sincronizar respostas.');
            }
        } catch (e) {
            console.error(e);
            alert('Falha na sincronização.');
        } finally {
            setIsSyncing(false);
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

    const filteredResponses = responses.filter(r =>
        r.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Caixa de Entrada</h2>
                    <p className="text-muted-foreground mt-1">Sites que responderam à sua prospecção.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={syncReplies}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-bold text-sm border border-indigo-100"
                    >
                        {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sincronizar Mensagens
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {responses.length} Respostas
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Filtrar por domínio ou e-mail..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                            className="group p-6 rounded-3xl bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden cursor-pointer shadow-sm">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />

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
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 md:gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Último Contato</p>
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
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

            {/* Modal de Conversa e Resposta - Versão Light Premium */}
            {replyingTo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-3xl bg-white border-none rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

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
                                    <p className="text-sm font-medium text-slate-500">{replyingTo.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
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
                                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 min-h-0">
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
                                        threadMessages.map((msg, idx) => (
                                            <div key={msg.id || idx} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                <div className={`max-w-[85%] rounded-[1.5rem] p-5 shadow-md ${msg.isMe
                                                    ? 'bg-indigo-600 !text-white border-indigo-700 rounded-tr-none shadow-indigo-200'
                                                    : 'bg-white text-slate-800 border-slate-200 border rounded-tl-none shadow-slate-100'
                                                    }`}>
                                                    {msg.subject && (
                                                        <h4 className={`text-[11px] font-black uppercase tracking-widest mb-2 pb-2 border-b ${msg.isMe ? 'border-white/20 text-indigo-100' : 'border-slate-100 text-slate-400'}`}>
                                                            {msg.subject}
                                                        </h4>
                                                    )}
                                                    <div
                                                        className={`text-[15px] leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none ${msg.isMe ? 'prose-invert !text-white' : 'prose-slate text-slate-800'}`}
                                                        dangerouslySetInnerHTML={{ __html: msg.body }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider px-2">
                                                    {msg.isMe ? 'VOCÊ • ' : (msg.from?.split('<')[0] || 'REMETENTE') + ' • '}
                                                    {new Date(msg.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Área de Resposta - Limpa e Branca com Contraste */}
                                <div className="p-8 border-t border-slate-100 bg-white shrink-0">
                                    <form onSubmit={handleSendReply} className="space-y-4">
                                        <div className="relative group">
                                            <textarea
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
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1 uppercase tracking-widest">
                                            <p className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Resposta vinculada à thread selecionada
                                            </p>
                                            <p className="text-indigo-400">
                                                Backlinks Prospector Premium
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
