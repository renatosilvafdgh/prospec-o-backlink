'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Mail,
    Trash2,
    Edit3,
    Copy,
    Info,
    Loader2,
    X,
    Type,
    AlignLeft
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [newTemplate, setNewTemplate] = useState({ nome_template: '', assunto: '', corpo_email: '' });

    const supabase = createClient();

    useEffect(() => {
        fetchTemplates();
    }, []);

    async function fetchTemplates() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Erro ao buscar templates:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddTemplate(e: React.FormEvent) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('email_templates')
                .insert([{
                    ...newTemplate,
                    user_id: user.id
                }]);

            if (error) throw error;

            setNewTemplate({ nome_template: '', assunto: '', corpo_email: '' });
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error('Erro ao salvar template:', error);
            alert('Erro ao salvar template.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteTemplate(id: string) {
        if (!confirm('Tem certeza que deseja excluir este template?')) return;

        try {
            setIsDeleting(id);
            const { error } = await supabase
                .from('email_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            console.error('Erro ao excluir template:', error);
        } finally {
            setIsDeleting(null);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Templates de E-mail</h2>
                    <p className="text-muted-foreground mt-1">Crie modelos reutilizáveis com variáveis dinâmicas.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-all font-medium shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Template
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse">Carregando seus templates...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6 glass rounded-2xl border border-border">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Nenhum template encontrado</h3>
                        <p className="text-muted-foreground">Crie seu primeiro modelo de e-mail para começar a prospecção.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="text-primary font-bold hover:underline">
                        Criar novo template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div key={template.id} className="p-6 rounded-2xl glass border border-border flex flex-col gap-4 group hover:border-primary/50 transition-all relative">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        disabled={isDeleting === template.id}
                                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        {isDeleting === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold truncate">{template.nome_template}</h3>
                                <p className="text-sm text-muted-foreground mt-1 truncate">{template.assunto}</p>
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-lg border border-border min-h-[4.5rem]">
                                {template.corpo_email}
                            </div>

                            <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border">
                                <button className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
                                    <Copy className="w-3.5 h-3.5" />
                                    Duplicar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-4 items-start">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-200/80">
                    <p className="font-semibold text-blue-400">Variáveis Dinâmicas</p>
                    <p className="mt-1">Use as chaves abaixo para personalizar seus e-mails automaticamente:</p>
                    <div className="flex gap-2 mt-2 flex-wrap text-blue-300 font-mono">
                        <span className="bg-blue-500/10 px-2 py-1 rounded">{"{site}"}</span>
                        <span className="bg-blue-500/10 px-2 py-1 rounded">{"{url}"}</span>
                        <span className="bg-blue-500/10 px-2 py-1 rounded">{"{nome}"}</span>
                    </div>
                </div>
            </div>

            {/* Modal de Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary" />
                                Criar Novo Template
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddTemplate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Type className="w-4 h-4 text-muted-foreground" />
                                        Nome do Template
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Proposta Inicial"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={newTemplate.nome_template}
                                        onChange={e => setNewTemplate({ ...newTemplate, nome_template: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        Assunto do E-mail
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Parceria com o site {site}"
                                        className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={newTemplate.assunto}
                                        onChange={e => setNewTemplate({ ...newTemplate, assunto: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <AlignLeft className="w-4 h-4 text-muted-foreground" />
                                    Corpo do E-mail
                                </label>
                                <textarea
                                    required
                                    rows={8}
                                    placeholder="Escreva sua mensagem aqui... Use {site}, {url} ou {nome} para campos dinâmicos."
                                    className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                    value={newTemplate.corpo_email}
                                    onChange={e => setNewTemplate({ ...newTemplate, corpo_email: e.target.value })}
                                />
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
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
