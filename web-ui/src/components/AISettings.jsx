import React, { useState } from 'react';

const AISettings = () => {
  const [prompt, setPrompt] = useState(`You are an expert project manager. Transform these activity logs into a Klient-compatible timesheet comment.
Format: "[Task Category] Brief professional description of work performed."
Constraints: No fluff, max 200 characters, use professional verbs (e.g., 'Analyzed', 'Developed', 'Coordinated').`);

  const [saved, setSaved] = useState(false);
  const [manualSummary, setManualSummary] = useState({
    hoursAgo: 1,
    isProcessing: false,
  });

  const handleSavePrompt = async () => {
    try {
      const response = await fetch('/api/ai-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Error saving prompt');
    }
  };

  const handleTriggerSummary = async () => {
    setManualSummary({ ...manualSummary, isProcessing: true });
    try {
      const response = await fetch('/api/summarize-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursAgo: manualSummary.hoursAgo }),
      });

      if (response.ok) {
        alert('Manual summary started!');
      }
    } catch (error) {
      console.error('Failed to trigger summary:', error);
      alert('Error triggering summary');
    } finally {
      setManualSummary({ ...manualSummary, isProcessing: false });
    }
  };

  const handleAbort = async () => {
    try {
      await fetch('/api/abort-summary', { method: 'POST' });
      alert('Summary aborted!');
    } catch (error) {
      console.error('Failed to abort:', error);
    }
  };

  return (
    <div >
      <h2 >AI Settings</h2>

      <div className="stats-grid">
        {/* AI Prompt Editor */}
        <div className="card">
          <h3 >
            🤖 AI Personality Editor
          </h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="input-field"
            placeholder="Enter the system prompt for Ollama..."
          />
          <button
            onClick={handleSavePrompt}
            className={`w-full py-2 rounded-lg font-medium transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'btn-primary'
            }`}
          >
            {saved ? '✓ Saved!' : '💾 Save Prompt'}
          </button>
          <p >
            This prompt controls how Ollama summarizes your activity logs into professional timesheet comments.
          </p>
        </div>

        {/* Manual Summary Trigger */}
        <div >
          <div className="card">
            <h3 >
              ⏱️ Manual Summary Trigger
            </h3>

            <div>
              <label className="label-text">Summarize the last</label>
              <div >
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={manualSummary.hoursAgo}
                  onChange={(e) => setManualSummary({ ...manualSummary, hoursAgo: parseInt(e.target.value) || 1 })}
                  className="input-field"
                />
                <span >hours of activity</span>
              </div>
            </div>

            <button
              onClick={handleTriggerSummary}
              disabled={manualSummary.isProcessing}
              className={`w-full py-2 rounded-lg font-medium transition-all ${
                manualSummary.isProcessing
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {manualSummary.isProcessing ? '⏳ Processing...' : '▶ Trigger Summary'}
            </button>

            <button
              onClick={handleAbort}
              className="btn-danger"
            >
              ⏹️ Cancel AI Summary
            </button>

            <div >
              <p >Status:</p>
              <div >
                <div ></div>
                <span>Idle - ready for summarization</span>
              </div>
            </div>
          </div>

          {/* Hardware Monitor */}
          <div className="card">
            <h3 >
              📡 System Status
            </h3>

            <div >
              <div >
                <span >Backend API</span>
                <div >
                  <div className="status-indicator online"></div>
                  <span >Online</span>
                </div>
              </div>

              <div >
                <span >Windows Client</span>
                <div >
                  <div className="status-indicator online"></div>
                  <span >Active</span>
                </div>
              </div>

              <div >
                <span >Ollama Server</span>
                <div >
                  <div className="status-indicator online"></div>
                  <span >Running</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
