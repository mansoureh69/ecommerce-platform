"use client";

import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

function classes(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ className, type = "button", ...props }, ref) {
    return <button ref={ref} type={type} className={classes("ui-button", className)} {...props} />;
  },
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={classes("ui-input", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={classes("ui-select", className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={classes("ui-checkbox", className)} {...props} />;
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (inputId: string, describedBy: string | undefined) => ReactNode;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <div className="ui-field">
      <label htmlFor={inputId}>{label}</label>
      {children(inputId, error ? errorId : undefined)}
      {error ? (
        <p id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={classes("ui-badge", className)}>{children}</span>;
}

export function Skeleton({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <span className={classes("ui-skeleton", className)} aria-label={label} aria-busy="true" />;
}

export const Dialog = forwardRef<HTMLDialogElement, DialogHTMLAttributes<HTMLDialogElement>>(
  function Dialog({ className, children, ...props }, ref) {
    return <dialog ref={ref} className={classes("ui-dialog", className)} {...props}>{children}</dialog>;
  },
);

export const Drawer = forwardRef<HTMLDialogElement, DialogHTMLAttributes<HTMLDialogElement>>(
  function Drawer({ className, children, ...props }, ref) {
    return <dialog ref={ref} className={classes("ui-drawer", className)} {...props}>{children}</dialog>;
  },
);

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, activeId, onChange, label }: { items: TabItem[]; activeId: string; onChange: (id: string) => void; label: string }) {
  const active = items.find((item) => item.id === activeId) ?? items[0];
  return (
    <div className="ui-tabs">
      <div role="tablist" aria-label={label}>
        {items.map((item) => (
          <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={item.id === active?.id} aria-controls={`panel-${item.id}`} onClick={() => onChange(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {active ? <div id={`panel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`}>{active.content}</div> : null}
    </div>
  );
}

export function ToastRegion({ messages }: { messages: Array<{ id: string; message: string }> }) {
  return (
    <div className="ui-toast-region" role="status" aria-live="polite" aria-atomic="false">
      {messages.map((toast) => <div className="ui-toast" key={toast.id}>{toast.message}</div>)}
    </div>
  );
}
