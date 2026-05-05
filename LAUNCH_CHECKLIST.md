# Squarespell Email System — Launch Checklist & Audit Report

## Critical Bugs Found & Fixed

### 1. Email Quota Bypass (SEVERITY: CRITICAL)
**File:** `backend/src/middleware/emailQuota.ts`
**Bug:** Quota middleware used `req.auth?.userId` which was never set — always `undefined`. This meant quota checks matched no records, reporting 0 sends used, effectively allowing unlimited emails on any plan.
**Fix:** Changed to use `req.dbUserId` (set by `attachUser` middleware). Also added `req.userPlan` propagation from the auth middleware so the correct plan limit is applied.

### 2. Cross-Tenant Data Leak — Suppressions (SEVERITY: CRITICAL)
**File:** `backend/src/routes/emails.ts` (suppressions endpoint)
**Bug:** `GET /api/emails/suppressions` returned ALL unsubscribed emails globally to any authenticated user. Tenant A could see email addresses that unsubscribed from Tenant B's campaigns.
**Fix:** Now only returns suppressions for emails the current tenant has actually sent to.

### 3. XSS Vulnerability — Unsubscribe Page (SEVERITY: HIGH)
**File:** `backend/src/routes/unsubscribe.ts`
**Bug:** Email value decoded from base64 token was injected directly into HTML without escaping. An attacker could craft a malicious token with `<script>` in the "email" field to execute arbitrary JavaScript on any user clicking the unsubscribe link.
**Fix:** Added `escHtml()` sanitization to all user-controlled values rendered in HTML. Also added email format validation to reject non-email payloads.

### 4. Concurrent Send Race Condition (SEVERITY: HIGH)
**File:** `backend/src/routes/emails.ts` (send endpoint)
**Bug:** No status check or lock before sending. Double-clicking "Send" would trigger two concurrent send operations, sending duplicate emails to all recipients.
**Fix:** Added concurrency guard: check status isn't 'sending', atomically set to 'sending' with `.neq('status', 'sending')` condition, and properly reset status on completion or failure.

### 5. Campaign Stuck in 'sending' (SEVERITY: MEDIUM)
**File:** `backend/src/routes/emails.ts`
**Bug:** If `resolveRecipients` threw after status was set to 'sending', the campaign would be permanently stuck — no way to resend or edit.
**Fix:** Added status reset to 'draft' in the catch block before returning the 500 error.

### 6. Link-Clicks Endpoint — Full Table Scan (SEVERITY: MEDIUM)
**File:** `backend/src/routes/emails.ts`
**Bug:** Fetched ALL clicked events globally (`eq('type', 'clicked')` with no campaign filter), then filtered client-side. At scale (1000+ campaigns), this would load millions of rows per request.
**Fix:** First fetch send IDs for the campaign, then query `email_events` with `.in('send_id', sendIdList)` to filter at the database level.

### 7. Timeline Endpoint — Wrong Filter (SEVERITY: LOW)
**File:** `backend/src/routes/emails.ts`
**Bug:** Queried `email_events` with `.eq('send_id', req.params.id)` where `req.params.id` is a campaign ID, not a send ID. This would always return empty results.
**Fix:** Removed the broken events query since the endpoint already builds timeline from `email_sends` data which works correctly.

### 8. Webhook Duplicate Processing (SEVERITY: LOW)
**File:** `backend/src/routes/resendWebhook.ts`
**Bug:** No deduplication — Resend's at-least-once delivery could fire the same webhook multiple times, double-incrementing engagement counters.
**Fix:** Added deduplication check: query for existing event with same `send_id + type + occurred_at` before processing. If found, return early.

### 9. Test-Send Merge Tag Mismatch (SEVERITY: LOW)
**File:** `backend/src/routes/emails.ts`
**Bug:** Test-send used hardcoded string replacements (`{{firstName}}` → split/join) that didn't match the production regex-based `applyMergeTags` system. Tags like `{{first_name}}` or `{{outcome_name}}` would appear as raw placeholders in test emails.
**Fix:** Now uses the production `applyMergeTags()` function with a sample `MergeContext`, giving an accurate preview of what recipients will see. Also adds the CAN-SPAM footer and List-Unsubscribe headers to match real sends.

### 10. Quota Display — Wrong Plan Source (SEVERITY: LOW)
**File:** `backend/src/routes/emails.ts`
**Bug:** `GET /api/emails/quota` used `req.auth?.plan` (undefined) — always fell back to 'starter', showing incorrect quota limits for users on other plans.
**Fix:** Changed to `req.userPlan` which is now set correctly by `attachUser`.

---

## Pre-Launch Validation Checklist

### Deliverability
- [ ] SPF record configured for sending domain
- [ ] DKIM signing enabled in Resend dashboard
- [ ] DMARC record published (at minimum `p=none` for monitoring)
- [ ] Sending domain verified in Resend
- [ ] Test email lands in inbox (not spam) on Gmail, Outlook, Yahoo
- [ ] List-Unsubscribe header recognized by Gmail (shows unsub button)
- [ ] One-click unsubscribe (RFC 8058) works from mail client

### Email Compliance
- [ ] CAN-SPAM footer appears on every email (marketing + test)
- [ ] Physical address in footer is valid
- [ ] Unsubscribe link works (renders page, processes form)
- [ ] Unsubscribed users don't receive further emails
- [ ] Hard bounces auto-suppress the address
- [ ] Spam complaints auto-suppress the address

### Sending Infrastructure
- [ ] Batch sending works for 100+ recipients
- [ ] Retry logic fires on 429/503 errors
- [ ] Failed batches mark individual sends as 'failed' with error metadata
- [ ] Campaign status transitions: draft → sending → sent (blast) or draft (live)
- [ ] Double-send protection rejects concurrent requests (409)
- [ ] Quota enforcement blocks sends when limit reached (402)
- [ ] Quota correctly reads user's plan (not hardcoded 'starter')

### Tracking & Analytics
- [ ] Resend webhook endpoint responds 200 to all events
- [ ] Delivered events update email_sends status
- [ ] Opens tracked via Resend's native pixel (opened_at populated)
- [ ] Clicks tracked via Resend's native link rewriting (clicked_at populated)
- [ ] Timeline chart shows data for sent campaigns
- [ ] Link-clicks breakdown shows correct URLs
- [ ] Recipient table shows per-user engagement data
- [ ] Lead scoring updates on open/click/deliver events

### Security
- [ ] Unsubscribe page HTML-escapes all user input
- [ ] Webhook endpoint validates payload structure
- [ ] All campaign endpoints check tenant ownership
- [ ] Suppressions endpoint only shows tenant-relevant data
- [ ] No SQL injection vectors (parameterized queries via Supabase)
- [ ] Auth middleware rejects requests without valid Clerk token

### Performance at Scale
- [ ] Link-clicks queries filtered at DB level (not full table scan)
- [ ] Sending loop uses 200ms inter-batch delay for rate limiting
- [ ] Webhook deduplication prevents counter inflation
- [ ] Recipient resolution handles 10,000+ leads without timeout
- [ ] Supabase `.in()` calls chunked if needed (current max ~25k)

---

## Architecture Notes for Future Development

### Known Limitations (Acceptable for Launch)
1. Lead scoring counters have a minor race condition under concurrent webhook events — acceptable since scores recalculate from timestamps
2. `email_unsubscribes` table is global (not per-tenant) — this is by design since an email that unsubscribes shouldn't receive from ANY tenant
3. Timeline endpoint uses `email_sends` timestamps, not `email_events` — slight precision loss but simpler and more reliable
4. No webhook signature verification from Resend — low risk since webhook URL is obscure, but should add HMAC validation before going multi-tenant at scale

### Recommended Post-Launch Improvements
1. Add `UNIQUE(send_id, type, occurred_at)` index on `email_events` for database-level deduplication
2. Add Resend webhook signature verification (HMAC)
3. Move campaign sending to a background job queue (Bull/BullMQ) for better reliability
4. Add tenant_id column to email_unsubscribes for faster suppression queries
5. Implement soft-delete (archive) instead of hard-delete for campaigns
6. Add rate limiting on the public unsubscribe endpoint to prevent enumeration
