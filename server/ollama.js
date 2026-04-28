const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

const PROMPT_FILE = path.join(__dirname, 'PROMPT.txt');

/**
 * Summarizes a batch of activities into a Klient-compatible comment.
 */
async function summarizeActivities(activities) {
  if (!activities || activities.length === 0) return null;

  let systemPrompt = "You are a professional project manager.";
  try {
    if (fs.existsSync(PROMPT_FILE)) {
      systemPrompt = fs.readFileSync(PROMPT_FILE, 'utf8');
    }
  } catch (err) {
    console.error('Failed to read PROMPT.txt:', err.message);
  }

  const activitySummary = activities.map(a => 
    `- [${a.process_name}] ${a.window_title} (${Math.round(a.duration_ms / 1000 / 60)} mins) ${a.ocr_text ? 'Context: ' + a.ocr_text.substring(0, 100) : ''}`
  ).join('\n');

  const userPrompt = `Summarize these activities:\n${activitySummary}`;

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false
    });

    // DeepSeek-R1 specific cleaning: Remove <think> tags if they leak through
    let cleaned = response.data.response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return cleaned;
  } catch (error) {
    console.error('Ollama summarization failed:', error.message);
    return "[Manual Entry Required] AI summarization failed.";
  }
}

module.exports = { summarizeActivities };
