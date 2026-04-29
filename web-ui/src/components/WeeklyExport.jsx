import React, { useState, useEffect } from 'react';

const WeeklyExport = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState([]);
  const [weekDates, setWeekDates] = useState([]);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [compactMode, setCompactMode] = useState(false);

  const fetchExports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/export/weekly');
      const data = await res.json();
      setEntries(data);
      processMatrix(data, currentWeekOffset);
    } catch (err) {
      console.error('Failed to load exports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExports();
  }, []);

  useEffect(() => {
    processMatrix(entries, currentWeekOffset);
  }, [currentWeekOffset, entries]);

  const processMatrix = (data, weekOffset) => {
    const today = new Date();
    const currentDay = today.getDay() === 0 ? 7 : today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7));
    monday.setHours(0,0,0,0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    setWeekDates(dates);

    const matrixMap = {};

    data.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0,0,0,0);
      
      if (entryDate >= dates[0] && entryDate <= dates[6]) {
        const key = `${entry.account_name}|${entry.project_name}|${entry.task_name}`;
        if (!matrixMap[key]) {
          matrixMap[key] = {
            id: key,
            account: entry.account_name || 'N/A',
            project: entry.project_name || 'Unassigned',
            task: entry.task_name || 'No Task',
            days: [0, 0, 0, 0, 0, 0, 0],
            notes: ['', '', '', '', '', '', ''],
            total: 0,
            // Automatic Billable Check (simple rule: Non-Project = Non-Billable)
            billable: !entry.project_name?.includes('Non-Project')
          };
        }

        const dayIndex = (entryDate.getDay() === 0 ? 7 : entryDate.getDay()) - 1;
        matrixMap[key].days[dayIndex] += entry.total_hours || 0;
        matrixMap[key].total += entry.total_hours || 0;
        
        if (entry.combined_notes) {
          const cleanedNotes = entry.combined_notes.split('\n').map(n => n.trim().replace(/^- /, '')).filter(Boolean).join('; ');
          const existing = matrixMap[key].notes[dayIndex];
          matrixMap[key].notes[dayIndex] = existing ? `${existing}; ${cleanedNotes}` : cleanedNotes;
        }
      }
    });

    setMatrixData(Object.values(matrixMap));
  };

  const copyKlientMatrix = () => {
    let tsv = '';
    matrixData.forEach(row => {
      const hours = row.days.map(d => d > 0 ? d.toFixed(2) : '').join('\t');
      tsv += `${row.project}\t${row.task}\t${hours}\n`;
    });
    navigator.clipboard.writeText(tsv);
    alert('Matrix copied to clipboard!');
  };

  const changeWeek = (offsetDelta) => {
    setCurrentWeekOffset(prev => prev + offsetDelta);
  };

  const calculateColumnTotal = (dayIndex) => {
    return matrixData.reduce((sum, row) => sum + row.days[dayIndex], 0);
  };

  const grandTotal = matrixData.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Timesheet Matrix</h2>
          <p className="text-gray-500 text-sm mt-1">Review approved entries and export to Salesforce Klient</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
             <button 
                onClick={() => setCompactMode(false)}
                className={`px-3 py-1 text-[10px] uppercase font-bold rounded ${!compactMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
             >Comfortable</button>
             <button 
                onClick={() => setCompactMode(true)}
                className={`px-3 py-1 text-[10px] uppercase font-bold rounded ${compactMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}
             >Compact</button>
          </div>
          <div className="flex gap-1 items-center bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-400">←</button>
            <span className="text-sm font-bold px-4 text-blue-400">
              {weekDates.length > 0 && `${weekDates[0].toLocaleDateString()} - ${weekDates[6].toLocaleDateString()}`}
            </span>
            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-400" disabled={currentWeekOffset >= 0}>→</button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={copyKlientMatrix} className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest">📋 Copy Klient Grid</button>
        <button onClick={fetchExports} className="btn-secondary px-6 border-gray-800 text-gray-400 hover:text-white">🔄 Refresh</button>
      </div>

      <div className="card overflow-x-auto p-0 border-gray-800 shadow-2xl">
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-800">
              <th className={`text-left ${compactMode ? 'py-2 px-4' : 'py-4 px-6'} text-gray-400 font-bold uppercase tracking-wider text-[10px] w-48`}>Project / Task</th>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <th key={day} className={`py-4 px-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] w-20`}>
                  {day}
                  <div className="text-[9px] font-normal text-gray-600 mt-0.5">{weekDates[i]?.getDate()}.{weekDates[i]?.getMonth() + 1}</div>
                </th>
              ))}
              <th className="py-4 px-6 text-blue-400 font-bold uppercase tracking-wider text-[10px] w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {matrixData.length === 0 ? (
              <tr><td colSpan="9" className="py-20 text-gray-600 italic">No approved entries found for this week.</td></tr>
            ) : (
              matrixData.map(row => (
                <tr key={row.id} className={`hover:bg-blue-900/5 transition-colors ${!row.billable ? 'opacity-50 grayscale bg-gray-900/10' : ''}`}>
                  <td className={`text-left ${compactMode ? 'py-2 px-4' : 'py-4 px-6'}`}>
                    <div className="font-bold text-gray-200 truncate" title={row.project}>{row.project}</div>
                    <div className="text-[10px] text-gray-500 truncate uppercase tracking-tighter" title={row.task}>{row.task}</div>
                  </td>
                  {row.days.map((hours, i) => (
                    <td key={i} className={`${compactMode ? 'py-2' : 'py-4'} px-2 border-x border-gray-800/20 ${hours > 0 ? 'bg-blue-900/10' : ''}`}>
                      {hours > 0 ? (
                        <div className="relative group/note cursor-help">
                          <span className={`font-mono font-bold text-white ${compactMode ? 'text-sm' : 'text-base'}`}>{hours.toFixed(2)}</span>
                          {row.notes[i] && <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                          {row.notes[i] && (
                            <div className="absolute z-10 hidden group-hover/note:block bg-gray-950 border border-gray-700 p-3 rounded-lg shadow-2xl text-[10px] text-left w-64 -left-32 bottom-8 animate-slide-in">
                              <p className="text-blue-400 mb-2 font-black uppercase tracking-widest">Activity Summary</p>
                              <p className="text-gray-300 leading-relaxed italic">{row.notes[i]}</p>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-gray-800 font-mono opacity-20">-</span>}
                    </td>
                  ))}
                  <td className="py-4 px-6 font-mono font-bold text-blue-400 text-base bg-blue-900/5">{row.total.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-900/50 font-bold border-t border-gray-700">
            <tr>
              <td className="py-4 px-6 text-left text-gray-400 uppercase text-[10px] tracking-widest">Daily Context</td>
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const dayTotal = calculateColumnTotal(i);
                // Overtime: >10h (Red), Gap: <7.5h (Orange)
                let colorClass = "text-gray-300";
                if (dayTotal > 10) colorClass = "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                else if (dayTotal > 0 && dayTotal < 7.5) colorClass = "text-orange-500";
                
                return (
                  <td key={i} className={`py-4 px-2 font-mono text-sm ${colorClass}`}>
                    {dayTotal > 0 ? dayTotal.toFixed(2) : '-'}
                  </td>
                );
              })}
              <td className="py-4 px-6 font-mono text-xl text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">{grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="flex gap-4 items-center bg-blue-900/5 border border-blue-900/20 p-4 rounded-xl shadow-inner">
        <span className="text-xl bg-blue-900/30 w-10 h-10 flex items-center justify-center rounded-full">💡</span>
        <div className="text-[10px] text-blue-400/80 leading-relaxed uppercase tracking-wider font-bold">
          <p>Total hours for this week: <span className="text-white text-sm ml-1">{grandTotal.toFixed(2)}</span></p>
          <p className="mt-1">Non-project activities are automatically dimmed to help you focus on billable work.</p>
        </div>
      </div>
    </div>
  );
};

export default WeeklyExport;
