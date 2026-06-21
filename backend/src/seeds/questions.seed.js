require('dotenv').config();
// src/seeds/questions.seed.js
// Seeds the PostgreSQL `questions` table. Idempotent via the sha256 text_hash:
// re-running skips questions whose text already exists.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.data.json'), 'utf8'));

async function seedQuestions() {
  let inserted = 0;
  let skipped = 0;
  try {
    for (const q of questions) {
      const textHash = crypto.createHash('sha256').update(q.text).digest('hex');
      const result = await db.query(
        `INSERT INTO questions
           (technology, concept, difficulty, difficulty_score, text,
            options, correct_index, source, status, metadata, text_hash)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11)
         ON CONFLICT (text_hash) DO NOTHING
         RETURNING id`,
        [
          q.technology,
          q.concept,
          q.difficulty,
          q.difficulty_score,
          q.text,
          JSON.stringify(q.options),
          q.correct_index,
          q.source || 'manual',
          q.status || 'active',
          JSON.stringify(q.metadata || {}),
          textHash,
        ]
      );
      if (result.rows.length > 0) {
        inserted++;
        console.log(`Inserted: ${q.text.slice(0, 48)}...`);
      } else {
        skipped++;
        console.log(`Skipped existing: ${q.text.slice(0, 40)}...`);
      }
    }
    console.log(`Questions seed completed. Inserted ${inserted}, skipped ${skipped}.`);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding questions:', err);
    await db.pool.end().catch(() => {});
    process.exit(1);
  }
}

seedQuestions();
