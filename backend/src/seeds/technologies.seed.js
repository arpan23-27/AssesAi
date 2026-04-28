require('dotenv').config();
// src/seeds/technologies.seed.js
const db = require('../config/db');

async function seedTechnologies() {
  const technologies = ['javascript', 'react', 'nodejs', 'python', 'sql'];

  try {
    for (const tech of technologies) {
      const result = await db.query(
        `
        INSERT INTO technologies (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name
        `,
        [tech]
      );

      if (result.rows.length > 0) {
        console.log(`Inserted technology: ${result.rows[0].name}`);
      } else {
        console.log(`Skipped existing technology: ${tech}`);
      }
    }

    console.log('Technologies seed completed.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding technologies:', err);
    process.exit(1);
  }
}

// Run standalone
seedTechnologies();