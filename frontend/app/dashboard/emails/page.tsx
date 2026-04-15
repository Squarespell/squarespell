'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listCampaigns, getQuota, type Campaign } from '@/lib/emails';

export default function EmailsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [quota, setQuota] = useState<{used:number;cap:number;plan:string}|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([listCampaigns(), getQuota().catch(()=>null)])
      .then(([c,q]) => { setItems(c); setQuota(q); })
      .finally(() => setLoading(false));
  }, []);
  const pct = quota ? Math.min(100, Math.round((quota.used/quota.cap)*100)) : 0;
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Emails</h1>
          <p className="text-gray-400">Send campaigns and automations to your leads.</p>
        </div>
        <Link href="/dashboard/emails/new" className="px-4 py-2 rounded-full bg-lime-300 text-black font-semibold">+ New campaign</Link>
      </div>
      {quota && (
        <div className="mb-6 rounded-xl border border-gray-800 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Monthly email usage ({quota.plan})</span>
            <span>{quota.used.toLocaleString()} / {quota.cap.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-lime-300" style={{width:`${pct}%`}} />
          </div>
        </div>
      )}
      {loading ? <div className="text-gray-500">Loading…</div> :
        items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <p className="text-gray-400 mb-4">No campaigns yet.</p>
            <Link href="/dashboard/emails/new" className="text-lime-300 underline">Create your first campaign</Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900 text-left text-xs uppercase text-gray-400">
                <tr><th className="p-3">Name</th><th className="p-3">Subject</th><th className="p-3">Status</th><th className="p-3">Created</th></tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-gray-300">{c.subject}</td>
                    <td className="p-3"><span className="text-xs uppercase">{c.status}</span></td>
                    <td className="p-3 text-gray-500 text-sm">{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
