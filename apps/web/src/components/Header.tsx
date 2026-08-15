import type { Locale, User } from "../types";
import { getContent } from "../content-i18n";
import { translate } from "../i18n";
import { LanguageSelect } from "./LanguageSelect";

export function Header({ user, locale, onLocaleChange, onLogout, onSignIn, onNavigate }: {
  user: User | null; locale: Locale; onLocaleChange: (locale: Locale) => void; onLogout: () => void; onSignIn: () => void; onNavigate: (path: string) => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const copy = getContent(locale).navigation;
  return <header className="site-header">
    <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }} aria-label={copy.homeLabel}><span className="brand-mark">M2</span><span><b>me2write</b><small>{copy.brandTagline}</small></span></a>
    <nav aria-label={copy.primaryLabel}>
      <div className="primary-links"><a className="nav-link" href="/about" onClick={(event) => { event.preventDefault(); onNavigate("/about"); }}>{copy.about}</a><a className="nav-link" href="/contact" onClick={(event) => { event.preventDefault(); onNavigate("/contact"); }}>{copy.contact}</a><a className="nav-link ecosystem-link" href="https://me2talk.com/" target="_blank" rel="noopener noreferrer">{t("speaking")}</a></div>
      <a className="ecosystem-link ecosystem-link-mobile" href="https://me2talk.com/" target="_blank" rel="noopener noreferrer">{t("speaking")}</a>
      <LanguageSelect locale={locale} onChange={onLocaleChange}/>
      {!user && <button className="header-signin" type="button" onClick={onSignIn}>{t("signIn")}</button>}
      {user && <details className="user-menu"><summary><Avatar user={user}/><span><b>{user.displayName ?? user.email ?? t("account")}</b><small>{user.isAdmin ? t("administrator") : t("member")}</small></span><i>⌄</i></summary>
        <div className="user-popover">
          <div className="user-identity"><Avatar user={user}/><div><strong>{user.displayName ?? t("account")}</strong><span>{user.email}</span></div></div>
          <dl><div><dt>{t("role")}</dt><dd>{user.isAdmin ? t("administrator") : t("member")}</dd></div><div><dt>{t("status")}</dt><dd className={user.isBlocked ? "danger" : "online"}>{user.isBlocked ? t("suspended") : t("active")}</dd></div></dl>
          {user.isAdmin && <a className="admin-link" href="/admin" onClick={(event) => { event.preventDefault(); onNavigate("/admin"); }}>◈ {t("admin")}</a>}
          <button className="menu-button" type="button" onClick={onLogout}>↪ {t("signOut")}</button>
        </div>
      </details>}
    </nav>
  </header>;
}

function Avatar({ user }: { user: User }) {
  return user.avatarUrl
    ? <img className="avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer"/>
    : <span className="avatar avatar-fallback">{(user.displayName ?? user.email ?? "U").charAt(0).toUpperCase()}</span>;
}
