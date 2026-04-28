const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

const PROMPT_FILE = path.join(__dirname, 'PROMPT.txt');

/**
 * Summarizes a batch of activities, optionally using vision for poor OCR context.
 */
async function summarizeActivities(activities, calendarContext = '') {
  if (!activities || activities.length === 0) return null;

  let systemPrompt = "You are a professional project manager.";
  try {
    if (fs.existsSync(PROMPT_FILE)) {
      systemPrompt = fs.readFileSync(PROMPT_FILE, 'utf8');
    }
  } catch (err) {
    console.error('Failed to read PROMPT.txt:', err.message);
  }

  // Fallback logic: check if OCR is too sparse
  const lastActivity = activities[activities.length - 1];
  let images = [];
  
  // If OCR text is short (e.g. < 50 chars), grab the latest image
  if (lastActivity.ocr_text && lastActivity.ocr_text.length < 50 && lastActivity.image_data) {
      console.log('🧐 OCR text sparse, triggering vision analysis...');
      images = [lastActivity.image_data]; // Ollama expects an array of base64 strings
  }

  const activitySummary = activities.map(a => 
    `- [${a.process_name}] ${a.window_title} (${Math.round(a.duration_ms / 1000 / 60)} mins)`
  ).join('\n');

  const userPrompt = `Summarize these activities:\n${activitySummary}${calendarContext ? `\n\n### CALENDAR CONTEXT\n${calendarContext}` : ''}`;

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: images.length > 0 ? 'llava' : OLLAMA_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      images: images,
      stream: false
    });

    let cleaned = response.data.response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return cleaned;
  } catch (error) {
    console.error('Ollama summarization failed:', error.message);
    return "[Manual Entry Required] AI summarization failed.";
  }
}

module.exports = { summarizeActivities };
