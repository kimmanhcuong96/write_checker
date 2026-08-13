import { useEffect, useMemo, useState } from "react";
import { api, API_ORIGIN, RequestError } from "./api";
import { AdminUsage } from "./components/AdminUsage";
import { EvaluationResult } from "./components/EvaluationResult";
import { Header } from "./components/Header";
import type { EvaluationResponse, User } from "./types";

const progressCopy = ["Analyzing your writing…", "Evaluating grammar and vocabulary…", "Estimating your CEFR level…"];
const countWords = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [text, setText] = useState("");
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [maximumWords, setMaximumWords] = useState(1000);
  const words = useMemo(() => countWords(text), [text]);

  useEffect(() => {
    void api<{ user: User }>("/api/me").then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setAuthLoading(false));
    void api<{ maximumWritingWords: number }>("/api/config").then((config) => setMaximumWords(config.maximumWritingWords)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!submitting) return;
    const timer = window.setInterval(() => setProgressIndex((index) => (index + 1) % progressCopy.length), 1800);
    return () => window.clearInterval(timer);
  }, [submitting]);

  const logout = async () => { await api<{ ok: boolean }>("/auth/logout", { method: "POST" }); setUser(null); setResult(null); };
  const updateText = (value: string) => { setText(value); setRequestId(null); setError(null); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || submitting || words === 0 || words > maximumWords) return;
    const id = requestId ?? crypto.randomUUID();
    setRequestId(id); setSubmitting(true); setError(null); setResult(null); setProgressIndex(0);
    try {
      const response = await api<EvaluationResponse>("/api/evaluations", { method: "POST", body: JSON.stringify({ requestId: id, text }) });
      setResult(response); setRequestId(null);
    } catch (reason) {
      const normalized = reason instanceof RequestError ? reason : new RequestError("UNKNOWN_ERROR", "We couldn't check your writing. Please try again.", 500);
      setError({ code: normalized.code, message: normalized.message });
      if (["INVALID_INPUT", "WRITING_TOO_LONG", "EVALUATION_FAILED", "DUPLICATE_REQUEST"].includes(normalized.code)) setRequestId(null);
      if (normalized.code === "AUTH_REQUIRED") setUser(null);
    } finally { setSubmitting(false); }
  };

  const isAdminPage = window.location.pathname === "/admin/llm-usage";
  return <div className="app-shell">
    <Header user={user} onLogout={() => { void logout(); }} />
    {isAdminPage ? <AdminUsage /> : <main>
      <section className="hero"><p className="eyebrow">English writing, made clearer</p><h1>Write with more<br/><em>confidence.</em></h1><p className="hero-copy">Get focused CEFR feedback that shows what works, what matters, and exactly where to go next.</p></section>
      <section className="workspace" aria-labelledby="writing-heading">
        <div className="workspace-heading"><div><p className="eyebrow">Your draft</p><h2 id="writing-heading">What are you working on?</h2></div><span className={words > maximumWords ? "word-count over" : "word-count"}>{words} / {maximumWords} words</span></div>
        {!authLoading && !user && <div className="signin-panel"><div><h3>Sign in to check your writing</h3><p>Your evaluations stay connected to your independent me2write account.</p></div><a className="primary-button" href={`${API_ORIGIN}/auth/google`}><GoogleIcon /> Continue with Google</a></div>}
        <form onSubmit={(event) => { void submit(event); }}>
          <label className="sr-only" htmlFor="writing">English writing to evaluate</label>
          <textarea id="writing" value={text} onChange={(event) => updateText(event.target.value)} disabled={submitting} placeholder="Paste an essay, email, journal entry, or anything you're writing in English…" aria-describedby="writing-help writing-error" aria-invalid={words > maximumWords} />
          <div className="form-footer"><p id="writing-help">Aim for at least a few sentences so the level estimate has enough evidence.</p><button className="primary-button check-button" type="submit" disabled={!user || submitting || words === 0 || words > maximumWords}>{submitting ? <><span className="spinner" /> Checking…</> : <>Check my writing <span>→</span></>}</button></div>
        </form>
        {submitting && <div className="analysis-status" role="status"><span className="pulse-dot"/><p>{progressCopy[progressIndex]}</p></div>}
        {words > maximumWords && <div id="writing-error" className="error-banner" role="alert">Your writing is {words - maximumWords} words over the limit.</div>}
        {error && <div id="writing-error" className={`error-banner ${error.code === "AI_QUOTA_UNAVAILABLE" ? "quota" : ""}`} role="alert"><div><strong>{error.code === "AI_QUOTA_UNAVAILABLE" ? "Evaluation temporarily paused" : "We couldn't finish that check"}</strong><p>{error.message}</p></div>{error.code !== "AI_QUOTA_UNAVAILABLE" && user && <button type="button" onClick={(event) => { void submit(event as unknown as React.FormEvent); }}>Try again</button>}</div>}
      </section>
      {result?.evaluation && <EvaluationResult result={result.evaluation} />}
    </main>}
    <footer><span>© {new Date().getFullYear()} me2write</span><span>Independent from me2talk · Built for deliberate practice</span></footer>
  </div>;
}

function GoogleIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"/><path fill="#EA4335" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z"/></svg>; }
