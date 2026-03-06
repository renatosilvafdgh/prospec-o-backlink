'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Upload,
    MoreHorizontal,
    ExternalLink,
    Loader2,
    X,
    Trash2,
    Globe,
    CheckSquare,
    Square,
    Edit2,
    Check,
    Zap
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SitesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [newSite, setNewSite] = useState({ url: '', email: '', categoria: '', campanha_id: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [campanhas, setCampanhas] = useState<any[]>([]);

    // Novos estados para seleção e edição
    const [selectedSites, setSelectedSites] = useState<string[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkCampanhaId, setBulkCampanhaId] = useState('');
    const [editingSite, setEditingSite] = useState<any | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchSites();
        fetchCampanhas();
    }, []);

    async function fetchCampanhas() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('campanhas').select('id, nome_campanha').eq('user_id', user.id).eq('ativa', true);
        setCampanhas(data || []);
    }

    async function fetchSites() {
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
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSites(data || []);
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
                    categoria: newSite.categoria,
                    campanha_id: newSite.campanha_id || null,
                    user_id: user.id,
                    status_contato: 'lead'
                }]);

            if (error) throw error;

            setNewSite({ url: '', email: '', categoria: '', campanha_id: '' });
            setIsModalOpen(false);
            fetchSites();
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
            setSites(sites.filter(s => s.id !== id));
            setSelectedSites(selectedSites.filter(sid => sid !== id));
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
            fetchSites();
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
            fetchSites();
        } catch (error: any) {
            alert('Erro na atualização em massa: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    const toggleSelectAll = () => {
        if (selectedSites.length === filteredSites.length) {
            setSelectedSites([]);
        } else {
            setSelectedSites(filteredSites.map(s => s.id));
        }
    };

    const toggleSelectSite = (id: string) => {
        if (selectedSites.includes(id)) {
            setSelectedSites(selectedSites.filter(sid => sid !== id));
        } else {
            setSelectedSites([...selectedSites, id]);
        }
    };

    const filteredSites = sites.filter(site =>
        site.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.email && site.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
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
                        onChange={(e) => setSearchTerm(e.target.value)}
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

                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-all text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    Filtros
                </button>
            </div>

            <div className="rounded-2xl glass border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-muted-foreground animate-pulse">Carregando seus sites...</p>
                        </div>
                    ) : filteredSites.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Nenhum site encontrado</h3>
                                <p className="text-muted-foreground">Você ainda não cadastrou nenhum site ou nenhum corresponde à sua busca.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold hover:underline">
                                Comece adicionando seu primeiro site
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="px-4 py-4 w-10 text-center">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="p-1 rounded text-muted-foreground hover:bg-accent"
                                        >
                                            {selectedSites.length === filteredSites.length && filteredSites.length > 0
                                                ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                : <Square className="w-4 h-4" />
                                            }
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Domínio / Campanha</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">DA</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredSites.map((site) => (
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
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{site.url}</span>
                                                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => window.open(`http://${site.url}`, '_blank')} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground">{site.email || 'E-mail não cadastrado'}</span>
                                                {site.campanha && (
                                                    <span className="text-[10px] bg-primary/5 text-indigo-600 px-1.5 py-0.5 rounded border border-primary/10">
                                                        {site.campanha.nome_campanha}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-indigo-600 text-xs font-bold">
                                                {site.domain_authority || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm">{site.categoria || 'Sem categoria'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${site.status_contato === 'respondeu' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                site.status_contato === 'contatado' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                }`}>
                                                {site.status_contato}
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

                        <form onSubmit={handleAddSite} className="space-y-4">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">E-mail de Contato</label>
                                <input
                                    type="email"
                                    placeholder="contato@exemplo.com"
                                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                    value={newSite.email}
                                    onChange={e => setNewSite({ ...newSite, email: e.target.value })}
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

                            <div className="flex gap-3 pt-4">
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
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
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

                        <form onSubmit={handleEditSite} className="space-y-4">
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">E-mail de Contato</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                                    value={editingSite.email || ''}
                                    onChange={e => setEditingSite({ ...editingSite, email: e.target.value })}
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
                                <div className="space-y-2">
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

                            <div className="flex gap-3 pt-4">
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
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
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
        </div>
    );
}

// Helper para classes
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}

