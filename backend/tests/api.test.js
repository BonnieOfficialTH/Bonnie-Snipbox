import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { setSupabase } from '../src/supabase.js';

test('Backend API Suite', async (t) => {
  const mockCollections = [
    { id: 'work', name: 'Work', color: '#8bc9b5', sort_order: 1, created_at: 1000, updated_at: 1000, deleted_at: null },
  ];
  const mockSnippets = [
    {
      id: 'snp-1',
      title: 'Daily Standup',
      category_id: 'work',
      icon: '💼',
      content: 'Standup {{text}}',
      dynamic_fields: [{ name: 'text', defaultValue: '' }],
      created_at: 2000,
      updated_at: 2000,
      deleted_at: null,
    },
  ];

  const createMockSupabase = () => ({
    from(table) {
      let data = table === 'collections' ? [...mockCollections] : [...mockSnippets];
      const query = {
        select: () => query,
        is: () => query,
        eq: () => query,
        order: () => Promise.resolve({ data, error: null }),
        upsert: (row) => ({
          select: () => ({
            single: () => Promise.resolve({ data: row, error: null }),
          }),
        }),
        update: (updates) => ({
          eq: (field, val) => ({
            is: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { ...data[0], ...updates }, error: null }),
              }),
            }),
            select: () => ({
              single: () => Promise.resolve({ data: { ...data[0], ...updates }, error: null }),
            }),
            then: (resolve) => resolve({ data: null, error: null }),
          }),
        }),
      };
      return query;
    },
  });

  setSupabase(createMockSupabase());
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  t.after(() => server.close());

  await t.test('GET /api/health returns healthy', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.service, 'snippet-supabase-backend');
  });

  await t.test('GET /api/bootstrap returns collections and snippets', async () => {
    const res = await fetch(`${baseUrl}/api/bootstrap`);
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.collections.length, 1);
    assert.equal(json.data.collections[0].id, 'work');
    assert.equal(json.data.snippets.length, 1);
    assert.equal(json.data.snippets[0].title, 'Daily Standup');
  });

  await t.test('POST /api/snippets creates a snippet', async () => {
    const res = await fetch(`${baseUrl}/api/snippets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Snippet',
        categoryId: 'work',
        content: 'Hello {{world}}',
      }),
    });
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.data.title, 'New Snippet');
  });
});
