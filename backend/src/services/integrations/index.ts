import { addMailchimpContact } from './mailchimp';
import { addKlaviyoContact } from './klaviyo';
import { addConvertkitSubscriber } from './convertkit';
import { addActivecampaignContact } from './activecampaign';
import { addHubspotContact } from './hubspot';
import { prefillAcuityLink, checkAcuityBooking } from './acuity';
import { prefillCalendlyLink, checkCalendlyBooking } from './calendly';

export interface Integration {
  type: string;
  config: Record<string, any>;
}

export interface Lead {
  email: string;
  firstName?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export async function pushLeadToIntegration(
  integration: Integration,
  lead: Lead
): Promise<{ success: boolean; error?: string }> {
  try {
    const { type, config } = integration;

    switch (type) {
      case 'mailchimp':
        if (!config.apiKey || !config.listId) {
          return { success: false, error: 'Missing Mailchimp API key or list ID' };
        }
        return await addMailchimpContact(
          config.apiKey,
          config.listId,
          lead.email,
          lead.firstName || '',
          lead.tags,
          lead.metadata
        );

      case 'klaviyo':
        if (!config.apiKey || !config.listId) {
          return { success: false, error: 'Missing Klaviyo API key or list ID' };
        }
        return await addKlaviyoContact(
          config.apiKey,
          config.listId,
          lead.email,
          lead.firstName || '',
          lead.tags,
          lead.metadata
        );

      case 'convertkit':
        if (!config.apiKey || !config.formId) {
          return { success: false, error: 'Missing ConvertKit API key or form ID' };
        }
        return await addConvertkitSubscriber(
          config.apiKey,
          config.formId,
          lead.email,
          lead.firstName || '',
          lead.tags,
          lead.metadata
        );

      case 'activecampaign':
        if (!config.apiKey || !config.accountUrl) {
          return { success: false, error: 'Missing ActiveCampaign API key or account URL' };
        }
        return await addActivecampaignContact(
          config.apiKey,
          config.accountUrl,
          lead.email,
          lead.firstName || '',
          lead.tags,
          lead.metadata
        );

      case 'hubspot':
        if (!config.accessToken) {
          return { success: false, error: 'Missing HubSpot access token' };
        }
        return await addHubspotContact(
          config.accessToken,
          lead.email,
          lead.firstName || '',
          lead.tags,
          lead.metadata
        );

      case 'acuity':
        if (!config.apiKey) {
          return { success: false, error: 'Missing Acuity API key' };
        }
        // For Acuity, we check if a booking exists for this email
        const acuityResult = await checkAcuityBooking(config.apiKey, lead.email);
        if (!acuityResult.success) {
          return { success: false, error: acuityResult.error };
        }
        // Store booking status in metadata for reference
        return {
          success: true,
          ...(acuityResult.hasBooking && { bookingConfirmed: true }),
        };

      case 'calendly':
        if (!config.apiKey) {
          return { success: false, error: 'Missing Calendly API key' };
        }
        // For Calendly, we check if a booking exists for this email
        const calendlyResult = await checkCalendlyBooking(config.apiKey, lead.email);
        if (!calendlyResult.success) {
          return { success: false, error: calendlyResult.error };
        }
        // Store booking status in metadata for reference
        return {
          success: true,
          ...(calendlyResult.hasBooking && { bookingConfirmed: true }),
        };

      default:
        return { success: false, error: `Unsupported integration type: ${type}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Integration push failed' };
  }
}
