import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  getQuestions,
  getQuestionsWithIds,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkLoadQuestions,
  type QuestionsData,
} from "./services/api";

type TopicKey = string;

type QuestionWithId = {
  _id: string;
  topic: string;
  question: string;
  answer: number;
  time?: number;
};

// Función para generar el label de una temática (capitalizar primera letra)
// Obtiene el label desde la base de datos, si no existe capitaliza el nombre
const getTopicLabel = (topic: string): string => {
  // Capitalizar primera letra de cada palabra
  return topic
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const Backoffice: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionsData>({});
  const [questionsWithIds, setQuestionsWithIds] = useState<QuestionWithId[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({ question: "", answer: "", time: "10" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasIds, setHasIds] = useState(false);

  // Función para cargar preguntas desde la API
  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const [groupedData, questionsList] = await Promise.all([
        getQuestions(),
        getQuestionsWithIds(),
      ]);
      console.log("Preguntas agrupadas cargadas:", Object.keys(groupedData).length, "temas");
      console.log("Preguntas con IDs cargadas:", questionsList.length);
      console.log("API URL configurada:", import.meta.env.VITE_API_URL || "http://localhost:3001/api");
      
      setQuestions(groupedData);
      setQuestionsWithIds(questionsList);
      setHasIds(questionsList.length > 0);
      // Guardar en localStorage como backup
      localStorage.setItem("questions", JSON.stringify(groupedData));
      
      // Si no hay preguntas con IDs pero sí hay preguntas agrupadas, mostrar advertencia
      if (questionsList.length === 0 && Object.keys(groupedData).length > 0) {
        console.warn("⚠️ No se pudieron cargar los IDs de las preguntas. Algunas funciones de edición pueden no estar disponibles.");
      }
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
      setHasIds(false);
      // Fallback a localStorage
      const stored = localStorage.getItem("questions");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setQuestions(parsed);
        } catch (e) {
          console.error("Error al parsear localStorage:", e);
          setQuestions({});
        }
      } else {
        setQuestions({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Obtener pregunta por ID desde la lista con IDs
  const getQuestionById = (id: string): QuestionWithId | undefined => {
    return questionsWithIds.find((q) => q._id === id);
  };

  // Obtener todas las preguntas de un tema con sus IDs
  const getQuestionsByTopic = (topic: TopicKey): QuestionWithId[] => {
    return questionsWithIds.filter((q) => q.topic === topic);
  };

  const handleEdit = (id: string) => {
    const question = getQuestionById(id);
    if (!question) return;

    setEditingId(id);
    setSelectedTopic(question.topic as TopicKey);
    setNewQuestion({
      question: question.question,
      answer: question.answer.toString(),
      time: (question.time || 10).toString(),
    });
    setShowAddForm(false);
  };

  const handleSave = async (topic: TopicKey, id: string | null) => {
    if (!newQuestion.question.trim() || !newQuestion.answer.trim()) return;

    const answerNum = parseFloat(newQuestion.answer.replace(",", "."));
    if (isNaN(answerNum)) {
      alert("La respuesta debe ser un número válido");
      return;
    }

    const timeNum = parseFloat(newQuestion.time.replace(",", "."));
    const finalTime = isNaN(timeNum) || timeNum <= 0 ? 10 : timeNum;

    try {
      if (id !== null) {
        // Editar pregunta existente
        await updateQuestion(id, topic, newQuestion.question, answerNum, finalTime);
      } else {
        // Agregar nueva pregunta
        await createQuestion(topic, newQuestion.question, answerNum, finalTime);
      }
      // Recargar preguntas después de guardar
      await loadQuestions();
      setEditingId(null);
      setNewQuestion({ question: "", answer: "", time: "10" });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error al guardar pregunta:", error);
      alert("Error al guardar la pregunta. Por favor, intenta nuevamente.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta pregunta?")) return;

    try {
      await deleteQuestion(id);
      // Recargar preguntas después de eliminar
      await loadQuestions();
    } catch (error) {
      console.error("Error al eliminar pregunta:", error);
      alert("Error al eliminar la pregunta. Por favor, intenta nuevamente.");
    }
  };

  const handleAddNew = (topic: TopicKey) => {
    setSelectedTopic(topic);
    setNewQuestion({ question: "", answer: "", time: "10" });
    setShowAddForm(true);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setNewQuestion({ question: "", answer: "", time: "10" });
    setShowAddForm(false);
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("Cargando archivo...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Validar que tenga al menos una fila de datos
        if (jsonData.length < 2) {
          setUploadStatus("❌ El archivo debe tener al menos una fila de datos (sin contar el encabezado)");
          return;
        }

        // Inicializar objeto vacío para reemplazar todas las preguntas existentes
        const loadedQuestions: QuestionsData = {};

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Omitir la primera fila (encabezados) y procesar datos
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length < 3) {
            errorCount++;
            errors.push(`Fila ${i + 1}: Faltan columnas`);
            continue;
          }

          // Columna 1: Tag (temática)
          // Columna 2: Pregunta
          // Columna 3: Respuesta
          // Columna 4: Tiempo (opcional, default 10)

          const tag = String(row[0] || "").trim().toLowerCase();
          const pregunta = String(row[1] || "").trim();
          const respuesta = row[2];
          const tiempo = row[3] ? parseFloat(String(row[3])) : 10;

          // Validar tag (temática) - ahora aceptamos cualquier tag
          if (!tag) {
            errorCount++;
            errors.push(`Fila ${i + 1}: El tag está vacío`);
            continue;
          }

          // Validar pregunta
          if (!pregunta) {
            errorCount++;
            errors.push(`Fila ${i + 1}: La pregunta está vacía`);
            continue;
          }

          // Validar respuesta
          const answerNum = parseFloat(String(respuesta).replace(",", "."));
          if (isNaN(answerNum)) {
            errorCount++;
            errors.push(`Fila ${i + 1}: La respuesta "${respuesta}" no es un número válido`);
            continue;
          }

          // Validar tiempo
          const timeNum = isNaN(tiempo) || tiempo <= 0 ? 10 : tiempo;

          // Inicializar array si no existe para esta temática
          if (!loadedQuestions[tag]) {
            loadedQuestions[tag] = [];
          }

          // Agregar pregunta (solo las del Excel, reemplazando las anteriores)
          loadedQuestions[tag].push({
            question: pregunta,
            answer: answerNum,
            time: timeNum !== 10 ? timeNum : undefined,
          });

          successCount++;
        }

        if (successCount > 0) {
          // Preparar preguntas para la API
          const questionsToLoad = Object.keys(loadedQuestions).flatMap((tag) =>
            loadedQuestions[tag].map((q) => ({
              topic: tag,
              question: q.question,
              answer: q.answer,
              time: q.time || 10,
            }))
          );

          // Enviar a la API
          try {
            const result = await bulkLoadQuestions(questionsToLoad);
            setUploadStatus(
              `✅ ${result.success} pregunta(s) cargada(s) correctamente. Las preguntas anteriores fueron reemplazadas.${result.errors && result.errors.length > 0 ? ` ${result.errors.length} error(es).` : ""}`
            );
            // Recargar preguntas
            await loadQuestions();
          } catch (apiError) {
            console.error("Error al cargar preguntas en la API:", apiError);
            setUploadStatus(
              `❌ Error al cargar preguntas en la base de datos. ${errorCount > 0 ? ` ${errorCount} error(es) en el archivo.` : ""}`
            );
          }
        } else {
          setUploadStatus(`❌ No se pudo cargar ninguna pregunta. Errores: ${errors.slice(0, 3).join("; ")}`);
        }

        // Limpiar el input
        event.target.value = "";
      } catch (error) {
        console.error("Error al leer el archivo Excel:", error);
        setUploadStatus("❌ Error al leer el archivo Excel. Asegurate de que el formato sea correcto.");
      }
    };

    reader.onerror = () => {
      setUploadStatus("❌ Error al leer el archivo");
      event.target.value = "";
    };

    reader.readAsArrayBuffer(file);
  };

  const exportData = () => {
    // Crear un array con todas las preguntas en formato de filas Excel
    const rows: any[][] = [
      ["Tag", "Pregunta", "Respuesta", "Tiempo"], // Encabezados
    ];

    // Recorrer todos los temas y agregar cada pregunta como una fila
    (Object.keys(questions) as TopicKey[]).forEach((topic) => {
      questions[topic].forEach((q) => {
        rows.push([
          topic, // Tag (temática)
          q.question, // Pregunta
          q.answer, // Respuesta
          q.time || 10, // Tiempo (default 10 si no está definido)
        ]);
      });
    });

    // Crear un workbook y una hoja
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Preguntas");

    // Generar el archivo Excel y descargarlo
    XLSX.writeFile(workbook, "questions.xlsx");
  };

  return (
    <div className="app-shell">
      <div className="app-card" style={{ maxWidth: "1200px" }}>
        <div className="app-header">
          <span className="font-semibold tracking-[0.25em] uppercase">
            Backoffice
          </span>
          <div className="flex gap-2 flex-wrap">
            <label
              className="secondary-button"
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                cursor: "pointer",
                display: "inline-block",
              }}
            >
              📁 Cargar Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                style={{ display: "none" }}
              />
            </label>
            <button
              onClick={exportData}
              className="secondary-button"
              style={{ padding: "6px 12px", fontSize: "11px" }}
            >
              📊 Exportar Excel
            </button>
            <a
              href="/"
              className="secondary-button"
              style={{ padding: "6px 12px", fontSize: "11px", textDecoration: "none" }}
            >
              ← Volver al juego
            </a>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="topic-hero-title" style={{ marginBottom: "8px" }}>
              Gestión de Preguntas
            </h1>
            <p className="topic-hero-subtitle" style={{ marginTop: "0" }}>
              Administrá las preguntas y respuestas del juego. Los cambios se guardan
              automáticamente en MongoDB.
            </p>
            {uploadStatus && (
              <div
                className="mt-4 p-3 rounded-lg text-sm"
                style={{
                  background: uploadStatus.includes("✅")
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${uploadStatus.includes("✅") ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  color: uploadStatus.includes("✅") ? "#86efac" : "#fca5a5",
                }}
              >
                {uploadStatus}
              </div>
            )}
            {!hasIds && Object.keys(questions).length > 0 && (
              <div
                className="mt-4 p-4 rounded-lg text-sm"
                style={{
                  background: "rgba(251, 146, 60, 0.1)",
                  border: "1px solid rgba(251, 146, 60, 0.3)",
                  color: "#fdba74",
                }}
              >
                <div className="mb-2">
                  <strong>⚠️ No se pudieron cargar los IDs de las preguntas.</strong>
                </div>
                <div className="mb-3 text-xs opacity-90">
                  Para poder editar las preguntas, el servidor debe estar corriendo. 
                  Abrí la consola del navegador (F12) para ver más detalles del error.
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={loadQuestions}
                    className="px-3 py-1 rounded text-xs font-semibold"
                    style={{ 
                      background: "rgba(251, 146, 60, 0.2)",
                      border: "1px solid rgba(251, 146, 60, 0.5)",
                      color: "#fb923c"
                    }}
                  >
                    🔄 Recargar
                  </button>
                  <span className="text-xs opacity-75">
                    O ejecutá en la terminal: <code className="px-1 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>cd server && npm run dev</code>
                  </span>
                </div>
              </div>
            )}
          </div>

          {(Object.keys(questions) as TopicKey[]).map((topic) => (
            <div
              key={topic}
              className="result-card"
              style={{ marginBottom: "24px" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="result-title" style={{ margin: 0, fontSize: "18px" }}>
                  {getTopicLabel(topic)}
                  <span className="ml-2 text-xs text-slate-400 font-normal">
                    ({questions[topic].length} preguntas)
                  </span>
                </h2>
                <button
                  onClick={() => handleAddNew(topic)}
                  className="ghost-button"
                  style={{ padding: "6px 12px", fontSize: "11px" }}
                >
                  + Agregar pregunta
                </button>
              </div>

              {selectedTopic === topic && showAddForm && editingId === null && (
                <div
                  className="mb-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-700"
                >
                  <h3 className="text-sm font-semibold mb-3 text-slate-300">
                    Nueva pregunta
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      className="estimate-input"
                      placeholder="Pregunta"
                      value={newQuestion.question}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, question: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      className="estimate-input"
                      placeholder="Respuesta (número)"
                      value={newQuestion.answer}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, answer: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      className="estimate-input"
                      placeholder="Tiempo en segundos (default: 10)"
                      value={newQuestion.time}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, time: e.target.value })
                      }
                      min="1"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(topic, null)}
                        className="primary-button"
                        style={{ width: "auto", padding: "8px 16px" }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="secondary-button"
                        style={{ padding: "8px 16px" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(() => {
                  const questionsWithIdsForTopic = getQuestionsByTopic(topic);
                  // Si hay preguntas con IDs, usarlas
                  if (questionsWithIdsForTopic.length > 0) {
                    return questionsWithIdsForTopic.map((q) => (
                      <div
                        key={q._id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800"
                      >
                        {editingId === q._id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              className="estimate-input"
                              value={newQuestion.question}
                              onChange={(e) =>
                                setNewQuestion({ ...newQuestion, question: e.target.value })
                              }
                            />
                            <input
                              type="number"
                              className="estimate-input"
                              value={newQuestion.answer}
                              onChange={(e) =>
                                setNewQuestion({ ...newQuestion, answer: e.target.value })
                              }
                            />
                            <input
                              type="number"
                              className="estimate-input"
                              placeholder="Tiempo en segundos (default: 10)"
                              value={newQuestion.time}
                              onChange={(e) =>
                                setNewQuestion({ ...newQuestion, time: e.target.value })
                              }
                              min="1"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(topic, q._id)}
                                className="primary-button"
                                style={{ width: "auto", padding: "8px 16px" }}
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancel}
                                className="secondary-button"
                                style={{ padding: "8px 16px" }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-slate-200 mb-1">{q.question}</p>
                              <div className="flex gap-4 text-xs text-slate-400">
                                <p>
                                  Respuesta:{" "}
                                  <span className="text-emerald-400 font-semibold">
                                    {new Intl.NumberFormat("es-AR").format(q.answer)}
                                  </span>
                                </p>
                                <p>
                                  Tiempo:{" "}
                                  <span className="text-orange-400 font-semibold">
                                    {q.time || 10}s
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(q._id)}
                                className="secondary-button"
                                style={{ padding: "6px 12px", fontSize: "11px" }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(q._id)}
                                className="secondary-button"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "11px",
                                  borderColor: "rgba(239, 68, 68, 0.6)",
                                  color: "#fca5a5",
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ));
                  }
                  // Si no hay preguntas con IDs, mostrar desde questions como fallback
                  const questionsForTopic = questions[topic] || [];
                  if (questionsForTopic.length > 0) {
                    return questionsForTopic.map((q, index) => (
                      <div
                        key={`fallback-${topic}-${index}`}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-slate-200 mb-1">{q.question}</p>
                            <div className="flex gap-4 text-xs text-slate-400">
                              <p>
                                Respuesta:{" "}
                                <span className="text-emerald-400 font-semibold">
                                  {new Intl.NumberFormat("es-AR").format(q.answer)}
                                </span>
                              </p>
                              <p>
                                Tiempo:{" "}
                                <span className="text-orange-400 font-semibold">
                                  {q.time || 10}s
                                </span>
                              </p>
                            </div>
                            <p className="text-xs text-amber-400 mt-2">
                              ⚠️ Esta pregunta no tiene ID. Asegurate de que el servidor esté corriendo y hacé clic en "Recargar" arriba.
                            </p>
                          </div>
                        </div>
                      </div>
                    ));
                  }
                  // Si no hay preguntas en ninguna fuente
                  return (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No hay preguntas en esta temática.
                    </p>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        <div className="app-footer" style={{ marginTop: "32px" }}>
          <span>
            Los cambios se guardan automáticamente en MongoDB. {isLoading && "Cargando..."}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Backoffice;

