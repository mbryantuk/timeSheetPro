import React, { useState } from 'react';
import Sidebar from './Sidebar';
import PendingDrafts from './PendingDrafts';
import WeeklyExport from './WeeklyExport';
import TaskManagement from './TaskManagement';
import ActivityFeed from './ActivityFeed';
import AISettings from './AISettings';
import SystemMonitor from './SystemMonitor';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('drafts');

  const renderContent = () => {
    switch (activeTab) {
      case 'drafts':
        return <PendingDrafts />;
      case 'weekly':
        return <WeeklyExport />;
      case 'tasks':
        return <TaskManagement />;
      case 'activity':
        return <ActivityFeed />;
      case 'ai':
        return <AISettings />;
      case 'monitor':
        return <SystemMonitor />;
      default:
        return <PendingDrafts />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;
