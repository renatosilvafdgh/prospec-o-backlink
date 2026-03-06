'use client';

import { useState } from 'react';
import {
    Settings,
    User,
    Bell,
    Shield,
    Mail,
    Key,
    Loader2
} from 'lucide-react';

export default function ConfigPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
                <p className="text-muted-foreground mt-1">Gerencie suas preferências e conexões de API.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1 space-y-4">
                    <div className="p-4 rounded-xl bg-indigo-600 text-white flex items-center gap-3">
                        <User className="w-5 h-5" />
                        <span className="font-medium">Perfil e Conta</span>
                    </div>
                    <div className="p-4 rounded-xl hover:bg-accent transition-colors flex items-center gap-3 cursor-pointer">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">E-mail e SMTP</span>
                    </div>
                    <div className="p-4 rounded-xl hover:bg-accent transition-colors flex items-center gap-3 cursor-pointer">
                        <Key className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">Chaves de API</span>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-6">
                    <div className="p-8 rounded-2xl glass border border-border space-y-6">
                        <h3 className="text-xl font-bold">Perfil do Usuário</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nome</label>
                                    <input type="text" className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg outline-none" placeholder="Seu Nome" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">E-mail</label>
                                    <input type="email" className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg outline-none" placeholder="seu@email.com" readOnly />
                                </div>
                            </div>
                            <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition-all">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>

                    <div className="p-8 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center gap-4 py-12">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Shield className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">Segurança</p>
                            <p className="text-sm text-muted-foreground">Configurações avançadas de 2FA e logs de acesso em breve.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

