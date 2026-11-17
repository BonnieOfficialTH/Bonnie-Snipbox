import express from 'express';
import { getSupabase } from '../supabase.js';
import { toCollectionModel, toCollectionRow } from '../utils/mappers.js';

const router = express.Router();

// List all active collections
router.get('/', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json({ ok: true, data: (data || []).map(toCollectionModel) });
  } catch (error) {
    next(error);
  }
});

// Create or update collection
router.post('/', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const body = req.body;
    if (!body || !body.name) {
      return res.status(400).json({ ok: false, error: { message: 'Collection name is required.' } });
    }

    const now = Date.now();
    const id = body.id || `col_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const collectionModel = {
      id,
      name: body.name.trim(),
      color: body.color || '#93b8f4',
      sortOrder: Number(body.sortOrder ?? 0),
      createdAt: body.createdAt ? Number(body.createdAt) : now,
      updatedAt: now,
      deletedAt: null,
    };

    const row = toCollectionRow(collectionModel);
    const { data, error } = await supabase
      .from('collections')
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, data: toCollectionModel(data) });
  } catch (error) {
    next(error);
  }
});

// Update collection
router.put('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const { id } = req.params;
    const updates = { ...req.body, id, updatedAt: Date.now() };
    const row = toCollectionRow(updates);

    const { data, error } = await supabase
      .from('collections')
      .update(row)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: { message: 'Collection not found.' } });
    res.json({ ok: true, data: toCollectionModel(data) });
  } catch (error) {
    next(error);
  }
});

// Soft delete collection
router.delete('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ ok: false, error: { message: 'Database not configured.' } });

    const { id } = req.params;
    const now = Date.now();

    const { error } = await supabase
      .from('collections')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id);

    if (error) throw error;
    res.json({ ok: true, data: { id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
