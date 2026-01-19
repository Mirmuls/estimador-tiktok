# Estimador TikTok

Aplicación web de estimación numérica con gestión de preguntas mediante MongoDB.

## Características

- 🎮 Juego de estimación numérica con múltiples temáticas
- 📊 Backoffice para gestionar preguntas y respuestas
- 💾 Integración con MongoDB para almacenamiento persistente
- 📁 Importación/Exportación de preguntas en formato Excel

## Estructura del Proyecto

```
estimador-tiktok/
├── src/              # Frontend (React + TypeScript + Vite)
│   ├── Game.tsx      # Componente principal del juego
│   ├── Backoffice.tsx # Panel de administración
│   └── services/
│       └── api.ts    # Servicio de API para comunicación con el backend
├── server/           # Backend (Node.js + Express + MongoDB)
│   ├── server.js     # Servidor principal
│   ├── models/       # Modelos de MongoDB
│   └── routes/       # Rutas de la API
└── package.json      # Dependencias del frontend
```

## Instalación

### 1. Instalar dependencias del frontend

```bash
npm install
```

### 2. Instalar dependencias del backend

```bash
cd server
npm install
cd ..
```

### 3. Configurar MongoDB

Crea un archivo `.env` en la carpeta `server/` con la siguiente estructura:

```env
MONGODB_URI=mongodb+srv://ezequielmirmul_db_user:YU2HFGGUwHbTxEi8@cluster0.zqmo1ct.mongodb.net/estimador-tiktok?retryWrites=true&w=majority&appName=Cluster0
PORT=3001
```

**Nota:** El archivo `.env` ya está configurado con la conexión a MongoDB proporcionada. Si necesitas cambiarla, actualiza el archivo `server/.env`.

### 4. Configurar la URL de la API (opcional)

Si necesitas cambiar la URL de la API, crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3001/api
```

Por defecto, la aplicación usa `http://localhost:3001/api`.

## Uso

### Desarrollo

Para ejecutar tanto el frontend como el backend simultáneamente:

```bash
npm run dev:all
```

O ejecutarlos por separado:

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Producción

1. Construir el frontend:
```bash
npm run build
```

2. Iniciar el servidor backend:
```bash
npm run server:start
```

## API Endpoints

### GET `/api/questions`
Obtiene todas las preguntas agrupadas por tema.

### GET `/api/questions/list`
Obtiene todas las preguntas con sus IDs (para el backoffice).

### POST `/api/questions`
Crea una nueva pregunta.

**Body:**
```json
{
  "topic": "futbol",
  "question": "¿Cuántos días fue Marcelo Bielsa técnico?",
  "answer": 2237,
  "time": 10
}
```

### PUT `/api/questions/:id`
Actualiza una pregunta existente.

### DELETE `/api/questions/:id`
Elimina una pregunta.

### POST `/api/questions/bulk`
Carga múltiples preguntas (para importación desde Excel).

**Body:**
```json
{
  "questions": [
    {
      "topic": "futbol",
      "question": "Pregunta 1",
      "answer": 100,
      "time": 10
    }
  ]
}
```

## Formato de Excel

El archivo Excel debe tener las siguientes columnas:

1. **Tag** - Temática de la pregunta (ej: futbol, economia, geografia)
2. **Pregunta** - Texto de la pregunta
3. **Respuesta** - Número de la respuesta correcta
4. **Tiempo** - Tiempo en segundos (opcional, default: 10)

## Base de Datos

La aplicación usa MongoDB para almacenar las preguntas. El modelo incluye:

- `topic` - Temática de la pregunta
- `question` - Texto de la pregunta
- `answer` - Respuesta numérica correcta
- `time` - Tiempo en segundos (default: 10)
- `createdAt` - Fecha de creación
- `updatedAt` - Fecha de actualización

## Fallback

Si la conexión a MongoDB falla, la aplicación tiene un sistema de fallback:

1. Intenta cargar desde localStorage
2. Si no hay datos en localStorage, muestra un estado vacío (sin preguntas)

## Tecnologías

- **Frontend:** React, TypeScript, Vite, TailwindCSS
- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Herramientas:** ExcelJS (para importar/exportar Excel)

