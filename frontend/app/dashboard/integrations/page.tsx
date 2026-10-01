'use client';

/**
 * /dashboard/integrations - Where users connect lead delivery destinations.
 *
 * Fully working integrations: Webhook, Mailchimp, Klaviyo,
 * Zapier and every "via Zapier" tile are PLANNED (available: false): the Zapier app is not mounted on the API yet.
 * ConvertKit, and Google Sheets. Each has a setup form that validates
 * credentials and lets users pick lists/audiences/forms.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  DisplayTitle,
  Card,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://api.squarespellquiz.com';

type IntegrationType = 'webhook' | 'zapier' | 'mailchimp' | 'klaviyo' | 'convertkit' | 'google_sheets';

type Integration = {
  id: string;
  type: IntegrationType;
  config: Record<string, any>;
  active: boolean;
  created_at: string;
};

type ListItem = { id: string; name: string; member_count?: number };

type IntegrationCategory = 'Popular' | 'Email Marketing' | 'Analytics' | 'Lead Generation' | 'CRM' | 'Collaboration' | 'Automation' | 'Ecommerce';

type Catalog = {
  type: IntegrationType;
  name: string;
  tagline: string;
  available: boolean;
  icon: string;
  category: IntegrationCategory;
  color: string;
  /** True = native integration. False = via Zapier (shown as "via Zapier" tag). */
  native: boolean;
};

var CATALOG: Catalog[] = [
  /* ── Native integrations (fully built) ── */
  { type: 'zapier', name: 'Zapier', tagline: 'Connect quiz leads to the other apps you use through Zapier.', available: false, icon: 'Z', category: 'Popular', color: '#FF4A00', native: true },
  { type: 'mailchimp', name: 'Mailchimp', tagline: 'Push leads straight into a Mailchimp audience.', available: true, icon: 'M', category: 'Popular', color: '#FFE01B', native: true },
  { type: 'google_sheets', name: 'Google Sheets', tagline: 'Append every lead to a Google Sheet row.', available: true, icon: 'G', category: 'Popular', color: '#0F9D58', native: true },
  { type: 'klaviyo', name: 'Klaviyo', tagline: 'Sync leads + outcome tags into Klaviyo.', available: true, icon: 'K', category: 'Email Marketing', color: '#000000', native: true },
  { type: 'convertkit', name: 'ConvertKit', tagline: 'Subscribe leads to a ConvertKit form or tag.', available: true, icon: 'C', category: 'Email Marketing', color: '#FB6970', native: true },
  { type: 'webhook', name: 'Custom Webhook', tagline: 'POST every lead to your own URL.', available: true, icon: 'W', category: 'Automation', color: '#6B7280', native: true },

  /* ── Via Zapier (shown to bulk up the ecosystem) ── */
  { type: 'zapier', name: 'HubSpot', tagline: 'Sync leads and quiz data to HubSpot CRM.', available: false, icon: 'H', category: 'CRM', color: '#FF7A59', native: false },
  { type: 'zapier', name: 'Salesforce', tagline: 'Create leads in Salesforce from quiz submissions.', available: false, icon: 'S', category: 'CRM', color: '#00A1E0', native: false },
  { type: 'zapier', name: 'ActiveCampaign', tagline: 'Add quiz leads to ActiveCampaign automations.', available: false, icon: 'A', category: 'Email Marketing', color: '#004CFF', native: false },
  { type: 'zapier', name: 'Drip', tagline: 'Push leads into Drip workflows and tags.', available: false, icon: 'D', category: 'Email Marketing', color: '#4E38E0', native: false },
  { type: 'zapier', name: 'Constant Contact', tagline: 'Add quiz leads to Constant Contact lists.', available: false, icon: 'CC', category: 'Email Marketing', color: '#004990', native: false },
  { type: 'zapier', name: 'AWeber', tagline: 'Subscribe quiz leads to AWeber lists.', available: false, icon: 'AW', category: 'Email Marketing', color: '#2E73BD', native: false },
  { type: 'zapier', name: 'Sendinblue (Brevo)', tagline: 'Push leads to Brevo (Sendinblue) campaigns.', available: false, icon: 'B', category: 'Email Marketing', color: '#0092FF', native: false },
  { type: 'zapier', name: 'Google Analytics', tagline: 'Track quiz events in Google Analytics.', available: false, icon: 'GA', category: 'Analytics', color: '#E37400', native: false },
  { type: 'zapier', name: 'Meta Pixel', tagline: 'Fire lead events for Facebook/Instagram ads.', available: false, icon: 'FB', category: 'Analytics', color: '#1877F2', native: false },
  { type: 'zapier', name: 'Google Tag Manager', tagline: 'Push quiz events into GTM data layer.', available: false, icon: 'GT', category: 'Analytics', color: '#4285F4', native: false },
  { type: 'zapier', name: 'Slack', tagline: 'Get quiz lead notifications in Slack channels.', available: false, icon: 'SL', category: 'Collaboration', color: '#4A154B', native: false },
  { type: 'zapier', name: 'Discord', tagline: 'Post new leads to a Discord channel.', available: false, icon: 'DC', category: 'Collaboration', color: '#5865F2', native: false },
  { type: 'zapier', name: 'Notion', tagline: 'Log quiz leads to a Notion database.', available: false, icon: 'N', category: 'Collaboration', color: '#000000', native: false },
  { type: 'zapier', name: 'Airtable', tagline: 'Add leads as rows in an Airtable base.', available: false, icon: 'AT', category: 'Collaboration', color: '#18BFFF', native: false },
  { type: 'zapier', name: 'Shopify', tagline: 'Sync quiz results with Shopify customers.', available: false, icon: 'SH', category: 'Ecommerce', color: '#96BF48', native: false },
  { type: 'zapier', name: 'WooCommerce', tagline: 'Push quiz leads to WooCommerce.', available: false, icon: 'WC', category: 'Ecommerce', color: '#7F54B3', native: false },
  { type: 'zapier', name: 'Stripe', tagline: 'Trigger payments or subscriptions from quiz outcomes.', available: false, icon: 'ST', category: 'Ecommerce', color: '#635BFF', native: false },
  { type: 'zapier', name: 'Pipedrive', tagline: 'Create deals from quiz-qualified leads.', available: false, icon: 'PD', category: 'CRM', color: '#017737', native: false },
  { type: 'zapier', name: 'Zoho CRM', tagline: 'Push leads into Zoho CRM modules.', available: false, icon: 'ZO', category: 'CRM', color: '#E42527', native: false },
  { type: 'zapier', name: 'Monday.com', tagline: 'Create items from quiz leads in Monday boards.', available: false, icon: 'MO', category: 'Lead Generation', color: '#FF3D57', native: false },
  { type: 'zapier', name: 'Typeform', tagline: 'Sync quiz data with Typeform responses.', available: false, icon: 'TF', category: 'Lead Generation', color: '#262627', native: false },
  { type: 'zapier', name: 'Intercom', tagline: 'Create or update Intercom contacts from leads.', available: false, icon: 'IC', category: 'Lead Generation', color: '#1F8DED', native: false },
  { type: 'zapier', name: 'Make (Integromat)', tagline: 'Trigger Make scenarios from quiz events.', available: false, icon: 'MK', category: 'Automation', color: '#6D00CC', native: false },
  { type: 'zapier', name: 'Pabbly Connect', tagline: 'Send leads to Pabbly Connect workflows.', available: false, icon: 'PA', category: 'Automation', color: '#FF6B00', native: false },

  /* ── Email Marketing (expanded) ── */
  { type: 'zapier', name: 'GetResponse', tagline: 'Add quiz leads to GetResponse autoresponders.', available: false, icon: 'GR', category: 'Email Marketing', color: '#00BAFF', native: false },
  { type: 'zapier', name: 'MailerLite', tagline: 'Subscribe leads to MailerLite groups and automations.', available: false, icon: 'ML', category: 'Email Marketing', color: '#09C269', native: false },
  { type: 'zapier', name: 'Campaign Monitor', tagline: 'Add quiz leads to Campaign Monitor lists.', available: false, icon: 'CM', category: 'Email Marketing', color: '#509CF6', native: false },
  { type: 'zapier', name: 'Moosend', tagline: 'Sync leads to Moosend mailing lists.', available: false, icon: 'MS', category: 'Email Marketing', color: '#26C164', native: false },
  { type: 'zapier', name: 'Omnisend', tagline: 'Push leads into Omnisend segments and workflows.', available: false, icon: 'OS', category: 'Email Marketing', color: '#1B1B40', native: false },
  { type: 'zapier', name: 'Benchmark Email', tagline: 'Add contacts to Benchmark Email lists.', available: false, icon: 'BE', category: 'Email Marketing', color: '#0070C0', native: false },
  { type: 'zapier', name: 'Emma', tagline: 'Push quiz leads into Emma audiences.', available: false, icon: 'EM', category: 'Email Marketing', color: '#2E3642', native: false },
  { type: 'zapier', name: 'Sendfox', tagline: 'Subscribe leads to Sendfox lists.', available: false, icon: 'SF', category: 'Email Marketing', color: '#4353FF', native: false },
  { type: 'zapier', name: 'Flodesk', tagline: 'Add quiz leads to Flodesk segments.', available: false, icon: 'FD', category: 'Email Marketing', color: '#FFC8DD', native: false },
  { type: 'zapier', name: 'Beehiiv', tagline: 'Add subscribers to your Beehiiv newsletter.', available: false, icon: 'BH', category: 'Email Marketing', color: '#FFC700', native: false },
  { type: 'zapier', name: 'Mailjet', tagline: 'Sync quiz leads to Mailjet contact lists.', available: false, icon: 'MJ', category: 'Email Marketing', color: '#3B2E82', native: false },
  { type: 'zapier', name: 'Customer.io', tagline: 'Create people in Customer.io from quiz leads.', available: false, icon: 'CI', category: 'Email Marketing', color: '#5046E4', native: false },
  { type: 'zapier', name: 'Kit (ConvertKit)', tagline: 'Tag and segment subscribers in Kit.', available: false, icon: 'KT', category: 'Email Marketing', color: '#FB6970', native: false },

  /* ── CRM (expanded) ── */
  { type: 'zapier', name: 'Freshsales', tagline: 'Create contacts in Freshsales from quiz data.', available: false, icon: 'FS', category: 'CRM', color: '#F47920', native: false },
  { type: 'zapier', name: 'Copper', tagline: 'Add leads to Copper CRM directly from quizzes.', available: false, icon: 'CP', category: 'CRM', color: '#F7B42C', native: false },
  { type: 'zapier', name: 'Close', tagline: 'Create leads in Close from quiz submissions.', available: false, icon: 'CL', category: 'CRM', color: '#2B2D42', native: false },
  { type: 'zapier', name: 'Insightly', tagline: 'Push quiz leads into Insightly contacts.', available: false, icon: 'IN', category: 'CRM', color: '#1B59A6', native: false },
  { type: 'zapier', name: 'Agile CRM', tagline: 'Add contacts and deals from quiz leads.', available: false, icon: 'AG', category: 'CRM', color: '#28B5C1', native: false },
  { type: 'zapier', name: 'Capsule CRM', tagline: 'Create contacts in Capsule from quiz data.', available: false, icon: 'CA', category: 'CRM', color: '#1C7ED6', native: false },
  { type: 'zapier', name: 'Keap (Infusionsoft)', tagline: 'Add contacts and tags in Keap from quizzes.', available: false, icon: 'KP', category: 'CRM', color: '#1A8B5F', native: false },
  { type: 'zapier', name: 'Nimble', tagline: 'Sync quiz leads to Nimble contacts.', available: false, icon: 'NM', category: 'CRM', color: '#2E86C1', native: false },
  { type: 'zapier', name: 'Nutshell', tagline: 'Create leads in Nutshell from quiz responses.', available: false, icon: 'NS', category: 'CRM', color: '#007F5F', native: false },
  { type: 'zapier', name: 'Streak', tagline: 'Add quiz leads to Streak pipelines in Gmail.', available: false, icon: 'SK', category: 'CRM', color: '#E8771A', native: false },

  /* ── Analytics (expanded) ── */
  { type: 'zapier', name: 'Mixpanel', tagline: 'Track quiz events and user behavior in Mixpanel.', available: false, icon: 'MP', category: 'Analytics', color: '#4F44E0', native: false },
  { type: 'zapier', name: 'Amplitude', tagline: 'Send quiz completion events to Amplitude.', available: false, icon: 'AM', category: 'Analytics', color: '#0061FF', native: false },
  { type: 'zapier', name: 'Segment', tagline: 'Route quiz events through Segment to any destination.', available: false, icon: 'SE', category: 'Analytics', color: '#52BD94', native: false },
  { type: 'zapier', name: 'Heap', tagline: 'Auto-capture quiz interactions in Heap analytics.', available: false, icon: 'HP', category: 'Analytics', color: '#6C31FF', native: false },
  { type: 'zapier', name: 'Hotjar', tagline: 'Trigger Hotjar recordings on quiz pages.', available: false, icon: 'HJ', category: 'Analytics', color: '#FF3C00', native: false },
  { type: 'zapier', name: 'FullStory', tagline: 'Replay quiz sessions in FullStory.', available: false, icon: 'FS', category: 'Analytics', color: '#7B00FF', native: false },
  { type: 'zapier', name: 'PostHog', tagline: 'Track quiz funnels and feature usage in PostHog.', available: false, icon: 'PH', category: 'Analytics', color: '#F9BD2B', native: false },
  { type: 'zapier', name: 'Kissmetrics', tagline: 'Track quiz conversions and behavior in Kissmetrics.', available: false, icon: 'KM', category: 'Analytics', color: '#1E88E5', native: false },
  { type: 'zapier', name: 'Pinterest Tag', tagline: 'Fire conversion events for Pinterest ads.', available: false, icon: 'PT', category: 'Analytics', color: '#E60023', native: false },
  { type: 'zapier', name: 'TikTok Pixel', tagline: 'Send lead events to TikTok Ads Manager.', available: false, icon: 'TT', category: 'Analytics', color: '#000000', native: false },
  { type: 'zapier', name: 'LinkedIn Insight Tag', tagline: 'Track quiz conversions for LinkedIn campaigns.', available: false, icon: 'LI', category: 'Analytics', color: '#0077B5', native: false },

  /* ── Lead Generation (expanded) ── */
  { type: 'zapier', name: 'Calendly', tagline: 'Schedule meetings from quiz-qualified leads.', available: false, icon: 'CD', category: 'Lead Generation', color: '#006BFF', native: false },
  { type: 'zapier', name: 'Acuity Scheduling', tagline: 'Book appointments from quiz submissions.', available: false, icon: 'AS', category: 'Lead Generation', color: '#316FFD', native: false },
  { type: 'zapier', name: 'Leadpages', tagline: 'Push leads from quizzes to Leadpages.', available: false, icon: 'LP', category: 'Lead Generation', color: '#4530B8', native: false },
  { type: 'zapier', name: 'OptinMonster', tagline: 'Sync quiz leads with OptinMonster campaigns.', available: false, icon: 'OM', category: 'Lead Generation', color: '#7CB342', native: false },
  { type: 'zapier', name: 'Unbounce', tagline: 'Connect quiz leads to Unbounce landing pages.', available: false, icon: 'UB', category: 'Lead Generation', color: '#2B60E2', native: false },
  { type: 'zapier', name: 'Drift', tagline: 'Create contacts in Drift from quiz submissions.', available: false, icon: 'DR', category: 'Lead Generation', color: '#0176FF', native: false },
  { type: 'zapier', name: 'LiveChat', tagline: 'Start chat conversations from quiz leads.', available: false, icon: 'LC', category: 'Lead Generation', color: '#FF5100', native: false },
  { type: 'zapier', name: 'Crisp', tagline: 'Add quiz leads as Crisp contacts.', available: false, icon: 'CR', category: 'Lead Generation', color: '#4B69FF', native: false },
  { type: 'zapier', name: 'Zendesk', tagline: 'Create tickets from quiz feedback submissions.', available: false, icon: 'ZD', category: 'Lead Generation', color: '#03363D', native: false },
  { type: 'zapier', name: 'Freshdesk', tagline: 'Create support tickets from quiz responses.', available: false, icon: 'FD', category: 'Lead Generation', color: '#25C16F', native: false },

  /* ── Ecommerce (expanded) ── */
  { type: 'zapier', name: 'BigCommerce', tagline: 'Sync quiz data with BigCommerce customers.', available: false, icon: 'BC', category: 'Ecommerce', color: '#121118', native: false },
  { type: 'zapier', name: 'Squarespace Commerce', tagline: 'Tag customers based on quiz outcomes.', available: false, icon: 'SQ', category: 'Ecommerce', color: '#000000', native: false },
  { type: 'zapier', name: 'Gumroad', tagline: 'Trigger product offers from quiz results.', available: false, icon: 'GU', category: 'Ecommerce', color: '#FF90E8', native: false },
  { type: 'zapier', name: 'Teachable', tagline: 'Enroll quiz leads in Teachable courses.', available: false, icon: 'TE', category: 'Ecommerce', color: '#1D1D1D', native: false },
  { type: 'zapier', name: 'Thinkific', tagline: 'Create students from quiz submissions.', available: false, icon: 'TH', category: 'Ecommerce', color: '#0EBB72', native: false },
  { type: 'zapier', name: 'Kajabi', tagline: 'Add quiz leads to Kajabi funnels and lists.', available: false, icon: 'KJ', category: 'Ecommerce', color: '#2962FF', native: false },
  { type: 'zapier', name: 'Podia', tagline: 'Subscribe leads to Podia email lists.', available: false, icon: 'PO', category: 'Ecommerce', color: '#5436DA', native: false },
  { type: 'zapier', name: 'Etsy', tagline: 'Track quiz-sourced customers on Etsy.', available: false, icon: 'ET', category: 'Ecommerce', color: '#F1641E', native: false },
  { type: 'zapier', name: 'Square', tagline: 'Create customers in Square from quiz leads.', available: false, icon: 'SQ', category: 'Ecommerce', color: '#006AFF', native: false },
  { type: 'zapier', name: 'PayPal', tagline: 'Trigger payment links from quiz outcomes.', available: false, icon: 'PP', category: 'Ecommerce', color: '#003087', native: false },

  /* ── Collaboration (expanded) ── */
  { type: 'zapier', name: 'Microsoft Teams', tagline: 'Post lead notifications to Teams channels.', available: false, icon: 'MT', category: 'Collaboration', color: '#6264A7', native: false },
  { type: 'zapier', name: 'Trello', tagline: 'Create Trello cards from quiz submissions.', available: false, icon: 'TR', category: 'Collaboration', color: '#0052CC', native: false },
  { type: 'zapier', name: 'Asana', tagline: 'Create Asana tasks from quiz leads.', available: false, icon: 'AN', category: 'Collaboration', color: '#F06A6A', native: false },
  { type: 'zapier', name: 'ClickUp', tagline: 'Create ClickUp tasks from quiz responses.', available: false, icon: 'CU', category: 'Collaboration', color: '#7B68EE', native: false },
  { type: 'zapier', name: 'Basecamp', tagline: 'Post quiz leads to Basecamp projects.', available: false, icon: 'BS', category: 'Collaboration', color: '#1D2D35', native: false },
  { type: 'zapier', name: 'Todoist', tagline: 'Create follow-up tasks in Todoist.', available: false, icon: 'TD', category: 'Collaboration', color: '#E44332', native: false },
  { type: 'zapier', name: 'Linear', tagline: 'File quiz feedback as Linear issues.', available: false, icon: 'LN', category: 'Collaboration', color: '#5E6AD2', native: false },
  { type: 'zapier', name: 'Jira', tagline: 'Create Jira issues from quiz responses.', available: false, icon: 'JR', category: 'Collaboration', color: '#0052CC', native: false },
  { type: 'zapier', name: 'GitHub', tagline: 'Create GitHub issues from quiz feedback.', available: false, icon: 'GH', category: 'Collaboration', color: '#24292E', native: false },
  { type: 'zapier', name: 'Coda', tagline: 'Add quiz lead rows to Coda documents.', available: false, icon: 'CO', category: 'Collaboration', color: '#F46A54', native: false },

  /* ── Automation (expanded) ── */
  { type: 'zapier', name: 'n8n', tagline: 'Trigger n8n workflows from quiz events.', available: false, icon: 'N8', category: 'Automation', color: '#EA4B71', native: false },
  { type: 'zapier', name: 'Tray.io', tagline: 'Connect quiz data to Tray.io integrations.', available: false, icon: 'TI', category: 'Automation', color: '#0059B2', native: false },
  { type: 'zapier', name: 'Automate.io', tagline: 'Build automations from quiz submissions.', available: false, icon: 'AI', category: 'Automation', color: '#FF6348', native: false },
  { type: 'zapier', name: 'Power Automate', tagline: 'Trigger Microsoft Power Automate flows.', available: false, icon: 'PA', category: 'Automation', color: '#0066FF', native: false },
  { type: 'zapier', name: 'IFTTT', tagline: 'Create IFTTT applets from quiz triggers.', available: false, icon: 'IF', category: 'Automation', color: '#33CCFF', native: false },
  { type: 'zapier', name: 'Workato', tagline: 'Build enterprise automations from quiz data.', available: false, icon: 'WK', category: 'Automation', color: '#4C61DF', native: false },
  { type: 'zapier', name: 'ActivePieces', tagline: 'Trigger ActivePieces flows from quiz events.', available: false, icon: 'AP', category: 'Automation', color: '#FF4F40', native: false },
  { type: 'zapier', name: 'Pipedream', tagline: 'Run code on every quiz submission via Pipedream.', available: false, icon: 'PD', category: 'Automation', color: '#37B058', native: false },
];


var CATEGORIES: IntegrationCategory[] = ['Popular', 'Email Marketing', 'Analytics', 'CRM', 'Lead Generation', 'Ecommerce', 'Collaboration', 'Automation'];

function labelFor(type: IntegrationType): string {
  var found = CATALOG.find(function(c) { return c.type === type; });
  return found ? found.name : type;
}

function iconFor(type: IntegrationType): string {
  var found = CATALOG.find(function(c) { return c.type === type; });
  return found ? found.icon : '?';
}

var inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: C.SURFACE,
  border: '1px solid ' + C.BORDER,
  borderRadius: 8,
  fontSize: 13,
  color: C.TEXT,
  fontFamily: '"Inter",system-ui,sans-serif',
  outline: 'none',
};

var labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: C.TEXT_MUTED,
  marginBottom: 6,
};

/* ──────────────────────────────────────────────────────────────────────
   Email Platform Setup Form (Mailchimp, Klaviyo, ConvertKit)
   ────────────────────────────────────────────────────────────────────── */
function EmailPlatformForm({
  type,
  token,
  onCreated,
  onCancel,
}: {
  type: 'mailchimp' | 'klaviyo' | 'convertkit';
  token: string;
  onCreated: (i: Integration) => void;
  onCancel: () => void;
}) {
  var [apiKey, setApiKey] = useState('');
  var [lists, setLists] = useState<ListItem[]>([]);
  var [selectedList, setSelectedList] = useState('');
  var [loadingLists, setLoadingLists] = useState(false);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);
  var [step, setStep] = useState<'key' | 'list'>('key');

  var platformName = labelFor(type);
  var listLabel = type === 'convertkit' ? 'Form' : type === 'klaviyo' ? 'List' : 'Audience';

  function fetchLists() {
    if (!apiKey) return;
    setLoadingLists(true);
    setError(null);

    fetch(API + '/api/integrations/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ type: type, apiKey: apiKey }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Invalid API key'); });
        return res.json();
      })
      .then(function(data) {
        setLists(data.lists || []);
        if (data.lists && data.lists.length > 0) {
          setSelectedList(data.lists[0].id);
        }
        setStep('list');
        setLoadingLists(false);
      })
      .catch(function(e) {
        setError(e.message || 'Failed to validate API key');
        setLoadingLists(false);
      });
  }

  function saveIntegration() {
    if (!apiKey || !selectedList) return;
    setSaving(true);
    setError(null);

    var config: Record<string, any> = { apiKey: apiKey };
    if (type === 'convertkit') {
      config.formId = selectedList;
    } else {
      config.listId = selectedList;
    }

    // Include the list name for display
    var listObj = lists.find(function(l) { return l.id === selectedList; });
    if (listObj) config.listName = listObj.name;

    fetch(API + '/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ type: type, config: config }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Failed to save'); });
        return res.json();
      })
      .then(function(data) {
        onCreated(data);
        setSaving(false);
      })
      .catch(function(e) {
        setError(e.message);
        setSaving(false);
      });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.ACCENT, color: '#fff', fontSize: 14, fontWeight: 700,
        }}>
          {iconFor(type)}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>Connect {platformName}</div>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>
            {step === 'key' ? 'Step 1: Enter your API key' : 'Step 2: Select ' + listLabel.toLowerCase()}
          </div>
        </div>
      </div>

      {step === 'key' && (
        <div>
          <label style={labelStyle}>{platformName} API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={function(e) { setApiKey(e.target.value); }}
            placeholder={type === 'mailchimp' ? 'xxxxxxxx-us21' : type === 'klaviyo' ? 'pk_xxxxxxxx' : 'xxxxxxxx'}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginBottom: 12, lineHeight: 1.5 }}>
            {type === 'mailchimp' && 'Find this in your Mailchimp account under Profile > Extras > API Keys.'}
            {type === 'klaviyo' && 'Find this in Klaviyo under Settings > API Keys. Use a private API key.'}
            {type === 'convertkit' && 'Find this in ConvertKit under Settings > Advanced > API Key.'}
          </div>
        </div>
      )}

      {step === 'list' && (
        <div>
          <label style={labelStyle}>Select {listLabel}</label>
          {lists.length === 0 ? (
            <div style={{ fontSize: 13, color: C.TEXT_MUTED, marginBottom: 12 }}>
              No {listLabel.toLowerCase()}s found. Create one in {platformName} first.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              {lists.map(function(l) {
                var isSelected = selectedList === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={function() { setSelectedList(l.id); }}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid ' + (isSelected ? C.ACCENT : C.BORDER),
                      borderRadius: 8,
                      background: isSelected ? 'rgba(49, 84, 255,0.06)' : C.SURFACE,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: C.TEXT }}>{l.name}</span>
                    {l.member_count !== undefined && (
                      <span style={{ fontSize: 11, color: C.TEXT_MUTED }}>{l.member_count.toLocaleString()} contacts</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <GhostButton onClick={function() { setStep('key'); }}>Back</GhostButton>
        </div>
      )}

      {error && (
        <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 10 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {step === 'key' && (
          <PrimaryButton onClick={fetchLists} disabled={loadingLists || !apiKey}>
            {loadingLists ? 'Validating...' : 'Validate & continue'}
          </PrimaryButton>
        )}
        {step === 'list' && lists.length > 0 && (
          <PrimaryButton onClick={saveIntegration} disabled={saving || !selectedList}>
            {saving ? 'Connecting...' : 'Connect ' + platformName}
          </PrimaryButton>
        )}
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Google Sheets Setup Form
   ────────────────────────────────────────────────────────────────────── */
function GoogleSheetsForm({
  token,
  onCreated,
  onCancel,
}: {
  token: string;
  onCreated: (i: Integration) => void;
  onCancel: () => void;
}) {
  var [spreadsheetId, setSpreadsheetId] = useState('');
  var [sheetName, setSheetName] = useState('Sheet1');
  var [serviceAccountJson, setServiceAccountJson] = useState('');
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);

  function save() {
    if (!spreadsheetId) { setError('Spreadsheet ID is required'); return; }
    setSaving(true);
    setError(null);

    fetch(API + '/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        type: 'google_sheets',
        config: { spreadsheet_id: spreadsheetId, sheet_name: sheetName || 'Sheet1', service_account_json: serviceAccountJson },
      }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Failed to save'); });
        return res.json();
      })
      .then(function(data) { onCreated(data); setSaving(false); })
      .catch(function(e) { setError(e.message); setSaving(false); });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f9d58', color: '#fff', fontSize: 14, fontWeight: 700,
        }}>G</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.TEXT }}>Connect Google Sheets</div>
          <div style={{ fontSize: 12, color: C.TEXT_MUTED }}>Auto-append every lead as a new row</div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Spreadsheet ID</label>
        <input
          type="text"
          value={spreadsheetId}
          onChange={function(e) { setSpreadsheetId(e.target.value); }}
          placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 4 }}>
          The long ID from your Google Sheet URL: docs.google.com/spreadsheets/d/<b>this-part</b>/edit
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Sheet Name (tab)</label>
        <input
          type="text"
          value={sheetName}
          onChange={function(e) { setSheetName(e.target.value); }}
          placeholder="Sheet1"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Service Account JSON (optional)</label>
        <textarea
          value={serviceAccountJson}
          onChange={function(e) { setServiceAccountJson(e.target.value); }}
          placeholder='Paste your Google service account JSON here for private sheets...'
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'ui-monospace,monospace', fontSize: 11 }}
        />
        <div style={{ fontSize: 11, color: C.TEXT_MUTED, marginTop: 4 }}>
          Only needed for private sheets. Make the sheet public (view access) to skip this step.
        </div>
      </div>

      {error && <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryButton onClick={save} disabled={saving || !spreadsheetId}>
          {saving ? 'Connecting...' : 'Connect Google Sheets'}
        </PrimaryButton>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Webhook Form (unchanged)
   ────────────────────────────────────────────────────────────────────── */
function WebhookForm({
  onCreated,
  token,
}: {
  onCreated: (i: Integration) => void;
  token: string;
}) {
  var [url, setUrl] = useState('');
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);

  function submit() {
    if (!url) return;
    setSaving(true);
    setError(null);
    fetch(API + '/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ type: 'webhook', config: { url: url } }),
    })
      .then(function(res) {
        if (!res.ok) return res.json().then(function(j) { throw new Error(j.error || 'Failed to save webhook'); });
        return res.json();
      })
      .then(function(data) { onCreated(data); setUrl(''); })
      .catch(function(e) { setError(e.message || 'Something went wrong'); })
      .finally(function() { setSaving(false); });
  }

  return (
    <div>
      <label style={labelStyle}>Webhook URL</label>
      <input
        type="url"
        value={url}
        onChange={function(e) { setUrl(e.target.value); }}
        placeholder="https://your-server.com/hooks/squarespell"
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      {error && <div style={{ color: '#ff6b6b', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
      <PrimaryButton onClick={submit} disabled={saving || !url}>
        {saving ? 'Saving...' : 'Add webhook'}
      </PrimaryButton>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Integration Row (existing integrations)
   ────────────────────────────────────────────────────────────────────── */
function IntegrationRow({
  integration,
  token,
  onChange,
  onDelete,
}: {
  integration: Integration;
  token: string;
  onChange: (i: Integration) => void;
  onDelete: (id: string) => void;
}) {
  var [testing, setTesting] = useState(false);
  var [testResult, setTestResult] = useState<string | null>(null);

  function toggle() {
    fetch(API + '/api/integrations/' + integration.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ active: !integration.active }),
    }).then(function(res) {
      if (res.ok) res.json().then(function(data) { onChange(data); });
    });
  }

  function runTest() {
    setTesting(true);
    setTestResult(null);
    fetch(API + '/api/integrations/test/' + integration.id, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) setTestResult('Success');
        else setTestResult('Failed: ' + (data.error || data.status));
      })
      .catch(function(e) { setTestResult('Failed: ' + e.message); })
      .finally(function() {
        setTesting(false);
        setTimeout(function() { setTestResult(null); }, 4000);
      });
  }

  function remove() {
    if (!confirm('Remove this integration?')) return;
    fetch(API + '/api/integrations/' + integration.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    }).then(function(res) {
      if (res.ok) onDelete(integration.id);
    });
  }

  var configSummary = '';
  if (integration.type === 'webhook') {
    configSummary = integration.config?.url || '';
  } else if (integration.config?.listName) {
    configSummary = integration.config.listName;
  } else if (integration.config?.spreadsheet_id) {
    configSummary = 'Sheet: ' + (integration.config.sheet_name || 'Sheet1');
  } else {
    configSummary = 'Connected';
  }

  var canTest = integration.type === 'webhook' || integration.type === 'mailchimp' || integration.type === 'klaviyo' || integration.type === 'convertkit';

  return (
    <div style={{
      padding: '14px 18px',
      border: '1px solid ' + C.BORDER,
      borderRadius: 12,
      background: C.SURFACE,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: integration.active ? C.ACCENT : C.BORDER,
          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {iconFor(integration.type)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.TEXT }}>{labelFor(integration.type)}</span>
            <Pill variant={integration.active ? 'live' : 'draft'}>{integration.active ? 'Active' : 'Paused'}</Pill>
          </div>
          <div style={{
            fontSize: 12, color: C.TEXT_MUTED, fontFamily: 'ui-monospace,monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {configSummary}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {testResult && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: testResult === 'Success' ? C.SUCCESS : C.DANGER,
          }}>
            {testResult}
          </span>
        )}
        {canTest && (
          <GhostButton onClick={runTest}>{testing ? 'Testing...' : 'Test'}</GhostButton>
        )}
        <GhostButton onClick={toggle}>{integration.active ? 'Pause' : 'Resume'}</GhostButton>
        <GhostButton onClick={remove}>Remove</GhostButton>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main Page (2026 redesign, screen 17: "Connect your workflow.")
   ────────────────────────────────────────────────────────────────────── */

/** Curated "Popular" set shown first, per the design. */
var POPULAR = ['Zapier', 'Mailchimp', 'Google Sheets', 'Klaviyo', 'ConvertKit', 'HubSpot', 'Slack', 'Custom Webhook', 'Notion'];

/** The catalog files a few native tools under "Popular"; for browsing by category, use their real category. */
function categoryOf(c: Catalog): IntegrationCategory {
  if (c.category !== 'Popular') return c.category;
  if (c.type === 'mailchimp') return 'Email Marketing';
  if (c.type === 'google_sheets') return 'Collaboration';
  return 'Automation';
}

var NAV: { key: string; label: string; icon: string }[] = [
  { key: 'Popular', label: 'Popular', icon: 'M13 2 4 14h7l-1 8 9-12h-7z' },
  { key: 'Email Marketing', label: 'Email marketing', icon: 'M3 5h18v14H3zM3 7l9 6 9-6' },
  { key: 'CRM', label: 'CRM', icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5M17 11a3 3 0 100-6M22 21c0-3-1.8-5-4.5-5.7' },
  { key: 'Analytics', label: 'Analytics', icon: 'M5 20v-6M12 20V8M19 20V4' },
  { key: 'Ecommerce', label: 'Commerce', icon: 'M3 4h2l2.5 12h11L21 7H6.2M9 20h.01M18 20h.01' },
  { key: 'Lead Generation', label: 'Lead generation', icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z' },
  { key: 'Collaboration', label: 'Collaboration', icon: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z' },
  { key: 'Automation', label: 'Automation', icon: 'M6 3v6M6 15v6M18 3v6M18 15v6M6 9a3 3 0 100 6 3 3 0 000-6zM18 9a3 3 0 100 6 3 3 0 000-6z' },
];

var PAGE_CSS = `
  .sq-int { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 32px; }
  .sq-int-nav button { display: flex; align-items: center; gap: 14px; width: 100%; height: 48px; padding: 0 16px; border: none; border-radius: 6px; background: transparent; color: ${C.INK}; font: 400 16px ${C.FONT}; cursor: pointer; text-align: left; }
  .sq-int-nav button:hover { background: ${C.GRAY_50}; }
  .sq-int-nav button[aria-current="true"] { background: ${C.PERIWINKLE_SOFT}; color: ${C.ACCENT}; font-weight: 500; }
  .sq-int-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .sq-int-card { display: flex; gap: 18px; padding: 22px; background: #fff; border: 1px solid ${C.BORDER}; border-radius: 8px; min-width: 0; }
  .sq-int-card.is-connected { border-color: ${C.ACCENT}; }
  .sq-int-list .sq-int-grid { grid-template-columns: 1fr; }
  .sq-int-list .sq-int-card { align-items: center; padding: 14px 18px; }
  .sq-int-list .sq-int-action { margin-top: 0 !important; margin-left: auto; }
  @media (max-width: 1200px) { .sq-int-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sq-int-art { display: none; } }
  @media (max-width: 900px) { .sq-int { grid-template-columns: 1fr; } .sq-int-promo { display: none; } }
  @media (max-width: 640px) { .sq-int-grid { grid-template-columns: 1fr; } }
`;

function LogoTile({ c, size = 64 }: { c: Catalog; size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 8, background: c.color + '1A', color: c.color === '#FFE01B' ? '#0B1233' : c.color, border: '1px solid ' + C.BORDER_LIGHT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size > 40 ? 20 : 13, fontWeight: 800, letterSpacing: '-0.02em', flexShrink: 0 }}>
      {c.icon}
    </span>
  );
}

export default function IntegrationsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [integrations, setIntegrations] = useState<Integration[]>([]);
  var [loading, setLoading] = useState(true);
  var [setupType, setSetupType] = useState<IntegrationType | null>(null);
  var [category, setCategory] = useState('Popular');
  var [search, setSearch] = useState('');
  var [sortBy, setSortBy] = useState('popular');
  var [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    setLoading(true);
    fetch(API + '/api/integrations', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(res) { if (!res.ok) throw new Error('Failed to load integrations'); return res.json(); })
      .then(function(data) { if (!cancelled) setIntegrations(Array.isArray(data) ? data : []); })
      .catch(function(e) { console.error(e); })
      .finally(function() { if (!cancelled) setLoading(false); });
    return function() { cancelled = true; };
  }, [token]);

  useEffect(function() {
    if (!setupType) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSetupType(null); }
    document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('keydown', onKey); };
  }, [setupType]);

  function handleCreated(i: Integration) {
    setIntegrations(function(prev) { return [i].concat(prev); });
    setSetupType(null);
  }

  var counts = useMemo(function() {
    var m: Record<string, number> = { Popular: POPULAR.length };
    CATALOG.forEach(function(c) { var k = categoryOf(c); m[k] = (m[k] || 0) + 1; });
    return m;
  }, []);
  var availableCount = CATALOG.filter(function(c) { return c.available; }).length;
  var plannedCount = CATALOG.length - availableCount;
  var connectedCount = integrations.filter(function(i) { return i.active; }).length;

  var shown = useMemo(function() {
    var q = search.trim().toLowerCase();
    var list = q
      ? CATALOG.filter(function(c) { return (c.name + ' ' + c.tagline).toLowerCase().indexOf(q) > -1; })
      : category === 'Popular'
        ? POPULAR.map(function(n) { return CATALOG.find(function(c) { return c.name === n; }); }).filter(Boolean) as Catalog[]
        : CATALOG.filter(function(c) { return categoryOf(c) === category; });
    if (sortBy === 'available') list = list.slice().sort(function(a, b) { return Number(b.available) - Number(a.available); });
    if (sortBy === 'name') list = list.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
    return list;
  }, [search, category, sortBy]);

  function openSetup(c: Catalog) {
    if (!c.available) return; // Zapier and everything via Zapier is planned: nothing to open.
    if (c.type === 'zapier') { router.push('/dashboard/integrations/api-keys'); return; }
    setSetupType(c.type);
  }

  if (authStatus === 'loading') {
    return <DashboardShell title="Integrations"><PageLoading /></DashboardShell>;
  }

  return (
    <DashboardShell title="Integrations">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <div style={{ minWidth: 0 }}>
          <DisplayTitle size="xl">Connect your workflow.</DisplayTitle>
          <p style={{ margin: '14px 0 18px', fontSize: 'clamp(17px, 1.6vw, 22px)', color: C.GRAY_600 }}>Send quiz leads to the tools you use.</p>
          <div style={{ fontSize: 17, color: C.INK }}>
            <b style={{ fontFamily: C.DISPLAY_FONT, fontSize: 20 }}>{connectedCount}</b> connected
            <span style={{ margin: '0 10px', color: C.GRAY_400 }}>·</span>
            <b style={{ fontFamily: C.DISPLAY_FONT, fontSize: 20 }}>{availableCount}</b> available
            <span style={{ margin: '0 10px', color: C.GRAY_400 }}>·</span>
            <b style={{ fontFamily: C.DISPLAY_FONT, fontSize: 20 }}>{plannedCount}</b> planned
          </div>
        </div>
        <svg className="sq-int-art" width="420" height="160" viewBox="0 0 420 160" aria-hidden="true" style={{ flexShrink: 0 }}>
          <text x="10" y="54" fontSize="22" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif" fontStyle="italic">More leads.</text>
          <text x="10" y="82" fontSize="22" fill={C.INK} fontFamily="'Instrument Serif', Georgia, serif" fontStyle="italic">More possibilities.</text>
          <path d="M200 30 A 90 90 0 0 1 290 120 L 200 120 Z" fill={C.PERIWINKLE} />
          <rect x="240" y="80" width="72" height="72" fill={C.ACCENT} />
          <circle cx="330" cy="40" r="36" fill={C.ACID} />
          <path d="M330 26v28M316 40h28" stroke={C.INK} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="sq-int">
        {/* Category navigation */}
        <aside>
          <nav className="sq-int-nav" aria-label="Integration categories" style={{ display: 'grid', gap: 4 }}>
            {NAV.map(function(n) {
              var active = !search && category === n.key;
              return (
                <button key={n.key} type="button" aria-current={active} onClick={function() { setCategory(n.key); setSearch(''); }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.icon} /></svg>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  <span style={{ fontSize: 14, color: active ? C.ACCENT : C.GRAY_500 }}>{counts[n.key] || 0}</span>
                </button>
              );
            })}
          </nav>
          <div className="sq-int-promo" aria-hidden="true" style={{ position: 'relative', marginTop: 28, height: 260, borderRadius: 8, overflow: 'hidden', background: C.PERIWINKLE }}>
            <div style={{ position: 'absolute', left: 22, top: 22, fontFamily: C.SERIF_FONT, fontSize: 34, lineHeight: 1, color: C.INK }}>Turn<br />quiz leads<br />into growth.</div>
            <svg width="100%" height="100%" viewBox="0 0 270 260" preserveAspectRatio="xMaxYMax slice" style={{ position: 'absolute', inset: 0 }}>
              <path d="M200 70 C 205 45, 220 30, 250 22" fill="none" stroke={C.INK} strokeWidth="1.2" />
              <path d="M240 18 L 250 22 L 244 32" fill="none" stroke={C.INK} strokeWidth="1.2" />
              <path d="M270 150 A 90 90 0 0 0 180 240 L 270 240 Z" fill={C.BRAND_300} />
              <rect x="140" y="200" width="60" height="60" fill={C.BRAND_300} opacity="0.7" />
            </svg>
            <div style={{ position: 'absolute', left: 22, bottom: 20, fontSize: 10, letterSpacing: '0.18em', color: C.INK, lineHeight: 1.6 }}>CONNECT<br />AUTOMATE<br />SCALE</div>
          </div>
        </aside>

        <div style={{ minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <label style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 320px' }}>
              <span style={{ position: 'absolute', left: 16, color: C.GRAY_600, display: 'flex' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </span>
              <input type="search" aria-label="Search integrations" placeholder="Search integrations..." value={search} onChange={function(e) { setSearch(e.target.value); }}
                style={{ width: '100%', height: 48, padding: '0 16px 0 48px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 16, fontFamily: C.FONT, color: C.INK }} />
            </label>
            <select aria-label="Sort integrations" value={sortBy} onChange={function(e) { setSortBy(e.target.value); }}
              style={{ height: 48, minWidth: 180, padding: '0 14px', borderRadius: 6, border: '1px solid ' + C.BORDER, background: '#fff', fontSize: 15, fontFamily: C.FONT, color: C.INK, cursor: 'pointer' }}>
              <option value="popular">Most popular</option>
              <option value="available">Available first</option>
              <option value="name">Name A–Z</option>
            </select>
            <div role="group" aria-label="View" style={{ display: 'flex', border: '1px solid ' + C.BORDER, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
              {(['grid', 'list'] as const).map(function(v) {
                return (
                  <button key={v} type="button" aria-pressed={view === v} aria-label={v === 'grid' ? 'Grid view' : 'List view'} onClick={function() { setView(v); }}
                    style={{ width: 50, height: 46, border: 'none', background: view === v ? C.INK : '#fff', color: view === v ? '#fff' : C.INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {v === 'grid'
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected */}
          {loading ? <PageLoading /> : integrations.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: C.INK }}>Connected ({integrations.length})</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {integrations.map(function(i) {
                  return (
                    <IntegrationRow key={i.id} integration={i} token={token || ''}
                      onChange={function(updated) { setIntegrations(function(prev) { return prev.map(function(p) { return p.id === updated.id ? updated : p; }); }); }}
                      onDelete={function(id) { setIntegrations(function(prev) { return prev.filter(function(p) { return p.id !== id; }); }); }} />
                  );
                })}
              </div>
            </section>
          )}

          {/* Catalog */}
          <div className={view === 'list' ? 'sq-int-list' : ''}>
            {shown.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', background: '#fff', border: '1px solid ' + C.BORDER, borderRadius: 8, color: C.GRAY_600 }}>No integrations match “{search}”.</div>
            ) : (
              <div className="sq-int-grid">
                {shown.map(function(c, ci) {
                  var isConnected = c.native && integrations.some(function(i) { return i.type === c.type && i.active; });
                  return (
                    <article key={c.name + '-' + ci} className={'sq-int-card' + (isConnected ? ' is-connected' : '')}>
                      <LogoTile c={c} size={view === 'list' ? 44 : 64} />
                      <div style={{ minWidth: 0, flex: 1, display: view === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 16 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: C.INK }}>{c.name}</h3>
                            {!c.native && <span style={{ fontSize: 12.5, padding: '3px 10px', borderRadius: 999, background: C.ACID_SOFT, color: C.INK }}>via Zapier</span>}
                            {isConnected && <Pill variant="live">Connected</Pill>}
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: 15, color: C.GRAY_600, lineHeight: 1.45 }}>{c.tagline}</p>
                        </div>
                        <div className="sq-int-action" style={{ marginTop: 16 }}>
                          {c.available ? (
                            <PrimaryButton onClick={function() { openSetup(c); }}>{isConnected ? 'Add another' : 'Connect'}</PrimaryButton>
                          ) : (
                            <span title="Not available yet" style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 16px', borderRadius: 6, border: '1px dashed ' + C.GRAY_300, color: C.GRAY_500, fontSize: 14 }}>Planned</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup dialog */}
      {setupType && (
        <div role="dialog" aria-modal="true" aria-label={'Connect ' + labelFor(setupType)} onMouseDown={function(e) { if (e.target === e.currentTarget) setSetupType(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11, 18, 51,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '8vh 16px', overflowY: 'auto' }}>
          <div style={{ width: 'min(620px, 100%)' }}>
            <Card>
              {setupType === 'webhook' && (
                <div>
                  <WebhookForm token={token || ''} onCreated={handleCreated} />
                  <div style={{ marginTop: 10 }}><GhostButton onClick={function() { setSetupType(null); }}>Cancel</GhostButton></div>
                </div>
              )}
              {(setupType === 'mailchimp' || setupType === 'klaviyo' || setupType === 'convertkit') && (
                <EmailPlatformForm type={setupType} token={token || ''} onCreated={handleCreated} onCancel={function() { setSetupType(null); }} />
              )}
              {setupType === 'google_sheets' && (
                <GoogleSheetsForm token={token || ''} onCreated={handleCreated} onCancel={function() { setSetupType(null); }} />
              )}
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
