import React, { useState, useEffect } from 'react';

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [formData, setFormData] = useState({ name: '', project_id: '', account_name: '' });
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([tasksData, projectsData]) => {
      setTasks(tasksData);
      setProjects(projectsData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load tasks:', err);
      setLoading(false);
    });
  }, []);

  const handleImportCSV = async () => {
    if (!csvInput.trim()) {
      alert('Please paste CSV data');
      return;
    }

    try {
      const response = await fetch('/api/tasks/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvInput }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.imported} tasks imported successfully!`);
        setCsvInput('');
        setShowForm(false);
        // Refresh tasks
        const refreshed = await fetch('/api/tasks').then(r => r.json());
        setTasks(refreshed);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Error importing tasks');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const refreshed = await fetch('/api/tasks').then(r => r.json());
        setTasks(refreshed);
        setFormData({ name: '', project_id: '', account_name: '' });
        setShowForm(false);
        alert('Task added successfully!');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      alert('Error adding task');
    }
  };

  if (loading) {
    return <div >
      <div className="spinner"></div>
    </div>;
  }

  return (
    <div >
      <div >
        <h2 >Task Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div >
            <div>
              <h3 >Import from CSV</h3>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                className="input-field"
                placeholder="Paste CSV data here (Owner, Status, Project, Task, Account)..."
              />
              <button
                onClick={handleImportCSV}
                className="btn-primary"
              >
                📥 Import CSV
              </button>
            </div>

            <div >
              <div >
                <div ></div>
              </div>
              <div >
                <span >OR</span>
              </div>
            </div>

            <form onSubmit={handleAddTask} >
              <div>
                <label className="label-text">Task Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Design Homepage"
                />
              </div>

              <div>
                <label className="label-text">Project</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text">Account Name</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., ACME Corp"
                />
              </div>

              <button type="submit" className="btn-primary">
                ✓ Add Task
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card table-container">
        {tasks.length === 0 ? (
          <div >
            <div >📌</div>
            <p >No tasks yet. Create one or import from CSV!</p>
          </div>
        ) : (
          <table >
            <thead>
              <tr >
                <th >Task Name</th>
                <th >Project</th>
                <th >Account</th>
                <th >Owner</th>
                <th >Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr key={idx} >
                  <td >{task.name}</td>
                  <td >{task.project_name || '—'}</td>
                  <td >{task.account_name || '—'}</td>
                  <td >{task.owner || '—'}</td>
                  <td >
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.status === 'active'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {task.status || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TaskManagement;
