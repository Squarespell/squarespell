/**
 * Plain-language copy for the Sites screens: states, recovery for every failure, and API error messages.
 * No em dashes. Never says "automatic Squarespace insertion" and never calls the first setup "one click".
 */
import type { InstallMode, InstallStatus, Platform, SiteState } from './client';

export const PRODUCT_PROMISE = 'Connect your website once. Publish, update or remove every quiz with one button.';

export const SITE_STATE_LABEL: Record<SiteState, string> = {
  draft: 'Setup not finished',
  verifying: 'Verifying',
  verified: 'Verified',
  needs_attention: 'Needs attention',
  paused: 'Paused',
  disconnected: 'Disconnected',
};

export const INSTALL_STATUS_LABEL: Record<InstallStatus, string> = {
  draft: 'Draft', publishing: 'Publishing', live: 'Live', updating: 'Updating', paused: 'Paused', moving: 'Moving', removing: 'Removing', removed: 'Removed', failed: 'Failed',
};

export const MODE_LABEL: Record<InstallMode, string> = { inline: 'Inline', popup: 'Popup', floating_tab: 'Floating tab' };
export const PLATFORM_LABEL: Record<Platform, string> = { squarespace: 'Squarespace', html: 'Other / HTML' };
export const PLATFORM_METHOD: Record<Platform, string> = { squarespace: 'Guided setup', html: 'Site loader' };

export interface PlatformChoice { id: string; label: string; method: string; availability: 'Available' | 'Planned' | 'Later'; sprite: string }
export const PLATFORM_CHOICES: PlatformChoice[] = [
  { id: 'squarespace', label: 'Squarespace', method: 'One guided step, then one button', availability: 'Available', sprite: 'squarespace' },
  { id: 'html', label: 'Other / HTML', method: 'Universal site loader', availability: 'Available', sprite: 'html' },
  { id: 'wordpress', label: 'WordPress', method: 'Plugin connection', availability: 'Planned', sprite: 'wordpress' },
  { id: 'shopify', label: 'Shopify', method: 'App and theme extension', availability: 'Planned', sprite: 'shopify' },
  { id: 'wix', label: 'Wix', method: 'App connection', availability: 'Planned', sprite: 'wix' },
  { id: 'webflow', label: 'Webflow', method: 'App connection', availability: 'Later', sprite: 'webflow' },
  { id: 'framer', label: 'Framer', method: 'Plugin connection', availability: 'Later', sprite: 'framer' },
];

export const SQUARESPACE_EXPLANATION =
  'Squarespace does not provide a page API that lets us place a quiz silently. You install a small site loader once. After it is verified, popup and floating quizzes are controlled here with one button. Each new inline location needs one slot, added once.';

export interface Recovery { title: string; body: string; steps: string[]; action?: 'recheck' | 'plan' | 'back' }

export const RECOVERY: Record<string, Recovery> = {
  loader_not_found: {
    title: 'We could not find the site loader on your live page',
    body: 'Your website loaded, but the loader line was not in the page.',
    steps: ['Copy the loader again and check that all of it was pasted.', 'Paste it in Code Injection and press Save in Squarespace.', 'Wait a few seconds, then check again. Squarespace can take a moment to publish the change.'],
    action: 'recheck',
  },
  verification_lost: {
    title: 'The site loader is no longer on your page',
    body: 'This website was verified before, but the loader is missing now. Quizzes on it are not showing until it is back.',
    steps: ['Open Code Injection in Squarespace and check that the loader line is still there.', 'If it was removed, paste it again and save.', 'Then check the connection again.'],
    action: 'recheck',
  },
  wrong_domain: {
    title: 'The page opened on a different domain',
    body: 'Your address redirects to another website, so we cannot confirm it is the one you connected.',
    steps: ['Connect the domain your visitors actually see in the address bar.', 'If your domain redirects on purpose, connect the final domain instead.'],
    action: 'back',
  },
  page_requires_login: {
    title: 'Your website asks for a password',
    body: 'A password-protected site blocks our check, so we cannot see the loader.',
    steps: ['Turn off site password protection for a moment, or publish the site.', 'Then check the connection again. You can turn protection back on afterwards, but visitors will not see quizzes behind a password.'],
    action: 'recheck',
  },
  plan_does_not_allow_custom_code: {
    title: 'Your Squarespace plan may not include Code Injection',
    body: 'Code Injection and code blocks need a Squarespace plan that allows custom code. We cannot see your plan, so this is based on what you told us.',
    steps: ['Check your plan in Squarespace under Settings, then Billing.', 'Upgrade to a plan that includes custom code, or use the hosted quiz link for now.', 'Then check the connection again.'],
    action: 'recheck',
  },
  blocked_by_csp_or_consent_manager: {
    title: 'The loader is on your page but is not running',
    body: 'We can see the loader line, but no signal has come from your site. A cookie banner, consent tool or security setting may be blocking scripts.',
    steps: ['Allow scripts from squarespellquiz.com in your consent or security tool.', 'Open your website in a normal window, not the Squarespace editor.', 'Then check the connection again.'],
    action: 'recheck',
  },
  slot_missing: {
    title: 'We could not find that slot on your page',
    body: 'An inline quiz needs a named slot on the page. Add it once in a Code Block.',
    steps: ['Copy the slot code shown in the placement step.', 'In Squarespace, add a Code Block where the quiz should appear and paste it. Save and publish the page.', 'Then try publishing again.'],
    action: 'recheck',
  },
  token_expired: {
    title: 'The connection to your platform expired',
    body: 'The saved permission for this website ran out.',
    steps: ['Reconnect the website to give permission again.'],
    action: 'back',
  },
  token_revoked: {
    title: 'The connection to your platform was removed',
    body: 'Permission for this website was revoked, so we cannot manage it.',
    steps: ['Reconnect the website to give permission again.'],
    action: 'back',
  },
  timeout: {
    title: 'Your website took too long to answer',
    body: 'We waited but the page did not load in time.',
    steps: ['Open your website in a browser to make sure it loads.', 'Then check again. Nothing was changed.'],
    action: 'recheck',
  },
  unreachable: {
    title: 'We could not reach your website',
    body: 'The address did not load a normal page.',
    steps: ['Check the domain for typos and that the site is published.', 'Then check again. Nothing was changed.'],
    action: 'recheck',
  },
};
export const recoveryFor = (code: string | null | undefined): Recovery => RECOVERY[code || ''] || RECOVERY.unreachable;

const API_MESSAGES: Record<string, string> = {
  site_not_verified: 'Verify the site loader before publishing a quiz.',
  site_paused: 'This website is paused. Resume it before publishing.',
  site_disconnected: 'This website is disconnected.',
  quiz_not_live: 'Publish the quiz first, then add it to your website.',
  quiz_not_found: 'We could not find that quiz.',
  site_exists: 'This website is already connected to your account.',
  invalid_domain: 'That does not look like a public website address.',
  platform_not_available: 'That platform is not available yet.',
  invalid_page_rules: 'A page rule must look like /pricing, /services/* or *.',
  invalid_slot: 'Slot names use lower-case letters, numbers and dashes, up to 40 characters.',
  invalid_mode: 'Choose inline, popup or floating tab.',
  busy: 'A change is already in progress. Please wait a moment.',
  rate_limited: 'Too many requests. Please wait a minute and try again.',
  publish_failed: 'We could not publish this change. Your previous version is still live.',
  site_limit_reached: 'You have reached the number of websites your plan allows.',
  installation_limit_reached: 'This website has reached the number of quizzes your plan allows.',
  network: 'We could not reach Squarespell. Please check your connection and try again.',
  timeout: 'That took too long. Please check your connection and try again.',
};
export function friendlyError(code: string | undefined, fallback?: string): string {
  return (code && API_MESSAGES[code]) || fallback || 'Something went wrong. Please try again.';
}

const ACTION_TEXT: Record<string, string> = {
  site_created: 'Website added', verify_ok: 'Connection verified', verify_failed: 'Verification did not pass', attention_reported: 'Issue reported',
  heartbeat_rejected: 'A heartbeat from a different domain was refused', published: 'Quiz published', published_failed: 'Publish failed, previous version kept',
  install_updated: 'Quiz updated', updated: 'Quiz updated', moved: 'Quiz moved', paused: 'Quiz paused', resumed: 'Quiz resumed', removed: 'Quiz removed',
  rollback: 'Previous version restored', site_paused: 'Website paused', site_resumed: 'Website resumed', site_disconnected: 'Website disconnected', disconnect_failed: 'Disconnect failed, nothing changed',
};
export const eventText = (action: string): string => ACTION_TEXT[action] || action.replace(/_/g, ' ');
export const eventIsProblem = (action: string): boolean => /failed|rejected|rollback|attention/.test(action);

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never';
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 45) return 'Just now';
  if (s < 3600) return Math.round(s / 60) + ' minutes ago';
  if (s < 86400) return Math.round(s / 3600) + ' hours ago';
  if (s < 172800) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
