import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: Number,
    required: true,
  },
  time: {
    type: Number,
    default: 10,
    min: 1,
  },
  topic: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
}, {
  timestamps: true,
});

// Índice para búsquedas más rápidas por tema
questionSchema.index({ topic: 1 });

export default mongoose.model("Question", questionSchema);

