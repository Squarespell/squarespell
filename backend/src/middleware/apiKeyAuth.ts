import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export interface ApiKeyRequest extends Request {
  userId?: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Hash an API key using SHA256
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Middleware to authenticate requests using API key
 * Expects header: x-api-key: <api_key>
 */
export async function apiKeyAuth(req: ApiKeyRequest, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const keyHash = hashApiKey(apiKey);

    // Look up the key in the database
    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .select('user_id, revoked_at')
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check if the key is revoked
    if (keyRecord.revoked_at) {
      return res.status(401).json({ error: 'API key has been revoked' });
    }

    // Set the user ID on the request
    req.userId = keyRecord.user_id;

    // Update last_used_at timestamp (non-critical, don't fail if this fails)
    try {
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', keyHash);
    } catch (err: any) {
      // Non-critical, log but don't fail the request
      console.warn('Failed to update last_used_at:', err);
    }

    next();
  } catch (err: any) {
    console.error('API key authentication error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
