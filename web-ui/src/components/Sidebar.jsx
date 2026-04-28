import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'drafts', label: 'Pending Drafts', icon: '📋' },
    { id: 'weekly', label: 'Weekly Export', icon: '📊' },
    { id: 'tasks', label: 'Task Management', icon: '📌' },
    { id: 'activity', label: 'Activity Feed', icon: '🔥' },
    { id: 'ai', label: 'AI Settings', icon: '🤖' },
    { id: 'monitor', label: 'System Monitor', icon: '📡' },
  ];

  return (
    <aside className="sidebar">
      <div >
        <h1 >TimeSheetPro</h1>
        <p >Automated Timesheet System</p>
      </div>

      <nav className="nav-links">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
            }`}
          >
            <span >{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div >
        <p >Status</p>
        <div className="nav-links">
          <div >
            <div className="status-indicator online"></div>
            <span >Backend: Online</span>
          </div>
          <div >
            <div className="status-indicator online"></div>
            <span >Client: Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
