import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      if (!dialogRef.current) return [];
      const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(nodes).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    const focusTimer = window.setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#25233B]/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-card shadow-elevation border border-[#E8E6F1] p-6 sm:p-7 z-10 animate-fade-up max-h-[90vh] overflow-y-auto focus:outline-none`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 id="dialog-title" className="text-xl font-semibold text-[#25233B]">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-[#625F78] mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#625F78] hover:text-[#25233B] hover:bg-[#F7F6FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
};
