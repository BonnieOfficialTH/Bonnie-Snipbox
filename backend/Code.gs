const CONFIG = {
  spreadsheetIdProperty: 'SPREADSHEET_ID',
  version: 1,
  lockTimeoutMs: 10000,
};

const SCHEMA = {
  snippets: {
    name: 'Snippets',
    headers: ['id', 'title', 'categoryId', 'icon', 'content', 'dynamicFieldsJson', 'createdAt', 'updatedAt', 'revision', 'deletedAt'],
  },
  collections: {
    name: 'Collections',
    headers: ['id', 'name', 'color', 'createdAt', 'updatedAt', 'revision', 'sortOrder', 'deletedAt'],
  },
};

const DEFAULT_COLLECTIONS = [
  { id: 'social', name: 'Social', color: '#f0a6c1' },
  { id: 'work', name: 'Work', color: '#8bc9b5' },
  { id: 'personal', name: 'Personal', color: '#f4c96b' },
  { id: 'other', name: 'Other', color: '#93b8f4' },
];

function doGet(event) {
  return respond_(function () {
    return withDataLock_(function (spreadsheet) {
      const action = event && event.parameter ? event.parameter.action || 'bootstrap' : 'bootstrap';
      if (action === 'health') {
        return { service: 'snippet-sheet-api', version: CONFIG.version, spreadsheet: spreadsheet.getName() };
      }
      if (action !== 'bootstrap') fail_('UNKNOWN_ACTION', 'Unsupported GET action.');
      return readBootstrap_(spreadsheet);
    });
  });
}

function doPost(event) {
  return respond_(function () {
    const body = JSON.parse(event && event.postData ? event.postData.contents || '{}' : '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail_('INVALID_REQUEST', 'Request body must be a JSON object.');
    return withDataLock_(function (spreadsheet) {
      switch (body.action) {
        case 'saveSnippet':
          return saveSnippet_(spreadsheet, body);
        case 'deleteSnippet':
          return deleteSnippet_(spreadsheet, body);
        case 'saveCollection':
          return saveCollection_(spreadsheet, body);
        case 'deleteCollection':
          return deleteCollection_(spreadsheet, body);
        case 'moveCollection':
          return moveCollection_(spreadsheet, body);
        case 'importBackup':
          return importBackup_(spreadsheet, body.backup);
        default:
          fail_('UNKNOWN_ACTION', 'Unsupported POST action.');
      }
    });
  });
}

function setup() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!scriptProperties.getProperty(CONFIG.spreadsheetIdProperty) && activeSpreadsheet) {
    scriptProperties.setProperty(CONFIG.spreadsheetIdProperty, activeSpreadsheet.getId());
  }
  return withDataLock_(function (spreadsheet) {
    return { ready: true, spreadsheet: spreadsheet.getName(), version: CONFIG.version };
  });
}

function respond_(operation) {
  try {
    return jsonOutput_({ ok: true, data: operation() });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput_({
      ok: false,
      error: {
        code: error && error.apiCode ? error.apiCode : 'INTERNAL_ERROR',
        message: error && error.apiCode ? error.message : 'The request could not be completed.',
      },
    });
  }
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function withDataLock_(operation) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.lockTimeoutMs)) fail_('LOCK_TIMEOUT', 'The sheet is busy. Please retry the request.');
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(CONFIG.spreadsheetIdProperty);
    if (!spreadsheetId || !spreadsheetId.trim()) {
      fail_('MISSING_CONFIGURATION', 'Set the SPREADSHEET_ID script property before using this API.');
    }
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ensureSchema_(spreadsheet);
    ensureDefaultCollections_(sheets.collections);
    return operation(spreadsheet, sheets);
  } finally {
    lock.releaseLock();
  }
}

function ensureSchema_(spreadsheet) {
  const result = {};
  Object.keys(SCHEMA).forEach(function (key) {
    const definition = SCHEMA[key];
    let sheet = spreadsheet.getSheetByName(definition.name);
    if (!sheet) sheet = spreadsheet.insertSheet(definition.name);

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]);
    } else {
      if (key === 'collections') migrateCollectionsSchema_(sheet, definition.headers);
      const headers = sheet.getRange(1, 1, 1, definition.headers.length).getDisplayValues()[0];
      if (JSON.stringify(headers) !== JSON.stringify(definition.headers)) {
        fail_('SCHEMA_MISMATCH', 'The "' + definition.name + '" tab has unexpected headers. Check it before continuing.');
      }
    }
    result[key] = sheet;
  });
  return result;
}

function migrateCollectionsSchema_(sheet, headers) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn !== 6 && lastColumn !== 7) return;
  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const legacyHeaders = ['id', 'name', 'color', 'createdAt', 'updatedAt', 'deletedAt'];
  const revisionHeaders = ['id', 'name', 'color', 'createdAt', 'updatedAt', 'revision', 'deletedAt'];
  const isLegacy = lastColumn === 6 && JSON.stringify(currentHeaders) === JSON.stringify(legacyHeaders);
  const hasRevision = lastColumn === 7 && JSON.stringify(currentHeaders) === JSON.stringify(revisionHeaders);
  if (!isLegacy && !hasRevision) return;

  if (isLegacy) sheet.insertColumnBefore(6);
  sheet.insertColumnBefore(7);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const rowCount = sheet.getLastRow() - 1;
  if (rowCount > 0) {
    if (isLegacy) {
      sheet.getRange(2, 6, rowCount, 1).setValues(Array.from({ length: rowCount }, function () { return [1]; }));
    }
    sheet.getRange(2, 7, rowCount, 1).setValues(Array.from({ length: rowCount }, function (_, index) { return [index]; }));
  }
}

function ensureDefaultCollections_(sheet) {
  if (sheet.getLastRow() > 1) return;
  const now = Date.now();
  const rows = DEFAULT_COLLECTIONS.map(function (item, index) {
    return [item.id, item.name, item.color, now, now, 1, index, ''];
  });
  sheet.getRange(2, 1, rows.length, SCHEMA.collections.headers.length).setValues(rows);
}

function readBootstrap_(spreadsheet) {
  const sheets = ensureSchema_(spreadsheet);
  ensureDefaultCollections_(sheets.collections);
  const collections = readRows_(sheets.collections, SCHEMA.collections.headers.length)
    .filter(function (row) { return !row[7]; })
    .map(function (row) {
      return { id: String(row[0]), name: String(row[1]), color: String(row[2] || ''), revision: Number(row[5]) || 1, sortOrder: Number(row[6]) || 0 };
    }).sort(function (left, right) { return left.sortOrder - right.sortOrder; });
  const snippets = readRows_(sheets.snippets, SCHEMA.snippets.headers.length)
    .filter(function (row) { return !row[9]; })
    .map(function (row) {
      let dynamicFields;
      try {
        dynamicFields = row[5] ? JSON.parse(row[5]) : [];
      } catch (error) {
        fail_('INVALID_SHEET_DATA', 'A snippet has invalid dynamicFieldsJson. Check the Snippets tab.');
      }
      if (!Array.isArray(dynamicFields)) fail_('INVALID_SHEET_DATA', 'A snippet dynamicFieldsJson value must be an array.');
      return {
        id: String(row[0]),
        title: String(row[1]),
        categoryId: String(row[2] || ''),
        icon: String(row[3] || '✦'),
        content: String(row[4] || ''),
        dynamicFields: dynamicFields,
        createdAt: Number(row[6]) || 0,
        updatedAt: Number(row[7]) || 0,
        revision: Number(row[8]) || 1,
      };
    });

  return {
    version: CONFIG.version,
    collections: [{ id: 'all', name: 'All snippets', color: '#a78bfa' }].concat(collections),
    snippets: snippets,
  };
}

function saveSnippet_(spreadsheet, request) {
  const snippet = normalizeSnippet_(request.snippet);
  const sheet = spreadsheet.getSheetByName(SCHEMA.snippets.name);
  const rows = readRows_(sheet, SCHEMA.snippets.headers.length);
  const index = rows.findIndex(function (row) { return String(row[0]) === snippet.id; });
  const now = Date.now();
  let createdAt = now;
  let revision = 1;

  if (index >= 0) {
    const existing = rows[index];
    if (existing[9]) fail_('NOT_FOUND', 'The snippet has been deleted.');
    if (Number(request.expectedRevision) !== Number(existing[8])) {
      fail_('REVISION_CONFLICT', 'This snippet changed in another session. Reload it before saving.');
    }
    createdAt = Number(existing[6]) || now;
    revision = (Number(existing[8]) || 0) + 1;
    sheet.getRange(index + 2, 1, 1, SCHEMA.snippets.headers.length)
      .setValues([snippetRow_(snippet, createdAt, now, revision, '')]);
  } else {
    if (request.expectedRevision !== undefined && Number(request.expectedRevision) !== 0) {
      fail_('REVISION_CONFLICT', 'This snippet does not exist in the shared sheet.');
    }
    sheet.appendRow(snippetRow_(snippet, createdAt, now, revision, ''));
  }
  return Object.assign({}, snippet, { createdAt: createdAt, updatedAt: now, revision: revision });
}

function deleteSnippet_(spreadsheet, request) {
  const id = requireId_(request.id);
  const sheet = spreadsheet.getSheetByName(SCHEMA.snippets.name);
  const rows = readRows_(sheet, SCHEMA.snippets.headers.length);
  const index = rows.findIndex(function (row) { return String(row[0]) === id && !row[9]; });
  if (index < 0) fail_('NOT_FOUND', 'Snippet not found.');
  const row = rows[index];
  if (Number(request.expectedRevision) !== Number(row[8])) {
    fail_('REVISION_CONFLICT', 'This snippet changed in another session. Reload it before deleting.');
  }
  const deletedAt = Date.now();
  const updated = row.slice();
  updated[7] = deletedAt;
  updated[8] = (Number(row[8]) || 0) + 1;
  updated[9] = deletedAt;
  sheet.getRange(index + 2, 1, 1, SCHEMA.snippets.headers.length).setValues([updated]);
  return { id: id, deletedAt: deletedAt, revision: updated[8] };
}

function saveCollection_(spreadsheet, request) {
  const collection = normalizeCollection_(request.collection);
  const sheet = spreadsheet.getSheetByName(SCHEMA.collections.name);
  const rows = readRows_(sheet, SCHEMA.collections.headers.length);
  const index = rows.findIndex(function (row) { return String(row[0]) === collection.id; });
  const now = Date.now();
  let createdAt = now;
  let revision = 1;
  let sortOrder = rows.filter(function (row) { return !row[7]; })
    .reduce(function (maximum, row) { return Math.max(maximum, Number(row[6]) + 1 || 0); }, 0);
  if (index >= 0) {
    const existing = rows[index];
    if (existing[7]) fail_('NOT_FOUND', 'The collection has been deleted.');
    if (Number(request.expectedRevision) !== Number(existing[5])) {
      fail_('REVISION_CONFLICT', 'This collection changed in another session. Reload it before saving.');
    }
    createdAt = Number(existing[3]) || now;
    revision = (Number(existing[5]) || 0) + 1;
    sortOrder = Number(existing[6]) || 0;
    sheet.getRange(index + 2, 1, 1, SCHEMA.collections.headers.length)
      .setValues([collectionRow_(collection, createdAt, now, revision, sortOrder, '')]);
  } else {
    if (request.expectedRevision !== undefined && Number(request.expectedRevision) !== 0) {
      fail_('REVISION_CONFLICT', 'This collection does not exist in the shared sheet.');
    }
    sheet.appendRow(collectionRow_(collection, createdAt, now, revision, sortOrder, ''));
  }
  return Object.assign({}, collection, { createdAt: createdAt, updatedAt: now, revision: revision, sortOrder: sortOrder });
}

function deleteCollection_(spreadsheet, request) {
  const id = requireId_(request.id);
  if (id === 'all') fail_('INVALID_COLLECTION', '"all" cannot be deleted.');
  const collectionSheet = spreadsheet.getSheetByName(SCHEMA.collections.name);
  const collectionRows = readRows_(collectionSheet, SCHEMA.collections.headers.length);
  const collectionIndex = collectionRows.findIndex(function (row) { return String(row[0]) === id && !row[7]; });
  if (collectionIndex < 0) fail_('NOT_FOUND', 'Collection not found.');
  const collection = collectionRows[collectionIndex];
  if (Number(request.expectedRevision) !== Number(collection[5])) {
    fail_('REVISION_CONFLICT', 'This collection changed in another session. Reload it before deleting.');
  }

  const now = Date.now();
  const snippetSheet = spreadsheet.getSheetByName(SCHEMA.snippets.name);
  const snippets = readRows_(snippetSheet, SCHEMA.snippets.headers.length);
  let unassignedSnippets = 0;
  snippets.forEach(function (row, index) {
    if (String(row[2]) !== id || row[9]) return;
    row[2] = '';
    row[7] = now;
    row[8] = (Number(row[8]) || 0) + 1;
    snippetSheet.getRange(index + 2, 1, 1, SCHEMA.snippets.headers.length).setValues([row]);
    unassignedSnippets += 1;
  });

  const updatedCollection = collection.slice();
  updatedCollection[4] = now;
  updatedCollection[5] = (Number(collection[5]) || 0) + 1;
  updatedCollection[7] = now;
  collectionSheet.getRange(collectionIndex + 2, 1, 1, SCHEMA.collections.headers.length).setValues([updatedCollection]);
  collectionRows.forEach(function (row, index) {
    if (index === collectionIndex || row[7] || Number(row[6]) <= Number(collection[6])) return;
    row[4] = now;
    row[5] = (Number(row[5]) || 0) + 1;
    row[6] = Number(row[6]) - 1;
    collectionSheet.getRange(index + 2, 1, 1, SCHEMA.collections.headers.length).setValues([row]);
  });
  return { id: id, deletedAt: now, revision: updatedCollection[5], unassignedSnippets: unassignedSnippets };
}

function moveCollection_(spreadsheet, request) {
  const id = requireId_(request.id);
  const sheet = spreadsheet.getSheetByName(SCHEMA.collections.name);
  const rows = readRows_(sheet, SCHEMA.collections.headers.length);
  const index = rows.findIndex(function (row) { return String(row[0]) === id && !row[7]; });
  if (index < 0) fail_('NOT_FOUND', 'Collection not found.');
  const row = rows[index];
  if (Number(request.expectedRevision) !== Number(row[5])) {
    fail_('REVISION_CONFLICT', 'This collection changed in another session. Reload it before moving.');
  }
  const orderedIndexes = rows.map(function (item, rowIndex) { return { row: item, index: rowIndex }; })
    .filter(function (item) { return !item.row[7]; })
    .sort(function (left, right) { return Number(left.row[6]) - Number(right.row[6]); });
  const position = orderedIndexes.findIndex(function (item) { return item.index === index; });
  const targetId = request.targetId ? requireId_(request.targetId) : '';
  let targetPosition = targetId
    ? orderedIndexes.findIndex(function (item) { return String(item.row[0]) === targetId; })
    : position + Number(request.direction);
  if (!targetId && Number(request.direction) !== -1 && Number(request.direction) !== 1) {
    fail_('INVALID_MOVE', 'A target collection or direction is required.');
  }
  if (targetPosition < 0 || targetPosition >= orderedIndexes.length) fail_('INVALID_MOVE', 'Target collection not found.');
  if (targetPosition === position) return { id: id, sortOrder: Number(row[6]), revision: Number(row[5]) };

  const now = Date.now();
  const reordered = orderedIndexes.slice();
  const moved = reordered.splice(position, 1)[0];
  reordered.splice(targetPosition, 0, moved);
  reordered.forEach(function (item, order) {
    if (Number(item.row[6]) === order) return;
    item.row[4] = now;
    item.row[5] = (Number(item.row[5]) || 0) + 1;
    item.row[6] = order;
    sheet.getRange(item.index + 2, 1, 1, SCHEMA.collections.headers.length).setValues([item.row]);
  });
  const updated = rows[index];
  return { id: id, sortOrder: Number(updated[6]), revision: Number(updated[5]) };
}

function importBackup_(spreadsheet, backup) {
  if (!backup || !Array.isArray(backup.templates) ||
      !backup.templates.every(function (item) {
        return item && typeof item.title === 'string' && typeof item.content === 'string' && Array.isArray(item.dynamicFields);
      })) {
    fail_('INVALID_BACKUP', 'Backup must contain a templates array with valid snippets.');
  }
  if (backup.templates.length > 1000) fail_('IMPORT_LIMIT', 'Import is limited to 1000 snippets at a time.');

  const sheets = ensureSchema_(spreadsheet);
  const collectionValues = readRows_(sheets.collections, SCHEMA.collections.headers.length);
  const collectionIds = new Set(collectionValues.map(function (row) { return String(row[0]); }));
  const activeCollectionIds = new Set(collectionValues.filter(function (row) { return !row[7]; }).map(function (row) { return String(row[0]); }));
  let nextSortOrder = collectionValues.filter(function (row) { return !row[7]; })
    .reduce(function (maximum, row) { return Math.max(maximum, Number(row[6]) + 1 || 0); }, 0);
  const collectionIdMap = Object.create(null);
  const collectionRows = [];
  const now = Date.now();
  const sourceCollections = Array.isArray(backup.collections) ? backup.collections
    : Array.isArray(backup.categories) ? backup.categories : [];

  sourceCollections.forEach(function (item) {
    if (!item || item.id === 'all' || !item.name) return;
    const sourceId = String(item.id || '');
    if (sourceId && activeCollectionIds.has(sourceId)) {
      collectionIdMap[sourceId] = sourceId;
      return;
    }
    const id = sourceId && !collectionIds.has(sourceId) ? sourceId : Utilities.getUuid();
    collectionIdMap[sourceId] = id;
    if (!collectionIds.has(id)) {
      const collection = normalizeCollection_({ id: id, name: item.name, color: item.color || '#b99be8' });
      collectionRows.push(collectionRow_(collection, now, now, 1, nextSortOrder++, ''));
      collectionIds.add(id);
      activeCollectionIds.add(id);
    }
  });

  if (collectionRows.length) {
    sheets.collections.getRange(sheets.collections.getLastRow() + 1, 1, collectionRows.length, SCHEMA.collections.headers.length)
      .setValues(collectionRows);
  }

  const snippetRows = backup.templates.map(function (item) {
    const categoryId = collectionIdMap[String(item.categoryId || '')] || String(item.categoryId || 'other');
    const snippet = normalizeSnippet_(Object.assign({}, item, {
      id: Utilities.getUuid(),
      categoryId: categoryId,
    }));
    return snippetRow_(snippet, now, now, 1, '');
  });
  if (snippetRows.length) {
    sheets.snippets.getRange(sheets.snippets.getLastRow() + 1, 1, snippetRows.length, SCHEMA.snippets.headers.length)
      .setValues(snippetRows);
  }
  return { importedSnippets: snippetRows.length, importedCollections: collectionRows.length };
}

function readRows_(sheet, width) {
  const lastRow = sheet.getLastRow();
  return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, width).getValues();
}

function normalizeSnippet_(value) {
  if (!value || typeof value !== 'object') fail_('INVALID_SNIPPET', 'Snippet must be an object.');
  const id = value.id ? requireId_(value.id) : Utilities.getUuid();
  const title = requireText_(value.title, 'title', 200);
  const content = requireText_(value.content, 'content', 45000, true);
  const categoryId = value.categoryId ? requireId_(value.categoryId) : '';
  const icon = requireText_(value.icon || '✦', 'icon', 32);
  const dynamicFields = value.dynamicFields === undefined ? [] : value.dynamicFields;
  if (!Array.isArray(dynamicFields)) fail_('INVALID_SNIPPET', 'dynamicFields must be an array.');
  if (dynamicFields.length > 200) fail_('INVALID_SNIPPET', 'A snippet can have at most 200 dynamic fields.');
  return { id: id, title: title, categoryId: categoryId, icon: icon, content: content, dynamicFields: dynamicFields };
}

function normalizeCollection_(value) {
  if (!value || typeof value !== 'object') fail_('INVALID_COLLECTION', 'Collection must be an object.');
  const id = value.id ? requireId_(value.id) : Utilities.getUuid();
  if (id === 'all') fail_('INVALID_COLLECTION', '"all" is a reserved collection ID.');
  return {
    id: id,
    name: requireText_(value.name, 'name', 100),
    color: requireText_(value.color || '#b99be8', 'color', 32),
  };
}

function snippetRow_(snippet, createdAt, updatedAt, revision, deletedAt) {
  return [
    snippet.id, snippet.title, snippet.categoryId, snippet.icon, snippet.content,
    JSON.stringify(snippet.dynamicFields), createdAt, updatedAt, revision, deletedAt,
  ];
}

function collectionRow_(collection, createdAt, updatedAt, revision, sortOrder, deletedAt) {
  return [collection.id, collection.name, collection.color, createdAt, updatedAt, revision, sortOrder, deletedAt];
}

function requireId_(value) {
  const id = String(value || '');
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) fail_('INVALID_ID', 'IDs may contain letters, numbers, underscores, and hyphens only.');
  return id;
}

function requireText_(value, field, maxLength, allowEmpty) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > maxLength) {
    fail_('INVALID_FIELD', field + ' is missing or exceeds its allowed length.');
  }
  return value;
}

function fail_(code, message) {
  const error = new Error(message);
  error.apiCode = code;
  throw error;
}
