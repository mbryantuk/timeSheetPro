const axios = require('axios');
const API_URL = 'http://localhost:3001/api';

const dummyData = [
  {
    account: { id: 'ACC-PUZ', name: 'Puzzel AS' },
    projects: [
      {
        id: 'PRJ-PUZ-01', name: 'Product Enhancement',
        tasks: [
          { id: 'TSK-PUZ-DEV', name: 'Feature Development' },
          { id: 'TSK-PUZ-BUG', name: 'Bug Fixing' },
          { id: 'TSK-PUZ-MTG', name: 'Standup & Planning' }
        ]
      }
    ]
  },
  {
    account: { id: 'ACC-INT', name: 'Internal R&D' },
    projects: [
      {
        id: 'PRJ-TSP', name: 'TimeSheetPro',
        tasks: [
          { id: 'TSK-TSP-UI', name: 'WPF UI Design' },
          { id: 'TSK-TSP-AI', name: 'Ollama Integration' },
          { id: 'TSK-TSP-OCR', name: 'Native OCR Logic' }
        ]
      }
    ]
  }
];

async function seed() {
  console.log('🌱 Seeding rich Klient dummy data...');
  try {
    for (const item of dummyData) {
      await axios.post(`${API_URL}/accounts`, item.account);
      for (const prj of item.projects) {
        await axios.post(`${API_URL}/projects`, { ...prj, account_id: item.account.id });
        for (const tsk of prj.tasks) {
          await axios.post(`${API_URL}/tasks`, { ...tsk, project_id: prj.id });
        }
      }
    }
    console.log('✅ Done! Click REFRESH in your Windows widget to see the new tasks.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
}

seed();
