import { useEffect } from 'react';

// Cierra una ventana modal con la tecla Escape mientras está abierta.
export const useEscapeKey = (isOpen: boolean, onClose: () => void) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
};
