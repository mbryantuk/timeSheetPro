import React, { useState, useEffect } from 'react';

const WeeklyExport = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matrixData, setMatrixData] = useState([]);
  const [weekDates, setWeekDates] = useState([]);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

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
    // Determine the date range for the selected week
    const today = new Date();
    // Get Monday of current week
    const currentDay = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon, 7=Sun
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
      
      // Only include if it falls in the current week
      if (entryDate >= dates[0] && entryDate <= dates[6]) {
        const key = `${entry.account_name || 'N/A'}|${entry.project_name || 'Unassigned'}|${entry.task_name || 'No Task'}`;
        if (!matrixMap[key]) {
          matrixMap[key] = {
            id: key,
            account: entry.account_name || 'N/A',
            project: entry.project_name || 'Unassigned',
            task: entry.task_name || 'No Task',
            billable: true,
            days: [0, 0, 0, 0, 0, 0, 0], // Mon-Sun
            notes: ['', '', '', '', '', '', ''],
            total: 0
          };
        }

        const dayIndex = (entryDate.getDay() === 0 ? 7 : entryDate.getDay()) - 1; // 0=Mon, 6=Sun
        matrixMap[key].days[dayIndex] += entry.total_hours || 0;
        matrixMap[key].total += entry.total_hours || 0;
        
        if (entry.combined_notes) {
          const existingNotes = matrixMap[key].notes[dayIndex];
          matrixMap[key].notes[dayIndex] = existingNotes ? `${existingNotes}\n${entry.combined_notes}` : entry.combined_notes;
        }
      }
    });

    setMatrixData(Object.values(matrixMap));
  };

  const copyToClipboard = () => {
    let tsv = 'Account\tProject\tTask\tMon\tTue\tWed\tThu\tFri\tSat\tSun\tTotal\n';
    matrixData.forEach(row => {
      tsv += `${row.account}\t${row.project}\t${row.task}\t`;
      tsv += row.days.map(d => d.toFixed(2)).join('\t');
      tsv += `\t${row.total.toFixed(2)}\n`;
    });
    navigator.clipboard.writeText(tsv);
    alert('Matrix copied to clipboard (paste directly into Excel/Sheets)!');
  };

  const changeWeek = (offsetDelta) => {
    setCurrentWeekOffset(prev => prev + offsetDelta);
  };

  const calculateColumnTotal = (dayIndex) => {
    return matrixData.reduce((sum, row) => sum + row.days[dayIndex], 0);
  };

  const grandTotal = matrixData.reduce((sum, row) => sum + row.total, 0);

  const formatDateHeader = (date) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${days[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}.`;
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Timesheet Matrix (Klient Format)</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => changeWeek(-1)} className="btn-secondary">← Prev Week</button>
          <span style={{ fontWeight: 'bold' }}>
            {weekDates.length > 0 && `${weekDates[0].toLocaleDateString()} - ${weekDates[6].toLocaleDateString()}`}
          </span>
          <button onClick={() => changeWeek(1)} className="btn-secondary" disabled={currentWeekOffset >= 0}>Next Week →</button>
          <button onClick={copyToClipboard} className="btn-primary" style={{ marginLeft: '1rem' }}>
            📋 Copy to Excel
          </button>
        </div>
      </div>

      <div className="card table-container" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '1000px', textAlign: 'center', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '15%' }}>ACCOUNT</th>
              <th style={{ textAlign: 'left', width: '20%' }}>PROJECT</th>
              <th style={{ textAlign: 'left', width: '20%' }}>TASK</th>
              <th style={{ width: '5%' }}>BILLABLE</th>
              {weekDates.map((date, i) => (
                <th key={i} style={{ width: '5%', fontSize: '0.8rem' }}>{formatDateHeader(date)}</th>
              ))}
              <th style={{ width: '5%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.length === 0 ? (
              <tr>
                <td colSpan="13" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  No approved timesheet entries for this week.
                </td>
              </tr>
            ) : (
              matrixData.map(row => (
                <tr key={row.id}>
                  <td style={{ textAlign: 'left' }}>{row.account}</td>
                  <td style={{ textAlign: 'left' }}>{row.project}</td>
                  <td style={{ textAlign: 'left' }}>{row.task}</td>
                  <td>
                    <input type="checkbox" checked={row.billable} readOnly style={{ accentColor: 'var(--primary)' }} />
                  </td>
                  {row.days.map((hours, i) => (
                    <td key={i} style={{ position: 'relative' }}>
                      {hours > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{hours.toFixed(2)}</span>
                          {row.notes[i] && (
                            <span title={row.notes[i]} style={{ cursor: 'help', fontSize: '1.2rem', color: 'var(--primary)' }}>
                              💬
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#555' }}>0.00</span>
                      )}
                    </td>
                  ))}
                  <td style={{ fontWeight: 'bold' }}>{row.total.toFixed(2)}</td>
                </tr>
              ))
            )}
            
            {/* Totals Row */}
            {matrixData.length > 0 && (
              <tr style={{ borderTop: '2px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '1rem' }}>TOTAL HOURS:</td>
                {[0, 1, 2, 3, 4, 5, 6].map(i => (
                  <td key={i} style={{ fontWeight: 'bold' }}>
                    {calculateColumnTotal(i).toFixed(2)}
                  </td>
                ))}
                <td style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>
                  {grandTotal.toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '1.5rem', color: '#aaa', fontSize: '0.9rem' }}>
        <p>💡 Tip: You can hover over the 💬 icon to view the generated summary notes for that specific day. Click "Copy to Excel" to quickly paste this matrix directly into your Klient/Krow timesheet system.</p>
      </div>
    </div>
  );
};

export default WeeklyExport;
