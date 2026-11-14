import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInContext, createContext } from 'node:vm';

class MockRange {
  constructor(sheet, row, column, rowCount, columnCount) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }
  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from({ length: this.columnCount }, (_, columnOffset) =>
        this.sheet.rows[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ''
      )
    );
  }
  getDisplayValues() {
    return this.getValues().map(row => row.map(value => String(value)));
  }
  setValues(values) {
    values.forEach((valueRow, rowOffset) => {
      const rowIndex = this.row - 1 + rowOffset;
      while (this.sheet.rows.length <= rowIndex) this.sheet.rows.push([]);
      valueRow.forEach((value, columnOffset) => {
        this.sheet.rows[rowIndex][this.column - 1 + columnOffset] = value;
      });
    });
  }
}

class MockSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)); }
  insertColumnBefore(column) { this.rows.forEach(row => row.splice(column - 1, 0, '')); }
  getRange(row, column, rowCount, columnCount) {
    return new MockRange(this, row, column, rowCount, columnCount);
  }
  appendRow(values) { this.rows.push(values); }
}

class MockSpreadsheet {
  constructor() {
    this.sheets = new Map();
  }
  getName() { return 'Team snippets'; }
  getSheetByName(name) { return this.sheets.get(name) || null; }
  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

function createApi({ legacyCollections = false, revisionCollections = false, missingSpreadsheetId = false } = {}) {
  const spreadsheet = new MockSpreadsheet();
  if (legacyCollections) {
    const sheet = spreadsheet.insertSheet('Collections');
    sheet.rows = [
      ['id', 'name', 'color', 'createdAt', 'updatedAt', 'deletedAt'],
      ['legacy', 'Legacy collection', '#123456', 100, 100, ''],
    ];
  } else if (revisionCollections) {
    const sheet = spreadsheet.insertSheet('Collections');
    sheet.rows = [
      ['id', 'name', 'color', 'createdAt', 'updatedAt', 'revision', 'deletedAt'],
      ['legacy', 'Legacy collection', '#123456', 100, 100, 3, ''],
    ];
  }
  let uuid = 0;
  const scriptProperties = new Map();
  if (!missingSpreadsheetId) scriptProperties.set('SPREADSHEET_ID', 'test-spreadsheet-id');
  const context = createContext({
    SpreadsheetApp: {
      openById: () => spreadsheet,
      getActiveSpreadsheet: () => ({ getId: () => 'test-spreadsheet-id' }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => scriptProperties.get(key) || null,
        setProperty: (key, value) => scriptProperties.set(key, value),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: text => ({ text, setMimeType() { return this; } }),
    },
    Utilities: { getUuid: () => `generated-${++uuid}` },
    console: { error() {} },
  });
  const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
  runInContext(source, context);
  return context;
}

function post(api, body) {
  return JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }).text);
}

test('setup stores the bound spreadsheet ID in script properties', () => {
  const api = createApi({ missingSpreadsheetId: true });

  assert.equal(api.setup().ready, true);
});

test('reports a configuration error when the spreadsheet ID is missing', () => {
  const api = createApi({ missingSpreadsheetId: true });
  const response = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);

  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'MISSING_CONFIGURATION');
});

test('bootstrap initializes shared tabs and default collections', () => {
  const api = createApi();
  const response = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);

  assert.equal(response.ok, true);
  assert.deepEqual(response.data.collections.map(item => item.id), ['all', 'social', 'work', 'personal', 'other']);
  assert.deepEqual(response.data.snippets, []);
});

test('snippet writes use revisions and soft-deleted snippets disappear from bootstrap', () => {
  const api = createApi();
  const snippet = {
    id: 'team-note',
    title: 'Team note',
    categoryId: 'work',
    icon: '✦',
    content: 'Shared text',
    dynamicFields: [],
  };
  const created = post(api, { action: 'saveSnippet', snippet });
  assert.equal(created.ok, true);
  assert.equal(created.data.revision, 1);

  const updated = post(api, {
    action: 'saveSnippet',
    snippet: { ...snippet, title: 'Updated note' },
    expectedRevision: created.data.revision,
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.data.revision, 2);

  const staleWrite = post(api, {
    action: 'saveSnippet',
    snippet,
    expectedRevision: created.data.revision,
  });
  assert.equal(staleWrite.ok, false);
  assert.equal(staleWrite.error.code, 'REVISION_CONFLICT');

  const deleted = post(api, {
    action: 'deleteSnippet',
    id: snippet.id,
    expectedRevision: updated.data.revision,
  });
  assert.equal(deleted.ok, true);
  assert.equal(deleted.data.revision, 3);
  assert.deepEqual(JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text).data.snippets, []);
});

test('collection updates reject stale revisions', () => {
  const api = createApi();
  const created = post(api, {
    action: 'saveCollection',
    collection: { id: 'team', name: 'Team', color: '#123456' },
  });
  assert.equal(created.ok, true);
  assert.equal(created.data.revision, 1);

  const updated = post(api, {
    action: 'saveCollection',
    collection: { id: 'team', name: 'Team updates', color: '#123456' },
    expectedRevision: created.data.revision,
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.data.revision, 2);

  const staleWrite = post(api, {
    action: 'saveCollection',
    collection: { id: 'team', name: 'Stale update', color: '#123456' },
    expectedRevision: created.data.revision,
  });
  assert.equal(staleWrite.ok, false);
  assert.equal(staleWrite.error.code, 'REVISION_CONFLICT');
});

test('backup import maps shared collections and creates shared snippets', () => {
  const api = createApi();
  const imported = post(api, {
    action: 'importBackup',
    backup: {
      collections: [{ id: 'launches', name: 'Launches', color: '#123456' }],
      templates: [{
        id: 'old-id',
        title: 'Launch note',
        categoryId: 'launches',
        content: 'Ready to launch',
        dynamicFields: [],
      }],
    },
  });

  assert.equal(imported.ok, true);
  assert.deepEqual(imported.data, { importedSnippets: 1, importedCollections: 1 });
  const bootstrap = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);
  assert.equal(bootstrap.data.collections.find(item => item.id === 'launches').name, 'Launches');
  assert.equal(bootstrap.data.snippets[0].categoryId, 'launches');
});

test('deleting a collection keeps its snippets and clears their collection ID', () => {
  const api = createApi();
  const createdSnippet = post(api, {
    action: 'saveSnippet',
    snippet: {
      id: 'unassigned-note',
      title: 'Unassigned note',
      categoryId: 'work',
      content: 'Keep me',
      dynamicFields: [],
    },
  });
  assert.equal(createdSnippet.ok, true);

  const deleted = post(api, {
    action: 'deleteCollection',
    id: 'work',
    expectedRevision: 1,
  });
  assert.equal(deleted.ok, true);
  assert.equal(deleted.data.unassignedSnippets, 1);
  const bootstrap = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);
  assert.equal(bootstrap.data.collections.some(item => item.id === 'work'), false);
  assert.equal(bootstrap.data.snippets[0].categoryId, '');
});

test('upgrades the earlier collections tab without dropping its rows', () => {
  const api = createApi({ legacyCollections: true });
  const response = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);

  assert.equal(response.ok, true);
  assert.deepEqual(response.data.collections.find(item => item.id === 'legacy'), {
    id: 'legacy',
    name: 'Legacy collection',
    color: '#123456',
    revision: 1,
    sortOrder: 0,
  });
});

test('adds collection ordering to the revision-based schema', () => {
  const api = createApi({ revisionCollections: true });
  const response = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);

  assert.equal(response.ok, true);
  assert.deepEqual(response.data.collections.find(item => item.id === 'legacy'), {
    id: 'legacy',
    name: 'Legacy collection',
    color: '#123456',
    revision: 3,
    sortOrder: 0,
  });
});

test('moves collections and increments the revisions of both affected rows', () => {
  const api = createApi();
  const moved = post(api, { action: 'moveCollection', id: 'work', targetId: 'social', expectedRevision: 1 });
  assert.equal(moved.ok, true);
  assert.equal(moved.data.sortOrder, 0);
  assert.equal(moved.data.revision, 2);

  const bootstrap = JSON.parse(api.doGet({ parameter: { action: 'bootstrap' } }).text);
  assert.deepEqual(bootstrap.data.collections.slice(1, 3).map(item => item.id), ['work', 'social']);
  assert.equal(bootstrap.data.collections.find(item => item.id === 'social').revision, 2);
});
