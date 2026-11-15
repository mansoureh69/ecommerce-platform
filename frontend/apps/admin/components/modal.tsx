"use client";

import { Button, Dialog } from "@ecommerce/ui-primitives";
import { useEffect, useRef, type ReactNode } from "react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);
  return (
    <Dialog ref={ref} aria-label={title} onClose={onClose}>
      {open ? (
        <div className="modal-body">
          <h2>{title}</h2>
          {children}
          <Button className="secondary" onClick={onClose}>Close</Button>
        </div>
      ) : null}
    </Dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, pending, error, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string; pending?: boolean; error?: ReactNode; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p>{message}</p>
      {error}
      <Button className="danger" disabled={pending} onClick={onConfirm}>{pending ? "Working…" : confirmLabel}</Button>
    </Modal>
  );
}
