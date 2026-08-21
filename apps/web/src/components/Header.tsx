import { useEffect, useRef, useState } from "react";
import type { Locale, User } from "../types";
import { getContent } from "../content-i18n";
import { translate } from "../i18n";
import { LanguageSelect } from "./LanguageSelect";

export function Header({ user, locale, onLocaleChange, onLogout, onSignIn, onNavigate }: {
  user: User | null; locale: Locale; onLocaleChange: (locale: Locale) => void; onLogout: () => void; onSignIn: () => void; onNavigate: (path: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const copy = getContent(locale).navigation;
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const navigate = (path: string) => (event: { preventDefault: () => void }) => { event.preventDefault(); setMenuOpen(false); onNavigate(path); };

  return <header className="site-header" ref={headerRef}>
    <div className="brand-group">
      <a className="brand" href="/" onClick={navigate("/")} aria-label={copy.homeLabel}><span className="brand-mark">M2</span><span><b>me2write</b><small>{copy.brandTagline}</small></span></a>
      <a className="ecosystem-button ecosystem-desktop-only" href="https://me2talk.com/" target="_blank" rel="noopener noreferrer" title={t("speaking")}>Me2Talk ↗</a>
      <a className="ecosystem-button ecosystem-button-listen ecosystem-desktop-only" href="https://me2listen.com/" target="_blank" rel="noopener noreferrer">Me2Listen ↗</a>
    </div>
    <div className="header-right">
      <nav id="site-nav" className={`site-nav${menuOpen ? " open" : ""}`} aria-label={copy.primaryLabel}>
        <div className="ecosystem-mobile-only">
          <a className="ecosystem-button" href="https://me2talk.com/" target="_blank" rel="noopener noreferrer" title={t("speaking")} onClick={() => setMenuOpen(false)}>Me2Talk ↗</a>
          <a className="ecosystem-button ecosystem-button-listen" href="https://me2listen.com/" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Me2Listen ↗</a>
        </div>
        <div className="primary-links"><a className="nav-link" href="/about" onClick={navigate("/about")}>{copy.about}</a><a className="nav-link" href="/contact" onClick={navigate("/contact")}>{copy.contact}</a></div>
        <LanguageSelect locale={locale} onChange={onLocaleChange}/>
      </nav>
      {!user && <button className="header-signin" type="button" onClick={() => { setMenuOpen(false); onSignIn(); }}><span className="header-signin-full">{t("signIn")}</span><span className="header-signin-short">{t("signInShort")}</span></button>}
      {user && <details className="user-menu"><summary><Avatar user={user}/><span><b>{user.displayName ?? user.email ?? t("account")}</b><small>{user.isAdmin ? t("administrator") : t("member")}</small></span><i>⌄</i></summary>
        <div className="user-popover">
          <div className="user-identity"><Avatar user={user}/><div><strong>{user.displayName ?? t("account")}</strong><span>{user.email}</span></div></div>
          <dl><div><dt>{t("role")}</dt><dd>{user.isAdmin ? t("administrator") : t("member")}</dd></div><div><dt>{t("status")}</dt><dd className={user.isBlocked ? "danger" : "online"}>{user.isBlocked ? t("suspended") : t("active")}</dd></div></dl>
          {user.isAdmin && <a className="admin-link" href="/admin" onClick={navigate("/admin")}>◈ {t("admin")}</a>}
          <button className="menu-button" type="button" onClick={() => { setMenuOpen(false); onLogout(); }}>↪ {t("signOut")}</button>
        </div>
      </details>}
      <button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-nav" aria-label={t("menu")} onClick={() => setMenuOpen((value) => !value)}>
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>;
}

function Avatar({ user }: { user: User }) {
  return user.avatarUrl
    ? <img className="avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer"/>
    : <span className="avatar avatar-fallback">{(user.displayName ?? user.email ?? "U").charAt(0).toUpperCase()}</span>;
}
