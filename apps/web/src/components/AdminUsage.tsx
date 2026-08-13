import { useEffect, useState } from "react";
import { api, RequestError } from "../api";
import type { UsageDashboard } from "../types";

const periodLabels = { today: "Today", week: "This week", month: "This month", year: "This year" };
const number = (value: number | null) => value === null ? "—" : new Intl.NumberFormat().format(value);

export function AdminUsage() {
  const [data, setData] = useState<UsageDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void api<UsageDashboard>("/api/admin/llm-usage").then(setData).catch((reason: unknown) => setError(reason instanceof RequestError ? reason.message : "Could not load usage.")); }, []);
  return <main className="admin-page"><div className="page-title"><p className="eyebrow">Admin</p><h1>LLM usage</h1><p>Request health and usage recorded independently for me2write.</p></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {!data && !error && <p className="loading-line">Loading usage…</p>}
    {data && <><div className="usage-grid">{data.summaries.map((item) => <article className="usage-card" key={item.period}><h2>{periodLabels[item.period]}</h2><strong>{number(item.requests)}</strong><span>requests</span><dl><div><dt>Successful</dt><dd>{number(item.successfulRequests)}</dd></div><div><dt>Failed</dt><dd>{number(item.failedRequests)}</dd></div><div><dt>Input tokens</dt><dd>{number(item.inputTokens)}</dd></div><div><dt>Output tokens</dt><dd>{number(item.outputTokens)}</dd></div><div><dt>Total tokens</dt><dd>{number(item.totalTokens)}</dd></div>{item.providerUsage.map((usage) => <div key={usage.unit}><dt>{usage.unit}</dt><dd>{number(usage.value)}</dd></div>)}</dl></article>)}</div>
      <section className="usage-table"><h2>Provider & model · this year</h2><div className="table-scroll"><table><thead><tr><th>Provider</th><th>Model</th><th>Requests</th><th>Total tokens</th><th>Provider usage</th></tr></thead><tbody>{data.breakdown.map((row) => <tr key={`${row.provider}-${row.model}-${row.providerUsageUnit ?? "tokens"}`}><td>{row.provider}</td><td><code>{row.model}</code></td><td>{number(row.requests)}</td><td>{number(row.totalTokens)}</td><td>{number(row.providerUsageValue)} {row.providerUsageUnit ?? ""}</td></tr>)}{data.breakdown.length === 0 && <tr><td colSpan={5}>No usage recorded this year.</td></tr>}</tbody></table></div></section></>}
  </main>;
}
