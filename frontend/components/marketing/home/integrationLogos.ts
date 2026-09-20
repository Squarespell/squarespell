export interface IntegrationLogo {
  name: string;
  logo: string;
}

// Listed in the current pricing catalog (lib/planCatalog.ts) as included with Pro.
export const CATALOG_INTEGRATIONS: IntegrationLogo[] = [
  { name: 'Mailchimp', logo: 'https://cdn.simpleicons.org/mailchimp/111111' },
  { name: 'Klaviyo', logo: 'https://www.google.com/s2/favicons?domain=klaviyo.com&sz=128' },
  { name: 'ConvertKit', logo: 'https://www.google.com/s2/favicons?domain=kit.com&sz=128' },
  { name: 'HubSpot', logo: 'https://cdn.simpleicons.org/hubspot/FF7A59' },
  { name: 'Google Sheets', logo: 'https://cdn.simpleicons.org/googlesheets/34A853' },
  { name: 'Zapier and webhooks', logo: 'https://cdn.simpleicons.org/zapier/FF4F00' },
];

// Backend services exist for these (backend/src/services/integrations/) but each
// must be tested end to end before it is described as generally available.
export const UNVERIFIED_INTEGRATIONS: IntegrationLogo[] = [
  { name: 'ActiveCampaign', logo: 'https://www.google.com/s2/favicons?domain=activecampaign.com&sz=128' },
  { name: 'Calendly', logo: 'https://cdn.simpleicons.org/calendly/006BFF' },
  { name: 'Acuity Scheduling', logo: 'https://www.google.com/s2/favicons?domain=acuityscheduling.com&sz=128' },
];
