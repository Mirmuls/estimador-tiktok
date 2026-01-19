import React, { useEffect, useMemo, useState } from "react";
import questionsData from "./questions.json";

type TopicKey = keyof typeof questionsData;

type Question = {
  question: string;
  answer: number;
};

type GameStep = "topic" | "question" | "result";

type ResultInfo = {
  correct: number;
  userAnswer: number | null;
  diff: number;
  diffPercent: number;
  points: number;
};

// Lógica de puntuación basada en la diferencia porcentual
function calculatePoints(diffPercent: number): number {
  if (diffPercent <= 5) return 100;
  if (diffPercent <= 10) return 80;
  if (diffPercent <= 20) return 50;
  if (diffPercent <= 40) return 20;
  return 0;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-AR").format(value);

const topicsLabels: Record<TopicKey, string> = {
  futbol: "Fútbol",
  economia: "Economía",
  geografia: "Geografía",
  musica: "Música",
};

const TOTAL_TIME = 10; // segundos

export const App: React.FC = () => {
  const [step, setStep] = useState<GameStep>("topic");
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<ResultInfo | null>(null);

  const currentQuestion: Question | null = useMemo(() => {
    if (!topic) return null;
    const list = questionsData[topic];
    if (!list || list.length === 0) return null;
    const index = currentIndex % list.length;
    return list[index];
  }, [topic, currentIndex]);

  // Manejo del timer de 10 segundos
  useEffect(() => {
    if (!isTimerRunning) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }

    const id = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isTimerRunning]);

  const startQuestion = (selectedTopic: TopicKey | null = topic) => {
    if (!selectedTopic) return;
    setTopic(selectedTopic);
    setInputValue("");
    setTimeLeft(TOTAL_TIME);
    setIsTimerRunning(true);
    setStep("question");
  };

  const handleSelectTopic = (t: TopicKey) => {
    setScore(0);
    setCurrentIndex(0);
    setResult(null);
    startQuestion(t);
  };

  const handleSubmit = (fromTimeout = false) => {
    if (!currentQuestion) return;

    setIsTimerRunning(false);

    const correct = currentQuestion.answer;
    const userAnswer = fromTimeout || inputValue.trim() === ""
      ? null
      : Number(inputValue.replace(",", "."));

    let diff = 0;
    let diffPercent = 100;
    let points = 0;

    if (userAnswer !== null && !Number.isNaN(userAnswer)) {
      diff = Math.abs(userAnswer - correct);
      diffPercent = correct === 0 ? 100 : (diff / Math.abs(correct)) * 100;
      points = calculatePoints(diffPercent);
    } else {
      diff = correct;
      diffPercent = 100;
      points = 0;
    }

    setScore((prev) => prev + points);

    setResult({
      correct,
      userAnswer,
      diff,
      diffPercent,
      points,
    });

    setStep("result");
  };

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => prev + 1);
    setResult(null);
    startQuestion();
  };

  const progress = (timeLeft / TOTAL_TIME) * 100;

  const renderTopicSelector = () => (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-3">
        <p className="uppercase tracking-[0.4em] text-xs text-slate-400">
          Juego de estimación numérica
        </p>
        <h1 className="topic-hero-title">
          Estimador
          <span className="topic-hero-highlight"> TikTok</span>
        </h1>
        <p className="topic-hero-subtitle">
          Elegí una temática, respondé en menos de 10 segundos y descubrí qué
          tan cerca estuviste. Puntos por aproximación, no por exactitud.
        </p>
      </div>

      <div className="topic-grid">
        {(Object.keys(questionsData) as TopicKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handleSelectTopic(key)}
            className="topic-card"
          >
            <div className="relative">
              <div className="topic-card-label">
                Tema
              </div>
              <div className="topic-card-title">{topicsLabels[key]}</div>
              <div className="topic-card-meta">{questionsData[key].length} preguntas</div>
            </div>
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500">
        MVP local · sin login · pensado para experimentar rápido.
      </div>
    </div>
  );

  const renderQuestion = () => {
    if (!currentQuestion || !topic) return null;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-[0.2em]">
          <span>{topicsLabels[topic]}</span>
          <span>Puntaje: {score}</span>
        </div>

        <div className="question-card">
          <div className="mb-4">
            <div className="timer-label">Tiempo</div>
            <div className="timer-track">
              <div className="timer-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="timer-remaining">{timeLeft} s restantes</div>
          </div>

          <div className="space-y-4 mt-4">
            <p className="question-title">{currentQuestion.question}</p>
            <p className="question-helper">
              Respondé solo con números. No hace falta ser exacto, solo estar
              cerca.
            </p>

            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <input
                type="number"
                inputMode="decimal"
                className="estimate-input"
                placeholder="Tu estimación"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />

              <button
                type="submit"
                className="primary-button"
              >
                Validar respuesta
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result || !topic || !currentQuestion) return null;

    const { correct, userAnswer, diff, diffPercent, points } = result;
    const approxLabel =
      points === 100
        ? "Brutal, casi perfecto."
        : points >= 80
        ? "Muy cerca, gran estimación."
        : points >= 50
        ? "Bastante bien, vas calibrando."
        : points > 0
        ? "Te faltó poco, seguí probando."
        : "Lejos esta vez, pero el cerebro aprende rápido.";

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-[0.2em]">
          <span>{topicsLabels[topic]}</span>
          <span>Puntaje total: {score}</span>
        </div>

        <div className="result-card space-y-6">
          <p className="result-title">{currentQuestion.question}</p>

          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <div className="text-xs text-slate-400 mb-1">
                Tu respuesta
              </div>
              <div className="text-xl font-semibold text-slate-50">
                {userAnswer === null || Number.isNaN(userAnswer)
                  ? "Sin respuesta"
                  : formatNumber(userAnswer)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <div className="text-xs text-slate-400 mb-1">
                Respuesta correcta
              </div>
              <div className="text-xl font-semibold text-emerald-400">
                {formatNumber(correct)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Diferencia: {formatNumber(diff)} (
                {diffPercent.toFixed(1).replace(".", ",")}%)
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Puntos ganados
                </div>
                <div className="text-2xl font-semibold text-orange-400">
                  +{points}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">{approxLabel}</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[11px] text-slate-400">
              Puntos por diferencia porcentual:
              <span className="ml-1 text-slate-300">
                0–5%: 100 · 6–10%: 80 · 11–20%: 50 · 21–40%: 20 · &gt;40%: 0
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("topic");
                  setTopic(null);
                  setResult(null);
                  setScore(0);
                  setCurrentIndex(0);
                }}
                className="secondary-button"
              >
                Cambiar temática
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="ghost-button"
              >
                Siguiente pregunta →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <div className="app-header">
            <span className="font-semibold tracking-[0.25em] uppercase">
              Estimador
            </span>
          <span className="app-badge-score">
            <span className="app-badge-dot" />
              Puntaje total: {score}
          </span>
        </div>

          {step === "topic" && renderTopicSelector()}
          {step === "question" && renderQuestion()}
          {step === "result" && renderResult()}

        <div className="app-footer">
          <span>Sin login · Datos locales · MVP para experimentar.</span>
          <span>
            Hecho con <strong>React</strong> + <strong>Tailwind</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;


