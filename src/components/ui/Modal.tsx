import React, { useEffect } from 'react';
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
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Card Content (Neo-Brutalist Panel) */}
      <div className="relative w-full max-w-lg rounded-[18px] border-4 border-black bg-white p-6 overflow-hidden animate-pop-in shadow-[6px_6px_0px_#000000] text-black">
        <div className="flex items-center justify-between mb-6 pb-2 border-b-3 border-black">
          <h3 className="font-display font-black text-xl tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:bg-rose-50 transition cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
