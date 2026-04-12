import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, attachUser, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../db/supabaseClient';

const router = Router();
router.use(requireAuth, attachUser);

/**
 * Hash an API key using SHA256
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a random API key
 */
function generateApiKey(): string {
  return `sq_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * GET /api/api-keys
 * List all API keys for the authenticated user (shows prefix only)
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
      .eq('user_id', req.dbUserId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(keys ?? []);
  } catch (err: any) {
    console.error('List API keys error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to list API keys' });
  }
});

/**
 * POST /api/api-keys
 * Generate a new API key for the authenticated user
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;

    // Generate a new API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 10); // sq_<8chars>

    // Store the hashed key in the database
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: req.dbUserId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: name || 'Untitled Key',
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // Return the full API key (only shown once to the user)
    res.status(201).json({
      ...newKey,
      api_key: apiKey,
      message: 'Store this API key in a safe place. You will not be able to see it again.',
    });
  } catch (err: any) {
    console.error('Create API key error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to create API key' });
  }
});

/**
 * DELETE /api/api-keys/:keyId
 * Revoke an API key
 */
router.delete('/:keyId', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { keyId } = req.params;

    // Verify ownership of the key
    const { data: keyRecord, error: selectError } = await supabase
      .from('api_keys')
      .select('id, user_id')
      .eq('id', keyId)
      .single();

    if (selectError || !keyRecord) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (keyRecord.user_id !== req.dbUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Revoke the key
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Revoke API key error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to revoke API key' });
  }
});

export default router;
