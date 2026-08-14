import { useEffect, useMemo, useState } from "react";
import { api, API_ORIGIN, RequestError } from "./api";
import { AdminUsage } from "./components/AdminUsage";
import { EvaluationResult } from "./components/EvaluationResult";
import { Header } from "./components/Header";
import { PracticeStudio } from "./components/PracticeStudio";
import { PublicPage } from "./components/PublicPage";
import { SiteFooter } from "./components/SiteFooter";
import { localizeApiError, resolveLocale, translate } from "./i18n";
import { applyPageMetadata, resolveSitePath } from "./site";
import type { CefrLevel, EvaluationResponse, Locale, User } from "./types";

const levels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const countWords = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;
type WorkspaceMode = "checker" | "topic" | "exam";
const workspaceFromHash = (): WorkspaceMode | null => window.location.hash === "#writing-checker" ? "checker" : window.location.hash === "#writing-practice" ? "topic" : window.location.hash === "#exam-practice" ? "exam" : null;

export function App() {
  const sitePath = resolveSitePath(window.location.pathname);
  const [locale, setLocale] = useState<Locale>(resolveLocale);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"estimate" | "targeted">("estimate");
  const [targetLevel, setTargetLevel] = useState<CefrLevel>("B1");
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string; requestId: string | undefined } | null>(null);
  const [evaluationRequestId, setEvaluationRequestId] = useState<string | null>(null);
  const [maximumWords, setMaximumWords] = useState(1000);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => workspaceFromHash() ?? "checker");
  const words = useMemo(() => countWords(text), [text]);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  useEffect(() => {
    document.documentElement.lang = sitePath === "/about" || sitePath === "/contact" || sitePath === "/privacy" ? "en" : locale;
    window.localStorage.setItem("me2write_locale", locale);
    applyPageMetadata(sitePath, locale);
  }, [locale, sitePath]);
  useEffect(() => {
    if (sitePath === "/about" || sitePath === "/contact" || sitePath === "/privacy" || sitePath === "/404") {
      setAuthLoading(false);
      return;
    }
    void api<{ user: User }>("/api/me").then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
    void api<{ maximumWritingWords: number }>("/api/config").then((config) => setMaximumWords(config.maximumWritingWords)).catch(() => undefined);
  }, [sitePath]);
  useEffect(() => {
    if (sitePath !== "/") return;
    const syncWorkspace = () => {
      const nextWorkspace = workspaceFromHash();
      if (nextWorkspace) setWorkspaceMode(nextWorkspace);
    };
    window.addEventListener("hashchange", syncWorkspace);
    return () => window.removeEventListener("hashchange", syncWorkspace);
  }, [sitePath]);

  const logout = async () => { await api<{ ok: boolean }>("/auth/logout", { method: "POST" }); setUser(null); setResult(null); };
  const resetDraftState = () => { setEvaluationRequestId(null); setError(null); setResult(null); };
  const submit = async () => {
    if (!user || user.isBlocked || submitting || words === 0 || words > maximumWords) return;
    const id = evaluationRequestId ?? crypto.randomUUID();
    setEvaluationRequestId(id); setSubmitting(true); setError(null); setResult(null);
    try {
      const response = await api<EvaluationResponse>("/api/evaluations", { method: "POST", body: JSON.stringify({
        requestId: id, text, mode, targetLevel: mode === "targeted" ? targetLevel : null, feedbackLanguage: locale
      }) });
      setResult(response); setEvaluationRequestId(null);
    } catch (reason) {
      const normalized = reason instanceof RequestError ? reason : new RequestError("UNKNOWN_ERROR", "We couldn't check your writing. Please try again.", 500);
      setError({ code: normalized.code, message: localizeApiError(locale, normalized.code, normalized.message), requestId: normalized.requestId });
      if (["INVALID_INPUT", "WRITING_TOO_LONG", "EVALUATION_FAILED", "DUPLICATE_REQUEST"].includes(normalized.code)) setEvaluationRequestId(null);
      if (normalized.code === "AUTH_REQUIRED") setUser(null);
      if (normalized.code === "USER_BLOCKED") setUser((current) => current ? { ...current, isBlocked: true } : current);
    } finally { setSubmitting(false); }
  };

  const featureHref = (feature: WorkspaceMode) => feature === "checker" ? "/#writing-checker" : feature === "topic" ? "/#writing-practice" : "/#exam-practice";
  return <div className="app-shell">
    <Header user={user} locale={locale} onLocaleChange={setLocale} onLogout={() => { void logout(); }}/>
    {sitePath === "/admin"
      ? user?.isAdmin ? <AdminUsage locale={locale} currentUserId={user.id}/> : <main className="center-state">{authLoading ? t("loading") : "403"}</main>
      : sitePath === "/about" || sitePath === "/contact" || sitePath === "/privacy"
        ? <PublicPage path={sitePath}/>
        : sitePath === "/404"
          ? <main className="not-found"><p className="eyebrow">404</p><h1>Page not found</h1><p>The page you requested does not exist.</p><a className="primary-button" href="/">Return to me2write</a></main>
          : <main>
        <section className="hero"><div><p className="eyebrow">{t("product")}</p><h1>{t("title")}</h1><p className="hero-copy">{t("subtitle")}</p><p className="system-status"><span/> {t("connected")}</p></div><div className="hero-visual" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><strong>CEFR</strong><small>A1 · A2 · B1 · B2 · C1 · C2</small></div></section>
        <nav id="features" className="feature-navigation" aria-label="Writing features">
          <section id="writing-checker" className={workspaceMode === "checker" ? "active" : undefined}><a href={featureHref("checker")} aria-current={workspaceMode === "checker" ? "page" : undefined}><h2>Writing checker</h2><p>Get CEFR-aligned feedback for your own English draft.</p></a></section>
          <section id="writing-practice" className={workspaceMode === "topic" ? "active" : undefined}><a href={featureHref("topic")} aria-current={workspaceMode === "topic" ? "page" : undefined}><h2>Writing practice</h2><p>Write from guided general and IELTS-style topics.</p></a></section>
          <section id="exam-practice" className={workspaceMode === "exam" ? "active" : undefined}><a href={featureHref("exam")} aria-current={workspaceMode === "exam" ? "page" : undefined}><h2>Exam practice</h2><p>Complete IELTS and TOEIC writing practice tasks.</p></a></section>
        </nav>
        {workspaceMode !== "checker" && <section id="writing-workspace" className="feature-section"><PracticeStudio key={workspaceMode} locale={locale} user={user} mode={workspaceMode} maximumWords={maximumWords}/></section>}
        {workspaceMode === "checker" && <section id="writing-workspace" className="workspace feature-section" aria-labelledby="writing-heading">
          <div className="mode-grid"><button type="button" aria-pressed={mode === "estimate"} className={mode === "estimate" ? "active" : ""} onClick={() => { setMode("estimate"); resetDraftState(); }}><span>01</span><strong>{t("estimate")}</strong><small>{t("estimateDesc")}</small></button><button type="button" aria-pressed={mode === "targeted"} className={mode === "targeted" ? "active" : ""} onClick={() => { setMode("targeted"); resetDraftState(); }}><span>02</span><strong>{t("targeted")}</strong><small>{t("targetedDesc")}</small></button></div>
          {mode === "targeted" && <fieldset className="target-selector"><legend>{t("targetLevel")}</legend><div>{levels.map((level) => <button type="button" aria-pressed={targetLevel === level} className={targetLevel === level ? "active" : ""} key={level} onClick={() => { setTargetLevel(level); resetDraftState(); }}>{level}</button>)}</div></fieldset>}
          {!authLoading && !user && <div className="signin-panel"><div><span className="panel-icon">↗</span><div><h3>{t("signInTitle")}</h3><p>{t("signInCopy")}</p></div></div><a className="primary-button" href={`${API_ORIGIN}/auth/google`}>{t("signIn")}</a></div>}
          {user?.isBlocked && <div className="blocked-banner">⊘ {t("blocked")}{user.blockedUntil && !user.permanentlyBlocked ? ` · ${new Intl.DateTimeFormat(locale, { dateStyle:"medium" }).format(new Date(user.blockedUntil))}` : ""}</div>}
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <div className="workspace-heading"><div><p className="eyebrow">{t("draft")}</p><h2 id="writing-heading">{t("draftTitle")}</h2></div><span className={words > maximumWords ? "word-count over" : "word-count"}>{words} / {maximumWords}</span></div>
            <label className="sr-only" htmlFor="writing-input">{t("draftTitle")}</label><textarea id="writing-input" value={text} onChange={(event) => { setText(event.target.value); resetDraftState(); }} disabled={submitting} placeholder={t("placeholder")} aria-invalid={words > maximumWords}/>
            <div className="form-footer"><p>{t("helper")}</p><button className="primary-button" type="submit" disabled={!user || user.isBlocked || submitting || words === 0 || words > maximumWords}>{submitting ? <><span className="spinner"/> {t("checking")}</> : <>{t("check")} <span>→</span></>}</button></div>
          </form>
          {submitting && <div className="analysis-status"><span className="pulse-dot"/><p>{t("checking")}</p><i/></div>}
          {error && <div className="error-banner" role="alert"><div><strong>{error.code}</strong><p>{error.message}</p>{error.requestId && <small>{t("reference")}: {error.requestId}</small>}</div><button type="button" aria-label={t("retry")} onClick={() => { void submit(); }}>↻</button></div>}
        </section>}
        {workspaceMode === "checker" && result?.evaluation && <EvaluationResult result={result.evaluation} locale={locale}/>}
      </main>}
    <SiteFooter/>
  </div>;
}
