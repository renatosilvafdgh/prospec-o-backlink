'use client';

import { useEffect, useRef } from 'react';
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
    const elRef = useRef<HTMLDivElement | null>(null);

    if (!elRef.current) {
        elRef.current = document.createElement('div');
    }

    useEffect(() => {
        const el = elRef.current!;
        document.body.appendChild(el);
        document.body.style.overflow = 'hidden'; // Bloqueia scroll do body ao abrir modal

        return () => {
            document.body.removeChild(el);
            document.body.style.overflow = ''; // Restaura scroll ao fechar
        };
    }, []);

    return createPortal(children, elRef.current);
}
