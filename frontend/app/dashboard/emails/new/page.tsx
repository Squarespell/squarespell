'use client';
import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardShell } from '../../_components/DashboardShell';import { PageHeader } from '../../_components/PageShell';
import { useDashboardAuth } from '../../_components/useDashboardAuth';
import { DASHBOARD_COLORS as C } from '../../_components/dashboardColors';
import {
  createCampaign, updateCampaign, sendCampaign, previewRecipients, testSendCampaign,
  CampaignMode,
} from '../../../../lib/emails';
import { Stepper, StepKey } from './_components/Stepper';
import { AudienceStep, AudienceState } from './_steps/AudienceStep';
import { DesignStep, DesignState } from './_steps/DesignStep';
import { ReviewStep } from './_steps/ReviewStep';
import { EMAIL_TEMPLATES } from './_steps/templates';
import { EMAIL_TEMPLATES as BLOCK_TEMPLATES } from '../../../../lib/email/templates';
import { DEFAULT_BRAND_KIT } from '../../../../lib/email/brandKit';
import { SAMPLE_CONTEXT } from '../../../../lib/email/mergeContext';
import { renderBlocks } from '../../../../lib/email/renderBlocks';

function NewCampaignPageInner() {
  const { status } = useDashboardAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = searchParams.get('template');
  const [step, setStep] = useState<StepKey>('audience');
  const [audience, setAudience] = useState<AudienceState>({
    sourceKind: 'quiz', sourceQuizId: '', filters: {}, manualRecipients: '',
  });

  // If ?template=<id> is in the URL, look up from the block-based gallery
  const blockTpl = useMemo(() => {
    if (!templateParam) return null;
    return BLOCK_TEMPLATES.find(function (t) { return t.id === templateParam; }) || null;
  }, [templateParam]);

  const defaultTpl = EMAIL_TEMPLATES[0];
  const [design, setDesign] = useState<DesignState>(() => {
    if (blockTpl) {
      const html = renderBlocks(blockTpl.blocks, DEFAULT_BRAND_KIT, SAMPLE_CONTEXT, {
        preheader: blockTpl.defaultPreheader,
      });
      return {
        templateId: blockTpl.id,
        subject: blockTpl.defaultSubject,
        html,
        fromName: '',
        fromEmail: '',
        blocks: blockTpl.blocks,
      };
    }
    return {
      templateId: defaultTpl.id, subject: defaultTpl.subjectSuggestion,
      html: defaultTpl.html, fromName: '', fromEmail: '',
    };
  });
  const [mode, setMode] = useState<CampaignMode>('blast');
  const [recipientCount, setRecipientCount] = useState(0);
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Keep recipient count in sync for the review step
  useEffect(() => {
    if (audience.sourceKind === 'quiz' && audience.sourceQuizId) {
      previewRecipients(audience.sourceQuizId, audience.filters)
        .then(r => setRecipientCount(r.count)).catch(() => setRecipientCount(0));
    } else if (audience.sourceKind === 'manual') {
      setRecipientCount(
        audience.manualRecipients.split(/[\s,;\n]+/).map(s => s.trim()).filter(s => s.includes('@')).length
      );
    } else setRecipientCount(0);
  }, [audience]);

  if (status === 'loading') return <DashboardShell><div style={{ padding: 40, color: C.TEXT_SUBTLE }}>Loading…</div></DashboardShell>;

  const saveOrSend = async (send: boolean) => {
    setSending(true); setResult(null);
    try {
      let campaign: any;
      if (draftId) {
        campaign = { id: draftId };
      } else {
        campaign = await createCampaign({
          name: name || design.subject || 'Untitled',
          subject: design.subject,
          from_name: design.fromName,
          from_email: design.fromEmail,
          html: design.html,
          mode,
          source_quiz_id: audience.sourceKind === 'quiz' ? audience.sourceQuizId : undefined,
          source_filters: audience.sourceKind === 'quiz' ? audience.filters : undefined,
        } as any);
        setDraftId(campaign.id);
      }
      if (!send) { router.push(`/dashboard/emails/${campaign.id}`); return; }
      const manualList = audience.sourceKind === 'manual'
        ? audience.manualRecipients.split(/[\s,;\n]+/).map(s => s.trim()).filter(s => s.includes('@'))
        : undefined;
      const r = await sendCampaign(campaign.id, manualList);
      setResult(r);
      setTimeout(() => router.push(`/dashboard/emails/${campaign.id}`), 1500);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setSending(false);
    }
  };

  const [draftId, setDraftId] = useState<string | null>(null);

  const testSend = async (to: string) => {
    let id = draftId;
    if (!id) {
      const draft = await createCampaign({
        name: name || design.subject || 'Untitled',
        subject: design.subject,
        from_name: design.fromName, from_email: design.fromEmail, html: design.html,
        mode, source_quiz_id: audience.sourceKind === 'quiz' ? audience.sourceQuizId : undefined,
        source_filters: audience.sourceKind === 'quiz' ? audience.filters : undefined,
      } as any);
      id = draft.id;
      setDraftId(id);
    }
    await testSendCampaign(id, to);
  };

  return (
    <DashboardShell>
      <PageHeader
        title="New campaign"
        subtitle="Audience → Design → Review. Send a test before going live."
      />
      <Stepper current={step} onJump={setStep} />

      {step === 'audience' && (
        <AudienceStep
          state={audience}
          setState={u => setAudience(s => ({ ...s, ...u }))}
          onNext={() => setStep('design')}
        />
      )}
      {step === 'design' && (
        <DesignStep
          state={design}
          setState={u => setDesign(s => ({ ...s, ...u }))}
          onNext={() => setStep('review')}
          onBack={() => setStep('audience')}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          audience={audience} design={design}
          mode={mode} setMode={setMode}
          recipientCount={recipientCount}
          onBack={() => setStep('design')}
          onSend={() => saveOrSend(true)}
          onSchedule={async (scheduledAt: string) => {
            setSending(true); setResult(null);
            try {
              let id = draftId;
              if (!id) {
                const draft = await createCampaign({
                  name: name || design.subject || 'Untitled',
                  subject: design.subject,
                  from_name: design.fromName, from_email: design.fromEmail, html: design.html,
                  mode, source_quiz_id: audience.sourceKind === 'quiz' ? audience.sourceQuizId : undefined,
                  source_filters: audience.sourceKind === 'quiz' ? audience.filters : undefined,
                } as any);
                id = draft.id;
                setDraftId(id);
              }
              await updateCampaign(id, { scheduled_at: scheduledAt, status: 'scheduled' } as any);
              setResult({ scheduled: true, scheduledAt });
              setTimeout(() => router.push(`/dashboard/emails/${id}`), 1500);
            } catch (e: any) {
              setResult({ error: e.message });
            } finally {
              setSending(false);
            }
          }}
          onSaveDraft={() => saveOrSend(false)}
          onTestSend={testSend}
          sending={sending} result={result}
        />
      )}
    </DashboardShell>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<DashboardShell><div style={{ padding: 40, color: C.TEXT_SUBTLE }}>Loading...</div></DashboardShell>}>
      <NewCampaignPageInner />
    </Suspense>
  );
}
