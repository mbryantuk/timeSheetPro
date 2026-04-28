import React, { useState, useEffect } from 'react';

const PendingDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/drafts').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([draftsData, tasksData]) => {
      setDrafts(draftsData);
      setTasks(tasksData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load drafts:', err);
      setLoading(false);
    });
  }, []);

  const handleApprove = async (draftId) => {
    if (!selectedTask) {
      alert('Please select a task before approving');
      return;
    }

    try {
      const response = await fetch(`/api/drafts/${draftId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: selectedTask,
          notes: editedNotes || selectedDraft.notes,
        }),
      });

      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId));
        setSelectedDraft(null);
        alert('Draft approved successfully!');
      }
    } catch (error) {
      console.error('Failed to approve draft:', error);
      alert('Error approving draft');
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
        <h2 >Pending Drafts</h2>
        <span >
          {drafts.length} pending
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="card">
          <div >✨</div>
          <p >All caught up! No pending drafts.</p>
        </div>
      ) : (
        <div >
          {drafts.map(draft => (
            <div
              key={draft.id}
              className="card"
              onClick={() => {
                setSelectedDraft(draft);
                setEditedNotes(draft.notes);
                setSelectedTask('');
              }}
            >
              <div >
                <div>
                  <p >{new Date(draft.date).toLocaleDateString()}</p>
                  <p >{draft.hours} hours</p>
                </div>
                <div >
                  <p >{draft.project_name || 'Unassigned'}</p>
                  <p >{draft.task_name || 'No task'}</p>
                </div>
              </div>

              {selectedDraft?.id === draft.id && (
                <div >
                  <div>
                    <label className="label-text">Select Task</label>
                    <select
                      value={selectedTask}
                      onChange={(e) => setSelectedTask(e.target.value)}
                      className="input-field"
                    >
                      <option value="">-- Select a task --</option>
                      {tasks.map(task => (
                        <option key={task.id} value={task.id}>
                          {task.name} ({task.account_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-text">Edit Notes</label>
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="input-field"
                      placeholder="Edit or improve the AI-generated notes..."
                    />
                  </div>

                  <div >
                    <button
                      onClick={() => handleApprove(draft.id)}
                      className="btn-primary"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => setSelectedDraft(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <p >{draft.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingDrafts;
