import React from "react";
import { btnDelete, btnGhost, btnSave } from "./tokens";

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title = "Confirmation",
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <Overlay>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-slate-700">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}>
          {cancelText}
        </button>
        <button className={btnDelete} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Overlay>
  );
}

export function PromptDialog({
  open,
  title = "Saisie",
  label = "Valeur",
  initialValue = "",
  confirmText = "Valider",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  label?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState(initialValue);
  React.useEffect(() => setValue(initialValue), [initialValue]);

  if (!open) return null;
  return (
    <Overlay>
      <h3 className="text-lg font-semibold">{title}</h3>
      <label className="mt-2 block text-sm text-slate-700">{label}</label>
      <input
        className="mt-1 w-full rounded-md border px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}>
          {cancelText}
        </button>
        <button className={btnSave} onClick={() => onConfirm(value)}>
          {confirmText}
        </button>
      </div>
    </Overlay>
  );
}
