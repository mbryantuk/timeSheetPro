import React, { useState, useEffect, useCallback } from 'react';

const WeeklyExport = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  const fetchExports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export/weekly');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Failed to load exports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, []);

  const openDrawer = (entry) => {
    setSelectedEntry(entry);
    setEditedNotes(entry.combined_notes);
    setIsDrawerOpen(true);
  };

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedEntry(null), 300); // Wait for transition
  }, []);

  // Keyboard support for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) closeDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedNotes);
    // Using a more subtle feedback than alert would be better, but keeping it simple for now
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-10 w-64 skeleton opacity-50" />
        <div className="h-64 w-full skeleton opacity-20" />
      </div>
    );
  }

  return (
    <div className="fade-in space-y-8 relative min-h-screen pb-20">
      {/* Header Area */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter mb-1">Weekly Summary</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Review and Export approved time</p>
        </div>
        <button 
          onClick={fetchExports} 
          className="group flex items-center gap-2 bg-white/5 hover:bg-blue-600/20 text-blue-400 text-[10px] font-black px-6 py-3 rounded-xl transition-all border border-blue-500/20 hover:border-blue-500/50"
          aria-label="Refresh weekly data"
        >
          <svg className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          REFRESH DATA
        </button>
      </div>

      {/* Main Content Table */}
      <div className="overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl bg-black/20 backdrop-blur-3xl">
        <table className="w-full text-left border-collapse" role="grid">
          <thead>
            <tr className="bg-gradient-to-r from-blue-950/20 via-purple-950/20 to-transparent border-b border-white/5">
              <th className="px-8 py-6 text-[10px] font-black text-blue-400 uppercase tracking-widest">Project Details</th>
              <th className="px-8 py-6 text-[10px] font-black text-purple-400 uppercase tracking-widest text-center">Schedule</th>
              <th className="px-8 py-6 text-[10px] font-black text-green-400 uppercase tracking-widest text-center">Duration</th>
              <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {entries.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-8 py-32 text-center">
                  <div className="text-4xl mb-4 grayscale opacity-10">📅</div>
                  <p className="text-gray-600 font-black italic uppercase tracking-widest text-xs">No approved entries found for this week.</p>
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-all group">
                  <td className="px-8 py-6 max-w-md">
                    <div className="font-black text-gray-100 text-lg tracking-tighter leading-tight">{entry.account_name}</div>
                    <div className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tighter flex items-center gap-2">
                      <span className="text-blue-500/50">{entry.project_name}</span>
                      <span className="text-gray-800">|</span>
                      <span className="text-purple-500/50">{entry.task_name}</span>
                    </div>
                    {/* Note Snippet Improvement */}
                    <div className="mt-3 text-[11px] text-gray-400 line-clamp-1 italic group-hover:text-gray-300 transition-colors">
                      "{entry.combined_notes}"
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex flex-col items-center">
                       <span className="text-xs font-black text-gray-400 tracking-widest">
                         {new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                       </span>
                       <span className="bg-white/5 text-gray-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-white/5 mt-1">
                         {new Date(entry.date).toLocaleDateString()}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white tracking-tighter group-hover:text-green-400 transition-colors">
                        {entry.total_hours.toFixed(2)}
                        </span>
                        <span className="text-[8px] font-black text-green-900 tracking-[0.2em] -mt-1">HOURS</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => openDrawer(entry)}
                      className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[9px] font-black px-5 py-3 rounded-xl border border-blue-500/20 transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-blue-900/0 hover:shadow-blue-600/20"
                      aria-label={`View and edit notes for ${entry.account_name}`}
                    >
                      View Notes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Premium Side Drawer for Notes */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-500 ease-in-out ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeDrawer} />
        
        <div 
          className={`absolute top-0 right-0 h-full w-full max-w-xl bg-[#08090d] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            {/* Drawer Header */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-blue-950/10 to-transparent">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter">Entry Details</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">Timesheet Note</span>
                    <span className="text-[9px] font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest">{selectedEntry?.total_hours.toFixed(2)} HRS</span>
                  </div>
                </div>
                <button 
                  onClick={closeDrawer} 
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  aria-label="Close drawer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              {selectedEntry && (
                <div className="space-y-1">
                  <p className="text-sm font-black text-gray-100">{selectedEntry.account_name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedEntry.project_name} » {selectedEntry.task_name}</p>
                  <p className="text-[10px] text-blue-400 font-black mt-2">{new Date(selectedEntry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              )}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Consolidated Notes</label>
                  <span className="text-[9px] text-blue-500 font-black">{editedNotes.length} Characters</span>
                </div>
                <textarea 
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full h-[60vh] bg-black/40 border border-white/5 rounded-[1.5rem] p-8 text-sm text-gray-300 leading-relaxed focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all font-medium custom-scrollbar shadow-inner"
                  placeholder="No notes available for this entry..."
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-8 border-t border-white/5 bg-black/40">
              <div className="flex gap-4">
                <button 
                  onClick={handleCopy}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                  Copy to Clipboard
                </button>
                <button 
                  onClick={closeDrawer}
                  className="px-10 bg-white/5 hover:bg-white/10 text-gray-400 font-black py-5 rounded-2xl transition-all border border-white/5 uppercase tracking-[0.2em] text-[10px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyExport;

