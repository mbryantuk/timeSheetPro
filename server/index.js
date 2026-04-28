const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { db, initDb } = require('./db');
const { summarizeActivities, abortGeneration } = require('./ollama');
const { getMeetingsForTimeframe } = require('./calendar');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));

// Serve React built UI
let uiBuildPath = path.join(__dirname, '../web-ui/dist');
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  uiBuildPath = path.join(__dirname, 'dist');
}

if (fs.existsSync(uiBuildPath)) {
  app.use(express.static(uiBuildPath));
  app.get('/', (req, res) => {
    res.sendFile(path.join(uiBuildPath, 'index.html'));
  });
} else {
  // Fallback to old EJS UI if React build doesn't exist
  app.get('/', (req, res) => {
    res.render('index');
  });
}

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
  const { id, name, project_id, owner, status, account_name } = req.body;
  await db('tasks').insert({ id, name, project_id, owner, status, account_name }).onConflict('id').merge();
  res.status(201).json({ id, name, project_id });
});

app.post('/api/tasks/import/csv', async (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'No CSV data provided' });
  try {
    const lines = csv.replace(/\\n/g, '\n').replace(/\\t/g, '\t').split('\n');
    let imported = 0;
    for (let line of lines) {
      if (!line.trim()) continue;
      const parts = line.split('\t').map(s => s.trim());
      if (parts.length >= 5) {
        const owner = parts[0];
        const status = parts[1];
        const projectName = parts[2];
        const taskName = parts[3];
        const accountName = parts[4];
        if (projectName === 'Project' || taskName === 'Klient Task: Task Name') continue;
        const accountId = 'ACC-' + Buffer.from(accountName).toString('base64').substring(0, 10).toUpperCase();
        const projectId = 'PRJ-' + Buffer.from(projectName).toString('base64').substring(0, 10).toUpperCase();
        const taskId = 'TSK-' + Buffer.from(taskName).toString('base64').substring(0, 10).toUpperCase() + '-' + Buffer.from(projectName).toString('base64').substring(0, 4).toUpperCase();
        await db('accounts').insert({ id: accountId, name: accountName }).onConflict('id').merge();
        await db('projects').insert({ id: projectId, name: projectName, account_id: accountId }).onConflict('id').merge();
        await db('tasks').insert({ id: taskId, name: taskName, project_id: projectId, owner, status, account_name: accountName }).onConflict('id').merge();
        imported++;
      }
    }
    res.json({ success: true, imported });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { process_name, window_title, url, ocr_text, image_data, duration_ms, task_id } = req.body;
    const [id] = await db('activities').insert({ process_name, window_title, url, ocr_text, image_data, duration_ms, task_id });
    res.status(201).json({ id });
  } catch (error) {
    console.error('API Activities Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/daily', async (req, res) => {
  const { date } = req.query;
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  try {
    const report = await db('activities')
      .leftJoin('tasks', 'activities.task_id', 'tasks.id')
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .where('activities.timestamp', '>=', start).andWhere('activities.timestamp', '<=', end)
      .select('projects.name as project_name', 'tasks.name as task_name', 'activities.task_id')
      .sum('duration_ms as total_ms').groupBy('activities.task_id');
    for (let item of report) {
        const activities = await db('activities').where(builder => { if (item.task_id) builder.where('task_id', item.task_id); else builder.whereNull('task_id'); }).andWhere('timestamp', '>=', start).andWhere('timestamp', '<=', end);
        item.hours = parseFloat((item.total_ms / (1000 * 60 * 60)).toFixed(2));
        item.project_name = item.project_name || 'Unassigned';
        item.task_name = item.task_name || 'General Activity';
        item.summary = await summarizeActivities(activities);
    }
    res.json(report);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/activities/recent', async (req, res) => {
  try {
    const activities = await db('activities').orderBy('timestamp', 'desc').limit(50);
    res.json(activities);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/export/weekly', async (req, res) => {
  try {
    const exports = await db('timesheet_entries')
      .join('tasks', 'timesheet_entries.task_id', 'tasks.id')
      .join('projects', 'timesheet_entries.project_id', 'projects.id')
      .where('status', 'approved')
      .select('projects.name as project_name', 'tasks.name as task_name', 'timesheet_entries.date')
      .sum('timesheet_entries.hours as total_hours')
      .select(db.raw('GROUP_CONCAT(timesheet_entries.notes, "\\n- ") as combined_notes'))
      .groupBy('tasks.id', 'timesheet_entries.date').orderBy('timesheet_entries.date', 'desc');
    res.json(exports);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/drafts', async (req, res) => {
  try {
    const drafts = await db('timesheet_entries')
      .leftJoin('tasks', 'timesheet_entries.task_id', 'tasks.id')
      .leftJoin('projects', 'timesheet_entries.project_id', 'projects.id')
      .where('timesheet_entries.status', 'draft')
      .select('timesheet_entries.id', 'timesheet_entries.date', 'timesheet_entries.hours', 'timesheet_entries.notes', 'timesheet_entries.created_at', 'timesheet_entries.raw_data', 'projects.name as project_name', 'tasks.name as task_name')
      .orderBy('timesheet_entries.created_at', 'desc');
    res.json(drafts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/drafts/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { task_id, notes } = req.body;
  try {
    await db('timesheet_entries').where('id', id).update({ status: 'approved', task_id, notes });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/abort-summary', (req, res) => {
    abortGeneration();
    res.json({ message: 'AI generation aborted.' });
});

app.get('/api/ai-status', async (req, res) => {
    const { isSummarizing, currentTask } = require('./ollama');
    res.json({ isSummarizing, currentTask });
});

app.get('/api/ollama-ps', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/ps`);
        res.json(response.data);
    } catch (error) { res.json({ models: [] }); }
});

app.post('/api/force-cron', async (req, res) => {
    const { hours } = req.body;
    const end = new Date();
    const start = new Date(end.getTime() - (hours || 1) * 60 * 60 * 1000);
    try {
        await generateDraftForPeriod(start, end);
        res.json({ message: '✅ Forced summarization triggered.' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cron-logs', async (req, res) => {
    try {
        const logs = await db('cron_logs').orderBy('timestamp', 'desc').limit(20);
        res.json(logs);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/activities', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const activities = await db('activities')
            .orderBy('timestamp', 'desc')
            .limit(limit);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ai-prompt', (req, res) => {
    try {
        const prompt = fs.readFileSync(path.join(__dirname, 'PROMPT.txt'), 'utf8');
        res.json({ prompt });
    } catch (e) {
        res.status(500).json({ error: 'Could not read PROMPT.txt' });
    }
});

app.post('/api/ai-prompt', (req, res) => {
    const { prompt } = req.body;
    try {
        const p = fs.existsSync(path.join(__dirname, 'PROMPT.txt')) ? path.join(__dirname, 'PROMPT.txt') : '/app/PROMPT.txt';
        fs.writeFileSync(p, prompt);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Could not save PROMPT.txt' });
    }
});

app.post('/api/summarize-manual', async (req, res) => {
    const { hoursAgo } = req.body;
    const end = new Date();
    const start = new Date(end.getTime() - (hoursAgo || 1) * 60 * 60 * 1000);
    try {
        await generateDraftForPeriod(start, end);
        res.json({ message: '✅ Manual summarization triggered.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/settings/prompt', (req, res) => {
    try {
        const prompt = fs.readFileSync(path.join(__dirname, 'PROMPT.txt'), 'utf8');
        res.json({ prompt });
    } catch (e) { res.status(500).json({ error: 'Could not read PROMPT.txt' }); }
});

app.post('/api/settings/prompt', (req, res) => {
    const { prompt } = req.body;
    try {
        const p = fs.existsSync(path.join(__dirname, 'PROMPT.txt')) ? path.join(__dirname, 'PROMPT.txt') : '/app/PROMPT.txt';
        fs.writeFileSync(p, prompt);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Could not save PROMPT.txt' }); }
});

async function logCron(message) {
    await db('cron_logs').insert({ message, timestamp: new Date().toISOString() });
}

async function generateDraftForPeriod(start, end) {
    const { getMeetingsForTimeframe } = require('./calendar');
    if (isSummarizing) { return; }
    isSummarizing = true;
    try {
        const activities = await db('activities').where('timestamp', '>=', start.toISOString()).andWhere('timestamp', '<=', end.toISOString());
        if (activities.length === 0) { await logCron('No activities found.'); isSummarizing = false; return; }
        const meetings = await getMeetingsForTimeframe(start, end);
        const summary = await summarizeActivities(activities, meetings.join('\n'));
        const totalMs = activities.reduce((sum, a) => sum + a.duration_ms, 0);
        const decimalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));
        await db('timesheet_entries').insert({ task_id: null, date: start.toISOString().split('T')[0], hours: decimalHours, notes: summary, raw_data: JSON.stringify(activities.map(a => `[\${a.process_name}] \${a.window_title}`)), status: 'draft' });
        await logCron(`✅ Summary drafted: ${summary.substring(0, 50)}...`);
    } catch (e) { await logCron(`❌ Summarization failed: ${e.message}`); } finally { isSummarizing = false; }
}

cron.schedule('0 10-17 * * 1-5', async () => {
    const end = new Date();
    await generateDraftForPeriod(new Date(end.getTime() - 60 * 60 * 1000), end);
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  process.exit(1);
});
