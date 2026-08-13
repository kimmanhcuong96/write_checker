import type { Locale, User } from "../types";
import { localeFlags, localeLabels, translate } from "../i18n";

export function Header({ user, locale, onLocaleChange, onLogout }: {
  user: User | null; locale: Locale; onLocaleChange: (locale: Locale) => void; onLogout: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return <header className="site-header">
    <a className="brand" href="/" aria-label="me2write home"><span className="brand-mark">M2</span><span><b>me2write</b><small>Writing intelligence</small></span></a>
    <nav aria-label="Primary navigation">
      <a className="nav-link" href="https://me2talk.com" target="_blank" rel="noreferrer">{t("speaking")}</a>
      <label className="locale-control"><span>{localeFlags[locale]}</span><select aria-label={t("language")} value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
        {(Object.keys(localeLabels) as Locale[]).map((item) => <option key={item} value={item}>{localeLabels[item]}</option>)}
      </select></label>
      {user && <details className="user-menu"><summary><Avatar user={user}/><span><b>{user.displayName ?? user.email ?? t("account")}</b><small>{user.isAdmin ? t("administrator") : t("member")}</small></span><i>⌄</i></summary>
        <div className="user-popover">
          <div className="user-identity"><Avatar user={user}/><div><strong>{user.displayName ?? t("account")}</strong><span>{user.email}</span></div></div>
          <dl><div><dt>{t("role")}</dt><dd>{user.isAdmin ? t("administrator") : t("member")}</dd></div><div><dt>{t("status")}</dt><dd className={user.isBlocked ? "danger" : "online"}>{user.isBlocked ? t("suspended") : t("active")}</dd></div></dl>
          {user.isAdmin && <a className="admin-link" href="/admin">◈ {t("admin")}</a>}
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
