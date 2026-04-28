import React, { useState, useEffect } from 'react';

const WeeklyExport = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedData, setGroupedData] = useState({});

  useEffect(() => {
    fetch('/api/exports')
      .then(r => r.json())
      .then(data => {
        setEntries(data);
        groupEntriesByProjectAndDate(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load exports:', err);
        setLoading(false);
      });
  }, []);

  const groupEntriesByProjectAndDate = (data) => {
    const grouped = {};
    data.forEach(entry => {
      const key = `${entry.project_name || 'Unassigned'} - ${entry.task_name || 'No Task'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });
    setGroupedData(grouped);
  };

  const calculateTotalHours = () => {
    return entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
  };

  const copyToClipboard = () => {
    let text = 'TimeSheet Export\n================\n\n';
    Object.entries(groupedData).forEach(([projectTask, items]) => {
      text += `${projectTask}\n`;
      items.forEach(item => {
        text += `  ${item.date}: ${item.total_hours}h - ${item.combined_notes || 'No notes'}\n`;
      });
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    alert('Weekly export copied to clipboard!');
  };

  if (loading) {
    return <div >
      <div className="spinner"></div>
    </div>;
  }

  return (
    <div >
      <div >
        <h2 >Weekly Export</h2>
        <button onClick={copyToClipboard} className="btn-primary">
          📋 Copy to Clipboard
        </button>
      </div>

      <div className="stats-grid">
        <div className="card">
          <p >Total Hours</p>
          <p >{calculateTotalHours().toFixed(1)}h</p>
        </div>
        <div className="card">
          <p >Entries</p>
          <p >{entries.length}</p>
        </div>
        <div className="card">
          <p >Projects</p>
          <p >{Object.keys(groupedData).length}</p>
        </div>
        <div className="card">
          <p >Period</p>
          <p >
            {entries.length > 0 ? `Last ${entries.length} days` : 'No data'}
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card">
          <div >📊</div>
          <p >No approved entries yet. Start by approving some drafts!</p>
        </div>
      ) : (
        <div className="card table-container">
          <table >
            <thead>
              <tr >
                <th >Date</th>
                <th >Project</th>
                <th >Task</th>
                <th >Hours</th>
                <th >Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={idx} >
                  <td >{new Date(entry.date).toLocaleDateString()}</td>
                  <td >{entry.project_name || '—'}</td>
                  <td >{entry.task_name || '—'}</td>
                  <td >{entry.total_hours}h</td>
                  <td  title={entry.combined_notes}>
                    {entry.combined_notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WeeklyExport;
