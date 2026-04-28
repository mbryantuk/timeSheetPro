import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('drafts');
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    fetch('/api/drafts')
      .then(res => res.json())
      .then(data => setDrafts(data));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      <nav className="w-64 bg-gray-900 border-r border-gray-800 p-6">
        <h2 className="text-xl font-bold mb-8">TimeSheetPro</h2>
        <button onClick={() => setActiveTab('drafts')} className="block w-full text-left p-3 mb-2 hover:bg-gray-800 rounded">📋 Pending Drafts</button>
        <button onClick={() => setActiveTab('export')} className="block w-full text-left p-3 mb-2 hover:bg-gray-800 rounded">📊 Weekly Export</button>
      </nav>

      <main className="flex-1 p-8">
        {activeTab === 'drafts' && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Pending Drafts</h1>
            {drafts.map(d => (
              <div key={d.id} className="bg-gray-900 p-6 rounded-lg border border-gray-800 mb-4">
                <p className="text-blue-400 font-bold mb-2">{d.hours} hours</p>
                <textarea className="w-full bg-black p-3 rounded border border-gray-700" defaultValue={d.notes} />
                <button className="mt-4 bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">Approve</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
