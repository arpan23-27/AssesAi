// src/models/question.model.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  technology: {
    type: String,
    required: true,
    enum: ['javascript', 'react', 'nodejs', 'python', 'sql'],
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['basic', 'intermediate', 'advanced'],
  },
  concept: {
    type: String,
    required: true,
  },
  difficulty_score: {
    type: Number,
    min: 0,
    max: 1,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    validate: {
      validator: arr => arr.length === 4,
      message: 'Exactly 4 options required',
    },
    required: true,
  },
  correct_index: {
    type: Number,
    min: 0,
    max: 3,
    required: true,
  },
  source: {
    type: String,
    enum: ['manual', 'ai_generated'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'pending_review', 'retired'],
    default: 'active',
  },
  metadata: {
    prompt_version: String,
    model: String,
  },
  text_hash: {
    type: String,
    unique: true,
    index: true,
  },
}, { timestamps: true });

// Compound index for filtering
questionSchema.index({ technology: 1, difficulty: 1, concept: 1, status: 1 });
// Index for adaptive selection
questionSchema.index({ technology: 1, difficulty_score: 1 });

module.exports = mongoose.model('Question', questionSchema);