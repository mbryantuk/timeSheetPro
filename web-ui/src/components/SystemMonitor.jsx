import React, { useState, useEffect } from 'react';

const SystemMonitor = () => {
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clientStatus, setClientStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [aiRes, ollamaRes, clientRes] = await Promise.all([
          fetch('/api/ai-status').then(r => r.json()),
          fetch('/api/ollama-ps').then(r => r.json()),
          fetch('/api/client-status').then(r => r.json())
        ]);

        setAiStatus(aiRes);
        setOllamaStatus(ollamaRes);
        setClientStatus(clientRes);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch status:', error);
        setLoading(false);
      }
    };

    fetchStatus();
    let interval;
    if (autoRefresh) interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) return (
    <div className="stats-grid">
      {[1, 2, 3].map(i => <div key={i} className="card h-64 skeleton opacity-50"></div>)}
    </div>
  );

  const vramPercent = ollamaStatus ? Math.round((ollamaStatus.vram_used / (ollamaStatus.vram_total || 1)) * 100) : 0;

  return (
    <div className="fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-white tracking-tight">System Monitor</h2>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer group">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4 rounded border-gray-800 bg-black text-blue-600 focus:ring-0"
          />
          <span className="group-hover:text-gray-300">Live Telemetry</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Processing Engine */}
        <div className="card bg-blue-900/5 border-blue-900/20">
          <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em] mb-6">AI Summarizer</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 font-bold uppercase">Engine State</span>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                <div className={`w-2 h-2 rounded-full ${aiStatus?.isSummarizing ? 'bg-yellow-500 animate-pulse shadow-[0_0_10px_#eab308]' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
                <span className={`text-[10px] font-black uppercase ${aiStatus?.isSummarizing ? 'text-yellow-500' : 'text-green-500'}`}>
                  {aiStatus?.isSummarizing ? 'Summarizing...' : 'Idle'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[9px] text-gray-600 uppercase font-black mb-1">Active Model</p>
              <p className="text-sm font-mono text-gray-300 tracking-wider">DeepSeek-R1:latest</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-gray-500 font-bold uppercase">Endpoint</span>
              <code className="text-[10px] text-blue-400/50">10.10.1.168:11434</code>
            </div>
          </div>
        </div>

        {/* Ollama Hardware */}
        <div className="card lg:col-span-2 bg-purple-900/5 border-purple-900/20">
          <h3 className="text-sm font-black text-purple-400 uppercase tracking-[0.2em] mb-6">Inference Hardware</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">VRAM Allocation</span>
                <span className="text-xs font-mono text-purple-400">{vramPercent}%</span>
              </div>
              <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000"
                  style={{ width: `${vramPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-600 font-medium italic text-right">
                {(ollamaStatus?.vram_used / 1e9 || 0).toFixed(1)}GB / {(ollamaStatus?.vram_total / 1e9 || 0).toFixed(1)}GB Utilized
              </p>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Loaded Models</span>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {ollamaStatus?.models?.length > 0 ? (
                  ollamaStatus.models.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-black/40 rounded-lg border border-white/5 group hover:border-purple-500/30 transition-colors">
                      <span className="text-[10px] font-mono text-gray-400 group-hover:text-white transition-colors">{m.name}</span>
                      <span className="text-[9px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded font-black">{(m.size / 1e9 || 0).toFixed(1)}GB</span>
                    </div>
                  ))
                ) : <p className="text-[10px] text-gray-700 italic">No models currently in memory.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure Health */}
      <div className="card bg-gray-900/20 border-white/5">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Service Health Grid</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Backend API', status: 'Healthy', active: true },
            { label: 'Win-Client', status: clientStatus?.active ? 'Active' : 'Offline', active: clientStatus?.active },
            { label: 'Ollama-Srv', status: ollamaStatus ? 'Responsive' : 'Timed Out', active: !!ollamaStatus },
            { label: 'SQLite-DB', status: 'Connected', active: true },
          ].map((s, i) => (
            <div key={i} className="p-4 bg-black/20 rounded-2xl border border-white/5 flex flex-col items-center gap-2 group hover:scale-105 transition-all">
              <div className={`w-3 h-3 rounded-full ${s.active ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'}`}></div>
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{s.label}</p>
              <p className={`text-xs font-bold ${s.active ? 'text-gray-300' : 'text-red-500'}`}>{s.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
