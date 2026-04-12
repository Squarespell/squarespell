import { supabase } from '../db/supabaseClient';

const BACKOFF_DELAYS = [60000, 300000, 1800000]; // 1min, 5min, 30min
const MAX_ATTEMPTS = 3;
const WEBHOOK_TIMEOUT = 10000; // 10 seconds

/**
 * Deliver a webhook to an external URL with retry support
 * On success, records delivery as 'success'
 * On failure, records delivery as 'pending' with exponential backoff
 */
export async function deliverWebhook(
  integrationId: string,
  leadId: string,
  webhookUrl: string,
  payload: any
): Promise<void> {
  try {
    // Attempt to POST to the webhook URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Success: insert delivery record with status 'success'
      await supabase.from('webhook_deliveries').insert({
        integration_id: integrationId,
        lead_id: leadId,
        payload,
        status: 'success',
        attempts: 1,
      });
    } else {
      // Non-2xx response: treat as failure, schedule retry
      const errorText = await response.text();
      await scheduleRetry(integrationId, leadId, payload, 0, `HTTP ${response.status}: ${errorText}`);
    }
  } catch (error: any) {
    // Network/timeout error: schedule retry
    const errorMessage = error?.message || 'Unknown error';
    await scheduleRetry(integrationId, leadId, payload, 0, errorMessage);
  }
}

/**
 * Schedule a retry by inserting a pending delivery record
 */
async function scheduleRetry(
  integrationId: string,
  leadId: string,
  payload: any,
  attempts: number,
  lastError: string
): Promise<void> {
  const nextDelayMs = BACKOFF_DELAYS[attempts] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
  const nextRetryAt = new Date(Date.now() + nextDelayMs).toISOString();

  await supabase.from('webhook_deliveries').insert({
    integration_id: integrationId,
    lead_id: leadId,
    payload,
    status: 'pending',
    attempts: attempts + 1,
    last_error: lastError,
    next_retry_at: nextRetryAt,
  });
}

/**
 * Process pending webhooks that are ready to retry
 * Queries for pending deliveries where next_retry_at <= now and attempts < MAX_ATTEMPTS
 * Retries each one, updating attempts and computing next retry with exponential backoff
 * If attempts >= MAX_ATTEMPTS, marks as 'failed'
 */
export async function processRetries(): Promise<number> {
  const now = new Date().toISOString();

  // Get all pending deliveries ready for retry
  const { data: deliveries, error: fetchError } = await supabase
    .from('webhook_deliveries')
    .select('id, integration_id, lead_id, payload, attempts, last_error')
    .eq('status', 'pending')
    .lte('next_retry_at', now)
    .lt('attempts', MAX_ATTEMPTS);

  if (fetchError) {
    console.error('Error fetching pending deliveries:', fetchError);
    return 0;
  }

  if (!deliveries || deliveries.length === 0) {
    return 0;
  }

  let processed = 0;

  for (const delivery of deliveries) {
    try {
      // Get the integration URL
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('config')
        .eq('id', delivery.integration_id)
        .single();

      if (integrationError || !integration?.config?.url) {
        // Integration not found or no URL: mark as failed
        await supabase
          .from('webhook_deliveries')
          .update({ status: 'failed', last_error: 'Integration not found or URL missing' })
          .eq('id', delivery.id);
        processed++;
        continue;
      }

      const webhookUrl = integration.config.url;

      // Attempt delivery
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(delivery.payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Success: mark as delivered
          await supabase
            .from('webhook_deliveries')
            .update({ status: 'success', attempts: delivery.attempts })
            .eq('id', delivery.id);
        } else {
          // Non-2xx: schedule next retry or mark as failed
          const errorText = await response.text();
          const nextError = `HTTP ${response.status}: ${errorText}`;
          updateWithRetryOrFail(delivery.id, delivery.attempts, nextError);
        }
      } catch (retryError: any) {
        // Retry attempt failed: schedule next retry or mark as failed
        const errorMessage = retryError?.message || 'Unknown error';
        updateWithRetryOrFail(delivery.id, delivery.attempts, errorMessage);
      }

      processed++;
    } catch (err) {
      console.error('Error processing delivery:', err);
    }
  }

  return processed;
}

/**
 * Helper to update delivery: either schedule next retry or mark as failed
 */
async function updateWithRetryOrFail(deliveryId: string, currentAttempts: number, lastError: string): Promise<void> {
  const nextAttempts = currentAttempts + 1;

  if (nextAttempts >= MAX_ATTEMPTS) {
    // Mark as failed
    await supabase
      .from('webhook_deliveries')
      .update({ status: 'failed', attempts: nextAttempts, last_error: lastError })
      .eq('id', deliveryId);
  } else {
    // Schedule next retry
    const nextDelayMs = BACKOFF_DELAYS[nextAttempts] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
    const nextRetryAt = new Date(Date.now() + nextDelayMs).toISOString();

    await supabase
      .from('webhook_deliveries')
      .update({
        status: 'pending',
        attempts: nextAttempts,
        last_error: lastError,
        next_retry_at: nextRetryAt,
      })
      .eq('id', deliveryId);
  }
}
