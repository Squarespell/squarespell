/**
 * Pricing and referral copy must only promise what the product does today.
 * Not live (2026-10-02): Zapier (router not mounted), HubSpot (connector never dispatched), public API access
 * (API-key router not mounted), per-seat pricing (no seat cap or seat billing), referral rewards (nothing tracks
 * sign-ups, converts referrals or grants credit). When one ships, update the copy and this test together.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PLANS } from '../planCatalog';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/referrals', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/app/dashboard/_components/DashboardShell', () => ({ DashboardShell: ({ children }: any) => <div>{children}</div>, DASHBOARD_COLORS: {} }));

import ReferralsPage from '@/app/dashboard/referrals/page';

const NOT_LIVE = /zapier|hubspot|api access|\/seat|per seat|seats? included/i;
const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../..', p), 'utf8');

describe('pricing copy matches what is live', () => {
  it('no plan lists Zapier, HubSpot, API access or per-seat pricing as included', () => {
    for (const plan of PLANS) {
      for (const f of plan.included) expect(f, plan.key).not.toMatch(NOT_LIVE);
      expect(plan.desc, plan.key).not.toMatch(NOT_LIVE);
    }
  });
  it('the pricing page comparison table and FAQ do not sell them either', () => {
    const page = read('app/pricing/page.tsx');
    expect(page).not.toMatch(/label: '(Zapier|HubSpot|API access)'/);
    expect(page).not.toMatch(/3 included|\$5\/seat/);
    // The FAQ may say Zapier/HubSpot are planned, but never that a plan includes them.
    expect(page).not.toMatch(/includes integrations with[^.]*(Zapier|HubSpot)/);
  });
  it('the home page integration logos are the live integrations', () => {
    const section = read('components/marketing/home/IntegrationsSection.tsx');
    expect(section).not.toMatch(/name: '(Zapier|HubSpot)'/);
    expect(read('components/marketing/home/FeatureBento.tsx')).not.toMatch(/API access|Referral tracking/);
  });
});

describe('referrals', () => {
  it('the referrals page promises no reward and is not in the navigation', () => {
    render(<ReferralsPage />);
    expect(screen.getByText('Referrals are not available yet')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\$25|account credit|earn/i);
    for (const f of ['app/dashboard/_components/DashboardShell.tsx', 'app/dashboard/_components/PageShell.tsx', 'app/dashboard/_components/CommandPalette.tsx']) {
      expect(read(f), f).not.toMatch(/href[:=] ?['"]\/dashboard\/referrals['"]|link\('\/dashboard\/referrals'/);
    }
  });
});
