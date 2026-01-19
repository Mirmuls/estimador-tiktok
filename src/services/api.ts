const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export type Question = {
  question: string;
  answer: number;
  time?: number;
};

export type QuestionsData = {
  [key: string]: Question[];
};

// Obtener todas las preguntas
export const getQuestions = async (): Promise<QuestionsData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`);
    if (!response.ok) {
      throw new Error("Error al obtener preguntas");
    }
    return await response.json();
  } catch (error) {
    console.error("Error al obtener preguntas:", error);
    // Fallback a localStorage si la API falla
    const stored = localStorage.getItem("questions");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error al parsear localStorage:", e);
      }
    }
    // Si no hay datos en ningún lado, retornar objeto vacío
    return {};
  }
};

// Crear una nueva pregunta
export const createQuestion = async (
  topic: string,
  question: string,
  answer: number,
  time: number = 10
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        question,
        answer,
        time,
      }),
    });

    if (!response.ok) {
      throw new Error("Error al crear pregunta");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al crear pregunta:", error);
    throw error;
  }
};

// Actualizar una pregunta
export const updateQuestion = async (
  id: string,
  topic: string,
  question: string,
  answer: number,
  time: number = 10
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        question,
        answer,
        time,
      }),
    });

    if (!response.ok) {
      throw new Error("Error al actualizar pregunta");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al actualizar pregunta:", error);
    throw error;
  }
};

// Eliminar una pregunta
export const deleteQuestion = async (id: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Error al eliminar pregunta");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al eliminar pregunta:", error);
    throw error;
  }
};

// Cargar preguntas en bulk (para Excel)
export const bulkLoadQuestions = async (questions: Array<{
  topic: string;
  question: string;
  answer: number;
  time?: number;
}>) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questions/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ questions }),
    });

    if (!response.ok) {
      throw new Error("Error al cargar preguntas");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al cargar preguntas en bulk:", error);
    throw error;
  }
};

// Para obtener el ID de una pregunta, necesitamos primero obtener todas las preguntas con IDs
export const getQuestionsWithIds = async (): Promise<Array<{
  _id: string;
  topic: string;
  question: string;
  answer: number;
  time?: number;
}>> => {
  const apiUrl = `${API_BASE_URL}/questions/list`;
  try {
    console.log("🔍 Intentando obtener preguntas con IDs desde:", apiUrl);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP ${response.status}:`, errorText);
      throw new Error(`Error al obtener preguntas con IDs: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("✅ Respuesta de /questions/list:", data.length, "preguntas");
    if (data.length > 0) {
      console.log("📝 Primera pregunta con ID:", data[0]);
    } else {
      console.warn("⚠️ La API devolvió un array vacío de preguntas");
    }
    return data;
  } catch (error: any) {
    console.error("❌ Error al obtener preguntas con IDs:", error);
    console.error("📍 URL de la API:", apiUrl);
    console.error("🔧 Verificá que:");
    console.error("   1. El servidor esté corriendo en el puerto 3001");
    console.error("   2. La URL de la API sea correcta");
    console.error("   3. No haya problemas de CORS");
    
    // Si es un error de red (servidor no disponible)
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      console.error("🚫 El servidor no está respondiendo. Asegurate de que esté corriendo.");
    }
    
    return [];
  }
};

