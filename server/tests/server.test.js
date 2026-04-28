const request = require('supertest');
const express = require('express');
const { db, initDb } = require('../db');
const { summarizeActivities } = require('../ollama');

// Mock Ollama to avoid hitting the actual server during tests
jest.mock('../ollama');

let app;

beforeAll(async () => {
  // Use a different DB for testing or clear it
  process.env.DATABASE_URL = ':memory:';
  await initDb();
  
  // Create a fresh app instance for testing
  // (In a real scenario, we might export app from index.js without starting it)
  app = express();
  app.use(express.json());
  
  // Re-register routes for the test app
  const { db: testDb } = require('../db');
  
  app.post('/api/accounts', async (req, res) => {
    const { id, name } = req.body;
    await testDb('accounts').insert({ id, name }).onConflict('id').merge();
    res.status(201).json({ id, name });
  });

  app.get('/api/accounts', async (req, res) => {
    const accounts = await testDb('accounts').select('*');
    res.json(accounts);
  });
});

describe('Hierarchy API', () => {
  it('should create and retrieve an account', async () => {
    const newAccount = { id: 'ACC001', name: 'Test Account' };
    
    const postRes = await request(app)
      .post('/api/accounts')
      .send(newAccount);
    
    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.id).toBe('ACC001');

    const getRes = await request(app).get('/api/accounts');
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.length).toBe(1);
    expect(getRes.body[0].name).toBe('Test Account');
  });
});
