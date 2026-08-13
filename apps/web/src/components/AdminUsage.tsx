import { useEffect, useId, useRef, useState } from "react";
import { api, RequestError } from "../api";
import { localizeApiError, translate } from "../i18n";
import type { AdminDashboard, AdminUserUsage, Locale } from "../types";

const number = (value: number | null, locale: Locale) => value === null ? "—" : new Intl.NumberFormat(locale).format(value);
const date = (value: string, locale: Locale) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function AdminUsage({ locale, currentUserId }: { locale: Locale; currentUserId: string }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "users">("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<AdminUserUsage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setError("");
      const query = new URLSearchParams({ page: String(page), pageSize: "50", search });
      void api<AdminDashboard>(`/api/admin/dashboard?${query}`, { signal: controller.signal })
        .then(setData)
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof RequestError ? localizeApiError(locale, reason.code, reason.message) : "Could not load admin dashboard.");
        });
    }, search ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locale, page, reloadKey, search]);

  const users = data?.users ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.userPage.total / data.userPage.pageSize)) : 1;
  return <main className="admin-page">
    <div className="admin-hero"><div><p className="eyebrow">{t("admin")}</p><h1>{t("usageTitle")}</h1><p>{t("usageSubtitle")}</p>{data && <small className="report-time-zone">{t("reportTimeZone")}: {data.reportTimeZone}</small>}</div><div className="admin-tabs"><button type="button" aria-pressed={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>{t("overview")}</button><button type="button" aria-pressed={tab === "users"} className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>{t("users")} <span>{data?.userPage.total ?? 0}</span></button></div></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {!data && !error && <p className="loading-line">{t("loading")}</p>}
    {data && tab === "overview" && <><div className="usage-grid">{data.summaries.map((item) => <article className="usage-card" key={item.period}><span>{({ today:t("today"), week:t("week"), month:t("month"), year:t("year") })[item.period]}</span><strong>{number(item.requests, locale)}</strong><small>{t("requests")}</small><dl><div><dt>{t("successful")}</dt><dd>{number(item.successfulRequests, locale)}</dd></div><div><dt>{t("failed")}</dt><dd>{number(item.failedRequests, locale)}</dd></div><div><dt>{t("totalTokens")}</dt><dd>{number(item.totalTokens, locale)}</dd></div></dl></article>)}</div>
      <section className="data-panel"><h2>{t("providerModel")}</h2><div className="table-scroll"><table><thead><tr><th>Provider</th><th>Model</th><th>{t("requests")}</th><th>{t("totalTokens")}</th></tr></thead><tbody>{data.breakdown.map((row) => <tr key={`${row.provider}-${row.model}`}><td>{row.provider}</td><td><code>{row.model}</code></td><td>{number(row.requests, locale)}</td><td>{number(row.totalTokens, locale)}</td></tr>)}</tbody></table></div></section></>}
    {data && tab === "users" && <section className="data-panel users-panel"><div className="panel-toolbar"><h2>{t("users")} <small>{number(data.userPage.total, locale)}</small></h2><input aria-label={t("searchUsers")} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("searchUsers")} /></div><div className="table-scroll"><table><thead><tr><th>{t("user")}</th><th>{t("today")}</th><th>{t("week")}</th><th>{t("month")}</th><th>{t("successFailed")}</th><th>{t("totalTokens")}</th><th>{t("lastActive")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="table-user">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer"/> : <span>{(user.displayName ?? "U")[0]}</span>}<div><strong>{user.displayName ?? "—"}</strong><small>{user.email}</small></div></div></td><td>{user.evaluations.today}</td><td>{user.evaluations.week}</td><td>{user.evaluations.month}</td><td>{user.successfulEvaluations} / {user.failedEvaluations}</td><td>{number(user.totalTokens, locale)}</td><td>{user.lastEvaluationAt ? date(user.lastEvaluationAt, locale) : "—"}</td><td><Status user={user} locale={locale} t={t}/></td><td><button type="button" className="manage-button" disabled={user.id === currentUserId} onClick={() => setSelected(user)}>{t("manage")}</button></td></tr>)}{users.length === 0 && <tr><td colSpan={9}>{t("noUsers")}</td></tr>}</tbody></table></div><div className="pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{t("previous")}</button><span>{page} / {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>{t("nextPage")}</button></div></section>}
    {selected && <SuspensionDialog
      user={selected}
      locale={locale}
      onClose={() => setSelected(null)}
      onSaved={() => { setSelected(null); setReloadKey((value) => value + 1); }}
    />}
  </main>;
}

function Status({ user, locale, t }: { user: AdminUserUsage; locale: Locale; t: (key: Parameters<typeof translate>[1]) => string }) {
  const suspended = user.permanentlyBlocked || Boolean(user.blockedUntil && new Date(user.blockedUntil) > new Date());
  return <div className="status-detail"><span className={`status-pill ${suspended ? "danger" : "active"}`}>{user.permanentlyBlocked ? t("permanent") : suspended ? t("suspended") : t("active")}</span>{suspended && user.blockedUntil && !user.permanentlyBlocked && <small>{t("expires")}: {date(user.blockedUntil, locale)}</small>}{suspended && user.blockReason && <small title={user.blockReason}>{t("currentReason")}: {user.blockReason}</small>}</div>;
}

function SuspensionDialog({ user, locale, onClose, onSaved }: { user: AdminUserUsage; locale: Locale; onClose: () => void; onSaved: () => void }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [kind, setKind] = useState<"none" | "days" | "permanent">("days");
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [onClose]);

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const body = kind === "days" ? { kind, days, reason } : { kind, reason: reason || null };
      await api<{ ok: true }>(`/api/admin/users/${user.id}/suspension`, { method:"POST", body:JSON.stringify(body) });
      onSaved();
    } catch (cause) { setError(cause instanceof RequestError ? localizeApiError(locale, cause.code, cause.message) : "Could not update user access."); setSaving(false); }
  };
  const isSuspended = user.permanentlyBlocked || Boolean(user.blockedUntil && new Date(user.blockedUntil) > new Date());
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">{t("manage")}</p><h2 id={titleId}>{user.displayName ?? user.email}</h2></div><button type="button" ref={closeRef} onClick={onClose} aria-label={t("cancel")}>×</button></div>{isSuspended && <div className="current-restriction"><strong>{t("currentRestriction")}</strong>{user.permanentlyBlocked ? <span>{t("permanent")}</span> : user.blockedUntil && <span>{t("expires")}: {date(user.blockedUntil, locale)}</span>}{user.blockReason && <p>{t("currentReason")}: {user.blockReason}</p>}</div>}<div className="segmented suspension-options"><button type="button" aria-pressed={kind === "days"} className={kind === "days" ? "active" : ""} onClick={() => setKind("days")}>{t("suspendDays")}</button><button type="button" aria-pressed={kind === "permanent"} className={kind === "permanent" ? "active" : ""} onClick={() => setKind("permanent")}>{t("blockPermanent")}</button><button type="button" aria-pressed={kind === "none"} className={kind === "none" ? "active" : ""} onClick={() => setKind("none")}>{t("unblock")}</button></div>{kind === "days" && <label>{t("days")}<input type="number" min={1} max={3650} value={days} onChange={(event) => setDays(Number(event.target.value))}/></label>}{kind !== "none" && <label>{t("reason")}<textarea className="reason-input" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)}/></label>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>{t("cancel")}</button><button type="button" className="primary-button" disabled={saving || (kind !== "none" && !reason.trim()) || (kind === "days" && (days < 1 || days > 3650))} onClick={() => { void submit(); }}>{saving ? t("loading") : t("apply")}</button></div></section></div>;
}
