import express from 'express';
import { getSupabase } from '../supabase.js';
import { toCollectionModel, toSnippetModel } from '../utils/mappers.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({
        ok: false,
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Database client is not configured.' },
      });
    }

    const [collectionsRes, snippetsRes] = await Promise.all([
      supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('snippets')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);

    if (collectionsRes.error) throw collectionsRes.error;
    if (snippetsRes.error) throw snippetsRes.error;

    const collections = (collectionsRes.data || []).map(toCollectionModel);
    const snippets = (snippetsRes.data || []).map(toSnippetModel);

    res.json({
      ok: true,
      data: {
        version: 1,
        collections,
        snippets,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
