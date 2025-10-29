// src/ui/toast.tsx
import React from "react";

type Kind = "success" | "error" | "info";

export function useToast() {
  const [toast, setToast] = React.useState<{ msg: string; kind: Kind } | null>(
    null
  );
  const show = (msg: string, kind: Kind = "info", ms = 3000) => {
    setToast({ msg, kind });
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => setToast(null), ms);
  };
  const hide = () => setToast(null);
  return { toast, show, hide };
}

export function Toast({
  toast,
  onClose,
}: {
  toast: { msg: string; kind: Kind } | null;
  onClose: () => void;
}) {
  if (!toast) return null;
  const theme =
    toast.kind === "success"
      ? "bg-emerald-600"
      : toast.kind === "error"
      ? "bg-rose-600"
      : "bg-slate-900";
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
      <div
        className={`${theme} text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-3`}
        role="status"
      >
        <span>{toast.msg}</span>
        <button
          className="ml-2 rounded bg-black/20 px-2 py-0.5 text-xs"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
