const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');
const { db, initDb } = require('./db');
const { summarizeActivities } = require('./ollama');
const { getMeetingsForTimeframe } = require('./calendar');
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

app.post('/api/tasks/import/csv', async (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'No CSV data provided' });

  try {
    // Handle standard newlines or escaped literal '\n' from JSON curl payloads
    const lines = csv.replace(/\\n/g, '\n').replace(/\\t/g, '\t').split('\n');
    let imported = 0;
    
    for (let line of lines) {
      if (!line.trim()) continue;
      
      // Data is tab-separated: Owner Name, Project Status, Project, Klient Task: Task Name, Account
      const parts = line.split('\t').map(s => s.trim());
      
      if (parts.length >= 5) {
        const projectName = parts[2];
        const taskName = parts[3];
        const accountName = parts[4];
        
        // Skip header row if pasted
        if (projectName === 'Project' || taskName === 'Klient Task: Task Name') continue;
        
        // Generate IDs based on the text to prevent duplicates
        const accountId = 'ACC-' + Buffer.from(accountName).toString('base64').substring(0, 10).toUpperCase();
        const projectId = 'PRJ-' + Buffer.from(projectName).toString('base64').substring(0, 10).toUpperCase();
        const taskId = 'TSK-' + Buffer.from(taskName).toString('base64').substring(0, 10).toUpperCase() + '-' + Buffer.from(projectName).toString('base64').substring(0, 4).toUpperCase();

        await db('accounts').insert({ id: accountId, name: accountName }).onConflict('id').merge();
        await db('projects').insert({ id: projectId, name: projectName, account_id: accountId }).onConflict('id').merge();
        await db('tasks').insert({ id: taskId, name: taskName, project_id: projectId }).onConflict('id').merge();
        imported++;
      }
    }
    
    res.json({ success: true, imported });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activity Heartbeat
app.post('/api/activities', async (req, res) => {
  const { process_name, window_title, url, ocr_text, image_data, duration_ms, task_id } = req.body;
  const [id] = await db('activities').insert({
    process_name,
    window_title,
    url,
    ocr_text,
    image_data,
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

// --- Hourly Sync & Approval Flow --- //

// Fetch pending drafts
app.get('/api/drafts', async (req, res) => {
  try {
    const drafts = await db('timesheet_entries')
      .leftJoin('tasks', 'timesheet_entries.task_id', 'tasks.id')
      .leftJoin('projects', 'tasks.project_id', 'projects.id')
      .where('status', 'draft')
      .select(
        'timesheet_entries.id',
        'timesheet_entries.date',
        'timesheet_entries.hours',
        'timesheet_entries.notes',
        'timesheet_entries.created_at',
        'timesheet_entries.raw_data',
        'projects.name as project_name',
        'tasks.name as task_name'
      ).orderBy('created_at', 'desc');
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch approved entries for weekly export (Grouped by Task and Date)
app.get('/api/export/weekly', async (req, res) => {
  try {
    const exports = await db('timesheet_entries')
      .join('tasks', 'timesheet_entries.task_id', 'tasks.id')
      .join('projects', 'tasks.project_id', 'projects.id')
      .where('status', 'approved')
      .select(
        'projects.name as project_name',
        'tasks.name as task_name',
        'timesheet_entries.date'
      )
      .sum('timesheet_entries.hours as total_hours')
      // Group concat notes for the same task on the same day if there are multiple approved drafts
      .select(db.raw('GROUP_CONCAT(timesheet_entries.notes, "\\n- ") as combined_notes'))
      .groupBy('tasks.id', 'timesheet_entries.date')
      .orderBy('timesheet_entries.date', 'desc');
      
    res.json(exports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a draft
app.put('/api/drafts/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { task_id, notes } = req.body;
  try {
    await db('timesheet_entries')
      .where('id', id)
      .update({ status: 'approved', task_id, notes });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force cron for testing
app.post('/api/force-cron', async (req, res) => {
    console.log('⏰ Running FORCED summarization job...');
    const end = new Date();
    // Grab everything in the last 24 hours for testing instead of just 1 hour
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    try {
        const activities = await db('activities')
          .where('timestamp', '>=', start.toISOString())
          .andWhere('timestamp', '<=', end.toISOString());

        if (activities.length === 0) {
          return res.json({ message: 'No activities found.' });
        }

        const meetings = await getMeetingsForTimeframe(start, end);
        const calendarContext = meetings.join('\n');

        const summary = await summarizeActivities(activities, calendarContext);

        const totalMs = activities.reduce((sum, a) => sum + a.duration_ms, 0);
        const decimalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));

        await db('timesheet_entries').insert({
          task_id: null,
          date: start.toISOString().split('T')[0],
          hours: decimalHours,
          notes: summary,
          raw_data: JSON.stringify(activities.map(a => `[\${a.process_name}] \${a.window_title} (\${Math.round(a.duration_ms / 1000)}s)`)),
          status: 'draft'
        });
        res.json({ message: `✅ Hourly summary drafted: \${summary.substring(0, 50)}...` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper function to generate a draft for a specific period
async function generateDraftForPeriod(start, end) {
    try {
        const activities = await db('activities')
          .where('timestamp', '>=', start.toISOString())
          .andWhere('timestamp', '<=', end.toISOString());

        if (activities.length === 0) {
          console.log('No activities found for the given period.');
          return;
        }

        const meetings = await getMeetingsForTimeframe(start, end);
        const calendarContext = meetings.join('\n');

        const summary = await summarizeActivities(activities, calendarContext);

        const totalMs = activities.reduce((sum, a) => sum + a.duration_ms, 0);
        const decimalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));

        await db('timesheet_entries').insert({
          task_id: null,
          date: start.toISOString().split('T')[0],
          hours: decimalHours,
          notes: summary,
          raw_data: JSON.stringify(activities.map(a => `[\${a.process_name}] \${a.window_title} (\${Math.round(a.duration_ms / 1000)}s)`)),
          status: 'draft'
        });
        console.log(`✅ Summary drafted: ${summary.substring(0, 50)}...`);
    } catch (e) {
        console.error('Summarization failed:', e.message);
    }
}

// Hourly Cron Job (Runs at minute 0, from 10 AM to 5 PM, Mon-Fri)
// Summarizes the previous 60 minutes (e.g., 9:00 - 10:00)
cron.schedule('0 10-17 * * 1-5', async () => {
    console.log('⏰ Running hourly working-hours summarization job...');
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    await generateDraftForPeriod(start, end);
});

// Half-hour Cron Job (Runs at 5:30 PM, Mon-Fri)
// Summarizes the final 30 minutes of the day (17:00 - 17:30)
cron.schedule('30 17 * * 1-5', async () => {
    console.log('⏰ Running final 5:30 PM summarization job...');
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 60 * 1000); // 30 minutes ago
    await generateDraftForPeriod(start, end);
});

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
