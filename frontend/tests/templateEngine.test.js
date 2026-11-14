import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate,
  normalizeDynamicFieldTokens,
  renderContent,
  resolveField,
  sameTemplateTokens,
} from '../src/lib/templateEngine.js';

test('formats calendar dates consistently', () => {
  const date = new Date(Date.UTC(2026, 10, 13));
  assert.equal(formatDate(date, 'DDMMYY'), '131126');
  assert.equal(formatDate(date, 'YYYY-MM-DD'), '2026-11-13');
  assert.equal(formatDate(date, 'DD Month YYYY'), '13 November 2026');
});

test('resolves dates using the selected timezone calendar day', () => {
  const now = new Date('2026-11-12T18:30:00.000Z');
  const field = { type: 'date', value: 'today', format: 'YYYY-MM-DD' };
  assert.equal(resolveField(field, now, 'Asia/Bangkok'), '2026-11-13');
  assert.equal(resolveField(field, now, 'America/New_York'), '2026-11-12');
});

test('shifts preview dates without changing the saved date field', () => {
  const now = new Date('2026-11-12T18:30:00.000Z');
  const field = { type: 'date', value: 'tomorrow', format: 'YYYY-MM-DD' };
  assert.equal(resolveField(field, now, 'Asia/Bangkok', -1), '2026-11-13');
  assert.equal(resolveField(field, now, 'Asia/Bangkok', 2), '2026-11-16');
  assert.deepEqual(field, { type: 'date', value: 'tomorrow', format: 'YYYY-MM-DD' });
});

test('resolves the day token with preview date offsets', () => {
  const now = new Date('2026-11-12T18:30:00.000Z');
  assert.equal(resolveField({ type: 'day' }, now, 'Asia/Bangkok'), '13');
  assert.equal(resolveField({ type: 'day' }, now, 'Asia/Bangkok', 1), '14');
});

test('supports custom values and leaves unknown tokens empty', () => {
  const content = 'Hello {{name}} — {{missing}}';
  const fields = [{ id: 'name', type: 'custom', label: 'Name', defaultValue: 'Mai' }];
  assert.equal(renderContent(content, fields, {}, 'Asia/Bangkok'), 'Hello Mai — ');
  assert.equal(renderContent(content, fields, { name: 'Team' }, 'Asia/Bangkok'), 'Hello Team — ');
});

test('renames legacy field IDs to readable tokens while preserving template references', () => {
  const normalized = normalizeDynamicFieldTokens('On {{random-date}}, contact {{project-field}}.', [
    { id: 'random-date', type: 'date', value: 'today', label: 'Today' },
    { id: 'project-field', type: 'custom', label: 'Project name' },
  ]);
  assert.equal(normalized.content, 'On {{today}}, contact {{project_name}}.');
  assert.deepEqual(normalized.dynamicFields.map(field => field.id), ['today', 'project_name']);
});

test('keeps custom tokens distinct from reserved system tokens', () => {
  const normalized = normalizeDynamicFieldTokens('{{custom-date}} {{system-date}}', [
    { id: 'custom-date', type: 'custom', label: 'Today' },
    { id: 'system-date', type: 'date', value: 'today' },
  ]);
  assert.equal(normalized.content, '{{custom_today}} {{today}}');
});

test('preview edits must preserve every template token', () => {
  assert.equal(sameTemplateTokens('Hello {{name}}!', 'Hi there, {{name}}.'), true);
  assert.equal(sameTemplateTokens('Hello {{name}}!', 'Hello there!'), false);
  assert.equal(sameTemplateTokens('Hello {{name}}!', 'Hello {{other}}!'), false);
  assert.equal(sameTemplateTokens('Hi {{name}}.', 'Hi {{name}} {{name}}.'), false);
});
