'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
    children: React.ReactNode;
    onClose?: () => void;
}

/**
 * Renderiza o conteúdo diretamente no <body> usando createPortal.
 * Isso garante que o modal sempre aparece acima de tudo, mesmo
 * quando o layout pai tem overflow-y:auto (que cria novo stacking context).
 */
export function ModalPortal({ children, onClose }: ModalPortalProps) {
    const [mounted, setMounted] = useState(false);
    const elRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setMounted(true);
        const el = document.createElement('div');
        elRef.current = el;
        document.body.appendChild(el);
        document.body.style.overflow = 'hidden';

        return () => {
            if (el && document.body.contains(el)) {
                document.body.removeChild(el);
            }
            document.body.style.overflow = '';
        };
    }, []);

    if (!mounted || !elRef.current) return null;

    return createPortal(children, elRef.current);
}
