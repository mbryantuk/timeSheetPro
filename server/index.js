const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { db, initDb } = require('./db');
const { summarizeActivities } = require('./ollama');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Web UI Dashboard
app.get('/', (req, res) => {
  res.render('index');
});

// Hierarchy Endpoints
app.get('/api/accounts', async (req, res) => {
  const accounts = await db('accounts').select('*');
  res.json(accounts);
});

app.post('/api/accounts', async (req, res) => {
  const { id, name } = req.body;
  await db('accounts').insert({ id, name }).onConflict('id').merge();
  res.status(201).json({ id, name });
});

app.get('/api/projects', async (req, res) => {
  const projects = await db('projects').select('*');
  res.json(projects);
});

app.post('/api/projects', async (req, res) => {
  const { id, name, account_id } = req.body;
  await db('projects').insert({ id, name, account_id }).onConflict('id').merge();
  res.status(201).json({ id, name, account_id });
});

app.get('/api/tasks', async (req, res) => {
  const tasks = await db('tasks').select('*');
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { id, name, project_id } = req.body;
  await db('tasks').insert({ id, name, project_id }).onConflict('id').merge();
  res.status(201).json({ id, name, project_id });
});

// Activity Heartbeat
app.post('/api/activities', async (req, res) => {
  const { process_name, window_title, url, ocr_text, duration_ms, task_id } = req.body;
  const [id] = await db('activities').insert({
    process_name,
    window_title,
    url,
    ocr_text,
    duration_ms,
    task_id
  });
  res.status(201).json({ id });
});

// Daily Report Endpoint
app.get('/api/reports/daily', async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  try {
    const report = await db('activities')
      .leftJoin('tasks', 'activities.task_id', 'tasks.id')
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .where('activities.timestamp', '>=', start)
      .andWhere('activities.timestamp', '<=', end)
      .select(
        'projects.name as project_name',
        'tasks.name as task_name',
        'activities.task_id'
      )
      .sum('duration_ms as total_ms')
      .groupBy('activities.task_id');

    // Add AI summaries for each group
    for (let item of report) {
        const activities = await db('activities')
            .where(builder => {
                 if (item.task_id) builder.where('task_id', item.task_id);
                 else builder.whereNull('task_id');
            })
            .andWhere('timestamp', '>=', start)
            .andWhere('timestamp', '<=', end);
        
        item.hours = parseFloat((item.total_ms / (1000 * 60 * 60)).toFixed(2));
        item.project_name = item.project_name || 'Unassigned';
        item.task_name = item.task_name || 'General Activity';
        item.summary = await summarizeActivities(activities);
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/health', (req, res) => res.send('OK'));

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
