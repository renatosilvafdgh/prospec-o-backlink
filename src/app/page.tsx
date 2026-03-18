'use client';

import { useState, useEffect } from 'react';
import { Mail, Zap, Target, BarChart3, Shield, Clock, ArrowRight, CheckCircle2, Inbox, Database } from 'lucide-react';

const features = [
  {
    icon: Database,
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
    title: 'Base de Sites Segmentada',
    desc: 'Acesse +10.000 sites brasileiros com e-mail verificado, filtráveis por categoria de nicho e autoridade de domínio (DA).',
  },
  {
    icon: Mail,
    iconColor: '#d97706',
    iconBg: '#fef3c7',
    title: 'Campanhas de E-mail',
    desc: 'Crie campanhas com templates personalizados e dispare e-mails de parceria para backlink direto pelo seu Gmail.',
  },
  {
    icon: Zap,
    iconColor: '#059669',
    iconBg: '#d1fae5',
    title: 'Follow-up Automático',
    desc: 'Configure sequências de follow-up com intervalos personalizados e aumente sua taxa de resposta sem esforço.',
  },
  {
    icon: Inbox,
    iconColor: '#0284c7',
    iconBg: '#e0f2fe',
    title: 'Inbox Integrado',
    desc: 'Gerencie todas as respostas e negociações de parcerias em um único painel, sem sair da plataforma.',
  },
  {
    icon: Clock,
    iconColor: '#e11d48',
    iconBg: '#ffe4e6',
    title: 'Intervalo entre Envios',
    desc: 'Defina um delay de 10s a 10 minutos para simular envios naturais e proteger a reputação do seu domínio.',
  },
  {
    icon: Shield,
    iconColor: '#4f46e5',
    iconBg: '#e0e7ff',
    title: 'Login Seguro com Google',
    desc: 'Autenticação via OAuth 2.0 oficial. Nunca armazenamos sua senha — apenas tokens temporários de acesso.',
  },
];

const steps = [
  { num: '01', title: 'Conecte o Gmail', desc: 'Autorize o app com 1 clique via OAuth 2.0 seguro.' },
  { num: '02', title: 'Filtre por Nicho e DA', desc: 'Explore +10.000 sites segmentados por categoria e autoridade de domínio.' },
  { num: '03', title: 'Crie uma Campanha', desc: 'Defina templates, limite diário e intervalo entre envios.' },
  { num: '04', title: 'Automatize e Acompanhe', desc: 'O sistema dispara e-mails, faz follow-up e rastreia respostas sozinho.' },
];

const sitesMock = [
  { domain: 'tecnoblog.com.br', da: 72, category: 'Tecnologia', email: 'contato@tecnoblog.com.br' },
  { domain: 'minhavida.com.br', da: 68, category: 'Saúde', email: 'parcerias@minhavida.com.br' },
  { domain: 'livedeiti.com.br', da: 55, category: 'Marketing', email: 'hello@livedeiti.com.br' },
  { domain: 'jovemnerd.com.br', da: 61, category: 'Entretenimento', email: 'ads@jovemnerd.com.br' },
];

const daChip = (da: number) => {
  if (da >= 70) return { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' };
  if (da >= 50) return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' };
  return { bg: '#ffe4e6', color: '#9f1239', border: '#fca5a5' };
};

const GoogleLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }} className="min-h-screen overflow-x-hidden" suppressHydrationWarning>

      {/* Navbar */}
      <nav style={{ backgroundColor: 'rgba(248,250,252,0.9)', borderBottom: '1px solid #e2e8f0', backdropFilter: 'blur(12px)' }} className="fixed top-0 w-full z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div style={{ background: '#ede9fe', borderRadius: '10px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail style={{ color: '#7c3aed', width: 16, height: 16 }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>Prospector AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8" style={{ fontSize: 14, color: '#64748b' }}>
            <a href="#features" style={{ color: '#64748b', textDecoration: 'none' }} className="hover:text-slate-900 transition-colors">Recursos</a>
            <a href="#how" style={{ color: '#64748b', textDecoration: 'none' }} className="hover:text-slate-900 transition-colors">Como funciona</a>
          </div>
          <a
            href="/api/auth/google"
            className="bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold text-sm"
            style={{ padding: '10px 20px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
          >
            Entrar com Google
            <ArrowRight style={{ width: 14, height: 14 }} />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-44 pb-24 px-6 flex flex-col items-center text-center">
        <div style={{ position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#ede9fe', color: '#6d28d9', marginBottom: 28, border: '1px solid #ddd6fe' }}>
          🇧🇷 +10.000 sites brasileiros cadastrados
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.05, maxWidth: 900, color: '#0f172a', margin: '0 0 24px' }}>
          Conquiste{' '}
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            backlinks de qualidade
          </span>{' '}
          no piloto automático
        </h1>

        <p style={{ fontSize: 18, color: '#64748b', maxWidth: 640, lineHeight: 1.7, margin: '0 0 40px' }}>
          Acesse uma base exclusiva com <strong style={{ color: '#0f172a' }}>+10.000 sites brasileiros</strong> com e-mail verificado, organizados por <strong style={{ color: '#0f172a' }}>categoria de nicho</strong> e <strong style={{ color: '#0f172a' }}>autoridade de domínio</strong>. Crie campanhas de parceria e prospecte backlinks direto pelo seu Gmail.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="/api/auth/google"
            className="bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-3 font-bold"
            style={{ padding: '14px 28px', borderRadius: 16, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 30px rgba(79,70,229,0.3)' }}
          >
            <GoogleLogo />
            Começar gratuitamente
          </a>
          <a href="#features" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Ver como funciona <ArrowRight style={{ width: 16, height: 16 }} />
          </a>
        </div>

        {/* Sites mock preview */}
        <div style={{ marginTop: 56, width: '100%', maxWidth: 780, borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 24px 64px rgba(15,23,42,0.08)', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fca5a5' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fcd34d' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#6ee7b7' }} />
            <span style={{ marginLeft: 8, fontSize: 12, fontFamily: 'monospace', color: '#94a3b8' }}>Base de Sites — 10.847 registros</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>Domínio</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>DA</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>E-mail</th>
              </tr>
            </thead>
            <tbody>
              {sitesMock.map((site) => {
                const chip = daChip(site.da);
                return (
                  <tr key={site.domain} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{site.domain}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, backgroundColor: chip.bg, color: chip.color, border: `1px solid ${chip.border}` }}>{site.da}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{site.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{site.email}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', backgroundColor: '#f8fafc' }}>+ 10.843 sites disponíveis...</div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '40px 24px', backgroundColor: '#ffffff' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: '+10.000', label: 'Sites com e-mail verificado' },
            { value: 'Nicho + DA', label: 'Organizado por categoria e score' },
            { value: '100%', label: 'Automatizado via Gmail' },
          ].map(({ value, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>{value}</span>
              <span style={{ fontSize: 14, color: '#64748b' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', backgroundColor: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
              Tudo para{' '}
              <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                escalar seu link building
              </span>
            </h2>
            <p style={{ fontSize: 15, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>
              Uma plataforma completa, integrada ao Gmail, com a maior base de sites brasileiros do mercado.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, transition: 'box-shadow 0.2s, transform 0.2s' }}
                className="hover:-translate-y-1 hover:shadow-lg"
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <f.icon style={{ width: 20, height: 20, color: f.iconColor }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <div className="max-w-5xl mx-auto">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>Como funciona</h2>
            <p style={{ fontSize: 15, color: '#64748b' }}>4 passos simples para automatizar seu link building.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#ede9fe', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#7c3aed' }}>
                  {step.num}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: '80px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="max-w-2xl mx-auto">
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(99,102,241,0.08)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Target style={{ width: 28, height: 28, color: '#7c3aed' }} />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>Pronto para prospectar backlinks?</h2>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 28 }}>
              Acesse +10.000 sites brasileiros com e-mail verificado e comece a construir parcerias hoje.
            </p>
            <a
              href="/api/auth/google"
              className="bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-3 font-bold w-full"
              style={{ padding: '16px 24px', borderRadius: 16, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 30px rgba(79,70,229,0.3)' }}
            >
              <GoogleLogo />
              Entrar com Google — é gratuito
            </a>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px', marginTop: 20 }}>
              {['Sem cartão de crédito', 'OAuth 2.0 seguro', 'Sua senha nunca é armazenada'].map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: '#10b981' }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 13, color: '#94a3b8', backgroundColor: '#ffffff' }}>
        <p>© {new Date().getFullYear()} Prospector AI — Automatize seu link building com a maior base de sites brasileiros.</p>
      </footer>
    </div>
  );
}
