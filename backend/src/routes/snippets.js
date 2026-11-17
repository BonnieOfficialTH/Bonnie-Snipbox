import express from 'express';
import { getSupabase } from '../supabase.js';
import { toSnippetModel, toSnippetRow } from '../utils/mappers.js';

const router = express.Router();

// List active snippets
router.get('/', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    let query = supabase
      .from('snippets')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (req.query.categoryId) {
      query = query.eq('category_id', req.query.categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, data: (data || []).map(toSnippetModel) });
  } catch (error) {
    next(error);
  }
});

// Create or update snippet
router.post('/', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const body = req.body;
    if (!body || !body.title) {
      return res.status(400).json({ ok: false, error: { message: 'Snippet title is required.' } });
    }

    const now = Date.now();
    const id = body.id || `snp_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const snippetModel = {
      id,
      title: body.title.trim(),
      categoryId: body.categoryId || null,
      icon: body.icon || '',
      content: body.content || '',
      dynamicFields: Array.isArray(body.dynamicFields) ? body.dynamicFields : [],
      createdAt: body.createdAt ? Number(body.createdAt) : now,
      updatedAt: now,
      deletedAt: null,
    };

    const row = toSnippetRow(snippetModel);
    const { data, error } = await supabase
      .from('snippets')
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, data: toSnippetModel(data) });
  } catch (error) {
    next(error);
  }
});

// Update snippet
router.put('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const { id } = req.params;
    const updates = { ...req.body, id, updatedAt: Date.now() };
    const row = toSnippetRow(updates);

    const { data, error } = await supabase
      .from('snippets')
      .update(row)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: { message: 'Snippet not found.' } });
    res.json({ ok: true, data: toSnippetModel(data) });
  } catch (error) {
    next(error);
  }
});

// Soft delete snippet
router.delete('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const { id } = req.params;
    const now = Date.now();

    const { error } = await supabase
      .from('snippets')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id);

    if (error) throw error;
    res.json({ ok: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
