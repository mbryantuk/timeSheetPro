const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

const PROMPT_FILE = path.join(__dirname, 'PROMPT.txt');

let abortController = null;
let isSummarizing = false;
let currentTask = "Idle";

async function summarizeActivities(activities, calendarContext = '') {
  if (!activities || activities.length === 0) return null;

  isSummarizing = true;
  currentTask = "Summarizing activities...";

  let systemPrompt = "You are a professional project manager.";
  try {
    if (fs.existsSync(PROMPT_FILE)) {
      systemPrompt = fs.readFileSync(PROMPT_FILE, 'utf8');
    }
  } catch (err) {
    console.error('Failed to read PROMPT.txt:', err.message);
  }

  const lastActivity = activities[activities.length - 1];
  // Removed experimental vision fallback due to hallucination

  const activitySummary = activities.map(a => 
    `- [${a.process_name}] ${a.window_title} (${Math.round(a.duration_ms / 1000 / 60)} mins)`
  ).join('\n');

  const userPrompt = `Summarize these activities:\n${activitySummary}${calendarContext ? `\n\n### IMPORTANT CALENDAR CONTEXT\n${calendarContext}` : ''}`;

  abortController = new AbortController();
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      stream: false
    }, { signal: abortController.signal });

    let cleaned = response.data.response
      .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove DeepSeek thinking blocks
      .replace(/<[^>]*>/g, '')                  // Remove all HTML-style tags (<s>, </s>, <br>, etc.)
      .replace(/\s+/g, ' ')                      // Normalize whitespace
      .trim();

    // Fallback if the model still generated garbage or nonsensical symbols
    const isJunk = cleaned.length < 3 || 
                   (cleaned.includes('##') && cleaned.length < 20) ||
                   (cleaned.match(/[#$@%^&*()_+={}\[\]|\\<>]/g) || []).length > (cleaned.length / 2);

    if (isJunk) {
       cleaned = "[Auto-Summarized] General Project Work";
    }
    return cleaned;
  } catch (error) {
    if (axios.isCancel(error)) {
        console.log('🤖 AI Generation aborted by user.');
        return "[Aborted] Generation stopped.";
    }
    console.error('Ollama summarization failed:', error.message);
    return "[Manual Entry Required] AI summarization failed.";
  } finally {
      abortController = null;
      isSummarizing = false;
      currentTask = "Idle";
  }
}

function abortGeneration() {
    if (abortController) {
        abortController.abort();
    }
}

module.exports = { 
    summarizeActivities, 
    abortGeneration, 
    get isSummarizing() { return isSummarizing; }, 
    get currentTask() { return currentTask; } 
};
