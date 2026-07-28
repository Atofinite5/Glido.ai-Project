import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

const tables = {
  videos: [],
  captions: [],
  templates: [
    {
      id: 'default-1', name: 'Bold Yellow', is_public: true,
      style: { font_family: 'Arial', font_size: 52, font_color: '#FFD700', font_bold: true, font_italic: false, background_type: 'semi-transparent', background_color: '#000000', animation_style: 'word-highlight', position: 'bottom' },
    },
    {
      id: 'default-2', name: 'Minimal White', is_public: true,
      style: { font_family: 'Helvetica', font_size: 44, font_color: '#FFFFFF', font_bold: false, font_italic: false, background_type: 'semi-transparent', background_color: '#000000', animation_style: 'none', position: 'bottom' },
    },
    {
      id: 'default-3', name: 'Neon Glow', is_public: true,
      style: { font_family: 'Impact', font_size: 56, font_color: '#00FF88', font_bold: true, font_italic: false, background_type: 'solid', background_color: '#1a0033', animation_style: 'word-highlight', position: 'bottom' },
    },
    {
      id: 'default-4', name: 'Clean Dark', is_public: true,
      style: { font_family: 'Arial', font_size: 40, font_color: '#E0E0E0', font_bold: false, font_italic: false, background_type: 'solid', background_color: '#1a1a1a', animation_style: 'none', position: 'bottom' },
    },
    {
      id: 'default-5', name: 'Cinematic', is_public: true,
      style: { font_family: 'Times New Roman', font_size: 48, font_color: '#F5F5DC', font_bold: false, font_italic: true, background_type: 'none', background_color: '#000000', animation_style: 'fade', position: 'bottom' },
    },
  ],
  exportJobs: [],
};

const STORAGE_DIR = path.join(__dirname, '../../storage');

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

async function loadTable(name) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, `${name}.json`), 'utf8');
    tables[name] = JSON.parse(data);
  } catch { }
}

async function loadAll() {
  await ensureDirs();
  for (const key of Object.keys(tables)) {
    await loadTable(key);
  }
}

async function saveTable(name) {
  await ensureDirs();
  await fs.writeFile(path.join(DATA_DIR, `${name}.json`), JSON.stringify(tables[name], null, 2));
}

export const db = {
  async init() {
    await loadAll();
  },

  async from(table) {
    await loadTable(table);
    let results = [...(tables[table] || [])];
    let pendingInsert = null;

    const q = {
      select() { return q; },
      insert(data) {
        const entries = Array.isArray(data) ? data : [data];
        pendingInsert = entries.map(d => ({ ...d, id: d.id || crypto.randomUUID(), created_at: new Date().toISOString() }));
        return q;
      },
      update(data) {
        pendingInsert = data;
        return q;
      },
      delete() { return q; },
      or() { return q; },
      eq(col, val) {
        results = results.filter(r => r[col] === val);
        if (pendingInsert) {
          for (const r of results) {
            Object.assign(r, pendingInsert);
          }
          pendingInsert = null;
          saveTable(table);
        }
        return q;
      },
      single() {
        if (pendingInsert) {
          tables[table].push(...pendingInsert);
          saveTable(table);
          const result = pendingInsert.length === 1 ? pendingInsert[0] : pendingInsert;
          pendingInsert = null;
          return { data: result, error: null };
        }
        return { data: results[0] || null, error: null };
      },
      order(col, opts = {}) {
        results.sort((a, b) => {
          const dir = opts.ascending ? 1 : -1;
          return a[col] > b[col] ? dir : -dir;
        });
        return { data: results, error: null };
      },
    };
    return q;
  },

  storage: {
    from(bucket) {
      return {
        async upload(filePath, buffer) {
          await ensureDirs();
          const fullPath = path.join(STORAGE_DIR, filePath);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, buffer);
          return { data: { path: filePath }, error: null };
        },
        getPublicUrl(filePath) {
          return {
            data: {
              publicUrl: `/storage/${filePath}`,
            },
          };
        },
        async read(filePath) {
          try {
            return await fs.readFile(path.join(STORAGE_DIR, filePath));
          } catch {
            return null;
          }
        },
      };
    },
    async read(filePath) {
      try {
        return await fs.readFile(path.join(STORAGE_DIR, filePath));
      } catch {
        return null;
      }
    },
  },

  auth: {
    async getUser() {
      return { data: { user: { id: 'local-user' } }, error: null };
    },
  },
};
