import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
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

export const Backoffice: React.FC = () => {
  // Cargar desde localStorage si existe, sino usar el JSON inicial
  const loadQuestions = (): QuestionsData => {
    const stored = localStorage.getItem("questions");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error al cargar preguntas desde localStorage", e);
        return questionsData;
      }
    }
    return questionsData;
  };

  const [questions, setQuestions] = useState<QuestionsData>(loadQuestions);
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState({ question: "", answer: "", time: "10" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Guardar en localStorage cada vez que cambien las preguntas
  useEffect(() => {
    localStorage.setItem("questions", JSON.stringify(questions));
  }, [questions]);

  const handleEdit = (topic: TopicKey, index: number) => {
    const question = questions[topic][index];
    setEditingIndex(index);
    setSelectedTopic(topic);
    setNewQuestion({
      question: question.question,
      answer: question.answer.toString(),
      time: (question.time || 10).toString(),
    });
    setShowAddForm(false);
  };

  const handleSave = (topic: TopicKey, index: number | null) => {
    if (!newQuestion.question.trim() || !newQuestion.answer.trim()) return;

    const answerNum = parseFloat(newQuestion.answer.replace(",", "."));
    if (isNaN(answerNum)) {
      alert("La respuesta debe ser un número válido");
      return;
    }

    const timeNum = parseFloat(newQuestion.time.replace(",", "."));
    const finalTime = isNaN(timeNum) || timeNum <= 0 ? 10 : timeNum;

    const updatedQuestions = { ...questions };

    if (index !== null) {
      // Editar pregunta existente
      updatedQuestions[topic] = [...updatedQuestions[topic]];
      updatedQuestions[topic][index] = {
        question: newQuestion.question,
        answer: answerNum,
        time: finalTime !== 10 ? finalTime : undefined,
      };
    } else {
      // Agregar nueva pregunta
      updatedQuestions[topic] = [
        ...updatedQuestions[topic],
        {
          question: newQuestion.question,
          answer: answerNum,
          time: finalTime !== 10 ? finalTime : undefined,
        },
      ];
    }

    setQuestions(updatedQuestions);
    setEditingIndex(null);
    setNewQuestion({ question: "", answer: "", time: "10" });
    setShowAddForm(false);
  };

  const handleDelete = (topic: TopicKey, index: number) => {
    if (!confirm("¿Estás seguro de eliminar esta pregunta?")) return;

    const updatedQuestions = { ...questions };
    updatedQuestions[topic] = updatedQuestions[topic].filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const handleAddNew = (topic: TopicKey) => {
    setSelectedTopic(topic);
    setNewQuestion({ question: "", answer: "", time: "10" });
    setShowAddForm(true);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setNewQuestion({ question: "", answer: "", time: "10" });
    setShowAddForm(false);
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("Cargando archivo...");

    const reader = new FileReader();
    reader.onload = (e) => {
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
          setQuestions(loadedQuestions);
          setUploadStatus(
            `✅ ${successCount} pregunta(s) cargada(s) correctamente. Las preguntas anteriores fueron reemplazadas.${errorCount > 0 ? ` ${errorCount} error(es).` : ""}`
          );
          if (errors.length > 0 && errors.length <= 10) {
            console.warn("Errores al cargar:", errors);
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
              automáticamente en el navegador.
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

              {selectedTopic === topic && showAddForm && editingIndex === null && (
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
                {questions[topic].map((q, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    {editingIndex === index && selectedTopic === topic ? (
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
                            onClick={() => handleSave(topic, index)}
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
                            onClick={() => handleEdit(topic, index)}
                            className="secondary-button"
                            style={{ padding: "6px 12px", fontSize: "11px" }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(topic, index)}
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
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="app-footer" style={{ marginTop: "32px" }}>
          <span>
            Los cambios se guardan automáticamente en el navegador (localStorage)
          </span>
        </div>
      </div>
    </div>
  );
};

export default Backoffice;

