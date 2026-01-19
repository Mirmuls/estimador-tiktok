import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import questionsRouter from "./routes/questions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ezequielmirmul_db_user:YU2HFGGUwHbTxEi8@cluster0.zqmo1ct.mongodb.net/estimador-tiktok?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB");
  })
  .catch((error) => {
    console.error("❌ Error al conectar a MongoDB:", error);
    console.error("URI utilizada:", MONGODB_URI.replace(/:[^:@]+@/, ":****@"));
  });

// Rutas
app.use("/api/questions", questionsRouter);

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor funcionando correctamente" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

