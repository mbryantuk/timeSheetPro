import React, { useState, useEffect } from 'react';

const SystemMonitor = () => {
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [aiRes, ollamaRes] = await Promise.all([
          fetch('/api/ai-status').then(r => r.json()),
          fetch('/api/ollama-ps').then(r => r.json()),
        ]);

        setAiStatus(aiRes);
        setOllamaStatus(ollamaRes);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch status:', error);
        setLoading(false);
      }
    };

    fetchStatus();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 3000);
    }

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return <div >
      <div className="spinner"></div>
    </div>;
  }

  return (
    <div >
      <div >
        <h2 >System Monitor</h2>
        <label >
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            
          />
          Auto-refresh
        </label>
      </div>

      <div className="stats-grid">
        {/* AI Status */}
        <div className="card">
          <h3 >
            🤖 AI Status
          </h3>

          <div >
            <div >
              <p >Status</p>
              <div >
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  aiStatus?.isSummarizing ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <span className={`font-semibold ${
                  aiStatus?.isSummarizing ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {aiStatus?.isSummarizing ? 'Summarizing...' : 'Idle'}
                </span>
              </div>
            </div>

            {aiStatus?.currentTask && (
              <div >
                <p >Current Task</p>
                <p >{aiStatus.currentTask}</p>
              </div>
            )}

            <div >
              <p >Model</p>
              <p >DeepSeek-R1</p>
            </div>

            <div >
              <p >API Endpoint</p>
              <p >http://10.10.1.168:11434</p>
            </div>
          </div>
        </div>

        {/* Ollama Hardware Monitor */}
        <div className="card">
          <h3 >
            💾 Ollama Hardware
          </h3>

          {ollamaStatus ? (
            <div >
              <div >
                <p >Loaded Models</p>
                <div >
                  {ollamaStatus.models?.length > 0 ? (
                    ollamaStatus.models.map((model, idx) => (
                      <div key={idx} >
                        <span >{model.name}</span>
                        <span >{(model.size / 1e9).toFixed(1)}GB</span>
                      </div>
                    ))
                  ) : (
                    <p >No models loaded</p>
                  )}
                </div>
              </div>

              <div >
                <p >VRAM Usage</p>
                <div >
                  <div >
                    <div
                      
                      style={{ width: `${(ollamaStatus.vram_used / ollamaStatus.vram_total) * 100}%` }}
                    ></div>
                  </div>
                  <span >
                    {(ollamaStatus.vram_used / 1e9).toFixed(1)}GB / {(ollamaStatus.vram_total / 1e9).toFixed(1)}GB
                  </span>
                </div>
              </div>

              <div >
                <p >Server Uptime</p>
                <p >{ollamaStatus.uptime_seconds ? `${Math.round(ollamaStatus.uptime_seconds / 3600)} hours` : 'Unknown'}</p>
              </div>

              {ollamaStatus.temperature && (
                <div >
                  <p >GPU Temperature</p>
                  <p className={`text-sm font-semibold ${
                    ollamaStatus.temperature > 75 ? 'text-orange-400' : 'text-green-400'
                  }`}>
                    {ollamaStatus.temperature}°C
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div >
              <div >⚠️</div>
              <p >Unable to connect to Ollama server</p>
            </div>
          )}
        </div>
      </div>

      {/* Overall System Health */}
      <div className="card">
        <h3 >System Health</h3>
        <div className="stats-grid">
          {[
            { label: 'Backend', status: 'online', color: 'green' },
            { label: 'Windows Client', status: 'active', color: 'green' },
            { label: 'Ollama', status: ollamaStatus ? 'running' : 'offline', color: ollamaStatus ? 'green' : 'red' },
            { label: 'Database', status: 'healthy', color: 'green' },
          ].map((item, idx) => (
            <div key={idx} >
              <p >{item.label}</p>
              <div >
                <div className={`w-2 h-2 bg-${item.color}-500 rounded-full animate-pulse`}></div>
                <span className={`text-sm font-medium capitalize text-${item.color}-400`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
