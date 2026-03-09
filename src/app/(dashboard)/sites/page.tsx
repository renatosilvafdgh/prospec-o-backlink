'use client';

import { useState, useEffect } from 'react';
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
    Link2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SitesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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

    const supabase = createClient();

    useEffect(() => {
        fetchSites(0);
        fetchCampanhas();
    }, []);

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

            let query = supabase
                .from('sites')
                .select(`*, campanha:campanhas(nome_campanha)`, { count: 'exact' })
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (search.trim()) {
                query = query.or(`url.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
            }

            const { data, error, count } = await query;

            if (error) throw error;
            setSites(data || []);
            setTotalCount(count || 0);
            setCurrentPage(page);
        } catch (error) {
            console.error('Erro ao buscar sites:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSite(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Limpar a URL para pegar apenas o domínio se possível
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
            console.error('Erro ao salvar site (Objeto completo):', error);
            const errorMessage = error.message || 'Erro desconhecido';
            const errorDetails = error.details || '';
            alert(`Erro ao salvar site: ${errorMessage} ${errorDetails}`);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteSite(id: string) {
        if (!confirm('Tem certeza que deseja excluir este site?')) return;

        try {
            setIsDeleting(id);
            const { error } = await supabase
                .from('sites')
                .delete()
                .eq('id', id);

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
                    // Se voltar para lead, limpamos a thread anterior para começar do zero
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
            const { error } = await supabase
                .from('sites')
                .update({ campanha_id: bulkCampanhaId || null })
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



    const toggleSelectSite = (id: string) => {
        if (selectedSites.includes(id)) {
            setSelectedSites(selectedSites.filter(sid => sid !== id));
        } else {
            setSelectedSites([...selectedSites, id]);
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    function handleSearch(value: string) {
        setSearchTerm(value);
        fetchSites(0, value);
    }

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Sites</h2>
                        <p className="text-muted-foreground mt-1">Importe e gerencie seus alvos de prospecção.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-all font-medium">
                            <Upload className="w-4 h-4" />
                            Importar CSV
                        </button>
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

                    {selectedSites.length > 0 && (
                        <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                            <span className="text-sm font-medium text-indigo-600 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                                {selectedSites.length} selecionados
                            </span>
                            <button
                                onClick={() => setIsBulkModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:opacity-90 transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
                            >
                                <Zap className="w-4 h-4" />
                                Atribuir Campanha
                            </button>
                        </div>
                    )}

                    <span className="text-sm text-muted-foreground whitespace-nowrap">
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
                                                    if (selectedSites.length === sites.length && sites.length > 0) {
                                                        setSelectedSites([]);
                                                    } else {
                                                        setSelectedSites(sites.map(s => s.id));
                                                    }
                                                }}
                                                className="p-1 rounded text-muted-foreground hover:bg-accent"
                                            >
                                                {selectedSites.length === sites.length && sites.length > 0
                                                    ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                    : <Square className="w-4 h-4" />
                                                }
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">DA</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">PA</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Spam</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {sites.map((site) => (
                                        <tr key={site.id} className={cn(
                                            "hover:bg-accent/30 transition-colors group",
                                            selectedSites.includes(site.id) && "bg-primary/5"
                                        )}>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => toggleSelectSite(site.id)}
                                                    className="p-1 rounded text-muted-foreground hover:bg-accent"
                                                >
                                                    {selectedSites.includes(site.id)
                                                        ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                        : <Square className="w-4 h-4" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer group/url"
                                                    onClick={() => setDrawerSite(site)}
                                                >
                                                    <span className="font-medium text-foreground group-hover/url:text-indigo-500 transition-colors">{site.url}</span>
                                                    <ExternalLink
                                                        className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => { e.stopPropagation(); window.open(`http://${site.url}`, '_blank'); }}
                                                    />
                                                </div>
                                                {site.campanha && (
                                                    <span className="text-[10px] bg-primary/5 text-indigo-600 px-1.5 py-0.5 rounded border border-primary/10 mt-0.5 inline-block">
                                                        {site.campanha.nome_campanha}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-primary/10 text-indigo-600 text-xs font-bold">
                                                    {site.da ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center w-9 h-7 rounded-lg bg-violet-500/10 text-violet-500 text-xs font-bold">
                                                    {site.pa ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-xs font-bold ${(site.spam ?? 0) >= 30
                                                    ? 'bg-red-500/10 text-red-500'
                                                    : (site.spam ?? 0) >= 10
                                                        ? 'bg-amber-500/10 text-amber-500'
                                                        : 'bg-emerald-500/10 text-emerald-500'
                                                    }`}>
                                                    {site.spam != null ? `${site.spam}%` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm">{site.categoria || '—'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${site.status_contato === 'respondeu' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    site.status_contato === 'contatado' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                    }`}>
                                                    {site.status_contato || 'lead'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingSite(site)}
                                                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSite(site.id)}
                                                        disabled={isDeleting === site.id}
                                                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        {isDeleting === site.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Controles de Paginação */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                            <span className="text-sm text-muted-foreground">
                                Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong> &mdash; {totalCount} sites no total
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchSites(currentPage - 1)}
                                    disabled={currentPage === 0 || loading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Anterior
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let page: number;
                                        if (totalPages <= 5) {
                                            page = i;
                                        } else if (currentPage < 3) {
                                            page = i;
                                        } else if (currentPage >= totalPages - 3) {
                                            page = totalPages - 5 + i;
                                        } else {
                                            page = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => fetchSites(page)}
                                                disabled={loading}
                                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${page === currentPage
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                    : 'border border-border bg-card hover:bg-accent'
                                                    }`}
                                            >
                                                {page + 1}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => fetchSites(currentPage + 1)}
                                    disabled={currentPage >= totalPages - 1 || loading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Próxima
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Adição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-600" />
                                Adicionar Novo Site
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSite} className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                            {/* Informações Básicas */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">URL do Site</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="exemplo.com.br"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                        value={newSite.url}
                                        onChange={e => setNewSite({ ...newSite, url: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Categoria</label>
                                        <input
                                            type="text"
                                            placeholder="Tecnologia"
                                            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                            value={newSite.categoria}
                                            onChange={e => setNewSite({ ...newSite, categoria: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Campanha</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-foreground"
                                            value={newSite.campanha_id}
                                            onChange={e => setNewSite({ ...newSite, campanha_id: e.target.value })}
                                        >
                                            <option value="">Nenhuma</option>
                                            {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome_campanha}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Métricas */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Métricas</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-muted-foreground">DA</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-indigo-600"
                                            value={newSite.da}
                                            onChange={e => setNewSite({ ...newSite, da: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-muted-foreground">PA</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-indigo-600"
                                            value={newSite.pa}
                                            onChange={e => setNewSite({ ...newSite, pa: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-muted-foreground">Spam %</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-indigo-600"
                                            value={newSite.spam}
                                            onChange={e => setNewSite({ ...newSite, spam: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contatos */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contatos</h4>
                                <div className="space-y-4">
                                    {/* Email 1 */}
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">Nome (1)</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={newSite.nome_1}
                                                onChange={e => setNewSite({ ...newSite, nome_1: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">E-mail (1)</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={newSite.email}
                                                onChange={e => setNewSite({ ...newSite, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    {/* Email 2 */}
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">Nome (2)</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={newSite.nome_2}
                                                onChange={e => setNewSite({ ...newSite, nome_2: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">E-mail (2)</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={newSite.email_2}
                                                onChange={e => setNewSite({ ...newSite, email_2: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    {/* Email 3 */}
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">Nome (3)</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={newSite.nome_3}
                                                onChange={e => setNewSite({ ...newSite, nome_3: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">E-mail (3)</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={newSite.email_3}
                                                onChange={e => setNewSite({ ...newSite, email_3: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Redes Sociais */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Redes Sociais</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Facebook URL</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                            value={newSite.facebook}
                                            onChange={e => setNewSite({ ...newSite, facebook: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Instagram URL</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                            value={newSite.instagram}
                                            onChange={e => setNewSite({ ...newSite, instagram: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">LinkedIn URL</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                            value={newSite.linkedin}
                                            onChange={e => setNewSite({ ...newSite, linkedin: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-card py-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Site'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Edição */}
            {editingSite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-600" />
                                Editar Site
                            </h3>
                            <button onClick={() => setEditingSite(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSite} className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                            {/* Informações Básicas */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">URL do Site</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                        value={editingSite.url}
                                        onChange={e => setEditingSite({ ...editingSite, url: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Categoria</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                            value={editingSite.categoria || ''}
                                            onChange={e => setEditingSite({ ...editingSite, categoria: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Campanha</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-foreground"
                                            value={editingSite.campanha_id || ''}
                                            onChange={e => setEditingSite({ ...editingSite, campanha_id: e.target.value })}
                                        >
                                            <option value="">Nenhuma</option>
                                            {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome_campanha}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium">Status do Contato</label>
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all text-foreground"
                                            value={editingSite.status_contato || 'lead'}
                                            onChange={e => setEditingSite({ ...editingSite, status_contato: e.target.value })}
                                        >
                                            <option value="lead">Lead (Pronto para enviar)</option>
                                            <option value="contatado">Contatado (Aguardando resposta/follow-up)</option>
                                            <option value="respondeu">Respondeu</option>
                                            <option value="fechado">Fechado</option>
                                            <option value="recusado">Recusado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Métricas */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Métricas</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-muted-foreground">DA</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-indigo-600"
                                            value={editingSite.da || ''}
                                            onChange={e => setEditingSite({ ...editingSite, da: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-muted-foreground">PA</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-indigo-600"
                                            value={editingSite.pa || ''}
                                            onChange={e => setEditingSite({ ...editingSite, pa: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-medium text-muted-foreground">Spam %</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:border-indigo-600"
                                            value={editingSite.spam || ''}
                                            onChange={e => setEditingSite({ ...editingSite, spam: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contatos */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contatos</h4>
                                <div className="space-y-4">
                                    {/* Email 1 */}
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">Nome (1)</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={editingSite.nome_1 || ''}
                                                onChange={e => setEditingSite({ ...editingSite, nome_1: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">E-mail (1)</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={editingSite.email || ''}
                                                onChange={e => setEditingSite({ ...editingSite, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    {/* Email 2 */}
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">Nome (2)</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={editingSite.nome_2 || ''}
                                                onChange={e => setEditingSite({ ...editingSite, nome_2: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">E-mail (2)</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={editingSite.email_2 || ''}
                                                onChange={e => setEditingSite({ ...editingSite, email_2: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    {/* Email 3 */}
                                    <div className="grid grid-cols-5 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">Nome (3)</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={editingSite.nome_3 || ''}
                                                onChange={e => setEditingSite({ ...editingSite, nome_3: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <label className="text-[11px] font-medium text-muted-foreground">E-mail (3)</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                                value={editingSite.email_3 || ''}
                                                onChange={e => setEditingSite({ ...editingSite, email_3: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Redes Sociais */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Redes Sociais</h4>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Facebook URL</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                            value={editingSite.facebook || ''}
                                            onChange={e => setEditingSite({ ...editingSite, facebook: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Instagram URL</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                            value={editingSite.instagram || ''}
                                            onChange={e => setEditingSite({ ...editingSite, instagram: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">LinkedIn URL</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs outline-none focus:border-indigo-600"
                                            value={editingSite.linkedin || ''}
                                            onChange={e => setEditingSite({ ...editingSite, linkedin: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-card py-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingSite(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Atribuição em Massa */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Zap className="w-5 h-5 text-indigo-600" />
                                Atribuir Campanha em Massa
                            </h3>
                            <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                            Você está alterando a campanha de <strong>{selectedSites.length}</strong> sites simultaneamente.
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Selecione a Campanha</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                value={bulkCampanhaId}
                                onChange={e => setBulkCampanhaId(e.target.value)}
                            >
                                <option value="">Nenhuma (Remover vínculo)</option>
                                {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome_campanha}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsBulkModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkAssign}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirmar Alteração
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {drawerSite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    {/* Overlay para fechar ao clicar fora */}
                    <div className="absolute inset-0" onClick={() => setDrawerSite(null)} />

                    <div
                        className="relative w-full max-w-4xl bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                        style={{ maxHeight: '90vh' }}
                    >
                        {/* Header */}
                        <div style={{ borderBottom: '1px solid #1e293b' }} className="flex items-center justify-between px-8 py-6 shrink-0">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#312e81' }}>
                                    <Globe className="w-6 h-6" style={{ color: '#a5b4fc' }} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-2xl truncate" style={{ color: '#f1f5f9' }}>{drawerSite.url}</h3>
                                    <a href={`http://${drawerSite.url}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm hover:underline" style={{ color: '#818cf8' }}>
                                        <ExternalLink className="w-4 h-4" /> Abrir site oficial
                                    </a>
                                </div>
                            </div>
                            <button onClick={() => setDrawerSite(null)}
                                className="p-2.5 rounded-full transition-colors shrink-0 hover:bg-[#1e293b]"
                                style={{ color: '#94a3b8' }}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Conteúdo em 2 Colunas */}
                        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Coluna Esquerda: Métricas e Info Base */}
                                <div className="space-y-8">
                                    {/* Métricas */}
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>Métricas de Autoridade</p>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                                <p className="text-3xl font-black" style={{ color: '#818cf8' }}>{drawerSite.da ?? '—'}</p>
                                                <p className="text-xs mt-1 font-medium" style={{ color: '#64748b' }}>Domain Auth (DA)</p>
                                            </div>
                                            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                                <p className="text-3xl font-black" style={{ color: '#a78bfa' }}>{drawerSite.pa ?? '—'}</p>
                                                <p className="text-xs mt-1 font-medium" style={{ color: '#64748b' }}>Page Auth (PA)</p>
                                            </div>
                                            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                                <p className="text-3xl font-black" style={{ color: (drawerSite.spam ?? 0) >= 30 ? '#f87171' : (drawerSite.spam ?? 0) >= 10 ? '#fbbf24' : '#34d399' }}>
                                                    {drawerSite.spam != null ? `${drawerSite.spam}%` : '—'}
                                                </p>
                                                <p className="text-xs mt-1 font-medium" style={{ color: '#64748b' }}>Spam Score</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status e Categoria */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Status Atual</p>
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold uppercase" style={
                                                drawerSite.status_contato === 'respondeu'
                                                    ? { backgroundColor: '#052e16', color: '#4ade80', border: '1px solid #166534' }
                                                    : drawerSite.status_contato === 'contatado'
                                                        ? { backgroundColor: '#451a03', color: '#fbbf24', border: '1px solid #92400e' }
                                                        : { backgroundColor: '#0c1a4a', color: '#93c5fd', border: '1px solid #1e3a8a' }
                                            }>
                                                {drawerSite.status_contato || 'lead'}
                                            </span>
                                        </div>
                                        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: '#475569' }}>Categoria</p>
                                            <p className="text-lg font-bold" style={{ color: '#e2e8f0' }}>{drawerSite.categoria || 'Não definida'}</p>
                                        </div>
                                    </div>

                                    {/* Campanha */}
                                    {drawerSite.campanha && (
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>Campanha Vinculada</p>
                                            <div className="p-5 rounded-2xl flex items-center gap-4" style={{ backgroundColor: '#1e1b4b', border: '1px solid #4f46e5' }}>
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                    <Zap className="w-5 h-5" style={{ color: '#a5b4fc' }} />
                                                </div>
                                                <p className="text-lg font-bold" style={{ color: '#a5b4fc' }}>{drawerSite.campanha.nome_campanha}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Coluna Direita: Contatos e Redes Sociais */}
                                <div className="space-y-8">
                                    {/* Contatos */}
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>Lista de Contatos</p>
                                        <div className="space-y-3">
                                            {[
                                                { email: drawerSite.email, nome: drawerSite.nome_1 },
                                                { email: drawerSite.email_2, nome: drawerSite.nome_2 },
                                                { email: drawerSite.email_3, nome: drawerSite.nome_3 },
                                            ].filter(c => c.email).map((contato, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl"
                                                    style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#312e81' }}>
                                                        <User className="w-4 h-4" style={{ color: '#a5b4fc' }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        {contato.nome && (
                                                            <p className="text-base font-bold truncate mb-0.5" style={{ color: '#f1f5f9' }}>{contato.nome}</p>
                                                        )}
                                                        <a href={`mailto:${contato.email}`}
                                                            className="flex items-center gap-1.5 text-sm hover:underline truncate font-medium"
                                                            style={{ color: '#818cf8' }}>
                                                            <Mail className="w-4 h-4 shrink-0" />{contato.email}
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                            {!drawerSite.email && !drawerSite.email_2 && !drawerSite.email_3 && (
                                                <div className="p-4 rounded-2xl text-center italic text-sm" style={{ backgroundColor: '#1e293b50', border: '1px dashed #334155', color: '#64748b' }}>
                                                    Nenhum e-mail localizado
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Redes Sociais */}
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#475569' }}>Presença Digital</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                { label: 'Facebook', value: drawerSite.facebook, color: '#60a5fa', bg: '#172554', border: '#1e3a8a' },
                                                { label: 'Instagram', value: drawerSite.instagram, color: '#f472b6', bg: '#2d0a1f', border: '#831843' },
                                                { label: 'LinkedIn', value: drawerSite.linkedin, color: '#38bdf8', bg: '#082f49', border: '#0369a1' },
                                            ].filter(r => r.value).map((rede) => (
                                                <a key={rede.label}
                                                    href={rede.value.startsWith('http') ? rede.value : `https://${rede.value}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02]"
                                                    style={{ backgroundColor: rede.bg, border: `1px solid ${rede.border}` }}>
                                                    <Link2 className="w-5 h-5 shrink-0" style={{ color: rede.color }} />
                                                    <span className="text-sm font-bold" style={{ color: rede.color }}>{rede.label}</span>
                                                </a>
                                            ))}
                                            {(drawerSite.facebook || drawerSite.instagram || drawerSite.linkedin) === null && (
                                                <div className="col-span-2 p-4 rounded-2xl text-center italic text-sm" style={{ backgroundColor: '#1e293b50', border: '1px dashed #334155', color: '#64748b' }}>
                                                    Sem redes sociais cadastradas
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 flex gap-4 shrink-0" style={{ borderTop: '1px solid #1e293b', backgroundColor: '#0f172a' }}>
                            <button
                                onClick={() => { setEditingSite(drawerSite); setDrawerSite(null); }}
                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-base transition-all hover:bg-[#334155]"
                                style={{ backgroundColor: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }}
                            >
                                <Edit2 className="w-5 h-5" /> Editar Informações
                            </button>
                            <button
                                onClick={() => { handleDeleteSite(drawerSite.id); setDrawerSite(null); }}
                                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-base transition-all hover:bg-[#450a0a]"
                                style={{ backgroundColor: '#2d0a0a', color: '#f87171', border: '1px solid #7f1d1d' }}
                            >
                                <Trash2 className="w-5 h-5" /> Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Helper para classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
