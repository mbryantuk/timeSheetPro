const axios = require('axios');
require('dotenv').config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

/**
 * Summarizes a batch of activities into a Klient-compatible comment.
 */
async function summarizeActivities(activities) {
  if (!activities || activities.length === 0) return null;

  const activitySummary = activities.map(a => 
    `- [${a.process_name}] ${a.window_title} (${Math.round(a.duration_ms / 1000 / 60)} mins) ${a.ocr_text ? 'Context: ' + a.ocr_text.substring(0, 50) : ''}`
  ).join('\n');

  const prompt = `
    You are a professional project manager. Summarize the following desktop activities into a single, professional timesheet comment for a tool called Klient.
    
    Format: "[Category] Clear description of work performed."
    Example: "[Development] Implemented OAuth2 authentication flow and updated API documentation."
    
    Constraints:
    - Max 200 characters.
    - Use strong professional verbs.
    - Focus on the technical/work context.
    
    Activities:
    ${activitySummary}
  `;

  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      system: "You only output the summarized comment text. No conversational filler.",
      stream: false
    });

    return response.data.response.trim();
  } catch (error) {
    console.error('Ollama summarization failed:', error.message);
    return "[Manual Entry Required] AI summarization failed.";
  }
}

module.exports = { summarizeActivities };
