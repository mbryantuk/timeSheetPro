import React, { useState, useEffect } from 'react';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => {
        setActivities(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load activities:', err);
        setLoading(false);
      });
  }, []);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div >
      <div className="spinner"></div>
    </div>;
  }

  return (
    <div >
      <div >
        <h2 >Live Activity Feed</h2>
        <span >Last 24 hours</span>
      </div>

      {activities.length === 0 ? (
        <div className="card">
          <div >🔥</div>
          <p >No activity recorded yet. Make sure the Windows client is running!</p>
        </div>
      ) : (
        <div >
          {activities.map((activity, idx) => (
            <div key={idx} className="card" onClick={() => setExpandedActivity(expandedActivity === idx ? null : idx)}>
              <div >
                <div >
                  <div >
                    <span >{activity.process_name.includes('Code') ? '💻' : activity.process_name.includes('Chrome') ? '🌐' : '🔷'}</span>
                    <span >{activity.process_name}</span>
                    <span >{formatTime(activity.timestamp)}</span>
                  </div>
                  <p >{activity.window_title}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activity.duration < 60 ? 'bg-gray-800 text-gray-400' : 'bg-blue-900/30 text-blue-400'
                }`}>
                  {Math.round(activity.duration / 60)}m
                </span>
              </div>

              {expandedActivity === idx && (
                <div >
                  {activity.ocr_text && (
                    <div>
                      <p >OCR Text</p>
                      <p >
                        {activity.ocr_text}
                      </p>
                    </div>
                  )}

                  {activity.screenshot_path && (
                    <div>
                      <p >Screenshot</p>
                      <div >
                        <img
                          src={activity.screenshot_path}
                          alt="Screenshot"
                          
                          onMouseEnter={() => setScreenshotPreview(activity.screenshot_path)}
                          onMouseLeave={() => setScreenshotPreview(null)}
                        />
                      </div>
                    </div>
                  )}

                  {activity.ocr_text && (
                    <div >
                      Relevant keywords: <span >{activity.process_name}, {activity.window_title.slice(0, 30)}...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {screenshotPreview && (
        <div className="modal-overlay">
          <img
            src={screenshotPreview}
            alt="Screenshot Preview"
            className="modal-content"
            onClick={() => setScreenshotPreview(null)}
          />
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
