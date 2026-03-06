import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type PopupDialogTone = 'primary' | 'danger' | 'neutral' | 'success';

interface PopupDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: PopupDialogTone;
  onConfirm: () => void;
  onCancel?: () => void;
}

const toneClasses: Record<PopupDialogTone, string> = {
  primary: 'bg-[#FF2B5E] hover:bg-[#E6275A] text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  neutral: 'bg-gray-900 hover:bg-gray-800 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
};

export function PopupDialog({
  open,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
}: PopupDialogProps) {
  if (!open) return null;

  const handleClose = onCancel ?? onConfirm;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="popup-dialog-title" className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 text-gray-700 whitespace-pre-line">{message}</div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 transition-colors ${toneClasses[tone]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
