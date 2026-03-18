'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Search,
    Upload,
    ExternalLink,
    Loader2,
    X,
    Trash2,
    Globe,
    CheckSquare,
    Square,
    Edit2,
    Check,
    Zap,
    ChevronLeft,
    ChevronRight,
    Mail,
    User,
    Link2,
    ChevronUp,
    ChevronDown,
    Filter
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ModalPortal } from '@/components/ui/ModalPortal';

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

export default function SitesPage() {
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [newSite, setNewSite] = useState({
        url: '',
        email: '',
        nome_1: '',
        email_2: '',
        nome_2: '',
        email_3: '',
        nome_3: '',
        da: '',
        pa: '',
        spam: '',
        facebook: '',
        instagram: '',
        linkedin: '',
        categoria: '',
        campanha_id: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [campanhas, setCampanhas] = useState<any[]>([]);

    // Paginação
    const PAGE_SIZE = 20;
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Seleção e edição
    const [selectedSites, setSelectedSites] = useState<string[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkCampanhaId, setBulkCampanhaId] = useState('');
    const [editingSite, setEditingSite] = useState<any | null>(null);

    // Drawer de detalhes
    const [drawerSite, setDrawerSite] = useState<any | null>(null);

    // Ordenação e Filtro
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [statusFilter, setStatusFilter] = useState<string>('todos');

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        fetchSites(0);
        fetchCampanhas();
    }, [sortField, sortOrder, statusFilter]);

    async function fetchCampanhas() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('campanhas').select('id, nome_campanha').eq('user_id', user.id).eq('ativa', true);
        setCampanhas(data || []);
    }

    async function fetchSites(page: number, search: string = searchTerm) {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            // 1. Buscar Contador de forma isolada
            let countQuery = supabase.from('sites').select('*', { count: 'exact', head: true });

            // Filtro de dono
            countQuery = countQuery.or(`user_id.eq.${user.id},user_id.is.null`);

            // Filtro de busca
            if (search.trim()) {
                countQuery = countQuery.or(`url.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
            }

            // Filtro de status
            if (statusFilter !== 'todos') {
                countQuery = countQuery.eq('status_contato', statusFilter);
            } else {
                // Por padrão, esconde inválidos/bounces
                countQuery = countQuery.neq('status_contato', 'invalid');
            }

            const { count: total, error: countErr } = await countQuery;
            if (countErr) throw countErr;

            // 2. Buscar Dados da Página com Join e Ordenação Determinística
            let dataQuery = supabase.from('sites').select(`*, campanha:campanhas(nome_campanha)`);

            // Aplicar os mesmos filtros
            dataQuery = dataQuery.or(`user_id.eq.${user.id},user_id.is.null`);
            if (search.trim()) {
                dataQuery = dataQuery.or(`url.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
            }
            if (statusFilter !== 'todos') {
                dataQuery = dataQuery.eq('status_contato', statusFilter);
            } else {
                // Por padrão, esconde inválidos/bounces
                dataQuery = dataQuery.neq('status_contato', 'invalid');
            }

            // Ordenação Determinística
            dataQuery = dataQuery.order(sortField, { ascending: sortOrder === 'asc' });
            if (sortField !== 'id') {
                dataQuery = dataQuery.order('id', { ascending: true });
            }

            const { data, error: dataErr } = await dataQuery.range(from, to);
            if (dataErr) throw dataErr;

            setSites(data || []);
            setTotalCount(total || 0);
            setCurrentPage(page);
        } catch (error) {
            console.error('Erro detalhado ao buscar sites:', error);
            setSites([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }

    function handleSort(field: string) {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
        setCurrentPage(0);
    }

    async function handleAddSite(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let cleanUrl = newSite.url.replace(/https?:\/\//, '').replace(/\/$/, '').split('/')[0];

            const { error } = await supabase
                .from('sites')
                .insert([{
                    url: cleanUrl,
                    email: newSite.email,
                    nome_1: newSite.nome_1,
                    email_2: newSite.email_2,
                    nome_2: newSite.nome_2,
                    email_3: newSite.email_3,
                    nome_3: newSite.nome_3,
                    da: newSite.da ? parseInt(newSite.da) : null,
                    pa: newSite.pa ? parseInt(newSite.pa) : null,
                    spam: newSite.spam ? parseInt(newSite.spam) : null,
                    facebook: newSite.facebook,
                    instagram: newSite.instagram,
                    linkedin: newSite.linkedin,
                    categoria: newSite.categoria,
                    campanha_id: newSite.campanha_id || null,
                    user_id: user.id,
                    status_contato: 'lead'
                }]);

            if (error) throw error;

            setNewSite({
                url: '',
                email: '',
                nome_1: '',
                email_2: '',
                nome_2: '',
                email_3: '',
                nome_3: '',
                da: '',
                pa: '',
                spam: '',
                facebook: '',
                instagram: '',
                linkedin: '',
                categoria: '',
                campanha_id: ''
            });
            setIsModalOpen(false);
            fetchSites(currentPage);
        } catch (error: any) {
            console.error('Erro ao salvar site:', error);
            alert(`Erro ao salvar site: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteSite(id: string) {
        if (!confirm('Tem certeza que deseja excluir este site?')) return;
        try {
            setIsDeleting(id);
            const { error } = await supabase.from('sites').delete().eq('id', id);
            if (error) throw error;
            setSelectedSites(selectedSites.filter(sid => sid !== id));
            fetchSites(currentPage);
        } catch (error) {
            console.error('Erro ao excluir site:', error);
        } finally {
            setIsDeleting(null);
        }
    }

    async function handleEditSite(e: React.FormEvent) {
        e.preventDefault();
        if (!editingSite) return;
        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('sites')
                .update({
                    url: editingSite.url,
                    email: editingSite.email,
                    nome_1: editingSite.nome_1,
                    email_2: editingSite.email_2,
                    nome_2: editingSite.nome_2,
                    email_3: editingSite.email_3,
                    nome_3: editingSite.nome_3,
                    da: editingSite.da ? parseInt(String(editingSite.da)) : null,
                    pa: editingSite.pa ? parseInt(String(editingSite.pa)) : null,
                    spam: editingSite.spam ? parseInt(String(editingSite.spam)) : null,
                    facebook: editingSite.facebook,
                    instagram: editingSite.instagram,
                    linkedin: editingSite.linkedin,
                    categoria: editingSite.categoria,
                    campanha_id: editingSite.campanha_id || null,
                    status_contato: editingSite.status_contato,
                    thread_id: editingSite.status_contato === 'lead' ? null : undefined,
                    ultimo_contato: editingSite.status_contato === 'lead' ? null : undefined,
                })
                .eq('id', editingSite.id);
            if (error) throw error;
            setEditingSite(null);
            fetchSites(currentPage);
        } catch (error: any) {
            alert('Erro ao atualizar site: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleBulkAssign() {
        if (selectedSites.length === 0) return;
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('sites')
                .update({
                    campanha_id: bulkCampanhaId || null,
                    user_id: user.id
                })
                .in('id', selectedSites);
            if (error) throw error;
            alert(`${selectedSites.length} sites atualizados com sucesso!`);
            setSelectedSites([]);
            setIsBulkModalOpen(false);
            fetchSites(currentPage);
        } catch (error: any) {
            alert('Erro na atualização em massa: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleMarkAsReplied(ids: string | string[]) {
        const targetIds = Array.isArray(ids) ? ids : [ids];
        if (targetIds.length === 0) return;
        
        const confirmMsg = targetIds.length === 1 
            ? 'Marcar este site como Respondido? Isso interromperá os follow-ups.' 
            : `Marcar ${targetIds.length} sites como Respondidos? Isso interromperá os follow-ups.`;

        if (!confirm(confirmMsg)) return;

        try {
            setIsSaving(true);
            const { error } = await supabase
                .from('sites')
                .update({ 
                    status_contato: 'respondeu',
                    ultimo_contato: new Date().toISOString()
                })
                .in('id', targetIds);

            if (error) throw error;
            
            if (targetIds.length > 1) setSelectedSites([]);
            fetchSites(currentPage);
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    const toggleSelectSite = (id: string) => {
        setSelectedSites(prev => {
            if (prev.includes(id)) {
                return prev.filter(sid => sid !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    const selectedCount = selectedSites.length;

    function handleSearch(value: string) {
        setSearchTerm(value);
        fetchSites(0, value);
    }

    const allOnPageSelected = sites.length > 0 && sites.every(site => selectedSites.includes(site.id));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Sites</h2>
                    <p className="text-muted-foreground mt-1">Importe e gerencie seus alvos de prospecção.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:opacity-90 transition-all font-medium shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Site
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por domínio ou e-mail..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                        className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(0);
                        }}
                    >
                        <option value="todos">Todos (Válidos)</option>
                        <option value="lead">Não contatado</option>
                        <option value="contatado">Contatado</option>
                        <option value="respondeu">Respondeu</option>
                        <option value="fechado">Fechado</option>
                        <option value="recusado">Recusado</option>
                        <option value="invalid">E-mails Inválidos</option>
                    </select>
                </div>

                {selectedCount > 0 && (
                    <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                        <span className="text-sm font-bold text-indigo-600 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                            {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
                        </span>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:opacity-90 transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
                        >
                            <Zap className="w-4 h-4" />
                            Atribuir Campanha
                        </button>
                        <button
                            onClick={() => handleMarkAsReplied(selectedSites)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:opacity-90 transition-all text-sm font-bold shadow-lg shadow-emerald-600/20"
                        >
                            <Check className="w-4 h-4" />
                            Marcar Respondido
                        </button>
                    </div>
                )}

                <span className="text-sm font-semibold text-indigo-600 bg-indigo-600/10 px-3 py-1.5 rounded-lg border border-indigo-600/20 whitespace-nowrap">
                    {totalCount} sites
                </span>
            </div>

            <div className="rounded-2xl glass border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-muted-foreground animate-pulse">Carregando seus sites...</p>
                        </div>
                    ) : sites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Nenhum site encontrado</h3>
                                <p className="text-muted-foreground">Você ainda não cadastrou nenhum site ou nenhum corresponde à sua busca.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold hover:underline">
                                Comece adicionando seu primeiro site ou ajuste a busca
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="px-4 py-4 w-10 text-center">
                                        <button
                                            onClick={() => {
                                                const pageIds = sites.map(s => s.id);
                                                if (allOnPageSelected) {
                                                    setSelectedSites(prev => prev.filter(id => !pageIds.includes(id)));
                                                } else {
                                                    setSelectedSites(prev => {
                                                        const uniqueIds = new Set([...prev, ...pageIds]);
                                                        return Array.from(uniqueIds);
                                                    });
                                                }
                                            }}
                                            className="p-1 rounded text-muted-foreground hover:bg-accent"
                                        >
                                            {allOnPageSelected
                                                ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                : <Square className="w-4 h-4" />
                                            }
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('url')}>
                                        <div className="flex items-center gap-1">
                                            URL {sortField === 'url' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('da')}>DA</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('pa')}>PA</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('spam')}>Spam</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('status_contato')}>Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sites.map((site) => (
                                    <tr key={site.id} className={cn("hover:bg-accent/30 transition-colors group", selectedSites.includes(site.id) && "bg-primary/5")}>
                                        <td className="px-4 py-4 text-center">
                                            <button onClick={() => toggleSelectSite(site.id)} className="p-1 rounded text-muted-foreground hover:bg-accent font-medium">
                                                {selectedSites.includes(site.id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 cursor-pointer group/url" onClick={() => setDrawerSite(site)}>
                                                <span className="font-bold text-foreground group-hover/url:text-indigo-500 transition-colors">{site.url}</span>
                                                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); window.open(`http://${site.url}`, '_blank'); }} />
                                            </div>
                                            {site.campanha && <span className="text-[10px] bg-primary/5 text-indigo-600 px-1.5 py-0.5 rounded border border-primary/10 mt-0.5 inline-block font-medium">{site.campanha.nome_campanha}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${(site.da ?? 0) >= 40 ? 'bg-emerald-500/10 text-emerald-500' :
                                                (site.da ?? 0) >= 20 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                {site.da ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${(site.pa ?? 0) >= 40 ? 'bg-violet-500/10 text-violet-500' :
                                                (site.pa ?? 0) >= 20 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                {site.pa ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold ${(site.spam ?? 0) >= 30 ? 'bg-rose-500/10 text-rose-500' :
                                                (site.spam ?? 0) >= 10 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {site.spam != null ? `${site.spam}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{site.categoria || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${site.status_contato === 'respondeu' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    site.status_contato === 'contatado' ? 'bg-amber-500/10 text-amber-500' :
                                                        site.status_contato === 'fechado' ? 'bg-indigo-500/10 text-indigo-500' :
                                                            site.status_contato === 'recusado' ? 'bg-rose-500/10 text-rose-500' :
                                                                site.status_contato === 'invalid' ? 'bg-slate-500/10 text-slate-500 border border-slate-200' :
                                                                    site.status_contato === 'erro_envio' ? 'bg-rose-600/10 text-rose-600 border border-rose-200' :
                                                                        site.status_contato === 'somente_pago' ? 'bg-purple-600/10 text-purple-600 border border-purple-200' :
                                                                            'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {site.status_contato === 'lead' || !site.status_contato ? 'Não contatado' :
                                                        site.status_contato === 'invalid' ? 'E-mail Inválido' : 
                                                            site.status_contato === 'erro_envio' ? 'Erro no Envio' :
                                                                site.status_contato === 'somente_pago' ? 'Somente Pago' :
                                                                    site.status_contato}
                                                </span>
                                                {site.status_contato === 'contatado' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleMarkAsReplied(site.id); }}
                                                        className="p-1 hover:bg-emerald-500/20 text-emerald-500 rounded transition-colors"
                                                        title="Marcar como Respondido"
                                                    >
                                                        <CheckSquare className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                        <span className="text-sm text-muted-foreground">Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong> &mdash; {totalCount} sites no total</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => fetchSites(currentPage - 1)} disabled={currentPage === 0 || loading} className="px-3 py-2 rounded-lg border border-border flex items-center gap-1 hover:bg-accent disabled:opacity-40 transition-all font-medium"><ChevronLeft className="w-4 h-4" /> Anterior</button>
                            <button onClick={() => fetchSites(currentPage + 1)} disabled={currentPage >= totalPages - 1 || loading} className="px-3 py-2 rounded-lg border border-border flex items-center gap-1 hover:bg-accent disabled:opacity-40 transition-all font-medium">Próxima <ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Adição/Edição Unificado - Design Premium */}
            {(isModalOpen || editingSite) && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800/60 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                    {editingSite ? <Edit2 className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
                                    {editingSite ? 'Editar Site' : 'Adicionar Novo Site'}
                                </h3>
                                <button onClick={() => { setIsModalOpen(false); setEditingSite(null); }} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white"><X className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={editingSite ? handleEditSite : handleAddSite} className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
                                {/* Layout em Grid para campos */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-white ml-1">URL do Site</label>
                                            <input required type="text" className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" value={editingSite ? editingSite.url : newSite.url} onChange={e => editingSite ? setEditingSite({ ...editingSite, url: e.target.value }) : setNewSite({ ...newSite, url: e.target.value })} placeholder="exemplo.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-white ml-1">Categoria</label>
                                            <input type="text" className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" value={editingSite ? (editingSite.categoria || '') : newSite.categoria} onChange={e => editingSite ? setEditingSite({ ...editingSite, categoria: e.target.value }) : setNewSite({ ...newSite, categoria: e.target.value })} placeholder="ex: Tecnologia" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-white ml-1">Campanha</label>
                                            <select className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer" value={editingSite ? (editingSite.campanha_id || '') : newSite.campanha_id} onChange={e => editingSite ? setEditingSite({ ...editingSite, campanha_id: e.target.value }) : setNewSite({ ...newSite, campanha_id: e.target.value })}>
                                                <option value="">Nenhuma</option>
                                                {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome_campanha}</option>)}
                                            </select>
                                        </div>
                                        {editingSite && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-white ml-1">Status do Contato</label>
                                                <select className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer" value={editingSite.status_contato || 'lead'} onChange={e => setEditingSite({ ...editingSite, status_contato: e.target.value })}>
                                                    <option value="lead">Não contatado</option>
                                                    <option value="contatado">Contatado</option>
                                                    <option value="respondeu">Respondeu</option>
                                                    <option value="fechado">Fechado</option>
                                                    <option value="recusado">Recusado</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-700/30 space-y-4 shadow-inner">
                                            <h4 className="text-[10px] font-bold uppercase text-white tracking-[0.2em] ml-1">Métricas de Autoridade</h4>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-white uppercase ml-1">DA</label>
                                                    <input type="number" className="w-full px-2 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white text-center text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={editingSite ? (editingSite.da || '') : newSite.da} onChange={e => editingSite ? setEditingSite({ ...editingSite, da: e.target.value }) : setNewSite({ ...newSite, da: e.target.value })} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-white uppercase ml-1">PA</label>
                                                    <input type="number" className="w-full px-2 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white text-center text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={editingSite ? (editingSite.pa || '') : newSite.pa} onChange={e => editingSite ? setEditingSite({ ...editingSite, pa: e.target.value }) : setNewSite({ ...newSite, pa: e.target.value })} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-white uppercase ml-1">Spam %</label>
                                                    <input type="number" className="w-full px-2 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white text-center text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={editingSite ? (editingSite.spam || '') : newSite.spam} onChange={e => editingSite ? setEditingSite({ ...editingSite, spam: e.target.value }) : setNewSite({ ...newSite, spam: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-700/30 space-y-4 shadow-inner">
                                            <h4 className="text-[10px] font-bold uppercase text-white tracking-[0.2em] ml-1">Redes Sociais</h4>
                                            <div className="space-y-3">
                                                <div className="relative group">
                                                    <User className="absolute left-3 top-3.5 w-4 h-4 text-white group-focus-within:text-indigo-400 transition-colors" />
                                                    <input type="text" className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="URL do Perfil Instagram" value={editingSite ? (editingSite.instagram || '') : newSite.instagram} onChange={e => editingSite ? setEditingSite({ ...editingSite, instagram: e.target.value }) : setNewSite({ ...newSite, instagram: e.target.value })} />
                                                </div>
                                                <div className="relative group">
                                                    <Link2 className="absolute left-3 top-3.5 w-4 h-4 text-white group-focus-within:text-indigo-400 transition-colors" />
                                                    <input type="text" className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="URL do Perfil LinkedIn" value={editingSite ? (editingSite.linkedin || '') : newSite.linkedin} onChange={e => editingSite ? setEditingSite({ ...editingSite, linkedin: e.target.value }) : setNewSite({ ...newSite, linkedin: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Emails */}
                                <div className="space-y-4 pt-6 border-t border-slate-800/60">
                                    <h4 className="text-sm font-bold flex items-center gap-2 text-white ml-1">
                                        <Mail className="w-5 h-5 text-white" /> Lista de Contatos
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-3 p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                                            <label className="text-[10px] font-bold text-white uppercase tracking-widest ml-1">E-mail Principal</label>
                                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="Nome" value={editingSite ? (editingSite.nome_1 || '') : newSite.nome_1} onChange={e => editingSite ? setEditingSite({ ...editingSite, nome_1: e.target.value }) : setNewSite({ ...newSite, nome_1: e.target.value })} />
                                            <input type="email" className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="E-mail" value={editingSite ? (editingSite.email || '') : newSite.email} onChange={e => editingSite ? setEditingSite({ ...editingSite, email: e.target.value }) : setNewSite({ ...newSite, email: e.target.value })} />
                                        </div>
                                        <div className="space-y-3 p-5 rounded-3xl bg-slate-900/50 border border-slate-700/30">
                                            <label className="text-[10px] font-bold text-white uppercase tracking-widest ml-1">E-mail Alternativo 1</label>
                                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="Nome" value={editingSite ? (editingSite.nome_2 || '') : newSite.nome_2} onChange={e => editingSite ? setEditingSite({ ...editingSite, nome_2: e.target.value }) : setNewSite({ ...newSite, nome_2: e.target.value })} />
                                            <input type="email" className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="E-mail" value={editingSite ? (editingSite.email_2 || '') : newSite.email_2} onChange={e => editingSite ? setEditingSite({ ...editingSite, email_2: e.target.value }) : setNewSite({ ...newSite, email_2: e.target.value })} />
                                        </div>
                                        <div className="space-y-3 p-5 rounded-3xl bg-slate-900/50 border border-slate-700/30">
                                            <label className="text-[10px] font-bold text-white uppercase tracking-widest ml-1">E-mail Alternativo 2</label>
                                            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="Nome" value={editingSite ? (editingSite.nome_3 || '') : newSite.nome_3} onChange={e => editingSite ? setEditingSite({ ...editingSite, nome_3: e.target.value }) : setNewSite({ ...newSite, nome_3: e.target.value })} />
                                            <input type="email" className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" placeholder="E-mail" value={editingSite ? (editingSite.email_3 || '') : newSite.email_3} onChange={e => editingSite ? setEditingSite({ ...editingSite, email_3: e.target.value }) : setNewSite({ ...newSite, email_3: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 mt-auto px-1">
                                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingSite(null); }} className="flex-1 px-4 py-3 rounded-2xl border border-slate-700/50 text-white font-bold hover:bg-slate-800 transition-all">Cancelar</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingSite ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {editingSite ? 'Salvar Alterações' : 'Salvar Site'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal de Atribuição em Massa - Premium */}
            {isBulkModalOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="w-full max-w-md bg-[#0f172a] border border-slate-800/60 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] p-8 space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <Zap className="w-5 h-5 text-white" /> Atribuir Campanha
                                </h3>
                                <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-sm font-semibold text-white text-center">
                                Você selecionou <strong className="text-white text-lg mx-1">{selectedCount}</strong> sites.
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-white ml-1">Selecione a Campanha</label>
                                <select className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer" value={bulkCampanhaId} onChange={e => setBulkCampanhaId(e.target.value)}>
                                    <option value="">Nenhuma (Remover vínculo)</option>
                                    {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome_campanha}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 px-4 py-3 rounded-2xl border border-slate-700/50 text-white font-bold hover:bg-slate-800 transition-all">Cancelar</button>
                                <button onClick={handleBulkAssign} disabled={isSaving} className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Drawer de Detalhes - Rich Premium UI */}
            {drawerSite && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setDrawerSite(null)}>
                        <div className="relative w-full max-w-4xl bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-[#f8fafc]" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-8 py-6 shrink-0 border-b border-[#1e293b]">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <Globe className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-2xl truncate text-white">{drawerSite.url}</h3>
                                        <a href={`http://${drawerSite.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-bold">
                                            <ExternalLink className="w-4 h-4" /> Abrir site oficial
                                        </a>
                                    </div>
                                </div>
                                <button onClick={() => setDrawerSite(null)} className="p-2.5 rounded-full hover:bg-slate-800 transition-colors text-white"><X className="w-6 h-6" /></button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Authority Metrics */}
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-4 ml-1">Métricas de Autoridade</p>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className={`border rounded-2xl p-4 text-center transition-all ${(drawerSite.da ?? 0) >= 40 ? 'bg-emerald-950/30 border-emerald-500/30' : (drawerSite.da ?? 0) >= 20 ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-slate-900/50 border-slate-700'}`}>
                                                    <p className={`text-3xl font-black ${(drawerSite.da ?? 0) >= 40 ? 'text-emerald-400' : (drawerSite.da ?? 0) >= 20 ? 'text-indigo-400' : 'text-white'}`}>{drawerSite.da ?? '—'}</p>
                                                    <p className="text-[10px] mt-1 font-bold text-white uppercase tracking-wider">Domain Auth</p>
                                                </div>
                                                <div className={`border rounded-2xl p-4 text-center transition-all ${(drawerSite.pa ?? 0) >= 40 ? 'bg-violet-950/30 border-violet-500/30' : (drawerSite.pa ?? 0) >= 20 ? 'bg-indigo-950/30 border-indigo-500/30' : 'bg-slate-900/50 border-slate-700'}`}>
                                                    <p className={`text-3xl font-black ${(drawerSite.pa ?? 0) >= 40 ? 'text-violet-400' : (drawerSite.pa ?? 0) >= 20 ? 'text-indigo-400' : 'text-white'}`}>{drawerSite.pa ?? '—'}</p>
                                                    <p className="text-[10px] mt-1 font-bold text-white uppercase tracking-wider">Page Auth</p>
                                                </div>
                                                <div className={`border rounded-2xl p-4 text-center transition-all ${(drawerSite.spam ?? 0) >= 30 ? 'bg-rose-950/30 border-rose-500/30' : (drawerSite.spam ?? 0) >= 10 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-emerald-950/30 border-emerald-500/30'}`}>
                                                    <p className={`text-3xl font-black ${(drawerSite.spam ?? 0) >= 30 ? 'text-rose-400' : (drawerSite.spam ?? 0) >= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {drawerSite.spam != null ? `${drawerSite.spam}%` : '—'}
                                                    </p>
                                                    <p className="text-[10px] mt-1 font-bold text-white uppercase tracking-wider">Spam Score</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-2 ml-1">Status Atual</p>
                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${drawerSite.status_contato === 'respondeu' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : drawerSite.status_contato === 'contatado' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                                                    {drawerSite.status_contato === 'lead' || !drawerSite.status_contato ? 'Não contatado' : drawerSite.status_contato}
                                                </span>
                                            </div>
                                            <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-5">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1 ml-1">Categoria</p>
                                                <p className="text-lg font-bold text-white">{drawerSite.categoria || 'Não definida'}</p>
                                            </div>
                                        </div>
                                        {drawerSite.campanha && (
                                            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                    <Zap className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60 mb-0.5">Campanha</p>
                                                    <p className="text-lg font-black text-indigo-200">{drawerSite.campanha.nome_campanha}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contact List & Presence */}
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-4 ml-1">Lista de Contatos</p>
                                            <div className="space-y-3">
                                                {[
                                                    { email: drawerSite.email, nome: drawerSite.nome_1, label: 'Principal' },
                                                    { email: drawerSite.email_2, nome: drawerSite.nome_2, label: 'Alt 1' },
                                                    { email: drawerSite.email_3, nome: drawerSite.nome_3, label: 'Alt 2' },
                                                ].filter(c => c.email).map((contato, idx) => (
                                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-[#1e293b] border border-[#334155] hover:border-indigo-500/50 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                                            <User className="w-5 h-5 text-indigo-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-white truncate">{contato.nome || 'Sem nome'}</p>
                                                                <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-slate-700/50 rounded text-white">{contato.label}</span>
                                                            </div>
                                                            <a href={`mailto:${contato.email}`} className="flex items-center gap-1.5 text-sm text-indigo-400 hover:underline truncate font-medium">
                                                                <Mail className="w-3.5 h-3.5" /> {contato.email}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                                {!drawerSite.email && (
                                                    <div className="p-10 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 text-center">
                                                        <Mail className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                                        <p className="text-white/60 font-bold">Nenhum e-mail registrado</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-4 ml-1">Presença Digital</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { label: 'Instagram', value: drawerSite.instagram, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                                                    { label: 'LinkedIn', value: drawerSite.linkedin, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
                                                    { label: 'Facebook', value: drawerSite.facebook, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
                                                ].filter(r => r.value).map((rede) => (
                                                    <a key={rede.label} href={rede.value.startsWith('http') ? rede.value : `https://${rede.value}`} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02] ${rede.bg} ${rede.border} border`}>
                                                        <Link2 className={`w-5 h-5 shrink-0 ${rede.color}`} />
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${rede.color}`}>{rede.label}</span>
                                                    </a>
                                                ))}
                                                {(!drawerSite.instagram && !drawerSite.linkedin && !drawerSite.facebook) && (
                                                    <div className="col-span-2 p-4 rounded-2xl bg-slate-900/50 border border-dashed border-slate-700 text-center text-[10px] font-bold text-slate-600 uppercase">
                                                        Nenhuma rede social vinculada
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-8 flex gap-4 shrink-0 border-t border-[#1e293b] bg-[#0f172a]">
                                <button onClick={() => { setEditingSite(drawerSite); setDrawerSite(null); }} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-[#1e293b] hover:bg-[#334155] text-white border border-[#334155]">
                                    <Edit2 className="w-5 h-5" /> Editar Informações
                                </button>
                                {drawerSite.status_contato === 'contatado' && (
                                    <button onClick={() => { handleMarkAsReplied(drawerSite.id); setDrawerSite(null); }} className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50">
                                        <Check className="w-5 h-5" /> Marcar Respondido
                                    </button>
                                )}
                                <button onClick={() => { handleDeleteSite(drawerSite.id); setDrawerSite(null); }} className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50">
                                    <Trash2 className="w-5 h-5" /> Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

