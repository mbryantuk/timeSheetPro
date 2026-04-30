import React, { useState, useEffect } from 'react';

const AISettings = () => {
  const [prompt, setPrompt] = useState(`You are an expert Solution Architect at Puzzel. Generate professional, compliant timesheet notes.
- Start with a Verb.
- Include Purpose/Outcome.
- Strictly UNDER 20 WORDS.
- Use UK English.
- Avoid vague terms like 'support' or 'general work'.`);
  const [saved, setSaved] = useState(false);
  const [manualSummary, setManualSummary] = useState({
    hoursAgo: 1,
    isProcessing: false,
  });

  const [rules, setRules] = useState([]);
  const [excludeRules, setExcludeRules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [newRule, setNewRule] = useState({
    pattern: '',
    field: 'all',
    task_id: '',
    priority: 0
  });
  const [newExclude, setNewExclude] = useState({
    pattern: '',
    field: 'all'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promptRes, rulesRes, excludeRes, tasksRes] = await Promise.all([
        fetch('/api/ai-prompt').then(r => r.json()),
        fetch('/api/rules').then(r => r.json()),
        fetch('/api/exclude-rules').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json())
      ]);
      setPrompt(promptRes.prompt);
      setRules(rulesRes);
      setExcludeRules(excludeRes);
      setTasks(tasksRes);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleAddExclude = async () => {
    if (!newExclude.pattern) return;
    try {
        await fetch('/api/exclude-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExclude),
        });
        setNewExclude({ pattern: '', field: 'all' });
        fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteExclude = async (id) => {
    try {
        await fetch(`/api/exclude-rules/${id}`, { method: 'DELETE' });
        fetchData();
    } catch (err) { console.error(err); }
  };

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

  const handleAddRule = async () => {
    if (!newRule.pattern || !newRule.task_id) {
      alert('Pattern and Task are required');
      return;
    }
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      if (response.ok) {
        setNewRule({ pattern: '', field: 'all', task_id: '', priority: 0 });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add rule:', error);
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
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
    <div className="fade-in space-y-6 pb-12">
      <h2 className="text-2xl font-bold">AI & Automation Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Rules */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              🎯 Task Categorization Rules
            </h3>
            
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6 space-y-3">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Add New Rule</p>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Regex (e.g. VS Code|GitHub)"
                  className="input-field text-sm"
                  value={newRule.pattern}
                  onChange={e => setNewRule({...newRule, pattern: e.target.value})}
                />
                <select 
                  className="input-field text-sm"
                  value={newRule.field}
                  onChange={e => setNewRule({...newRule, field: e.target.value})}
                >
                  <option value="all">Match All Fields</option>
                  <option value="window_title">Window Title Only</option>
                  <option value="process_name">Process Name Only</option>
                </select>
              </div>
              <select 
                className="input-field text-sm"
                value={newRule.task_id}
                onChange={e => setNewRule({...newRule, task_id: e.target.value})}
              >
                <option value="">-- Select Target Task --</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.account_name} » {t.name}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Priority:</span>
                  <input 
                    type="number"
                    className="input-field text-sm w-20"
                    value={newRule.priority}
                    onChange={e => setNewRule({...newRule, priority: parseInt(e.target.value) || 0})}
                  />
                </div>
                <button onClick={handleAddRule} className="btn-primary flex-1 py-1.5">Add Rule</button>
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {rules.length === 0 && <p className="text-gray-500 text-center py-8 italic">No rules defined yet.</p>}
              {rules.map(rule => (
                <div key={rule.id} className="flex justify-between items-center p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-blue-400 text-xs bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30 font-mono">{rule.pattern}</code>
                      <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">{rule.field}</span>
                      <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold">P{rule.priority}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      Assign to: <span className="text-gray-200">{rule.account_name} » {rule.task_name}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-gray-600 hover:text-red-500 p-2 transition-colors"
                    title="Delete Rule"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              🚫 Global Exclude List
            </h3>
            <p className="text-[10px] text-gray-500 mb-4 italic">Activities matching these patterns will never be tracked.</p>
            
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6 space-y-3">
              <div className="flex gap-2">
                <input 
                  placeholder="Regex (e.g. Spotify|Banking)"
                  className="input-field text-sm flex-1"
                  value={newExclude.pattern}
                  onChange={e => setNewExclude({...newExclude, pattern: e.target.value})}
                />
                <button onClick={handleAddExclude} className="btn-secondary py-1 px-4">Add</button>
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {excludeRules.map(rule => (
                <div key={rule.id} className="flex justify-between items-center p-2 bg-gray-900 border border-gray-800 rounded group/ex">
                  <code className="text-red-400 text-xs font-mono">{rule.pattern}</code>
                  <button onClick={() => handleDeleteExclude(rule.id)} className="text-gray-700 hover:text-red-500 opacity-0 group-hover/ex:opacity-100 transition-opacity">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Prompt & Triggers */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              🤖 AI Personality Editor
            </h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input-field h-48 text-sm font-mono leading-relaxed mb-4"
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
            <p className="mt-3 text-xs text-gray-500 leading-relaxed italic">
              💡 This prompt controls how Ollama summarizes your activity logs. 
              Be specific about tone, forbidden words, and required detail level.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              ⏱️ Manual Summary Trigger
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label-text block mb-2">Retroactive Window</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={manualSummary.hoursAgo}
                    onChange={(e) => setManualSummary({ ...manualSummary, hoursAgo: parseInt(e.target.value) || 1 })}
                    className="input-field w-20"
                  />
                  <span className="text-sm text-gray-400">hours of past activity</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleTriggerSummary}
                  disabled={manualSummary.isProcessing}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    manualSummary.isProcessing
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'btn-primary'
                  }`}
                >
                  {manualSummary.isProcessing ? '⏳ Processing...' : '▶ Start AI Run'}
                </button>

                <button
                  onClick={handleAbort}
                  className="btn-danger px-4"
                  title="Force Stop"
                >
                  ⏹️
                </button>
              </div>

              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="status-indicator online scale-75"></div>
                  <span>Ollama Server is ready</span>
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
