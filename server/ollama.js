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

  const grouped = activities.reduce((acc, a) => {
    const key = `${a.process_name}|||${a.window_title}`;
    if (!acc[key]) {
      acc[key] = { 
        process_name: a.process_name, 
        window_title: a.window_title, 
        duration_ms: 0,
        is_background: a.is_background,
        is_call: a.is_call
      };
    }
    acc[key].duration_ms += a.duration_ms;
    return acc;
  }, {});

  const activitySummary = Object.values(grouped)
    .sort((a, b) => b.duration_ms - a.duration_ms)
    .map(a => 
      `- [${a.process_name}] ${a.window_title} (${Math.round(a.duration_ms / 1000 / 60)} mins)${a.is_background ? ' [BACKGROUND NOISE]' : ''}${a.is_call ? ' [ACTIVE CALL]' : ''}`
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

    // Look for all occurrences of "[Percentage]% | [Note]" or similar
    const regex = /(\d+)\s*%?\s*[|:-]\s*([^%\n]+?)(?=\s*\d+\s*%?\s*[|:-]|$)/g;
    let match;
    const tasks = [];
    while ((match = regex.exec(cleaned)) !== null) {
      tasks.push({ percentage: parseInt(match[1]), note: match[2].trim() });
    }

    if (tasks.length === 0) {
       // Fallback for list style without pipes
       const lines = cleaned.split('\n');
       for (const line of lines) {
         const m = line.match(/^\s*(\d+)\s*%?\s*[|:-]\s*(.*)/);
         if (m) {
           tasks.push({ percentage: parseInt(m[1]), note: m[2].trim() });
         }
       }
    }

    if (tasks.length === 0) {
       return [{ percentage: 100, note: cleaned.substring(0, 200) || "[Auto-Summarized] General Project Work" }];
    }
    return tasks;
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
