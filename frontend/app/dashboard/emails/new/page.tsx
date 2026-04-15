'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign, sendCampaign } from '@/lib/emails';

export default function NewCampaignPage() {
  const r = useRouter();
  const [name,setName]=useState('');
  const [subject,setSubject]=useState('');
  const [fromName,setFromName]=useState('');
  const [fromEmail,setFromEmail]=useState('');
  const [html,setHtml]=useState('<p>Hi {{firstName}},</p><p>Thanks for taking the quiz.</p>');
  const [recipients,setRecipients]=useState('');
  const [saving,setSaving]=useState(false);
  const [result,setResult]=useState<any>(null);

  async function saveDraft() {
    setSaving(true);
    try {
      await createCampaign({ name, subject, from_name: fromName, from_email: fromEmail, html } as any);
      r.push(`/dashboard/emails`);
    } finally { setSaving(false); }
  }
  async function sendNow() {
    setSaving(true);
    try {
      const c = await createCampaign({ name, subject, from_name: fromName, from_email: fromEmail, html } as any);
      const list = recipients.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
      const res = await sendCampaign(c.id, list);
      setResult(res);
    } finally { setSaving(false); }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">New campaign</h1>
      <div className="space-y-4">
        <input className="w-full bg-gray-900 rounded p-3" placeholder="Internal name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full bg-gray-900 rounded p-3" placeholder="Subject line" value={subject} onChange={e=>setSubject(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="bg-gray-900 rounded p-3" placeholder="From name" value={fromName} onChange={e=>setFromName(e.target.value)} />
          <input className="bg-gray-900 rounded p-3" placeholder="From email (verified domain)" value={fromEmail} onChange={e=>setFromEmail(e.target.value)} />
        </div>
        <textarea className="w-full bg-gray-900 rounded p-3 h-48 font-mono text-sm" value={html} onChange={e=>setHtml(e.target.value)} />
        <textarea className="w-full bg-gray-900 rounded p-3 h-24" placeholder="Recipient emails (comma or newline separated)" value={recipients} onChange={e=>setRecipients(e.target.value)} />
        <div className="flex gap-3">
          <button disabled={saving} onClick={saveDraft} className="px-4 py-2 rounded-full border border-gray-700">Save draft</button>
          <button disabled={saving||!recipients} onClick={sendNow} className="px-4 py-2 rounded-full bg-lime-300 text-black font-semibold">Send now</button>
        </div>
        {result && (
          <div className="rounded border border-gray-700 p-4 text-sm">
            Sent: {result.sent} · Skipped: {result.skipped}
            {result.skipped > 0 && <span className="text-yellow-400"> (quota reached)</span>}
          </div>
        )}
      </div>
    </div>
  );
}
