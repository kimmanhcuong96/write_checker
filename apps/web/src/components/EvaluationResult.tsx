import type { Evaluation } from "../types";

const labels: Record<keyof Evaluation["scores"], string> = {
  grammar: "Grammar", vocabulary: "Vocabulary", sentenceComplexity: "Sentence complexity",
  coherence: "Coherence", cohesion: "Cohesion", communicativeEffectiveness: "Communication", naturalness: "Naturalness"
};
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function EvaluationResult({ result }: { result: Evaluation }) {
  const next = levels[levels.indexOf(result.level) + 1];
  return <section className="result" aria-labelledby="result-heading">
    <div className="level-card">
      <div><p className="eyebrow">Estimated CEFR level</p><h2 id="result-heading">{result.level}</h2></div>
      <p>{result.levelReason}</p>
    </div>
    <div className="score-grid" aria-label="Writing scores">
      {Object.entries(result.scores).map(([key, value]) => <div className="score" key={key}>
        <div><span>{labels[key as keyof Evaluation["scores"]]}</span><strong>{value}<small>/10</small></strong></div>
        <div className="score-track" aria-hidden="true"><i style={{ width: `${value * 10}%` }} /></div>
      </div>)}
    </div>
    <div className="feedback-grid">
      <Feedback title="What works" tone="good" items={result.strengths} />
      <Feedback title="Priorities" tone="attention" items={result.problems} />
    </div>
    {result.corrections.length > 0 && <section className="corrections"><p className="eyebrow">Learn from the details</p><h3>Useful corrections</h3>
      <div className="correction-list">{result.corrections.map((item, index) => <article className="correction" key={`${item.original}-${index}`}>
        <div><span>Original</span><s>{item.original}</s></div><div><span>Better</span><strong>{item.better}</strong></div><p>{item.explanation}</p>
      </article>)}</div>
    </section>}
    <section className="plan"><div><p className="eyebrow">Your next move</p><h3>{next ? `${result.level} → ${next}` : "C2 refinement"}</h3></div>
      <ul>{result.improvementPlan.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>
  </section>;
}

function Feedback({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  return <section className={`feedback ${tone}`}><h3>{title}</h3><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>;
}
