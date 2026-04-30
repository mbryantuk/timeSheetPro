const { db } = require('./db');
const { summarizeActivities } = require('./ollama');
const { getMeetingsForTimeframe } = require('./calendar');
const fs = require('fs');
const path = require('path');

async function generateDraftForPeriod(start, end) {
    const startStr = start.toISOString().replace('T', ' ').substring(0, 19);
    const endStr = end.toISOString().replace('T', ' ').substring(0, 19);
    const activities = await db('activities').where('timestamp', '>=', startStr).andWhere('timestamp', '<=', endStr);
    
    if (activities.length === 0) return;

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
            break;
        }
    }

    const meetings = await getMeetingsForTimeframe(start, end);
    console.log(`- Requesting summary from AI...`);
    const tasks = await summarizeActivities(activities, meetings.join('\n'));
    console.log(`- AI Response (parsed):`, JSON.stringify(tasks, null, 2));
    
    const totalMs = activities.reduce((sum, a) => sum + a.duration_ms, 0);
    const totalHours = totalMs / (1000 * 60 * 60);

    if (!Array.isArray(tasks)) {
        await db('timesheet_entries').insert({ 
            task_id: assignedTaskId, 
            date: start.toISOString().split('T')[0], 
            start_time: startStr,
            end_time: endStr,
            hours: parseFloat((Math.round(totalHours / 0.25) * 0.25).toFixed(2)) || 0.25, 
            notes: tasks, 
            raw_data: JSON.stringify(activities.map(a => `[${a.process_name}] ${a.window_title}`)), 
            status: 'draft' 
        });
        return;
    }

    let targetTotal = Math.round(totalHours / 0.25) * 0.25;
    if (targetTotal === 0 && totalHours > 0) targetTotal = 0.25;

    // Limit number of tasks to what can fit in targetTotal (min 0.25 per task)
    const maxPossibleTasks = Math.max(1, Math.floor(targetTotal / 0.25));
    const limitedTasks = tasks.slice(0, maxPossibleTasks);

    let allocatedHours = 0;
    const entriesToInsert = limitedTasks.map((t, index) => {
        let h = Math.round(((t.percentage / 100) * targetTotal) / 0.25) * 0.25;
        if (h === 0) h = 0.25;
        allocatedHours += h;
        return {
            task_id: assignedTaskId,
            date: start.toISOString().split('T')[0],
            start_time: startStr,
            end_time: endStr,
            hours: h,
            notes: t.note,
            raw_data: JSON.stringify(activities.map(a => `[${a.process_name}] ${a.window_title}`)),
            status: 'draft'
        };
    });

    // Balance to match targetTotal exactly
    let attempts = 0;
    while (Math.abs(allocatedHours - targetTotal) > 0.001 && attempts < 10) {
        attempts++;
        if (allocatedHours > targetTotal) {
            const largest = entriesToInsert.reduce((a, b) => a.hours > b.hours ? a : b);
            if (largest.hours > 0.25) {
                largest.hours -= 0.25;
                allocatedHours -= 0.25;
            } else { break; }
        } else {
            const largest = entriesToInsert.reduce((a, b) => a.hours > b.hours ? a : b);
            largest.hours += 0.25;
            allocatedHours += 0.25;
        }
    }

    for (const entry of entriesToInsert) {
        await db('timesheet_entries').insert(entry);
    }
}

async function repair() {
    console.log('🚀 Starting summary regeneration with task splitting and 15-min rounding...');
    
    const drafts = await db('timesheet_entries').where('status', 'draft');
    console.log(`Found ${drafts.length} existing draft entries.`);

    // Group drafts by period to avoid double processing
    const periods = [];
    drafts.forEach(d => {
        if (!d.start_time || !d.end_time) return;
        const exists = periods.find(p => p.start === d.start_time && p.end === d.end_time);
        if (!exists) periods.push({ start: d.start_time, end: d.end_time });
    });

    console.log(`Processing ${periods.length} distinct time periods.`);

    for (const period of periods) {
        console.log(`\nProcessing Period: ${period.start} to ${period.end}`);
        
        // Delete existing drafts for this period
        await db('timesheet_entries')
            .where('start_time', period.start)
            .andWhere('end_time', period.end)
            .andWhere('status', 'draft')
            .del();
        
        console.log(`- Deleted old drafts. Regenerating...`);
        await generateDraftForPeriod(new Date(period.start), new Date(period.end));
        console.log(`✅ Regenerated entries for period.`);
    }

    console.log('\n✨ Regeneration complete.');
    process.exit(0);
}

repair().catch(err => {
    console.error('Repair failed:', err);
    process.exit(1);
});
