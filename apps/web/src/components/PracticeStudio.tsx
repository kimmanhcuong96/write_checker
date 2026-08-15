import { useEffect, useMemo, useState } from "react";
import { api, RequestError } from "../api";
import { getContent } from "../content-i18n";
import { localizeApiError } from "../i18n";
import type { Evaluation, IeltsCriteria, IeltsEvaluation, Locale, PracticeEvaluation, PracticeTask, ToeicEvaluation, User } from "../types";
import { EvaluationResult } from "./EvaluationResult";

type Topic = { id: string; category: "GENERAL" | "IELTS"; title: string; prompt: string; active: boolean };
type ContentResponse = { topics: Topic[]; exams: { ielts: { ACADEMIC: PracticeTask[]; GENERAL: PracticeTask[] }; toeic: PracticeTask[] } };
type Props = { locale: Locale; user: User | null; mode: "topic" | "exam"; maximumWords: number; onRequireAuth: () => void };
const limits = [null, 5, 10, 15, 20, 30, 45, 60] as const;
const words = (value: string) => value.trim() ? value.trim().split(/\s+/u).length : 0;
const formatTime = (seconds: number | null, noLimit: string) => seconds === null ? noLimit : `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
type ResultCopy = ReturnType<typeof getContent>["results"];

export function PracticeStudio({ locale, user, mode, maximumWords, onRequireAuth }: Props) {
  const copy = getContent(locale);
  const p = copy.practice;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [examTasks, setExamTasks] = useState<PracticeTask[]>([]);
  const [category, setCategory] = useState<"GENERAL" | "IELTS">("GENERAL");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [examType, setExamType] = useState<"IELTS" | "TOEIC">("IELTS");
  const [variant, setVariant] = useState<"IELTS_ACADEMIC" | "IELTS_GENERAL">("IELTS_ACADEMIC");
  const [limitMinutes, setLimitMinutes] = useState<number | null>(15);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessionLimitSeconds, setSessionLimitSeconds] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [timerStopped, setTimerStopped] = useState(false);
  const [expired, setExpired] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);

  useEffect(() => {
    void api<ContentResponse>("/api/practice/content").then((content) => {
      setTopics(content.topics);
      setExamTasks(mode === "exam" ? content.exams.ielts.ACADEMIC : []);
    }).catch(() => setMessage(p.loadError));
  }, [mode, p.loadError]);

  useEffect(() => {
    if (!startedAt || sessionLimitSeconds === null || expired || timerStopped || evaluation !== null) return;
    const timer = window.setInterval(() => {
      const next = Math.max(0, sessionLimitSeconds - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(next);
      if (next === 0) setExpired(true);
    }, 250);
    return () => window.clearInterval(timer);
  }, [startedAt, sessionLimitSeconds, expired, timerStopped, evaluation]);

  const availableTopics = useMemo(() => topics.filter((item) => item.category === category && item.active), [topics, category]);
  const activeTask = examTasks[current];
  const currentWordCount = words(answers[current] ?? "");
  const answersInvalid = answers.length === 0 || answers.some((answer) => !answer.trim() || words(answer) > maximumWords);

  const start = async () => {
    if (!user) { onRequireAuth(); return; }
    setStarting(true);
    setMessage("");
    try {
      const session = await api<{ id: string; status: "IN_PROGRESS" | "TIME_EXPIRED"; startedAt: string | null; serverNow: string; timeLimitSeconds: number | null; tasks: PracticeTask[] }>("/api/practice/sessions", {
        method: "POST",
        body: JSON.stringify(mode === "topic"
          ? { mode: "TOPIC", category, promptId: topic?.id, configuredTimeSeconds: limitMinutes === null ? null : limitMinutes * 60 }
          : { mode: "EXAM", examType, ...(examType === "IELTS" ? { examVariant: variant } : {}) })
      });
      const serverElapsedMs = session.startedAt ? Math.max(0, new Date(session.serverNow).getTime() - new Date(session.startedAt).getTime()) : 0;
      const stamp = Date.now() - serverElapsedMs;
      const nextRemaining = session.timeLimitSeconds === null ? null : Math.max(0, session.timeLimitSeconds - Math.floor(serverElapsedMs / 1000));
      setSessionId(session.id);
      setStartedAt(stamp);
      setSessionLimitSeconds(session.timeLimitSeconds);
      setRemaining(nextRemaining);
      setTimerStopped(false);
      setExpired(session.status === "TIME_EXPIRED" || nextRemaining === 0);
      setExamTasks(mode === "exam" ? session.tasks : []);
      setCurrent(0);
      setAnswers(mode === "exam" ? Array(session.tasks.length).fill("") : [answers[0] ?? ""]);
    } catch (error) {
      setMessage(error instanceof RequestError ? localizeApiError(locale, error.code, error.message) : p.startError);
    } finally {
      setStarting(false);
    }
  };

  const chooseRandom = async () => {
    setMessage("");
    try {
      setTopic((await api<{ topic: Topic }>(`/api/practice/topics/random?category=${category}`)).topic);
    } catch (error) {
      setMessage(error instanceof RequestError ? localizeApiError(locale, error.code, error.message) : p.randomError);
    }
  };

  const selectExam = (nextType: "IELTS" | "TOEIC", nextVariant = variant) => {
    setExamType(nextType);
    setCurrent(0);
    setAnswers([]);
    void api<ContentResponse>("/api/practice/content").then((content) => {
      setExamTasks(nextType === "TOEIC" ? content.exams.toeic : content.exams.ielts[nextVariant === "IELTS_GENERAL" ? "GENERAL" : "ACADEMIC"]);
    }).catch(() => setMessage(p.loadError));
  };

  const submit = async () => {
    if (!user) { onRequireAuth(); return; }
    if (!sessionId || !startedAt || submitting || answersInvalid) return;
    const submissionRemaining = sessionLimitSeconds === null ? null : Math.max(0, sessionLimitSeconds - Math.floor((Date.now() - startedAt) / 1000));
    setRemaining(submissionRemaining);
    setExpired(submissionRemaining === 0);
    setTimerStopped(true);
    setSubmitting(true);
    setMessage("");
    try {
      const response = await api<{ evaluation: { evaluation: PracticeEvaluation }; session: unknown }>(`/api/practice/sessions/${sessionId}/submit`, { method: "POST", body: JSON.stringify({ answers, feedbackLanguage: locale }) });
      setEvaluation(response.evaluation.evaluation);
      setMessage(p.submitted);
    } catch (error) {
      setMessage(error instanceof RequestError ? localizeApiError(locale, error.code, error.message) : p.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSession = () => {
    setStartedAt(null);
    setSessionLimitSeconds(null);
    setRemaining(null);
    setTimerStopped(false);
    setExpired(false);
    setCurrent(0);
    setAnswers([]);
    setSessionId(null);
    setEvaluation(null);
    setMessage("");
  };

  const locked = (mode === "exam" && !startedAt) || expired || evaluation !== null;
  return <section className="workspace practice-studio" aria-labelledby="practice-heading">
    <div className="workspace-heading"><div><p className="eyebrow">{mode === "topic" ? p.writingPractice : p.examPractice}</p><h2 id="practice-heading">{mode === "topic" ? p.chooseTopic : p.timedExam}</h2></div>{startedAt && <strong className={expired ? "timer expired" : "timer"}>{expired ? p.timeExpired : formatTime(remaining, p.noLimit)}</strong>}</div>
    {!startedAt && mode === "topic" && <div className="practice-controls">
      <div className="practice-control-fields">
        <label>{p.category}<select value={category} onChange={(event) => { setCategory(event.target.value as typeof category); setTopic(null); }}><option value="GENERAL">{p.generalTopics}</option><option value="IELTS">{p.ieltsTopics}</option></select></label>
        <label>{p.topic}<select value={topic?.id ?? ""} onChange={(event) => setTopic(availableTopics.find((item) => item.id === event.target.value) ?? null)}><option value="">{p.chooseATopic}</option>{availableTopics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>{p.timer}<select value={limitMinutes ?? "none"} onChange={(event) => setLimitMinutes(event.target.value === "none" ? null : Number(event.target.value))}>{limits.map((value) => <option key={value ?? "none"} value={value ?? "none"}>{value === null ? p.noLimit : `${value} ${p.minutes}`}</option>)}</select></label>
      </div>
      <div className="practice-random-row">
        <button className="random-topic-button" type="button" onClick={() => void chooseRandom()}>{p.randomTopic}</button>
      </div>
    </div>}
    {!startedAt && mode === "exam" && <div className="practice-controls">
      <div className="practice-control-fields">
        <label>{p.exam}<select value={examType} onChange={(event) => selectExam(event.target.value as typeof examType)}><option>IELTS</option><option>TOEIC</option></select></label>
        {examType === "IELTS" && <label>{p.variant}<select value={variant} onChange={(event) => { const next = event.target.value as typeof variant; setVariant(next); selectExam("IELTS", next); }}><option value="IELTS_ACADEMIC">{p.ieltsAcademic}</option><option value="IELTS_GENERAL">{p.ieltsGeneral}</option></select></label>}
      </div>
      <p className="practice-note" role="note"><span aria-hidden="true">ⓘ</span>{p.continuousTimer} {examType === "TOEIC" ? p.eightQuestions : p.twoTasks}</p>
    </div>}
    {topic && mode === "topic" && <div className="prompt-card"><strong>{topic.title}</strong><p>{topic.prompt}</p></div>}
    {startedAt && activeTask && mode === "exam" && <div className="prompt-card"><strong>{p.question} {activeTask.questionNumber} · {activeTask.taskType}</strong><p>{activeTask.prompt}</p>{activeTask.visualAsset && <img className="exam-visual" src={activeTask.visualAsset} alt={activeTask.visualDescription ?? p.examVisual}/>} {!activeTask.visualAsset && activeTask.visualDescription && <p><em>{activeTask.visualDescription}</em></p>}{activeTask.providedWords && <p><strong>{p.requiredWords}:</strong> {activeTask.providedWords.join(" · ")}</p>}{activeTask.wordMinimum && <small>{p.recommendedMinimum}: {activeTask.wordMinimum} {p.words}</small>}{activeTask.recommendedSeconds && <small> {p.recommendedAllocation}: {activeTask.recommendedSeconds / 60} {p.minutes}</small>}</div>}
    {startedAt && mode === "exam" && <nav className="question-nav" aria-label={p.question}>{examTasks.map((task, index) => <button type="button" key={task.questionNumber} aria-current={current === index ? "step" : undefined} onClick={() => setCurrent(index)}>Q{task.questionNumber}</button>)}</nav>}
    {(startedAt || topic) && <textarea value={answers[current] ?? ""} readOnly={locked} disabled={Boolean(user && submitting)} onChange={(event) => setAnswers((currentAnswers) => { const nextAnswers = [...currentAnswers]; nextAnswers[current] = event.target.value; return nextAnswers; })} placeholder={p.responsePlaceholder} aria-label={p.responsePlaceholder} aria-invalid={currentWordCount > maximumWords}/>}
    {!startedAt ? <button className="primary-button" type="button" disabled={starting || (mode === "topic" && !topic) || (mode === "exam" && examTasks.length === 0)} onClick={() => void start()}>{starting ? p.starting : mode === "topic" ? p.startPractice : p.startExam}</button> : <div className="form-footer"><span className={currentWordCount > maximumWords ? "word-count over" : "word-count"}>{answers[current]?.trim() ? `${currentWordCount} / ${maximumWords} ${p.words}` : ""}</span><div>{mode === "exam" && <><button type="button" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>{p.previous}</button><button type="button" disabled={current >= examTasks.length - 1} onClick={() => setCurrent((value) => value + 1)}>{p.next}</button></>}<button className="primary-button" type="button" disabled={Boolean(user && submitting) || evaluation !== null || answersInvalid} onClick={() => void submit()}>{submitting && user ? p.submitting : expired ? p.finalize : p.submit}</button></div></div>}
    {message && <p role="status" className="practice-message">{message}</p>}
    {evaluation && !("kind" in evaluation) && <EvaluationResult result={evaluation as Evaluation} locale={locale}/>}
    {evaluation && "kind" in evaluation && evaluation.kind === "IELTS" && <IeltsResult result={evaluation} copy={copy.results}/>}
    {evaluation && "kind" in evaluation && evaluation.kind === "TOEIC" && <ToeicResult result={evaluation} copy={copy.results}/>}
    {evaluation && <button className="secondary-button" type="button" onClick={resetSession}>{p.newSession}</button>}
  </section>;
}

function Criteria({ title, value, copy }: { title: string; value: IeltsCriteria; copy: ResultCopy }) {
  return <section><h4>{title}</h4><p>{copy.taskResponse} {value.taskAchievement} · {copy.coherence} {value.coherenceCohesion} · {copy.lexicalResource} {value.lexicalResource} · {copy.grammar} {value.grammaticalRangeAccuracy}</p>{value.feedback.map((item) => <p key={item}>{item}</p>)}</section>;
}

function IeltsResult({ result, copy }: { result: IeltsEvaluation; copy: ResultCopy }) {
  return <div className="result-card"><h3>{copy.ieltsBand}</h3><strong>{result.overallBand}</strong><p>{copy.task1}: {result.task1Band} · {copy.task2}: {result.task2Band}</p><Criteria title={copy.task1Criteria} value={result.task1Criteria} copy={copy}/><Criteria title={copy.task2Criteria} value={result.task2Criteria} copy={copy}/><h4>{copy.strengths}</h4>{result.strengths.map((item) => <p key={item}>{item}</p>)}<h4>{copy.weaknesses}</h4>{result.weaknesses.map((item) => <p key={item}>{item}</p>)}<h4>{copy.suggestions}</h4>{result.improvementSuggestions.map((item) => <p key={item}>{item}</p>)}</div>;
}

function ToeicResult({ result, copy }: { result: ToeicEvaluation; copy: ResultCopy }) {
  return <div className="result-card"><h3>{copy.toeicScore}</h3><strong>{result.estimatedScore} / 200</strong><h4>{copy.questionFeedback}</h4>{result.questionFeedback.map((item) => <p key={item.questionNumber}>Q{item.questionNumber}: {item.feedback}</p>)}<h4>{copy.strengths}</h4>{result.strengths.map((item) => <p key={item}>{item}</p>)}<h4>{copy.weaknesses}</h4>{result.weaknesses.map((item) => <p key={item}>{item}</p>)}<h4>{copy.suggestions}</h4>{result.improvementSuggestions.map((item) => <p key={item}>{item}</p>)}</div>;
}
