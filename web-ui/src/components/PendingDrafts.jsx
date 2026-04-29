import React, { useState, useEffect } from 'react';

const PendingDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [inlineEditId, setInlineEditId] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);
  const [timeline, setTimeline] = useState({ activity: [], approved: [] });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchDrafts();
    fetchTimeline();
  }, []);

  const addToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const [draftsData, tasksData] = await Promise.all([
        fetch('/api/drafts').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
      ]);
      setDrafts(draftsData);
      setTasks(tasksData);
    } catch (err) {
      addToast('Failed to load drafts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const date = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/reports/timeline?date=${date}`);
      const data = await res.json();
      setTimeline(data);
    } catch (err) { console.error(err); }
  };

  const suggestTask = (draft, allTasks) => {
    if (!draft || !allTasks.length) return '';
    if (draft.task_id) return draft.task_id;
    const context = (draft.notes + ' ' + (draft.raw_data || '')).toLowerCase();
    let bestMatch = null, maxScore = 0;
    allTasks.forEach(task => {
      let score = 0;
      const acc = (task.account_name || '').toLowerCase();
      const prj = (task.project_name || '').toLowerCase();
      const tsk = (task.name || '').toLowerCase();
      if (acc && context.includes(acc)) score += 3;
      if (prj && context.includes(prj)) score += 2;
      if (tsk && context.includes(tsk)) score += 1;
      if (score > maxScore) { maxScore = score; bestMatch = task.id; }
    });
    return bestMatch || '';
  };

  const handleSelectDraft = (draft) => {
    if (inlineEditId === draft.id) return;
    setActiveDraft(draft);
    setEditedNotes(draft.notes);
    setSelectedTask(suggestTask(draft, tasks));
    setTaskSearch('');
    fetchScreenshots(draft.id);
  };

  const fetchScreenshots = async (id) => {
    setLoadingScreenshots(true);
    setScreenshots([]);
    try {
      const res = await fetch(`/api/drafts/${id}/screenshots`);
      const data = await res.json();
      setScreenshots(data);
    } catch (err) { console.error(err); }
    finally { setLoadingScreenshots(false); }
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedDrafts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleApprove = async (draftId) => {
    if (!selectedTask) { addToast('Please select a task', 'error'); return; }
    try {
      await fetch(`/api/drafts/${draftId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: selectedTask, notes: editedNotes || activeDraft.notes }),
      });
      setDrafts(drafts.filter(d => d.id !== draftId));
      setActiveDraft(null);
      setSelectedDrafts(selectedDrafts.filter(i => i !== draftId));
      fetchTimeline();
      addToast('Draft approved!');
    } catch (error) { addToast('Approval failed', 'error'); }
  };

  const handleSplit = async (id) => {
    if (!confirm('Split this draft into two equal parts?')) return;
    try {
        await fetch(`/api/drafts/${id}/split`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ratio: 0.5 }) 
        });
        fetchDrafts();
        addToast('Draft split successfully');
    } catch (err) { addToast('Split failed', 'error'); }
  };

  const handleMerge = async () => {
    if (selectedDrafts.length < 2) return;
    try {
        await fetch('/api/drafts/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedDrafts })
        });
        setSelectedDrafts([]);
        fetchDrafts();
        addToast('Drafts merged successfully');
    } catch (err) { addToast('Merge failed', 'error'); }
  };

  const handleUndo = async (id) => {
    try {
        await fetch(`/api/drafts/${id}/undo`, { method: 'POST' });
        fetchDrafts();
        fetchTimeline();
        addToast('Undo successful', 'success');
    } catch (err) { addToast('Undo failed', 'error'); }
  };

  const handleBulkApprove = async () => {
    if (selectedDrafts.length === 0) return;
    try {
      await fetch('/api/drafts/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDrafts }),
      });
      setDrafts(drafts.filter(d => !selectedDrafts.includes(d.id)));
      setSelectedDrafts([]);
      setActiveDraft(null);
      fetchTimeline();
      addToast(`${selectedDrafts.length} drafts approved!`);
    } catch (err) { addToast('Bulk approval failed', 'error'); }
  };

  const saveInlineNote = (draftId, newNotes) => {
    setEditedNotes(newNotes);
    setDrafts(drafts.map(d => d.id === draftId ? { ...d, notes: newNotes } : d));
    setInlineEditId(null);
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton"></div>
      <div className="h-10 w-full skeleton mb-6"></div>
      {[1, 2, 3].map(i => <div key={i} className="card p-6 h-24 skeleton opacity-50"></div>)}
    </div>
  );

  const filteredTasks = tasks.filter(t => `${t.account_name} ${t.project_name} ${t.name}`.toLowerCase().includes(taskSearch.toLowerCase()));

  return (
    <div className="fade-in space-y-6 relative pb-20">
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✨' : '❌'} {t.message}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Your Daily Journey</h2>
          <p className="text-gray-500 text-sm">Visualize your raw activity becoming approved timesheet entries.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDrafts.length >= 2 && (
            <button onClick={handleMerge} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg">Merge Selected</button>
          )}
          {selectedDrafts.length > 0 && (
            <button onClick={handleBulkApprove} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg">Approve ({selectedDrafts.length})</button>
          )}
          <span className="bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-700">
            {drafts.length} Pending
          </span>
        </div>
      </div>

      {/* Unified Timeline */}
      <div className="card p-4 space-y-4 bg-black/40 border-blue-900/20">
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-gray-600 uppercase font-black tracking-widest px-1">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
          </div>
          
          {/* Row 1: Raw Activity */}
          <div className="space-y-1">
            <p className="text-[8px] text-blue-500/50 uppercase font-bold ml-1">Raw Activity Density</p>
            <div className="timeline-container !h-4 opacity-60">
              {timeline.activity.map((val, i) => (
                <div key={i} className="timeline-bucket active" style={{ opacity: val > 0 ? Math.min(0.1 + (val / 600000), 1) : 0 }}></div>
              ))}
            </div>
          </div>

          {/* Row 2: Approved Journey */}
          <div className="space-y-1 pt-2">
            <p className="text-[8px] text-green-500/50 uppercase font-bold ml-1">Approved Timesheet</p>
            <div className="timeline-container !h-10 !bg-green-950/10 !border-green-900/20">
              {timeline.approved.map((val, i) => (
                <div 
                    key={i} 
                    className={`timeline-bucket ${val ? '!bg-green-500 !opacity-40' : ''}`}
                    title={val ? `${val.hours} hrs: ${val.notes}` : 'Not yet approved'}
                ></div>
              ))}
              <div className="absolute top-0 bottom-0 left-[37.5%] right-[29.1%] border-x border-dashed border-white/5 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {drafts.length === 0 ? (
          <div className="card text-center py-20 bg-gray-900/10 border-dashed border-gray-800">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-xl font-bold text-gray-400 italic">Day Complete!</p>
            <p className="text-gray-600 text-sm mt-2">All activities have been journeyed into your timesheet.</p>
          </div>
        ) : (
          drafts.map(draft => (
            <div
              key={draft.id}
              className={`card cursor-pointer transition-all border-gray-800/50 group ${activeDraft?.id === draft.id ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/20 shadow-2xl' : 'hover:border-gray-600 hover:bg-gray-800/20'}`}
              onClick={() => handleSelectDraft(draft)}
            >
              <div className="flex items-start gap-4">
                <div 
                  className={`w-6 h-6 mt-1 rounded-lg border flex items-center justify-center transition-all ${selectedDrafts.includes(draft.id) ? 'bg-blue-600 border-blue-400 scale-110' : 'border-gray-700 bg-gray-950'}`}
                  onClick={(e) => handleToggleSelect(draft.id, e)}
                >
                  {selectedDrafts.includes(draft.id) && <span className="text-white text-xs">✓</span>}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-black text-gray-300">{new Date(draft.date).toLocaleDateString()}</p>
                        <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-mono border border-blue-800/30">{draft.hours.toFixed(2)} hours</span>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-500 text-sm uppercase tracking-tighter">{draft.project_name || 'Unassigned'}</p>
                      <p className="text-[9px] text-gray-500 font-bold tracking-widest">{draft.task_name || (draft.task_id ? 'RULE MATCHED' : 'PENDING ACTION')}</p>
                    </div>
                  </div>

                  {activeDraft?.id === draft.id ? (
                    <div className="mt-6 p-6 bg-black/40 rounded-2xl border border-gray-800 space-y-6" onClick={e => e.stopPropagation()}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Target Task</label>
                            <input type="text" placeholder="Filter hierarchy..." className="input-field text-xs py-2.5 bg-gray-950" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} />
                            <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)} className="input-field max-h-48 text-xs font-bold" size={5}>
                              {filteredTasks.map(t => <option key={t.id} value={t.id}>{t.account_name} » {t.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Final Comment</label>
                            <textarea value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)} className="input-field h-32 text-xs leading-relaxed bg-gray-950 font-medium" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-green-500 uppercase tracking-widest">Visual Timeline</label>
                            <span className="text-[9px] text-gray-600 font-bold bg-gray-900 px-2 py-0.5 rounded">AUTO-CAPTURED</span>
                          </div>
                          <div className="bg-gray-950 rounded-2xl border border-gray-800 h-[280px] overflow-y-auto p-4 grid grid-cols-2 gap-3 custom-scrollbar">
                            {loadingScreenshots && <div className="col-span-2 flex items-center justify-center h-full opacity-20"><div className="spinner"></div></div>}
                            {screenshots.map(s => (
                              <div key={s.id} className="relative group/img aspect-video bg-black rounded-lg overflow-hidden border border-gray-800 hover:border-blue-500/50 transition-all cursor-zoom-in">
                                <img src={s.image_data} alt={s.window_title} className="w-full h-full object-cover opacity-40 hover:opacity-100 transition-all duration-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button onClick={() => handleApprove(draft.id)} className="btn-primary flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-2xl">✓ Approve & Finalize</button>
                        <button onClick={() => handleSplit(draft.id)} className="btn-secondary px-6 text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 border-dashed border-gray-700">Split</button>
                        <button onClick={() => setActiveDraft(null)} className="btn-secondary px-8 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex justify-between items-center group/notes">
                      <div className="flex-1">
                        {inlineEditId === draft.id ? (
                          <input className="input-field text-sm py-1.5 bg-black/40 border-blue-500" value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)} onBlur={() => saveInlineNote(draft.id, editedNotes)} onKeyDown={(e) => e.key === 'Enter' && saveInlineNote(draft.id, editedNotes)} autoFocus onClick={e => e.stopPropagation()} />
                        ) : (
                          <div className="text-gray-400 italic text-sm py-1 group-hover/notes:text-white transition-colors" onDoubleClick={(e) => { e.stopPropagation(); setInlineEditId(draft.id); setEditedNotes(draft.notes); }}>
                            "{draft.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingDrafts;
