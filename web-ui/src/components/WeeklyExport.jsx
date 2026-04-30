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

  const [searchTerm, setSearchTerm] = useState('');

  // Grouping logic with search
  const filteredEntries = entries.filter(entry => 
    `${entry.account_name} ${entry.project_name} ${entry.task_name} ${entry.combined_notes}`
    .toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const key = `${entry.account_name} - ${entry.project_name}`;
    if (!acc[key]) {
      acc[key] = {
        account: entry.account_name,
        project: entry.project_name,
        totalHours: 0,
        items: []
      };
    }
    acc[key].totalHours += entry.total_hours;
    acc[key].items.push(entry);
    return acc;
  }, {});

  const totalWeekHours = entries.reduce((sum, e) => sum + e.total_hours, 0);
  const billableHours = entries.filter(e => e.is_billable).reduce((sum, e) => sum + e.total_hours, 0);
  const nonBillableHours = totalWeekHours - billableHours;
  const projectCount = new Set(entries.map(e => e.project_name)).size;
  const avgDayHours = totalWeekHours / (new Set(entries.map(e => e.date)).size || 1);

  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyForKlient = () => {
    // Format: Date	Account	Project	Task	Hours	Notes
    // (Assuming tab-separated for Excel)
    const headers = "Date\tAccount\tProject\tTask\tHours\tNotes";
    const rows = filteredEntries.map(e => {
      const date = new Date(e.date).toLocaleDateString();
      return `${date}\t${e.account_name}\t${e.project_name}\t${e.task_name}\t${e.total_hours}\t${e.combined_notes.replace(/\n/g, ' ')}`;
    }).join('\n');
    navigator.clipboard.writeText(headers + '\n' + rows);
    alert('Formatted for Klient Excel import. Ready to paste!');
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-10 w-64 skeleton opacity-50" />
        <div className="grid grid-cols-3 gap-6 mb-8">
           {[1,2,3].map(i => <div key={i} className="h-32 skeleton opacity-10" />)}
        </div>
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
        <div className="flex gap-4">
          <button 
            onClick={copyForKlient}
            className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-black px-6 py-3 rounded-xl transition-all border border-blue-500/20 uppercase tracking-widest shadow-xl shadow-blue-900/0 hover:shadow-blue-600/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2a4 4 0 00-4-4H5m11 0h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V17m-4 0h-6.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 00-.293.707V17m4 0v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1m5 0a2 2 0 002 2h2a2 2 0 002-2v-3a2 2 0 00-2-2h-3m-1 0H9m5 0v3m1 8l-2 2-2-2"></path></svg>
            Copy for Klient
          </button>
          <button 
            onClick={fetchExports} 
            className="group flex items-center gap-2 bg-white/5 hover:bg-blue-600/20 text-blue-400 text-[10px] font-black px-6 py-3 rounded-xl transition-all border border-blue-500/20 hover:border-blue-500/50"
            aria-label="Refresh weekly data"
          >
            <svg className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            REFRESH DATA
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-8 bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/10 hover:border-blue-500/30">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Total Hours tracked</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">{totalWeekHours.toFixed(1)}</span>
            <span className="text-xs font-bold text-blue-900">HOURS</span>
          </div>
          <div className="mt-4 flex gap-1 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(billableHours / totalWeekHours) * 100}%` }} title={`Billable: ${billableHours.toFixed(1)}h`} />
            <div className="h-full bg-gray-600" style={{ width: `${(nonBillableHours / totalWeekHours) * 100}%` }} title={`Non-Billable: ${nonBillableHours.toFixed(1)}h`} />
          </div>
          <div className="mt-3 flex justify-between text-[8px] font-black uppercase tracking-widest">
             <span className="text-blue-500">{billableHours.toFixed(1)}h Billable</span>
             <span className="text-gray-500">{nonBillableHours.toFixed(1)}h Non-Billable</span>
          </div>
        </div>
        
        <div className="card p-8 bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/10 hover:border-purple-500/30">
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Active Projects</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">{projectCount}</span>
            <span className="text-xs font-bold text-purple-900">PROJECTS</span>
          </div>
          <div className="flex gap-1 mt-4">
             {Object.entries(groupedEntries).slice(0, 5).map(([key, group], i) => (
                <div key={i} className="h-4 flex-1 bg-white/5 rounded-sm overflow-hidden" title={`${group.project}: ${group.totalHours}h`}>
                  <div className="h-full bg-purple-500/40" style={{ width: `${(group.totalHours / totalWeekHours) * 100}%` }} />
                </div>
             ))}
          </div>
        </div>

        <div className="card p-8 bg-gradient-to-br from-green-600/10 to-transparent border-green-500/10 hover:border-green-500/30">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Daily Average</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">{avgDayHours.toFixed(1)}</span>
            <span className="text-xs font-bold text-green-900">HRS / DAY</span>
          </div>
          <p className="mt-4 text-[10px] font-bold text-gray-500 italic">Target: 7.5 hrs</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="relative flex-1 group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Search projects, tasks, or notes..." 
            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-3 rounded-xl border border-white/5">{filteredEntries.length} Results</span>
        </div>
      </div>

      {/* Grouped Table View */}
      <div className="space-y-4">
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="rounded-[2rem] border border-white/5 shadow-2xl bg-black/20 backdrop-blur-3xl p-32 text-center">
             <div className="text-4xl mb-4 grayscale opacity-10">🔍</div>
             <p className="text-gray-600 font-black italic uppercase tracking-widest text-xs">No entries match your search criteria.</p>
          </div>
        ) : (
          Object.entries(groupedEntries).map(([key, group]) => (
            <div key={key} className="overflow-hidden rounded-3xl border border-white/5 shadow-xl bg-black/20 backdrop-blur-xl transition-all">
              {/* Group Header */}
              <div 
                onClick={() => toggleGroup(key)}
                className="px-8 py-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-blue-500/10 text-blue-400 transition-transform ${expandedGroups[key] ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tighter">{group.account}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{group.project}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-green-500 tracking-tighter">{group.totalHours.toFixed(2)}</span>
                  <span className="text-[8px] font-black text-green-900 ml-1 tracking-widest">TOTAL HRS</span>
                </div>
              </div>

              {/* Group Items */}
              {expandedGroups[key] && (
                <div className="animate-slide-down">
                   <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-white/[0.02]">
                        {group.items.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01] transition-all group">
                            <td className="px-8 py-4">
                               <div className="flex items-center gap-2">
                                  <div className="text-xs font-black text-gray-400">{entry.task_name}</div>
                                  {entry.is_billable ? (
                                    <span className="text-[7px] font-black text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20 uppercase tracking-widest shadow-[0_0_8px_rgba(59,130,246,0.2)]">Billable</span>
                                  ) : (
                                    <span className="text-[7px] font-black text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-widest">Internal</span>
                                  )}
                               </div>
                               <div className="mt-1 text-[11px] text-gray-500 line-clamp-1 italic group-hover:text-gray-400 transition-colors">
                                 "{entry.combined_notes}"
                               </div>
                            </td>
                            <td className="px-8 py-4 text-center w-32">
                               <span className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                 {new Date(entry.date).toLocaleDateString()}
                               </span>
                            </td>
                            <td className="px-8 py-4 text-center w-24">
                               <span className="text-lg font-black text-white tracking-tighter">
                                 {entry.total_hours.toFixed(2)}
                               </span>
                            </td>
                            <td className="px-8 py-4 text-right w-48">
                               <div className="flex justify-end gap-2">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(entry.combined_notes); }}
                                   className="p-2 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-lg border border-white/5 transition-all"
                                   title="Quick Copy"
                                 >
                                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); openDrawer(entry); }}
                                   className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[9px] font-black px-4 py-2 rounded-lg border border-blue-500/20 transition-all uppercase tracking-widest"
                                 >
                                   Details
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              )}
            </div>
          ))
        )}
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

