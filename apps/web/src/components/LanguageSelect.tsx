import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Locale } from "../types";
import { localeFlags, localeLabels, localeOptions, translate } from "../i18n";

export function LanguageSelect({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const currentIndex = localeOptions.indexOf(locale);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const focusOption = (index: number) => {
    optionRefs.current[(index + localeOptions.length) % localeOptions.length]?.focus();
  };
  const selectLocale = (next: Locale) => {
    onChange(next);
    setOpen(false);
    buttonRef.current?.focus();
  };
  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusOption(currentIndex));
    }
    if (event.key === "Escape") setOpen(false);
  };
  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number, option: Locale) => {
    if (event.key === "ArrowDown") { event.preventDefault(); focusOption(index + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); focusOption(index - 1); }
    else if (event.key === "Home") { event.preventDefault(); focusOption(0); }
    else if (event.key === "End") { event.preventDefault(); focusOption(localeOptions.length - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectLocale(option); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); buttonRef.current?.focus(); }
  };

  return <div ref={rootRef} className={`language-select${open ? " open" : ""}`}>
    <button
      ref={buttonRef}
      className="language-select-trigger"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      aria-label={t("language")}
      onClick={() => setOpen((value) => !value)}
      onKeyDown={handleButtonKeyDown}
    >
      <span className="language-flag" aria-hidden="true">{localeFlags[locale]}</span>
      <span className="language-select-name">{localeLabels[locale]}</span>
      <svg className="language-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
    </button>
    {open && <div id={listId} className="language-select-menu" role="listbox" aria-label={t("language")}>
      {localeOptions.map((option, index) => <button
        ref={(element) => { optionRefs.current[index] = element; }}
        className={`language-option${option === locale ? " selected" : ""}`}
        type="button"
        role="option"
        aria-selected={option === locale}
        key={option}
        onClick={() => selectLocale(option)}
        onKeyDown={(event) => handleOptionKeyDown(event, index, option)}
      >
        <span className="language-flag" aria-hidden="true">{localeFlags[option]}</span>
        <span>{localeLabels[option]}</span>
        {option === locale && <svg className="language-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/></svg>}
      </button>)}
    </div>}
  </div>;
}
