export const DATE_FORMATS = [
  ['DDMMYY','DDMMYY'],['DDMMYYYY','DDMMYYYY'],['DD/MM/YY','DD/MM/YY'],
  ['DD/MM/YYYY','DD/MM/YYYY'],['YYYY-MM-DD','YYYY-MM-DD'],
  ['DD Month YYYY','DD Month YYYY'],['Month DD, YYYY','Month DD, YYYY']
];
const pad = n => String(n).padStart(2, '0');

function getZonedParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    weekday: 'long',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

export function formatDate(date, format = 'DD/MM/YYYY') {
  // Date instances passed here represent a calendar date in UTC. This avoids
  // accidentally applying the browser's timezone a second time.
  const d = pad(date.getUTCDate());
  const m = pad(date.getUTCMonth() + 1);
  const y = date.getUTCFullYear();
  const yy = String(y).slice(-2);
  const month = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(date);
  return ({
    DDMMYY: `${d}${m}${yy}`,
    DDMMYYYY: `${d}${m}${y}`,
    'DD/MM/YY': `${d}/${m}/${yy}`,
    'DD/MM/YYYY': `${d}/${m}/${y}`,
    'YYYY-MM-DD': `${y}-${m}-${d}`,
    'DD Month YYYY': `${Number(d)} ${month} ${y}`,
    'Month DD, YYYY': `${month} ${Number(d)}, ${y}`,
  })[format] || `${d}/${m}/${y}`;
}

export function resolveField(field, now = new Date(), timezone = 'Asia/Bangkok', dateOffsetDays = 0) {
  const parts = getZonedParts(now, timezone);
  const calendarDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));

  if (field.type === 'date') {
    if (field.value === 'yesterday') calendarDate.setUTCDate(calendarDate.getUTCDate() - 1);
    if (field.value === 'tomorrow') calendarDate.setUTCDate(calendarDate.getUTCDate() + 1);
    if (field.value === 'monthStart') calendarDate.setUTCDate(1);
    if (field.value === 'monthEnd') calendarDate.setUTCMonth(calendarDate.getUTCMonth() + 1, 0);
    calendarDate.setUTCDate(calendarDate.getUTCDate() + dateOffsetDays);
    return formatDate(calendarDate, field.format || 'DD/MM/YYYY');
  }
  if (field.type === 'day') {
    calendarDate.setUTCDate(calendarDate.getUTCDate() + dateOffsetDays);
    return pad(calendarDate.getUTCDate());
  }
  if (field.type === 'time') return `${pad(Number(parts.hour) % 24)}:${pad(parts.minute)}`;
  if (field.type === 'weekday') return parts.weekday;
  if (field.type === 'month') return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: timezone }).format(now);
  if (field.type === 'year') return parts.year;
  return field.defaultValue || '';
}

const systemTokens = new Set([
  'today', 'yesterday', 'tomorrow', 'month_start', 'month_end',
  'day', 'time', 'weekday', 'month', 'year',
]);

function slugifyToken(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function customTokenBase(field) {
  const labelToken = slugifyToken(field.label);
  const id = String(field.id || '');
  const base = labelToken || (id.length < 8 ? slugifyToken(id) : '') || 'custom_information';
  return systemTokens.has(base) ? `custom_${base}` : base;
}

function fieldTokenBase(field) {
  if (field.type === 'custom') return customTokenBase(field);
  if (field.type === 'date') {
    return ({
      today: 'today',
      yesterday: 'yesterday',
      tomorrow: 'tomorrow',
      monthStart: 'month_start',
      monthEnd: 'month_end',
    })[field.value] || slugifyToken(field.value) || 'date';
  }
  return ({
    day: 'day',
    time: 'time',
    weekday: 'weekday',
    month: 'month',
    year: 'year',
  })[field.type] || slugifyToken(field.id) || 'custom_information';
}

function uniqueToken(base, used) {
  let token = base || 'custom_information';
  let suffix = 2;
  while (used.has(token)) token = `${base}_${suffix++}`;
  used.add(token);
  return token;
}

export function customFieldToken(label, fields = []) {
  const base = customTokenBase({ label });
  return uniqueToken(base, new Set(fields.map(field => String(field.id || ''))));
}

export function normalizeDynamicFieldTokens(content, fields = []) {
  const used = new Set();
  const mapping = new Map();
  const dynamicFields = fields.map(field => {
    const oldId = String(field.id || '');
    if (oldId && mapping.has(oldId)) return { ...field, id: mapping.get(oldId) };
    const id = uniqueToken(fieldTokenBase(field), used);
    if (oldId) mapping.set(oldId, id);
    return { ...field, id };
  });
  const normalizedContent = String(content || '').replace(/\{\{([^{}]+)\}\}/g, (token, id) =>
    mapping.has(id) ? `{{${mapping.get(id)}}}` : token
  );
  return { content: normalizedContent, dynamicFields };
}

export function sameTemplateTokens(original, edited) {
  const counts = value => {
    const result = new Map();
    String(value || '').replace(/\{\{([^{}]+)\}\}/g, (_, token) => {
      result.set(token, (result.get(token) || 0) + 1);
      return _;
    });
    return result;
  };
  const originalCounts = counts(original);
  const editedCounts = counts(edited);
  return originalCounts.size === editedCounts.size &&
    [...originalCounts].every(([token, count]) => editedCounts.get(token) === count);
}

export function renderContent(content, fields, overrides={}, timezone='Asia/Bangkok', dateOffsetDays=0) {
  return content.replace(/\{\{([^}]+)\}\}/g, (_,id) => {
    const f=fields.find(x=>x.id===id);
    if(!f) return '';
    if(f.type==='custom') return overrides[id] ?? f.defaultValue ?? '';
    return resolveField(f,new Date(),timezone,dateOffsetDays);
  });
}
export const uid = () => crypto.randomUUID();
export const initialTemplates = [
  {id:'s1',title:'IG Story Update',categoryId:'social',icon:'💌',content:'[💌] {{today}} beonnnie IG Story Update\n\n.\n\n#beonnnie',dynamicFields:[{id:'today',type:'date',label:'วันที่ปัจจุบัน',value:'today',format:'DDMMYY'}],isFavorite:true,createdAt:Date.now()-500000,updatedAt:Date.now()-300000,lastUsedAt:Date.now()-100000},
  {id:'s2',title:'Daily Standup',categoryId:'work',icon:'☀️',content:'Good morning team!\n\nHere is my update for {{today}}:\n• Yesterday: {{yesterday}}\n• Today: Working on {{project}}\n• Blockers: None',dynamicFields:[{id:'today',type:'date',label:'วันที่ปัจจุบัน',value:'today',format:'DD Month YYYY'},{id:'yesterday',type:'date',label:'เมื่อวาน',value:'yesterday',format:'DD Month YYYY'},{id:'project',type:'custom',label:'ชื่อโปรเจกต์',defaultValue:'Factory Dashboard'}],isFavorite:false,createdAt:Date.now()-400000,updatedAt:Date.now()-200000,lastUsedAt:null},
  {id:'s3',title:'Quick Thank You',categoryId:'personal',icon:'🌷',content:'Thank you so much for your help! I really appreciate it. 💜',dynamicFields:[],isFavorite:false,createdAt:Date.now()-300000,updatedAt:Date.now()-100000,lastUsedAt:null},
  {id:'s4',title:'Meeting Follow-up',categoryId:'work',icon:'📝',content:'Hi {{person}},\n\nThank you for joining today’s discussion. I’ll follow up on the action items and share an update by {{tomorrow}}.\n\nBest regards',dynamicFields:[{id:'person',type:'custom',label:'ชื่อบุคคล',defaultValue:''},{id:'tomorrow',type:'date',label:'วันพรุ่งนี้',value:'tomorrow',format:'DD/MM/YYYY'}],isFavorite:true,createdAt:Date.now()-200000,updatedAt:Date.now()-50000,lastUsedAt:null}
];
