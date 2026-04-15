import { api } from './api';
export type Campaign = {
  id: string; name: string; subject: string;
  from_name: string; from_email: string; html: string;
  status: 'draft'|'scheduled'|'sending'|'sent'|'failed';
  created_at: string;
};
export async function listCampaigns(): Promise<Campaign[]> {
  return (await api.get('/emails/campaigns')).data;
}
export async function createCampaign(p: Partial<Campaign>): Promise<Campaign> {
  return (await api.post('/emails/campaigns', p)).data;
}
export async function sendCampaign(id: string, recipients: string[]) {
  return (await api.post(`/emails/campaigns/${id}/send`, { recipients })).data;
}
export async function getQuota(): Promise<{used:number;cap:number;plan:string}> {
  return (await api.get('/emails/quota')).data;
}
