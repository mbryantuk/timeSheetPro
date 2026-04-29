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
  const tasks = await db('tasks')
    .leftJoin('projects', 'tasks.project_id', 'projects.id')
    .select('tasks.*', 'projects.name as project_name');
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

app.get('/api/reports/timeline', async (req, res) => {
    const { date } = req.query;
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    try {
        const activities = await db('activities')
            .where('timestamp', '>=', start)
            .andWhere('timestamp', '<=', end)
            .select('timestamp', 'duration_ms');
        
        const buckets = new Array(96).fill(0);
        activities.forEach(a => {
            const time = new Date(a.timestamp);
            const minutes = time.getHours() * 60 + time.getMinutes();
            const bucketIndex = Math.floor(minutes / 15);
            if (bucketIndex >= 0 && bucketIndex < 96) buckets[bucketIndex] += a.duration_ms;
        });

        // Also fetch approved blocks to show "Journey"
        const approved = await db('timesheet_entries')
            .where('date', date)
            .andWhere('status', 'approved')
            .select('start_time', 'end_time', 'hours', 'notes');

        const approvedBuckets = new Array(96).fill(null);
        approved.forEach(entry => {
            if (!entry.start_time || !entry.end_time) return;
            const startT = new Date(entry.start_time);
            const endT = new Date(entry.end_time);
            const startMin = startT.getHours() * 60 + startT.getMinutes();
            const endMin = endT.getHours() * 60 + endT.getMinutes();
            const startIdx = Math.floor(startMin / 15);
            const endIdx = Math.floor(endMin / 15);
            for (let i = startIdx; i <= endIdx && i < 96; i++) {
                approvedBuckets[i] = { notes: entry.notes, hours: entry.hours };
            }
        });

        res.json({ activity: buckets, approved: approvedBuckets });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/drafts/:id/split', async (req, res) => {
    const { ratio } = req.body; // e.g. 0.5 for 50/50
    try {
        const draft = await db('timesheet_entries').where('id', req.params.id).first();
        if (!draft) return res.status(404).json({ error: 'Draft not found' });

        const originalHours = draft.hours;
        const h1 = parseFloat((originalHours * ratio).toFixed(2));
        const h2 = parseFloat((originalHours - h1).toFixed(2));

        // Create new draft
        await db('timesheet_entries').insert({
            ...draft,
            id: null,
            hours: h2,
            notes: `[Split Part 2] ${draft.notes}`,
            created_at: new Date().toISOString()
        });

        // Update original
        await db('timesheet_entries').where('id', req.params.id).update({
            hours: h1,
            notes: `[Split Part 1] ${draft.notes}`
        });

        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/drafts/merge', async (req, res) => {
    const { ids } = req.body;
    try {
        const drafts = await db('timesheet_entries').whereIn('id', ids);
        if (drafts.length < 2) return res.status(400).json({ error: 'Select at least 2 drafts' });

        const totalHours = drafts.reduce((sum, d) => sum + d.hours, 0);
        const combinedNotes = drafts.map(d => d.notes).join('; ');
        const firstDraft = drafts[0];

        // Keep the first one, delete the rest
        await db('timesheet_entries').where('id', firstDraft.id).update({
            hours: totalHours,
            notes: combinedNotes,
            raw_data: JSON.stringify(drafts.flatMap(d => JSON.parse(d.raw_data || '[]')))
        });

        await db('timesheet_entries').whereIn('id', ids.slice(1)).del();

        res.json({ success: true, id: firstDraft.id });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/drafts/:id/undo', async (req, res) => {
    try {
        await db('timesheet_entries').where('id', req.params.id).update({ status: 'draft' });
        res.json({ success: true });
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
      .where('timesheet_entries.status', 'approved')
      .select('tasks.account_name', 'projects.name as project_name', 'tasks.name as task_name', 'timesheet_entries.date')
      .sum('timesheet_entries.hours as total_hours')
      .select(db.raw('GROUP_CONCAT(timesheet_entries.notes, "\\n- ") as combined_notes'))
      .groupBy('tasks.account_name', 'projects.name', 'tasks.name', 'timesheet_entries.date').orderBy('timesheet_entries.date', 'desc');
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

app.get('/api/client-status', async (req, res) => {
    try {
        const lastActivity = await db('activities').orderBy('timestamp', 'desc').first();
        if (!lastActivity) return res.json({ active: false, last_seen: null });
        const lastTime = new Date(lastActivity.timestamp);
        const diffMs = new Date() - lastTime;
        const active = diffMs < 5 * 60 * 1000; // 5 minutes
        res.json({ active, last_seen: lastActivity.timestamp });
    } catch (error) { res.status(500).json({ error: error.message }); }
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

// Categorization Rules API
app.get('/api/rules', async (req, res) => {
    try {
        const rules = await db('categorization_rules')
            .leftJoin('tasks', 'categorization_rules.task_id', 'tasks.id')
            .leftJoin('projects', 'tasks.project_id', 'projects.id')
            .select('categorization_rules.*', 'tasks.name as task_name', 'projects.name as project_name')
            .orderBy('priority', 'desc');
        res.json(rules);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/rules', async (req, res) => {
    try {
        const { pattern, field, task_id, priority } = req.body;
        await db('categorization_rules').insert({ pattern, field, task_id, priority });
        res.status(201).json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/rules/:id', async (req, res) => {
    try {
        await db('categorization_rules').where('id', req.params.id).del();
        res.json({ success: true });
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

let isCronSummarizing = false;
async function generateDraftForPeriod(start, end) {
    const { getMeetingsForTimeframe } = require('./calendar');
    if (isCronSummarizing) { return; }
    isCronSummarizing = true;
    try {
        const startStr = start.toISOString().replace('T', ' ').substring(0, 19);
        const endStr = end.toISOString().replace('T', ' ').substring(0, 19);
        const activities = await db('activities').where('timestamp', '>=', startStr).andWhere('timestamp', '<=', endStr);
        if (activities.length === 0) { await logCron('No activities found.'); isCronSummarizing = false; return; }
        
        // Rule-based Task Assignment
        let assignedTaskId = null;
        const rules = await db('categorization_rules').orderBy('priority', 'desc');
        
        for (const rule of rules) {
            const regex = new RegExp(rule.pattern, 'i');
            const match = activities.find(a => {
                if (rule.field === 'process_name') return regex.test(a.process_name);
                if (rule.field === 'window_title') return regex.test(a.window_title);
                return regex.test(a.process_name) || regex.test(a.window_title);
            });
            if (match) {
                assignedTaskId = rule.task_id;
                break; // Found highest priority match
            }
        }

        const meetings = await getMeetingsForTimeframe(start, end);
        const summary = await summarizeActivities(activities, meetings.join('\n'));
        const totalMs = activities.reduce((sum, a) => sum + a.duration_ms, 0);
        const decimalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));
        
        await db('timesheet_entries').insert({ 
            task_id: assignedTaskId, 
            date: start.toISOString().split('T')[0], 
            start_time: startStr,
            end_time: endStr,
            hours: decimalHours, 
            notes: summary, 
            raw_data: JSON.stringify(activities.map(a => `[${a.process_name}] ${a.window_title}`)), 
            status: 'draft' 
        });
        await logCron(`✅ Summary drafted${assignedTaskId ? ' (Auto-assigned)' : ''}: ${summary.substring(0, 50)}...`);
    } catch (e) { await logCron(`❌ Summarization failed: ${e.message}`); } finally { isCronSummarizing = false; }
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
