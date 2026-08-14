import { useEffect, useMemo, useState } from "react";
import { api, RequestError } from "../api";
import type { Evaluation, IeltsCriteria, IeltsEvaluation, Locale, PracticeEvaluation, PracticeTask, ToeicEvaluation, User } from "../types";
import { EvaluationResult } from "./EvaluationResult";

type Topic = { id: string; category: "GENERAL" | "IELTS"; title: string; prompt: string; active: boolean };
type ContentResponse = { topics: Topic[]; exams: { ielts: { ACADEMIC: PracticeTask[]; GENERAL: PracticeTask[] }; toeic: PracticeTask[] } };
type Props = { locale: Locale; user: User | null; mode: "topic" | "exam"; maximumWords: number };
const limits = [null, 5, 10, 15, 20, 30, 45, 60] as const;
const words = (value: string) => value.trim() ? value.trim().split(/\s+/u).length : 0;
const formatTime = (seconds: number | null) => seconds === null ? "No limit" : `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export function PracticeStudio({ locale, user, mode, maximumWords }: Props) {
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
    }).catch(() => setMessage("Unable to load practice content."));
  }, [mode]);

  useEffect(() => {
    if (!startedAt || sessionLimitSeconds === null || expired) return;
    const timer = window.setInterval(() => {
      const next = Math.max(0, sessionLimitSeconds - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(next);
      if (next === 0) setExpired(true);
    }, 250);
    return () => window.clearInterval(timer);
  }, [startedAt, sessionLimitSeconds, expired]);

  const availableTopics = useMemo(() => topics.filter((item) => item.category === category && item.active), [topics, category]);
  const activeTask = examTasks[current];
  const currentWordCount = words(answers[current] ?? "");
  const answersInvalid = answers.length === 0 || answers.some((answer) => !answer.trim() || words(answer) > maximumWords);

  const start = async () => {
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
      setExpired(session.status === "TIME_EXPIRED" || nextRemaining === 0);
      setExamTasks(mode === "exam" ? session.tasks : []);
      setCurrent(0);
      setAnswers(mode === "exam" ? Array(session.tasks.length).fill("") : [""]);
    } catch (error) {
      setMessage(error instanceof RequestError ? error.message : "Unable to start the session.");
    } finally {
      setStarting(false);
    }
  };

  const chooseRandom = async () => {
    setMessage("");
    try {
      setTopic((await api<{ topic: Topic }>(`/api/practice/topics/random?category=${category}`)).topic);
    } catch (error) {
      setMessage(error instanceof RequestError ? error.message : "Unable to select a random topic.");
    }
  };

  const selectExam = (nextType: "IELTS" | "TOEIC", nextVariant = variant) => {
    setExamType(nextType);
    setCurrent(0);
    setAnswers([]);
    void api<ContentResponse>("/api/practice/content").then((content) => {
      setExamTasks(nextType === "TOEIC" ? content.exams.toeic : content.exams.ielts[nextVariant === "IELTS_GENERAL" ? "GENERAL" : "ACADEMIC"]);
    }).catch(() => setMessage("Unable to load exam content."));
  };

  const submit = async () => {
    if (!user || !sessionId || !startedAt || submitting || answersInvalid) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await api<{ evaluation: { evaluation: PracticeEvaluation }; session: unknown }>(`/api/practice/sessions/${sessionId}/submit`, { method: "POST", body: JSON.stringify({ answers, feedbackLanguage: locale }) });
      setEvaluation(response.evaluation.evaluation);
      setMessage("Submitted for AI estimated feedback.");
    } catch (error) {
      setMessage(error instanceof RequestError ? error.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetSession = () => {
    setStartedAt(null);
    setSessionLimitSeconds(null);
    setRemaining(null);
    setExpired(false);
    setCurrent(0);
    setAnswers([]);
    setSessionId(null);
    setEvaluation(null);
    setMessage("");
  };

  const locked = !startedAt || expired || evaluation !== null;
  return <section className="workspace practice-studio" aria-labelledby="practice-heading">
    <div className="workspace-heading"><div><p className="eyebrow">{mode === "topic" ? "WRITING PRACTICE" : "EXAM PRACTICE"}</p><h2 id="practice-heading">{mode === "topic" ? "Choose a topic and write" : "Timed writing exam"}</h2></div>{startedAt && <strong className={expired ? "timer expired" : "timer"}>{expired ? "TIME EXPIRED" : formatTime(remaining)}</strong>}</div>
    {!startedAt && mode === "topic" && <div className="practice-controls">
      <label>Category<select value={category} onChange={(event) => { setCategory(event.target.value as typeof category); setTopic(null); }}><option value="GENERAL">General Topics</option><option value="IELTS">IELTS Topics</option></select></label>
      <label>Topic<select value={topic?.id ?? ""} onChange={(event) => setTopic(availableTopics.find((item) => item.id === event.target.value) ?? null)}><option value="">Choose a topic</option>{availableTopics.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <button type="button" onClick={() => void chooseRandom()}>Random Topic</button>
      <label>Timer<select value={limitMinutes ?? "none"} onChange={(event) => setLimitMinutes(event.target.value === "none" ? null : Number(event.target.value))}>{limits.map((value) => <option key={value ?? "none"} value={value ?? "none"}>{value === null ? "No Limit" : `${value} minutes`}</option>)}</select></label>
    </div>}
    {!startedAt && mode === "exam" && <div className="practice-controls"><label>Exam<select value={examType} onChange={(event) => selectExam(event.target.value as typeof examType)}><option>IELTS</option><option>TOEIC</option></select></label>{examType === "IELTS" && <label>Variant<select value={variant} onChange={(event) => { const next = event.target.value as typeof variant; setVariant(next); selectExam("IELTS", next); }}><option value="IELTS_ACADEMIC">IELTS Academic</option><option value="IELTS_GENERAL">IELTS General Training</option></select></label>}<p>One continuous 60-minute timer. {examType === "TOEIC" ? "8 questions." : "Task 1 + Task 2."}</p></div>}
    {topic && mode === "topic" && <div className="prompt-card"><strong>{topic.title}</strong><p>{topic.prompt}</p></div>}
    {startedAt && activeTask && mode === "exam" && <div className="prompt-card"><strong>Question {activeTask.questionNumber} · {activeTask.taskType}</strong><p>{activeTask.prompt}</p>{activeTask.visualAsset && <img className="exam-visual" src={activeTask.visualAsset} alt={activeTask.visualDescription ?? "Exam task visual"}/>} {!activeTask.visualAsset && activeTask.visualDescription && <p><em>{activeTask.visualDescription}</em></p>}{activeTask.providedWords && <p><strong>Required words:</strong> {activeTask.providedWords.join(" · ")}</p>}{activeTask.wordMinimum && <small>Recommended minimum: {activeTask.wordMinimum} words</small>}{activeTask.recommendedSeconds && <small> Recommended allocation: {activeTask.recommendedSeconds / 60} minutes</small>}</div>}
    {startedAt && mode === "exam" && <nav className="question-nav" aria-label="Questions">{examTasks.map((task, index) => <button type="button" key={task.questionNumber} aria-current={current === index ? "step" : undefined} onClick={() => setCurrent(index)}>Q{task.questionNumber}</button>)}</nav>}
    {(startedAt || topic) && <textarea value={answers[current] ?? ""} readOnly={locked} disabled={submitting} onChange={(event) => setAnswers((currentAnswers) => currentAnswers.map((answer, index) => index === current ? event.target.value : answer))} placeholder="Write your response here…" aria-label="Writing response" aria-invalid={currentWordCount > maximumWords}/>}
    {!startedAt ? <button className="primary-button" type="button" disabled={starting || !user || (mode === "topic" && !topic) || (mode === "exam" && examTasks.length === 0)} onClick={() => void start()}>{starting ? "Starting…" : `Start ${mode === "topic" ? "practice" : "exam"}`}</button> : <div className="form-footer"><span className={currentWordCount > maximumWords ? "word-count over" : "word-count"}>{answers[current]?.trim() ? `${currentWordCount} / ${maximumWords} words` : ""}</span><div>{mode === "exam" && <><button type="button" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>Previous</button><button type="button" disabled={current >= examTasks.length - 1} onClick={() => setCurrent((value) => value + 1)}>Next</button></>}<button className="primary-button" type="button" disabled={!user || submitting || evaluation !== null || answersInvalid} onClick={() => void submit()}>{submitting ? "Submitting…" : expired ? "Finalize submission" : "Submit"}</button></div></div>}
    {message && <p role="status" className="practice-message">{message}</p>}
    {evaluation && !("kind" in evaluation) && <EvaluationResult result={evaluation as Evaluation} locale={locale}/>}
    {evaluation && "kind" in evaluation && evaluation.kind === "IELTS" && <IeltsResult result={evaluation}/>}
    {evaluation && "kind" in evaluation && evaluation.kind === "TOEIC" && <ToeicResult result={evaluation}/>}
    {evaluation && <button className="secondary-button" type="button" onClick={resetSession}>Start a new session</button>}
  </section>;
}

function Criteria({ title, value }: { title: string; value: IeltsCriteria }) {
  return <section><h4>{title}</h4><p>Task response {value.taskAchievement} · Coherence {value.coherenceCohesion} · Lexical resource {value.lexicalResource} · Grammar {value.grammaticalRangeAccuracy}</p>{value.feedback.map((item) => <p key={item}>{item}</p>)}</section>;
}

function IeltsResult({ result }: { result: IeltsEvaluation }) {
  return <div className="result-card"><h3>Estimated IELTS Writing Band</h3><strong>{result.overallBand}</strong><p>Task 1: {result.task1Band} · Task 2: {result.task2Band}</p><Criteria title="Task 1 criteria" value={result.task1Criteria}/><Criteria title="Task 2 criteria" value={result.task2Criteria}/><h4>Strengths</h4>{result.strengths.map((item) => <p key={item}>{item}</p>)}<h4>Weaknesses</h4>{result.weaknesses.map((item) => <p key={item}>{item}</p>)}<h4>Improvement suggestions</h4>{result.improvementSuggestions.map((item) => <p key={item}>{item}</p>)}</div>;
}

function ToeicResult({ result }: { result: ToeicEvaluation }) {
  return <div className="result-card"><h3>Estimated TOEIC Writing Score</h3><strong>{result.estimatedScore} / 200</strong><h4>Question feedback</h4>{result.questionFeedback.map((item) => <p key={item.questionNumber}>Q{item.questionNumber}: {item.feedback}</p>)}<h4>Strengths</h4>{result.strengths.map((item) => <p key={item}>{item}</p>)}<h4>Weaknesses</h4>{result.weaknesses.map((item) => <p key={item}>{item}</p>)}<h4>Improvement suggestions</h4>{result.improvementSuggestions.map((item) => <p key={item}>{item}</p>)}</div>;
}
