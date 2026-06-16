'use client';

/**
 * /dashboard/integrations - Where users connect lead delivery destinations.
 *
 * Fully working integrations: Webhook, Zapier, Mailchimp, Klaviyo,
 * ConvertKit, and Google Sheets. Each has a setup form that validates
 * credentials and lets users pick lists/audiences/forms.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardShell, DASHBOARD_COLORS as C } from '../_components/DashboardShell';
import { useDashboardAuth } from '../_components/useDashboardAuth';
import {
  PageHeader,
  Card,
  PrimaryButton,
  GhostButton,
  Pill,
  PageLoading,
} from '../_components/PageShell';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

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
  { type: 'zapier', name: 'Zapier', tagline: 'Trigger any of 5,000+ Zapier apps.', available: true, icon: 'Z', category: 'Popular', color: '#FF4A00', native: true },
  { type: 'mailchimp', name: 'Mailchimp', tagline: 'Push leads straight into a Mailchimp audience.', available: true, icon: 'M', category: 'Popular', color: '#FFE01B', native: true },
  { type: 'google_sheets', name: 'Google Sheets', tagline: 'Append every lead to a Google Sheet row.', available: true, icon: 'G', category: 'Popular', color: '#0F9D58', native: true },
  { type: 'klaviyo', name: 'Klaviyo', tagline: 'Sync leads + outcome tags into Klaviyo.', available: true, icon: 'K', category: 'Email Marketing', color: '#000000', native: true },
  { type: 'convertkit', name: 'ConvertKit', tagline: 'Subscribe leads to a ConvertKit form or tag.', available: true, icon: 'C', category: 'Email Marketing', color: '#FB6970', native: true },
  { type: 'webhook', name: 'Custom Webhook', tagline: 'POST every lead to your own URL.', available: true, icon: 'W', category: 'Automation', color: '#6B7280', native: true },

  /* ── Via Zapier (shown to bulk up the ecosystem) ── */
  { type: 'zapier', name: 'HubSpot', tagline: 'Sync leads and quiz data to HubSpot CRM.', available: true, icon: 'H', category: 'CRM', color: '#FF7A59', native: false },
  { type: 'zapier', name: 'Salesforce', tagline: 'Create leads in Salesforce from quiz submissions.', available: true, icon: 'S', category: 'CRM', color: '#00A1E0', native: false },
  { type: 'zapier', name: 'ActiveCampaign', tagline: 'Add quiz leads to ActiveCampaign automations.', available: true, icon: 'A', category: 'Email Marketing', color: '#004CFF', native: false },
  { type: 'zapier', name: 'Drip', tagline: 'Push leads into Drip workflows and tags.', available: true, icon: 'D', category: 'Email Marketing', color: '#4E38E0', native: false },
  { type: 'zapier', name: 'Constant Contact', tagline: 'Add quiz leads to Constant Contact lists.', available: true, icon: 'CC', category: 'Email Marketing', color: '#004990', native: false },
  { type: 'zapier', name: 'AWeber', tagline: 'Subscribe quiz leads to AWeber lists.', available: true, icon: 'AW', category: 'Email Marketing', color: '#2E73BD', native: false },
  { type: 'zapier', name: 'Sendinblue (Brevo)', tagline: 'Push leads to Brevo (Sendinblue) campaigns.', available: true, icon: 'B', category: 'Email Marketing', color: '#0092FF', native: false },
  { type: 'zapier', name: 'Google Analytics', tagline: 'Track quiz events in Google Analytics.', available: true, icon: 'GA', category: 'Analytics', color: '#E37400', native: false },
  { type: 'zapier', name: 'Meta Pixel', tagline: 'Fire lead events for Facebook/Instagram ads.', available: true, icon: 'FB', category: 'Analytics', color: '#1877F2', native: false },
  { type: 'zapier', name: 'Google Tag Manager', tagline: 'Push quiz events into GTM data layer.', available: true, icon: 'GT', category: 'Analytics', color: '#4285F4', native: false },
  { type: 'zapier', name: 'Slack', tagline: 'Get quiz lead notifications in Slack channels.', available: true, icon: 'SL', category: 'Collaboration', color: '#4A154B', native: false },
  { type: 'zapier', name: 'Discord', tagline: 'Post new leads to a Discord channel.', available: true, icon: 'DC', category: 'Collaboration', color: '#5865F2', native: false },
  { type: 'zapier', name: 'Notion', tagline: 'Log quiz leads to a Notion database.', available: true, icon: 'N', category: 'Collaboration', color: '#000000', native: false },
  { type: 'zapier', name: 'Airtable', tagline: 'Add leads as rows in an Airtable base.', available: true, icon: 'AT', category: 'Collaboration', color: '#18BFFF', native: false },
  { type: 'zapier', name: 'Shopify', tagline: 'Sync quiz results with Shopify customers.', available: true, icon: 'SH', category: 'Ecommerce', color: '#96BF48', native: false },
  { type: 'zapier', name: 'WooCommerce', tagline: 'Push quiz leads to WooCommerce.', available: true, icon: 'WC', category: 'Ecommerce', color: '#7F54B3', native: false },
  { type: 'zapier', name: 'Stripe', tagline: 'Trigger payments or subscriptions from quiz outcomes.', available: true, icon: 'ST', category: 'Ecommerce', color: '#635BFF', native: false },
  { type: 'zapier', name: 'Pipedrive', tagline: 'Create deals from quiz-qualified leads.', available: true, icon: 'PD', category: 'CRM', color: '#017737', native: false },
  { type: 'zapier', name: 'Zoho CRM', tagline: 'Push leads into Zoho CRM modules.', available: true, icon: 'ZO', category: 'CRM', color: '#E42527', native: false },
  { type: 'zapier', name: 'Monday.com', tagline: 'Create items from quiz leads in Monday boards.', available: true, icon: 'MO', category: 'Lead Generation', color: '#FF3D57', native: false },
  { type: 'zapier', name: 'Typeform', tagline: 'Sync quiz data with Typeform responses.', available: true, icon: 'TF', category: 'Lead Generation', color: '#262627', native: false },
  { type: 'zapier', name: 'Intercom', tagline: 'Create or update Intercom contacts from leads.', available: true, icon: 'IC', category: 'Lead Generation', color: '#1F8DED', native: false },
  { type: 'zapier', name: 'Make (Integromat)', tagline: 'Trigger Make scenarios from quiz events.', available: true, icon: 'MK', category: 'Automation', color: '#6D00CC', native: false },
  { type: 'zapier', name: 'Pabbly Connect', tagline: 'Send leads to Pabbly Connect workflows.', available: true, icon: 'PA', category: 'Automation', color: '#FF6B00', native: false },

  /* ── Email Marketing (expanded) ── */
  { type: 'zapier', name: 'GetResponse', tagline: 'Add quiz leads to GetResponse autoresponders.', available: true, icon: 'GR', category: 'Email Marketing', color: '#00BAFF', native: false },
  { type: 'zapier', name: 'MailerLite', tagline: 'Subscribe leads to MailerLite groups and automations.', available: true, icon: 'ML', category: 'Email Marketing', color: '#09C269', native: false },
  { type: 'zapier', name: 'Campaign Monitor', tagline: 'Add quiz leads to Campaign Monitor lists.', available: true, icon: 'CM', category: 'Email Marketing', color: '#509CF6', native: false },
  { type: 'zapier', name: 'Moosend', tagline: 'Sync leads to Moosend mailing lists.', available: true, icon: 'MS', category: 'Email Marketing', color: '#26C164', native: false },
  { type: 'zapier', name: 'Omnisend', tagline: 'Push leads into Omnisend segments and workflows.', available: true, icon: 'OS', category: 'Email Marketing', color: '#1B1B40', native: false },
  { type: 'zapier', name: 'Benchmark Email', tagline: 'Add contacts to Benchmark Email lists.', available: true, icon: 'BE', category: 'Email Marketing', color: '#0070C0', native: false },
  { type: 'zapier', name: 'Emma', tagline: 'Push quiz leads into Emma audiences.', available: true, icon: 'EM', category: 'Email Marketing', color: '#2E3642', native: false },
  { type: 'zapier', name: 'Sendfox', tagline: 'Subscribe leads to Sendfox lists.', available: true, icon: 'SF', category: 'Email Marketing', color: '#4353FF', native: false },
  { type: 'zapier', name: 'Flodesk', tagline: 'Add quiz leads to Flodesk segments.', available: true, icon: 'FD', category: 'Email Marketing', color: '#FFC8DD', native: false },
  { type: 'zapier', name: 'Beehiiv', tagline: 'Add subscribers to your Beehiiv newsletter.', available: true, icon: 'BH', category: 'Email Marketing', color: '#FFC700', native: false },
  { type: 'zapier', name: 'Mailjet', tagline: 'Sync quiz leads to Mailjet contact lists.', available: true, icon: 'MJ', category: 'Email Marketing', color: '#3B2E82', native: false },
  { type: 'zapier', name: 'Customer.io', tagline: 'Create people in Customer.io from quiz leads.', available: true, icon: 'CI', category: 'Email Marketing', color: '#5046E4', native: false },
  { type: 'zapier', name: 'Kit (ConvertKit)', tagline: 'Tag and segment subscribers in Kit.', available: true, icon: 'KT', category: 'Email Marketing', color: '#FB6970', native: false },

  /* ── CRM (expanded) ── */
  { type: 'zapier', name: 'Freshsales', tagline: 'Create contacts in Freshsales from quiz data.', available: true, icon: 'FS', category: 'CRM', color: '#F47920', native: false },
  { type: 'zapier', name: 'Copper', tagline: 'Add leads to Copper CRM directly from quizzes.', available: true, icon: 'CP', category: 'CRM', color: '#F7B42C', native: false },
  { type: 'zapier', name: 'Close', tagline: 'Create leads in Close from quiz submissions.', available: true, icon: 'CL', category: 'CRM', color: '#2B2D42', native: false },
  { type: 'zapier', name: 'Insightly', tagline: 'Push quiz leads into Insightly contacts.', available: true, icon: 'IN', category: 'CRM', color: '#1B59A6', native: false },
  { type: 'zapier', name: 'Agile CRM', tagline: 'Add contacts and deals from quiz leads.', available: true, icon: 'AG', category: 'CRM', color: '#28B5C1', native: false },
  { type: 'zapier', name: 'Capsule CRM', tagline: 'Create contacts in Capsule from quiz data.', available: true, icon: 'CA', category: 'CRM', color: '#1C7ED6', native: false },
  { type: 'zapier', name: 'Keap (Infusionsoft)', tagline: 'Add contacts and tags in Keap from quizzes.', available: true, icon: 'KP', category: 'CRM', color: '#1A8B5F', native: false },
  { type: 'zapier', name: 'Nimble', tagline: 'Sync quiz leads to Nimble contacts.', available: true, icon: 'NM', category: 'CRM', color: '#2E86C1', native: false },
  { type: 'zapier', name: 'Nutshell', tagline: 'Create leads in Nutshell from quiz responses.', available: true, icon: 'NS', category: 'CRM', color: '#007F5F', native: false },
  { type: 'zapier', name: 'Streak', tagline: 'Add quiz leads to Streak pipelines in Gmail.', available: true, icon: 'SK', category: 'CRM', color: '#E8771A', native: false },

  /* ── Analytics (expanded) ── */
  { type: 'zapier', name: 'Mixpanel', tagline: 'Track quiz events and user behavior in Mixpanel.', available: true, icon: 'MP', category: 'Analytics', color: '#4F44E0', native: false },
  { type: 'zapier', name: 'Amplitude', tagline: 'Send quiz completion events to Amplitude.', available: true, icon: 'AM', category: 'Analytics', color: '#0061FF', native: false },
  { type: 'zapier', name: 'Segment', tagline: 'Route quiz events through Segment to any destination.', available: true, icon: 'SE', category: 'Analytics', color: '#52BD94', native: false },
  { type: 'zapier', name: 'Heap', tagline: 'Auto-capture quiz interactions in Heap analytics.', available: true, icon: 'HP', category: 'Analytics', color: '#6C31FF', native: false },
  { type: 'zapier', name: 'Hotjar', tagline: 'Trigger Hotjar recordings on quiz pages.', available: true, icon: 'HJ', category: 'Analytics', color: '#FF3C00', native: false },
  { type: 'zapier', name: 'FullStory', tagline: 'Replay quiz sessions in FullStory.', available: true, icon: 'FS', category: 'Analytics', color: '#7B00FF', native: false },
  { type: 'zapier', name: 'PostHog', tagline: 'Track quiz funnels and feature usage in PostHog.', available: true, icon: 'PH', category: 'Analytics', color: '#F9BD2B', native: false },
  { type: 'zapier', name: 'Kissmetrics', tagline: 'Track quiz conversions and behavior in Kissmetrics.', available: true, icon: 'KM', category: 'Analytics', color: '#1E88E5', native: false },
  { type: 'zapier', name: 'Pinterest Tag', tagline: 'Fire conversion events for Pinterest ads.', available: true, icon: 'PT', category: 'Analytics', color: '#E60023', native: false },
  { type: 'zapier', name: 'TikTok Pixel', tagline: 'Send lead events to TikTok Ads Manager.', available: true, icon: 'TT', category: 'Analytics', color: '#000000', native: false },
  { type: 'zapier', name: 'LinkedIn Insight Tag', tagline: 'Track quiz conversions for LinkedIn campaigns.', available: true, icon: 'LI', category: 'Analytics', color: '#0077B5', native: false },

  /* ── Lead Generation (expanded) ── */
  { type: 'zapier', name: 'Calendly', tagline: 'Schedule meetings from quiz-qualified leads.', available: true, icon: 'CD', category: 'Lead Generation', color: '#006BFF', native: false },
  { type: 'zapier', name: 'Acuity Scheduling', tagline: 'Book appointments from quiz submissions.', available: true, icon: 'AS', category: 'Lead Generation', color: '#316FFD', native: false },
  { type: 'zapier', name: 'Leadpages', tagline: 'Push leads from quizzes to Leadpages.', available: true, icon: 'LP', category: 'Lead Generation', color: '#4530B8', native: false },
  { type: 'zapier', name: 'OptinMonster', tagline: 'Sync quiz leads with OptinMonster campaigns.', available: true, icon: 'OM', category: 'Lead Generation', color: '#7CB342', native: false },
  { type: 'zapier', name: 'Unbounce', tagline: 'Connect quiz leads to Unbounce landing pages.', available: true, icon: 'UB', category: 'Lead Generation', color: '#2B60E2', native: false },
  { type: 'zapier', name: 'Drift', tagline: 'Create contacts in Drift from quiz submissions.', available: true, icon: 'DR', category: 'Lead Generation', color: '#0176FF', native: false },
  { type: 'zapier', name: 'LiveChat', tagline: 'Start chat conversations from quiz leads.', available: true, icon: 'LC', category: 'Lead Generation', color: '#FF5100', native: false },
  { type: 'zapier', name: 'Crisp', tagline: 'Add quiz leads as Crisp contacts.', available: true, icon: 'CR', category: 'Lead Generation', color: '#4B69FF', native: false },
  { type: 'zapier', name: 'Zendesk', tagline: 'Create tickets from quiz feedback submissions.', available: true, icon: 'ZD', category: 'Lead Generation', color: '#03363D', native: false },
  { type: 'zapier', name: 'Freshdesk', tagline: 'Create support tickets from quiz responses.', available: true, icon: 'FD', category: 'Lead Generation', color: '#25C16F', native: false },

  /* ── Ecommerce (expanded) ── */
  { type: 'zapier', name: 'BigCommerce', tagline: 'Sync quiz data with BigCommerce customers.', available: true, icon: 'BC', category: 'Ecommerce', color: '#121118', native: false },
  { type: 'zapier', name: 'Squarespace Commerce', tagline: 'Tag customers based on quiz outcomes.', available: true, icon: 'SQ', category: 'Ecommerce', color: '#000000', native: false },
  { type: 'zapier', name: 'Gumroad', tagline: 'Trigger product offers from quiz results.', available: true, icon: 'GU', category: 'Ecommerce', color: '#FF90E8', native: false },
  { type: 'zapier', name: 'Teachable', tagline: 'Enroll quiz leads in Teachable courses.', available: true, icon: 'TE', category: 'Ecommerce', color: '#1D1D1D', native: false },
  { type: 'zapier', name: 'Thinkific', tagline: 'Create students from quiz submissions.', available: true, icon: 'TH', category: 'Ecommerce', color: '#0EBB72', native: false },
  { type: 'zapier', name: 'Kajabi', tagline: 'Add quiz leads to Kajabi funnels and lists.', available: true, icon: 'KJ', category: 'Ecommerce', color: '#2962FF', native: false },
  { type: 'zapier', name: 'Podia', tagline: 'Subscribe leads to Podia email lists.', available: true, icon: 'PO', category: 'Ecommerce', color: '#5436DA', native: false },
  { type: 'zapier', name: 'Etsy', tagline: 'Track quiz-sourced customers on Etsy.', available: true, icon: 'ET', category: 'Ecommerce', color: '#F1641E', native: false },
  { type: 'zapier', name: 'Square', tagline: 'Create customers in Square from quiz leads.', available: true, icon: 'SQ', category: 'Ecommerce', color: '#006AFF', native: false },
  { type: 'zapier', name: 'PayPal', tagline: 'Trigger payment links from quiz outcomes.', available: true, icon: 'PP', category: 'Ecommerce', color: '#003087', native: false },

  /* ── Collaboration (expanded) ── */
  { type: 'zapier', name: 'Microsoft Teams', tagline: 'Post lead notifications to Teams channels.', available: true, icon: 'MT', category: 'Collaboration', color: '#6264A7', native: false },
  { type: 'zapier', name: 'Trello', tagline: 'Create Trello cards from quiz submissions.', available: true, icon: 'TR', category: 'Collaboration', color: '#0052CC', native: false },
  { type: 'zapier', name: 'Asana', tagline: 'Create Asana tasks from quiz leads.', available: true, icon: 'AN', category: 'Collaboration', color: '#F06A6A', native: false },
  { type: 'zapier', name: 'ClickUp', tagline: 'Create ClickUp tasks from quiz responses.', available: true, icon: 'CU', category: 'Collaboration', color: '#7B68EE', native: false },
  { type: 'zapier', name: 'Basecamp', tagline: 'Post quiz leads to Basecamp projects.', available: true, icon: 'BS', category: 'Collaboration', color: '#1D2D35', native: false },
  { type: 'zapier', name: 'Todoist', tagline: 'Create follow-up tasks in Todoist.', available: true, icon: 'TD', category: 'Collaboration', color: '#E44332', native: false },
  { type: 'zapier', name: 'Linear', tagline: 'File quiz feedback as Linear issues.', available: true, icon: 'LN', category: 'Collaboration', color: '#5E6AD2', native: false },
  { type: 'zapier', name: 'Jira', tagline: 'Create Jira issues from quiz responses.', available: true, icon: 'JR', category: 'Collaboration', color: '#0052CC', native: false },
  { type: 'zapier', name: 'GitHub', tagline: 'Create GitHub issues from quiz feedback.', available: true, icon: 'GH', category: 'Collaboration', color: '#24292E', native: false },
  { type: 'zapier', name: 'Coda', tagline: 'Add quiz lead rows to Coda documents.', available: true, icon: 'CO', category: 'Collaboration', color: '#F46A54', native: false },

  /* ── Automation (expanded) ── */
  { type: 'zapier', name: 'n8n', tagline: 'Trigger n8n workflows from quiz events.', available: true, icon: 'N8', category: 'Automation', color: '#EA4B71', native: false },
  { type: 'zapier', name: 'Tray.io', tagline: 'Connect quiz data to Tray.io integrations.', available: true, icon: 'TI', category: 'Automation', color: '#0059B2', native: false },
  { type: 'zapier', name: 'Automate.io', tagline: 'Build automations from quiz submissions.', available: true, icon: 'AI', category: 'Automation', color: '#FF6348', native: false },
  { type: 'zapier', name: 'Power Automate', tagline: 'Trigger Microsoft Power Automate flows.', available: true, icon: 'PA', category: 'Automation', color: '#0066FF', native: false },
  { type: 'zapier', name: 'IFTTT', tagline: 'Create IFTTT applets from quiz triggers.', available: true, icon: 'IF', category: 'Automation', color: '#33CCFF', native: false },
  { type: 'zapier', name: 'Workato', tagline: 'Build enterprise automations from quiz data.', available: true, icon: 'WK', category: 'Automation', color: '#4C61DF', native: false },
  { type: 'zapier', name: 'ActivePieces', tagline: 'Trigger ActivePieces flows from quiz events.', available: true, icon: 'AP', category: 'Automation', color: '#FF4F40', native: false },
  { type: 'zapier', name: 'Pipedream', tagline: 'Run code on every quiz submission via Pipedream.', available: true, icon: 'PD', category: 'Automation', color: '#37B058', native: false },
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
                      background: isSelected ? 'rgba(13,115,119,0.06)' : C.SURFACE,
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
            color: testResult === 'Success' ? '#4cd964' : '#ff6b6b',
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
   Main Page
   ────────────────────────────────────────────────────────────────────── */
export default function IntegrationsPage() {
  var { token, status: authStatus } = useDashboardAuth();
  var router = useRouter();
  var [integrations, setIntegrations] = useState<Integration[]>([]);
  var [loading, setLoading] = useState(true);
  var [setupType, setSetupType] = useState<IntegrationType | null>(null);

  useEffect(function() {
    if (!token) return;
    var cancelled = false;
    setLoading(true);

    fetch(API + '/api/integrations', {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function(res) {
        if (!res.ok) throw new Error('Failed to load integrations');
        return res.json();
      })
      .then(function(data) {
        if (!cancelled) setIntegrations(Array.isArray(data) ? data : []);
      })
      .catch(function(e) { console.error(e); })
      .finally(function() { if (!cancelled) setLoading(false); });

    return function() { cancelled = true; };
  }, [token]);

  function handleCreated(i: Integration) {
    setIntegrations(function(prev) { return [i].concat(prev); });
    setSetupType(null);
  }

  if (authStatus === 'loading') {
    return (
      <DashboardShell title="Integrations">
        <PageLoading />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Integrations">
      <PageHeader
        title="Integrations"
        subtitle="Send your quiz leads to the tools you already use"
      />

      {loading ? (
        <PageLoading />
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Setup form overlay */}
          {setupType && (
            <Card>
              {setupType === 'webhook' && (
                <div>
                  <WebhookForm token={token || ''} onCreated={handleCreated} />
                  <div style={{ marginTop: 10 }}>
                    <GhostButton onClick={function() { setSetupType(null); }}>Cancel</GhostButton>
                  </div>
                </div>
              )}
              {(setupType === 'mailchimp' || setupType === 'klaviyo' || setupType === 'convertkit') && (
                <EmailPlatformForm
                  type={setupType}
                  token={token || ''}
                  onCreated={handleCreated}
                  onCancel={function() { setSetupType(null); }}
                />
              )}
              {setupType === 'google_sheets' && (
                <GoogleSheetsForm
                  token={token || ''}
                  onCreated={handleCreated}
                  onCancel={function() { setSetupType(null); }}
                />
              )}
            </Card>
          )}

          {/* Connected integrations */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                Connected ({integrations.length})
              </h2>
            </div>

            {integrations.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: C.TEXT_MUTED, fontSize: 13.5 }}>
                No integrations connected yet. Pick one below to get started.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {integrations.map(function(i) {
                  return (
                    <IntegrationRow
                      key={i.id}
                      integration={i}
                      token={token || ''}
                      onChange={function(updated) {
                        setIntegrations(function(prev) { return prev.map(function(p) { return p.id === updated.id ? updated : p; }); });
                      }}
                      onDelete={function(id) {
                        setIntegrations(function(prev) { return prev.filter(function(p) { return p.id !== id; }); });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </Card>

          {/* Available integrations catalog — categorized grid */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: C.TEXT }}>
                  Available integrations
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: C.TEXT_MUTED }}>
                  {CATALOG.length} integrations — connect your leads to any tool in your stack.
                </p>
              </div>
            </div>

            {CATEGORIES.map(function(cat) {
              var catItems = CATALOG.filter(function(c) { return c.category === cat; });
              if (catItems.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 28 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 12, paddingBottom: 8,
                    borderBottom: '1px solid ' + C.BORDER,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.TEXT }}>{cat}</span>
                    <span style={{ fontSize: 11, color: C.TEXT_MUTED, fontWeight: 500 }}>({catItems.length})</span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 12,
                  }}>
                    {catItems.map(function(c, ci) {
                      var isConnected = c.native && integrations.some(function(i) { return i.type === c.type && i.active; });
                      return (
                        <div
                          key={c.name + '-' + ci}
                          onClick={function() {
                            if (!c.native) {
                              /* Via Zapier — go to Zapier setup */
                              router.push('/dashboard/integrations/api-keys');
                              return;
                            }
                            if (c.type === 'zapier') { router.push('/dashboard/integrations/api-keys'); return; }
                            setSetupType(c.type);
                          }}
                          style={{
                            padding: 16,
                            border: '1px solid ' + (isConnected ? C.ACCENT : C.BORDER),
                            borderRadius: 12,
                            background: isConnected ? 'rgba(13,115,119,0.04)' : C.SURFACE,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={function(e) { e.currentTarget.style.borderColor = C.ACCENT; e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,115,119,0.08)'; }}
                          onMouseLeave={function(e) { e.currentTarget.style.borderColor = isConnected ? C.ACCENT : C.BORDER; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: c.color + '14',
                              color: c.color, fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em',
                            }}>
                              {c.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.TEXT, display: 'block' }}>{c.name}</span>
                              {!c.native && (
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#FF4A00', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                  via Zapier
                                </span>
                              )}
                            </div>
                            {isConnected && <Pill variant="live">Connected</Pill>}
                          </div>
                          <div style={{ fontSize: 12, color: C.TEXT_MUTED, lineHeight: 1.5 }}>
                            {c.tagline}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
