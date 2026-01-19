import React, { useEffect, useMemo, useState } from "react";
import questionsData from "./questions.json";

type TopicKey = string;

type Question = {
  question: string;
  answer: number;
  time?: number; // Tiempo en segundos (opcional, default 10)
};

type QuestionsData = {
  [key: string]: Question[];
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

// Función para generar el label de una temática (capitalizar primera letra)
const getTopicLabel = (topic: string): string => {
  // Si es una temática conocida, usar el label específico
  const knownLabels: Record<string, string> = {
    futbol: "Fútbol",
    economia: "Economía",
    geografia: "Geografía",
    musica: "Música",
  };
  
  if (knownLabels[topic]) {
    return knownLabels[topic];
  }
  
  // Si no es conocida, capitalizar primera letra
  return topic.charAt(0).toUpperCase() + topic.slice(1);
};

const DEFAULT_TIME = 10; // segundos por defecto

export const Game: React.FC = () => {
  // Cargar preguntas desde localStorage si existen, sino usar las del JSON
  const [questionsDataState, setQuestionsDataState] = useState<QuestionsData>(questionsData);

  // Función para cargar preguntas desde localStorage
  const loadQuestionsFromStorage = () => {
    const stored = localStorage.getItem("questions");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQuestionsDataState(parsed);
      } catch (e) {
        console.error("Error al cargar preguntas desde localStorage", e);
      }
    } else {
      setQuestionsDataState(questionsData);
    }
  };

  useEffect(() => {
    // Cargar al montar el componente
    loadQuestionsFromStorage();

    // Escuchar cambios en localStorage (cuando se carga un Excel desde otra pestaña)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "questions") {
        loadQuestionsFromStorage();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // También escuchar cuando la página vuelve a tener foco (por si se cargó en la misma pestaña)
    const handleFocus = () => {
      loadQuestionsFromStorage();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const [step, setStep] = useState<GameStep>("topic");
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<ResultInfo | null>(null);

  const currentQuestion: Question | null = useMemo(() => {
    if (!topic) return null;
    const list = questionsDataState[topic as TopicKey];
    if (!list || list.length === 0) return null;
    const index = currentIndex % list.length;
    return list[index];
  }, [topic, currentIndex, questionsDataState]);

  // Manejo del timer con tiempo personalizado
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
    setIsTimerRunning(true);
    setStep("question");
  };

  // Actualizar el tiempo cuando cambia la pregunta
  useEffect(() => {
    if (step === "question" && currentQuestion && isTimerRunning) {
      const questionTime = currentQuestion.time || DEFAULT_TIME;
      setTimeLeft(questionTime);
    }
  }, [currentQuestion, step, isTimerRunning]);

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

  const progress = currentQuestion ? (timeLeft / (currentQuestion.time || DEFAULT_TIME)) * 100 : 0;

  const renderTopicSelector = () => {
    // Filtrar solo las temáticas que tienen al menos una pregunta
    const availableTopics = (Object.keys(questionsDataState) as TopicKey[]).filter(
      (key) => questionsDataState[key] && questionsDataState[key].length > 0
    );

    return (
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

        {availableTopics.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>No hay temáticas disponibles. Cargá preguntas desde el Backoffice.</p>
          </div>
        ) : (
          <div className="topic-grid">
            {availableTopics.map((key) => (
              <button
                key={key}
                onClick={() => handleSelectTopic(key)}
                className="topic-card"
              >
                <div className="relative">
                  <div className="topic-card-label">
                    Tema
                  </div>
                  <div className="topic-card-title">{getTopicLabel(key)}</div>
                  <div className="topic-card-meta">{questionsDataState[key].length} preguntas</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500">
          MVP local · sin login · pensado para experimentar rápido.
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion || !topic) return null;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-[0.2em]">
          <span>{getTopicLabel(topic)}</span>
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
          <span>{getTopicLabel(topic)}</span>
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
          <div className="flex items-center gap-4">
            <span className="app-badge-score">
              <span className="app-badge-dot" />
              Puntaje total: {score}
            </span>
            <a
              href="/backoffice"
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
              style={{ textDecoration: "none" }}
            >
              Backoffice
            </a>
          </div>
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

export default Game;

