import React, { useState, useEffect } from 'react';

const WeeklyExport = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState([]);
  const [weekDates, setWeekDates] = useState([]);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

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
            total: 0
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
    // Format: Project | Task | Mon | Tue | Wed | Thu | Fri | Sat | Sun
    // Klient "Add Multiple Rows" usually takes this tab-separated format
    let tsv = '';
    matrixData.forEach(row => {
      const hours = row.days.map(d => d > 0 ? d.toFixed(2) : '').join('\t');
      tsv += `${row.project}\t${row.task}\t${hours}\n`;
    });
    
    navigator.clipboard.writeText(tsv);
    alert('Matrix copied! In Klient, click "Add Multiple Rows" and paste.');
  };

  const copyDailyNotes = () => {
    // Format for pasting into a specific day's comment box
    let notes = '';
    matrixData.forEach(row => {
      notes += `### ${row.project} - ${row.task} ###\n`;
      row.days.forEach((hours, i) => {
        if (hours > 0) {
          notes += `${weekDates[i].toLocaleDateString()}: ${row.notes[i]}\n`;
        }
      });
      notes += '\n';
    });
    navigator.clipboard.writeText(notes);
    alert('Detailed notes copied to clipboard!');
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
        <div className="flex gap-2 items-center bg-gray-900 p-1 rounded-lg border border-gray-800">
          <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white">←</button>
          <span className="text-sm font-bold px-4 text-blue-400">
            {weekDates.length > 0 && `${weekDates[0].toLocaleDateString()} - ${weekDates[6].toLocaleDateString()}`}
          </span>
          <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white" disabled={currentWeekOffset >= 0}>→</button>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={copyKlientMatrix} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 shadow-lg shadow-blue-900/20">
          📋 Copy Klient Grid
        </button>
        <button onClick={copyDailyNotes} className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 border-gray-700">
          📝 Copy All Notes
        </button>
      </div>

      <div className="card overflow-x-auto p-0 border-gray-800 shadow-2xl">
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr className="bg-gray-900/50 border-b border-gray-800">
              <th className="text-left py-4 px-6 text-gray-400 font-bold uppercase tracking-wider text-[10px] w-48">Project / Task</th>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <th key={day} className="py-4 px-2 text-gray-400 font-bold uppercase tracking-wider text-[10px] w-20">
                  {day}
                  <div className="text-[9px] font-normal text-gray-600 mt-0.5">{weekDates[i]?.getDate()}.{weekDates[i]?.getMonth() + 1}</div>
                </th>
              ))}
              <th className="py-4 px-6 text-blue-400 font-bold uppercase tracking-wider text-[10px] w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {matrixData.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-20 text-gray-600 italic">No approved entries found for this week.</td>
              </tr>
            ) : (
              matrixData.map(row => (
                <tr key={row.id} className="hover:bg-blue-900/5 transition-colors group">
                  <td className="text-left py-4 px-6">
                    <div className="font-bold text-gray-200 truncate" title={row.project}>{row.project}</div>
                    <div className="text-xs text-gray-500 truncate" title={row.task}>{row.task}</div>
                  </td>
                  {row.days.map((hours, i) => (
                    <td key={i} className={`py-4 px-2 border-x border-gray-800/20 ${hours > 0 ? 'bg-blue-900/10' : ''}`}>
                      {hours > 0 ? (
                        <div className="relative group/note">
                          <span className="font-mono font-bold text-white text-base">{hours.toFixed(2)}</span>
                          {row.notes[i] && (
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full" title={row.notes[i]}></div>
                          )}
                          {/* Note Tooltip */}
                          {row.notes[i] && (
                            <div className="absolute z-10 hidden group-hover/note:block bg-gray-900 border border-gray-700 p-2 rounded shadow-2xl text-[10px] text-left w-48 -left-20 bottom-8">
                              <p className="text-blue-400 mb-1 font-bold">Notes:</p>
                              <p className="text-gray-300 leading-tight italic">{row.notes[i]}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-800 font-mono">-</span>
                      )}
                    </td>
                  ))}
                  <td className="py-4 px-6 font-mono font-bold text-blue-400 text-base bg-blue-900/5">
                    {row.total.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-900/50 font-bold border-t border-gray-700">
            <tr>
              <td className="py-4 px-6 text-left text-gray-400 uppercase text-[10px]">Daily Totals</td>
              {[0, 1, 2, 3, 4, 5, 6].map(i => {
                const dayTotal = calculateColumnTotal(i);
                return (
                  <td key={i} className={`py-4 px-2 font-mono text-sm ${dayTotal < 7.5 && dayTotal > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                    {dayTotal > 0 ? dayTotal.toFixed(2) : '-'}
                  </td>
                );
              })}
              <td className="py-4 px-6 font-mono text-xl text-green-400">
                {grandTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg flex gap-4 items-start shadow-inner">
        <span className="text-xl">💡</span>
        <div className="text-xs text-blue-300 leading-relaxed">
          <p className="font-bold mb-1 uppercase tracking-wider">Klient Pro Tip</p>
          <p>Click <strong>"Copy Klient Grid"</strong> to copy the grid exactly as Klient's "Add Multiple Rows" expects. 
          Use <strong>"Copy All Notes"</strong> to get a breakdown of your comments for manual pasting into the Salesforce Klient Daily Notes field.</p>
        </div>
      </div>
    </div>
  );
};

export default WeeklyExport;
