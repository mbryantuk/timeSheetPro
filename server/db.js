const knex = require('knex');
const path = require('path');
require('dotenv').config();

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.resolve(__dirname, process.env.DATABASE_URL || './timesheet.sqlite'),
  },
  useNullAsDefault: true,
});

async function initDb() {
  // Client/Salesforce Hierarchy
  if (!(await db.schema.hasTable('accounts'))) {
    await db.schema.createTable('accounts', (table) => {
      table.string('id').primary(); // Salesforce Account ID
      table.string('name').notNullable();
    });
  }

  if (!(await db.schema.hasTable('projects'))) {
    await db.schema.createTable('projects', (table) => {
      table.string('id').primary(); // Salesforce Krow__Project__c ID
      table.string('name').notNullable();
      table.string('account_id').references('id').inTable('accounts');
    });
  }

  if (!(await db.schema.hasTable('tasks'))) {
    await db.schema.createTable('tasks', (table) => {
      table.string('id').primary(); // Salesforce Krow__Task__c ID
      table.string('name').notNullable();
      table.string('project_id').references('id').inTable('projects');
    });
  }

  // Activity Tracking
  if (!(await db.schema.hasTable('activities'))) {
    await db.schema.createTable('activities', (table) => {
      table.increments('id').primary();
      table.timestamp('timestamp').defaultTo(db.fn.now());
      table.string('process_name');
      table.string('window_title');
      table.string('url');
      table.text('ocr_text');
      table.text('image_data');
      table.integer('duration_ms');
      table.string('task_id').references('id').inTable('tasks'); // Link activity to a task
    });
  } else if (!(await db.schema.hasColumn('activities', 'image_data'))) {
    await db.schema.alterTable('activities', (table) => {
      table.text('image_data');
    });
  }


  // Finalized Entries for Klient
  if (!(await db.schema.hasTable('timesheet_entries'))) {
    await db.schema.createTable('timesheet_entries', (table) => {
      table.increments('id').primary();
      table.string('sf_id'); // Salesforce Krow__Timesheet_Split__c ID (after sync)
      table.string('project_id').references('id').inTable('projects');
      table.string('task_id').references('id').inTable('tasks');
      table.date('date').notNullable();
      table.float('hours').notNullable();
      table.text('notes');
      table.string('status').defaultTo('draft'); // draft, synced, error
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.text('raw_data');
    });
  } else if (!(await db.schema.hasColumn('timesheet_entries', 'raw_data'))) {
    await db.schema.alterTable('timesheet_entries', (table) => {
      table.text('raw_data');
    });
  }
}

module.exports = { db, initDb };
