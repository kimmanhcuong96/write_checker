import { useEffect, useRef } from "react";
import type { Locale } from "../types";
import { getAuthDialogCopy } from "../auth-i18n";

export function AuthDialog({ locale, onClose, onSignIn }: { locale: Locale; onClose: () => void; onSignIn: () => void }) {
  const copy = getAuthDialogCopy(locale);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return <div className="auth-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeRef} className="auth-dialog-close" type="button" aria-label={copy.close} onClick={onClose}>×</button>
      <p className="eyebrow">me2write</p>
      <h2 id="auth-dialog-title">{copy.title}</h2>
      <p>{copy.description}</p>
      <div className="auth-dialog-actions">
        <button className="secondary-button" type="button" onClick={onClose}>{copy.cancel}</button>
        <button className="primary-button" type="button" onClick={onSignIn}>{copy.signIn}</button>
      </div>
    </section>
  </div>;
}
