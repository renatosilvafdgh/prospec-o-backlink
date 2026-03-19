'use client';

import { useState, useEffect, useRef } from 'react';
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
    AlignLeft,
    FileText
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { ModalPortal } from '@/components/ui/ModalPortal';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [newTemplate, setNewTemplate] = useState({ nome_template: '', assunto: '', corpo_email: '' });
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);


    const contentRef = useRef<HTMLTextAreaElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const contentBackdropRef = useRef<HTMLDivElement>(null);
    const subjectBackdropRef = useRef<HTMLDivElement>(null);

    const syncScroll = (e: React.UIEvent<HTMLTextAreaElement | HTMLDivElement>) => {
        if (contentRef.current && contentBackdropRef.current) {
            contentBackdropRef.current.scrollTop = contentRef.current.scrollTop;
            contentBackdropRef.current.scrollLeft = contentRef.current.scrollLeft;
        }
    };

    const syncSubjectScroll = () => {
        if (subjectRef.current && subjectBackdropRef.current) {
            subjectBackdropRef.current.scrollLeft = subjectRef.current.scrollLeft;
        }
    };

    const renderHighlightedTags = (text: string) => {
        if (!text) return { __html: '' };
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const tags = ['{nome}', '{site_url}', '{sua_url}', '{site}', '{url}'];
        let highlighted = escaped;
        tags.forEach(tag => {
            const regex = new RegExp(tag.replace('{', '\\{').replace('}', '\\}'), 'g');
            highlighted = highlighted.replace(regex, `<span class="text-amber-500 font-bold">${tag}</span>`);
        });
        return { __html: highlighted + (text.endsWith('\n') ? ' ' : '') };
    };

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

            if (editingTemplate) {
                const { error } = await supabase
                    .from('email_templates')
                    .update({
                        nome_template: newTemplate.nome_template,
                        assunto: newTemplate.assunto,
                        corpo_email: newTemplate.corpo_email
                    })
                    .eq('id', editingTemplate.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('email_templates')
                    .insert([{
                        ...newTemplate,
                        user_id: user.id
                    }]);
                if (error) throw error;
            }

            setNewTemplate({ nome_template: '', assunto: '', corpo_email: '' });
            setEditingTemplate(null);
            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error('Erro ao salvar template:', error);
            alert('Erro ao salvar template.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleEditClick(template: any) {
        try {
            // Verificar se o template está em uso em alguma campanha
            const { data, error } = await supabase
                .from('campanhas')
                .select('id')
                .or(`template_inicial.eq.${template.id},template_followup.eq.${template.id}`)
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                alert('Não é possível editar este template pois ele está sendo usado em uma campanha.');
                return;
            }

            setEditingTemplate(template);
            setNewTemplate({
                nome_template: template.nome_template,
                assunto: template.assunto,
                corpo_email: template.corpo_email
            });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Erro ao verificar uso do template:', error);
            alert('Erro ao carregar template para edição.');
        }
    }

    async function handleDuplicateTemplate(template: any) {
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('email_templates')
                .insert([{
                    nome_template: `${template.nome_template} (Cópia)`,
                    assunto: template.assunto,
                    corpo_email: template.corpo_email,
                    user_id: user.id
                }]);

            if (error) throw error;
            fetchTemplates();
        } catch (error) {
            console.error('Erro ao duplicar template:', error);
            alert('Erro ao duplicar template.');
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

            if (error) {
                // Código 23503 é violação de chave estrangeira no PostgreSQL (template em uso)
                if (error.code === '23503') {
                    alert('Não é possível excluir este template pois ele está sendo usado em uma campanha.');
                } else {
                    console.error('Erro ao excluir template:', error);
                    alert('Erro ao excluir template: ' + (error.message || 'Erro desconhecido'));
                }
                return;
            }

            setTemplates(templates.filter(t => t.id !== id));
        } catch (error: any) {
            console.error('Erro inesperado ao excluir template:', error);
            alert('Erro inesperado: ' + (error.message || 'Erro desconhecido'));
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:opacity-90 transition-all font-medium shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Template
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
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
                    <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-bold hover:underline">
                        Criar novo template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div key={template.id} className="p-6 rounded-2xl glass border border-border flex flex-col gap-4 group hover:border-primary/50 transition-all relative">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-xl bg-primary/10 text-indigo-600">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditClick(template)}
                                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                                    >
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
                                <button
                                    onClick={() => handleDuplicateTemplate(template)}
                                    className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:underline"
                                >
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
                <ModalPortal>
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800/60 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                    <FileText className="w-5 h-5 text-white" />
                                    {editingTemplate ? 'Editar Template' : 'Novo Template'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingTemplate(null);
                                        setNewTemplate({ nome_template: '', assunto: '', corpo_email: '' });
                                    }}
                                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAddTemplate} className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 ml-1">Nome do Template</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 rounded-2xl bg-[#1e293b] border border-slate-700/50 text-white placeholder:text-slate-500 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
                                            value={newTemplate.nome_template}
                                            onChange={e => setNewTemplate({ ...newTemplate, nome_template: e.target.value })}
                                            placeholder="Ex: Primeio Contato - Tech"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 ml-1">Assunto do E-mail</label>
                                        <div className="relative w-full rounded-2xl bg-[#1e293b] border border-slate-700/50 overflow-hidden shadow-sm">
                                            <div
                                                ref={subjectBackdropRef}
                                                className="absolute inset-0 px-4 py-3 pointer-events-none whitespace-nowrap overflow-hidden text-white font-sans text-sm"
                                                dangerouslySetInnerHTML={renderHighlightedTags(newTemplate.assunto)}
                                            />
                                            <input
                                                ref={subjectRef}
                                                required
                                                type="text"
                                                className="w-full px-4 py-3 bg-transparent text-transparent caret-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all relative z-10 font-sans text-sm"
                                                value={newTemplate.assunto}
                                                onChange={e => {
                                                    setNewTemplate({ ...newTemplate, assunto: e.target.value });
                                                    setTimeout(syncSubjectScroll, 0);
                                                }}
                                                onScroll={syncSubjectScroll}
                                                placeholder="Sugestão de parceria para {site_url}"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 ml-1">Conteúdo do E-mail</label>
                                        <div className="relative rounded-2xl bg-[#1e293b] border border-slate-700/50 overflow-hidden shadow-sm">
                                            <div
                                                ref={contentBackdropRef}
                                                className="absolute inset-0 px-4 py-3 pointer-events-none whitespace-pre-wrap break-words text-white font-sans text-sm leading-relaxed overflow-hidden"
                                                dangerouslySetInnerHTML={renderHighlightedTags(newTemplate.corpo_email)}
                                            />
                                            <textarea
                                                ref={contentRef}
                                                required
                                                className="w-full px-4 py-3 bg-transparent text-transparent caret-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all min-h-[250px] resize-none custom-scrollbar relative z-10 font-sans text-sm leading-relaxed"
                                                value={newTemplate.corpo_email}
                                                onChange={e => setNewTemplate({ ...newTemplate, corpo_email: e.target.value })}
                                                onScroll={syncScroll}
                                                placeholder="Olá {nome}, vi seu site {site_url} e..."
                                            />
                                        </div>
                                        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <p className="w-full text-xs font-bold uppercase tracking-wider text-white mb-1">Tags disponíveis:</p>
                                            <span className="px-2 py-1 rounded-md bg-indigo-600/20 text-white text-[10px] font-bold border border-indigo-500/30">{"{nome}"}</span>
                                            <span className="px-2 py-1 rounded-md bg-indigo-600/20 text-white text-[10px] font-bold border border-indigo-500/30">{"{site_url}"}</span>
                                            <span className="px-2 py-1 rounded-md bg-indigo-600/20 text-white text-[10px] font-bold border border-indigo-500/30">{"{sua_url}"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 mt-auto px-1">
                                    <button
                                        type="button"
                                        onClick={() => { setIsModalOpen(false); setEditingTemplate(null); }}
                                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-700/50 text-white font-bold hover:bg-slate-800 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Template'}
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

