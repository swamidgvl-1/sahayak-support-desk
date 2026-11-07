'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="w-[min(92vw,30rem)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
      aria-label={title}
    >
      {open && (
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button className="btn btn-sm" onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
