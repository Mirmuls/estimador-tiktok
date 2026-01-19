import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import questionsRouter from "./routes/questions.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Obtener el directorio actual del módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar dotenv con ruta explícita
const envPath = join(__dirname, ".env");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI no está definida en las variables de entorno");
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log("✅ Conectado a MongoDB");
    })
    .catch((error) => {
      console.error("❌ Error al conectar a MongoDB:", error.message);
    });
}

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

