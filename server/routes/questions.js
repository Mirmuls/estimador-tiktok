import express from "express";
import Question from "../models/Question.js";

const router = express.Router();

// GET /api/questions - Obtener todas las preguntas agrupadas por tema
router.get("/", async (req, res) => {
  try {
    const questions = await Question.find().sort({ topic: 1, createdAt: -1 });
    
    // Agrupar por tema
    const groupedQuestions = {};
    questions.forEach((q) => {
      if (!groupedQuestions[q.topic]) {
        groupedQuestions[q.topic] = [];
      }
      groupedQuestions[q.topic].push({
        question: q.question,
        answer: q.answer,
        time: q.time !== 10 ? q.time : undefined,
      });
    });

    res.json(groupedQuestions);
  } catch (error) {
    console.error("Error al obtener preguntas:", error);
    res.status(500).json({ error: "Error al obtener preguntas" });
  }
});

// GET /api/questions/list - Obtener todas las preguntas con IDs (para el backoffice)
router.get("/list", async (req, res) => {
  try {
    const questions = await Question.find().sort({ topic: 1, createdAt: -1 });
    // Mapear explícitamente para asegurar que _id esté presente
    const questionsWithIds = questions.map((q) => ({
      _id: q._id.toString(),
      topic: q.topic,
      question: q.question,
      answer: q.answer,
      time: q.time,
    }));
    res.json(questionsWithIds);
  } catch (error) {
    console.error("Error al obtener preguntas con IDs:", error);
    res.status(500).json({ error: "Error al obtener preguntas con IDs" });
  }
});

// POST /api/questions - Crear una nueva pregunta
router.post("/", async (req, res) => {
  try {
    const { topic, question, answer, time } = req.body;

    if (!topic || !question || answer === undefined) {
      return res.status(400).json({ error: "Faltan campos requeridos: topic, question, answer" });
    }

    const newQuestion = new Question({
      topic: topic.toLowerCase().trim(),
      question,
      answer: Number(answer),
      time: time && Number(time) > 0 ? Number(time) : 10,
    });

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Error al crear pregunta:", error);
    res.status(500).json({ error: "Error al crear pregunta" });
  }
});

// PUT /api/questions/:id - Actualizar una pregunta
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { topic, question, answer, time } = req.body;

    const updateData = {};
    if (topic) updateData.topic = topic.toLowerCase().trim();
    if (question) updateData.question = question;
    if (answer !== undefined) updateData.answer = Number(answer);
    if (time !== undefined) updateData.time = Number(time) > 0 ? Number(time) : 10;

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    res.json(updatedQuestion);
  } catch (error) {
    console.error("Error al actualizar pregunta:", error);
    res.status(500).json({ error: "Error al actualizar pregunta" });
  }
});

// DELETE /api/questions/:id - Eliminar una pregunta
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuestion = await Question.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    res.json({ message: "Pregunta eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar pregunta:", error);
    res.status(500).json({ error: "Error al eliminar pregunta" });
  }
});

// POST /api/questions/bulk - Cargar múltiples preguntas (para Excel)
router.post("/bulk", async (req, res) => {
  try {
    const { questions } = req.body; // Array de preguntas

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de preguntas" });
    }

    const results = {
      success: 0,
      errors: [],
    };

    // Usar insertMany para mejor performance
    const questionsToInsert = questions.map((q) => {
      try {
        if (!q.topic || !q.question || q.answer === undefined) {
          results.errors.push(`Pregunta inválida: faltan campos requeridos`);
          return null;
        }

        return {
          topic: q.topic.toLowerCase().trim(),
          question: q.question,
          answer: Number(q.answer),
          time: q.time && Number(q.time) > 0 ? Number(q.time) : 10,
        };
      } catch (error) {
        results.errors.push(`Error procesando pregunta: ${error.message}`);
        return null;
      }
    }).filter((q) => q !== null);

    if (questionsToInsert.length > 0) {
      // Eliminar todas las preguntas existentes antes de insertar (comportamiento de reemplazo)
      await Question.deleteMany({});
      
      const inserted = await Question.insertMany(questionsToInsert);
      results.success = inserted.length;
    }

    res.json(results);
  } catch (error) {
    console.error("Error al cargar preguntas en bulk:", error);
    res.status(500).json({ error: "Error al cargar preguntas en bulk" });
  }
});

export default router;

