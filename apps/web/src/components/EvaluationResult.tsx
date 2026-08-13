import { translate } from "../i18n";
import type { Evaluation, Locale } from "../types";

const scoreKeys: Array<keyof Evaluation["scores"]> = ["grammar", "vocabulary", "sentenceComplexity", "coherence", "cohesion", "communicativeEffectiveness", "naturalness"];
const scoreLabels: Record<Locale, Record<keyof Evaluation["scores"], string>> = {
  en: { grammar:"Grammar", vocabulary:"Vocabulary", sentenceComplexity:"Sentence complexity", coherence:"Coherence", cohesion:"Cohesion", communicativeEffectiveness:"Communication", naturalness:"Naturalness" },
  vi: { grammar:"Ngữ pháp", vocabulary:"Từ vựng", sentenceComplexity:"Độ phức tạp câu", coherence:"Mạch lạc", cohesion:"Liên kết", communicativeEffectiveness:"Hiệu quả giao tiếp", naturalness:"Tự nhiên" },
  zh: { grammar:"语法", vocabulary:"词汇", sentenceComplexity:"句子复杂度", coherence:"连贯性", cohesion:"衔接性", communicativeEffectiveness:"沟通效果", naturalness:"自然度" },
  ja: { grammar:"文法", vocabulary:"語彙", sentenceComplexity:"文の複雑さ", coherence:"一貫性", cohesion:"結束性", communicativeEffectiveness:"伝達力", naturalness:"自然さ" }
};
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function EvaluationResult({ result, locale }: { result: Evaluation; locale: Locale }) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const next = levels[levels.indexOf(result.level) + 1];
  return <section className="result" aria-labelledby="result-heading">
    <div className="level-card"><div><p className="eyebrow">{t("estimatedLevel")}</p><h2 id="result-heading">{result.level}</h2></div><p>{result.levelReason}</p></div>
    {result.targetAssessment && <section className={`target-result ${result.targetAssessment.meetsTarget ? "pass" : "gap"}`}>
      <div className="target-verdict"><span className="target-orbit">{result.targetAssessment.targetLevel}</span><div><p className="eyebrow">{t("targetReview")}</p><h3>{result.targetAssessment.meetsTarget ? t("meets") : t("notMeets")}</h3><p>{result.targetAssessment.verdict}</p></div></div>
      <div className="target-detail-grid"><Feedback title={t("gaps")} items={result.targetAssessment.gapSummary}/>
        <section><h4>{t("sentenceUpgrades")}</h4>{result.targetAssessment.sentenceUpgrades.map((item, index) => <article className="upgrade" key={index}><code>{item.original}</code><p>{item.assessment}</p><div>{item.alternatives.map((alternative) => <span key={alternative}>{alternative}</span>)}</div></article>)}</section>
        <section><h4>{t("vocabularyUpgrades")}</h4>{result.targetAssessment.vocabularyUpgrades.map((item, index) => <article className="upgrade" key={index}><code>{item.original}</code><p>{item.reason}</p><div>{item.alternatives.map((alternative) => <span key={alternative}>{alternative}</span>)}</div></article>)}</section>
      </div>
    </section>}
    <div className="section-heading"><p className="eyebrow">{t("scores")}</p></div>
    <div className="score-grid">{scoreKeys.map((key) => <div className="score" key={key}><div><span>{scoreLabels[locale][key]}</span><strong>{result.scores[key]}<small>/10</small></strong></div><div className="score-track"><i style={{ width: `${result.scores[key] * 10}%` }}/></div></div>)}</div>
    <div className="feedback-grid"><Feedback title={t("works")} items={result.strengths}/><Feedback title={t("priorities")} items={result.problems}/></div>
    {result.corrections.length > 0 && <section className="corrections"><p className="eyebrow">{t("corrections")}</p><div className="correction-list">{result.corrections.map((item, index) => <article className="correction" key={index}><div><span>{t("original")}</span><s>{item.original}</s></div><div><span>{t("better")}</span><strong>{item.better}</strong></div><p>{item.explanation}</p></article>)}</div></section>}
    <section className="plan"><div><p className="eyebrow">{t("next")}</p><h3>{next ? `${result.level} → ${next}` : "C2"}</h3></div><ul>{result.improvementPlan.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
  </section>;
}

function Feedback({ title, items }: { title: string; items: string[] }) {
  return <section className="feedback"><h4>{title}</h4><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>;
}
