import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Card Content (Minimalist Brutalist Panel) */}
      <div className="relative w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-5 overflow-hidden animate-pop-in shadow-2xl text-zinc-100 z-10">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
          <h3 className="font-semibold text-sm tracking-tight text-zinc-100">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 transition text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
