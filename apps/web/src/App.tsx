import { useEffect, useMemo, useState } from "react";
import { api, API_ORIGIN, RequestError } from "./api";
import { AdminUsage } from "./components/AdminUsage";
import { EvaluationResult } from "./components/EvaluationResult";
import { Header } from "./components/Header";
import { PracticeStudio } from "./components/PracticeStudio";
import { localeLabels, localizeApiError, resolveLocale, translate } from "./i18n";
import type { CefrLevel, EvaluationResponse, Locale, User } from "./types";

const levels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const countWords = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;

export function App() {
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
  const [workspaceMode, setWorkspaceMode] = useState<"checker" | "topic" | "exam">("checker");
  const words = useMemo(() => countWords(text), [text]);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("me2write_locale", locale);
  }, [locale]);
  useEffect(() => {
    void api<{ user: User }>("/api/me").then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
    void api<{ maximumWritingWords: number }>("/api/config").then((config) => setMaximumWords(config.maximumWritingWords)).catch(() => undefined);
  }, []);

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

  const isAdminPage = window.location.pathname.startsWith("/admin");
  return <div className="app-shell">
    <Header user={user} locale={locale} onLocaleChange={setLocale} onLogout={() => { void logout(); }}/>
    {isAdminPage
      ? user?.isAdmin ? <AdminUsage locale={locale} currentUserId={user.id}/> : <main className="center-state">{authLoading ? t("loading") : "403"}</main>
      : <main>
        <section className="hero"><div><p className="eyebrow">{t("product")}</p><h1>{t("title")}</h1><p className="hero-copy">{t("subtitle")}</p><p className="system-status"><span/> {t("connected")}</p></div><div className="hero-visual" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><strong>CEFR</strong><small>A1 · A2 · B1 · B2 · C1 · C2</small></div></section>
        <div className="mode-grid"><button type="button" aria-pressed={workspaceMode === "checker"} className={workspaceMode === "checker" ? "active" : ""} onClick={() => setWorkspaceMode("checker")}>Writing Checker</button><button type="button" aria-pressed={workspaceMode === "topic"} className={workspaceMode === "topic" ? "active" : ""} onClick={() => setWorkspaceMode("topic")}>Writing Practice</button><button type="button" aria-pressed={workspaceMode === "exam"} className={workspaceMode === "exam" ? "active" : ""} onClick={() => setWorkspaceMode("exam")}>Exam Practice</button></div>
        {workspaceMode !== "checker" && <PracticeStudio key={workspaceMode} locale={locale} user={user} mode={workspaceMode} maximumWords={maximumWords}/>}
        {workspaceMode === "checker" && <section className="workspace" aria-labelledby="writing-heading">
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
    <footer><span>© {new Date().getFullYear()} me2write</span><span>{localeLabels[locale]} · Independent from me2talk</span></footer>
  </div>;
}
