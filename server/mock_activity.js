const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

const activities = [
    { process_name: 'Code', window_title: 'server/index.js - timeSheetPro', duration_ms: 1000 * 60 * 45 },
    { process_name: 'ms-teams', window_title: 'Sprint Planning Meeting', duration_ms: 1000 * 60 * 30 },
    { process_name: 'chrome', window_title: 'Salesforce Klient API Documentation', duration_ms: 1000 * 60 * 20 },
    { process_name: 'Code', window_title: 'client/WatcherService.cs - timeSheetPro', duration_ms: 1000 * 60 * 60 },
    { process_name: 'chrome', window_title: 'Stack Overflow - How to use Windows OCR in C#', duration_ms: 1000 * 60 * 15 },
    { process_name: 'outlook', window_title: 'Inbox - Matt Bryant', duration_ms: 1000 * 60 * 10 }
];

async function seedTestData() {
    console.log('🚀 Seeding test data...');
    
    try {
        // 1. Setup Hierarchy
        await axios.post(`${API_URL}/accounts`, { id: 'ACC-123', name: 'Internal R&D' });
        await axios.post(`${API_URL}/projects`, { id: 'PRJ-999', name: 'TimeSheetPro Dev', account_id: 'ACC-123' });
        await axios.post(`${API_URL}/tasks`, { id: 'TSK-001', name: 'Initial Implementation', project_id: 'PRJ-999' });

        // 2. Push Activities
        for (const activity of activities) {
            console.log(`📝 Recording: ${activity.window_title}`);
            await axios.post(`${API_URL}/activities`, {
                ...activity,
                task_id: 'TSK-001',
                ocr_text: `Context relevant to ${activity.window_title}. This is a simulated OCR capture.`
            });
        }

        console.log('✨ Data seeded successfully.');
        
        // 3. Trigger Summarization Test
        console.log('🤖 Requesting AI Summary...');
        const now = new Date();
        const startOfToday = new Date(now.setHours(0,0,0,0)).toISOString();
        const endOfToday = new Date(now.setHours(23,59,59,999)).toISOString();

        const summaryRes = await axios.post(`${API_URL}/summarize`, {
            task_id: 'TSK-001',
            start_date: startOfToday,
            end_date: endOfToday
        });

        console.log('\n--- AI GENERATED TIMESHEET ENTRY ---');
        console.log(`Hours: ${summaryRes.data.hours}`);
        console.log(`Notes: ${summaryRes.data.notes}`);
        console.log('------------------------------------\n');

    } catch (error) {
        console.error('❌ Error seeding data:', error.response?.data || error.message);
        console.log('\nTip: Make sure the server is running (npm start or docker-compose up)');
    }
}

seedTestData();
