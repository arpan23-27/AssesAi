//src/config/openai.js

const OpenAI = require('openai');
 const ai = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1', });
module.exports = ai;