import Anthropic from '@anthropic-ai/sdk';
import { buildFallbackQuiz } from './fallbackQuiz';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate mode-specific system prompt for Claude based on quiz mode.
 * Different modes have different structure and output expectations.
 */
function getSystemPromptForMode(mode: string, businessType: string, url: string): string {
  const baseInstruction = `You are an expert lead-generation quiz creator. Your job is to create quizzes that help website visitors discover which product or service from a specific business is right for them.

CRITICAL INSTRUCTIONS:
1. You will receive scraped content from a real business website. READ IT CAREFULLY.
2. Your quiz MUST be 100% specific to this exact business and what they sell/offer.
3. Every question must help segment visitors based on the business's actual products, services, or solutions.

BANNED CONTENT (instant failure if included):
- "Squarespace"  -  NEVER mention Squarespace, website building, templates, plugins, or web design unless the business ACTUALLY sells those things
- "journey"  -  do not ask "where are you in your [X] journey"
- Generic personality quiz questions that don't relate to the business
- Questions about the visitor's experience with the business's platform/tools
- Questions about website design, SEO, or marketing unless the business sells those services
- Em dashes (--) - NEVER use em dashes anywhere. Use commas, periods, or hyphens (-) instead
- Vague filler questions like "What is your biggest challenge?" or "What matters most to you?" - every question must reference a SPECIFIC product, service, or use case from the website`;

  if (mode === 'price_calculator') {
    return `${baseInstruction}

PRICE CALCULATOR MODE:
This quiz calculates a dynamic price or cost estimate based on visitor selections.
- Each option in a question has a numeric "value" field (e.g., {"id": "a", "text": "Option A", "value": 100})
- The quiz totals these values to calculate a final price
- Outcomes should explain the calculated price and why they get this pricing
- Return score fields as "value" not "score" for price calculation
- Results should show the calculated total price and breakdown

OUTPUT: Return ONLY valid JSON. No markdown, no backticks, no explanation text.`;
  }

  if (mode === 'service_recommender') {
    return `${baseInstruction}

SERVICE RECOMMENDER MODE:
This quiz recommends specific services with pricing and calls-to-action.
- Outcomes have "price" field (e.g., "$299/month") and "cta_url" field for action links
- Every outcome must recommend a specific service from the business
- Results explain why each service fits the visitor's needs, what it costs, and link to purchase/learn more

OUTPUT: Return ONLY valid JSON. No markdown, no backticks, no explanation text.`;
  }

  if (mode === 'client_qualifier') {
    return `${baseInstruction}

CLIENT QUALIFIER MODE:
This quiz qualifies leads as "qualified" or "nurture" based on score thresholds.
- Outcomes have "type" field that is either "qualified" or "nurture"
- Outcomes have numeric "score_threshold" to determine who gets qualified vs nurture messaging
- "Qualified" outcomes have CTA for immediate purchase/booking
- "Nurture" outcomes have CTA for education/resources to move to qualified stage
- Results messaging differs sharply: qualified gets urgency/action, nurture gets education/value

OUTPUT: Return ONLY valid JSON. No markdown, no backticks, no explanation text.`;
  }

  if (mode === 'segmentation_quiz') {
    return `${baseInstruction}

SEGMENTATION QUIZ MODE:
This quiz segments visitors into behavioral/demographic tags for downstream marketing.
- Outcomes have "tags" array (e.g., ["enterprise", "urgent", "price-sensitive"])
- These tags are used to trigger different email sequences, ads, or content
- The same visitor can have multiple tags (it's not mutually exclusive like other modes)
- Outcomes describe the visitor segment, not a specific product recommendation
- Results show what segment the visitor belongs to and what that means for their journey

OUTPUT: Return ONLY valid JSON. No markdown, no backticks, no explanation text. NEVER use em dashes (--).`;
  }

  // Default: lead_quiz mode
  return `${baseInstruction}

LEAD_QUIZ MODE (default):
This is the standard lead-generation quiz. Every outcome recommends a specific product/service/solution from THIS business.

OUTPUT: Return ONLY valid JSON. No markdown, no backticks, no explanation text. NEVER use em dashes (--).`;
}

/**
 * Generate user prompt for Claude tailored to the quiz mode.
 */
function getUserPromptForMode(
  mode: string,
  siteName: string,
  websiteUrl: string,
  businessSummary: string,
  brandColorPrimary: string
): string {
  const basePrompt = `Create a ${mode} quiz for this business. Read the website content below, then generate a quiz that matches visitors to this business's specific products/services.

BUSINESS: ${siteName}
URL: ${websiteUrl}

${'='.repeat(60)}
WEBSITE CONTENT  -  READ THIS CAREFULLY:
${'='.repeat(60)}
${businessSummary || `Could not scrape the website. Based on the URL "${websiteUrl}" and business name "${siteName}", research what this business likely sells. Create a quiz about their probable products/services. Be specific  -  guess based on the domain name and business name.`}
${'='.repeat(60)}

TASK: Based on the content above, identify what ${siteName} sells or offers. Then create a quiz that:
1. Helps visitors figure out which of ${siteName}'s products/services is right for them
2. Asks about the VISITOR's needs, goals, situation  -  NOT about the business itself
3. Uses language and terminology from the website content`;

  if (mode === 'price_calculator') {
    return `${basePrompt}

Generate exactly 10 questions with 4 options each, and 3-5 outcomes.
CRITICAL: Options must have "value" fields (not "score") representing cost/price numbers.
The quiz sums these values to calculate a final price estimate.

Return this JSON structure:
{
  "title": "What will your [service/product] cost?",
  "description": "Get a personalized price estimate",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question about visitor needs that affects pricing?",
      "subtitle": "Optional context",
      "options": [
        { "id": "a", "text": "Option A (e.g., Basic tier)", "value": 100 },
        { "id": "b", "text": "Option B (e.g., Pro tier)", "value": 250 },
        { "id": "c", "text": "Option C (e.g., Enterprise tier)", "value": 500 },
        { "id": "d", "text": "Option D (e.g., Unsure)", "value": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Your estimated price",
      "description": "Based on your selections, your estimated ${siteName} pricing is...",
      "minScore": 0,
      "maxScore": 500,
      "ctaText": "Get a quote",
      "ctaUrl": ""
    }
  ],
  "leadGate": {
    "headline": "Your price estimate is ready!",
    "subtext": "Enter your email to get a personalized quote",
    "buttonText": "Show my estimate"
  },
  "settings": {
    "primaryColor": "${brandColorPrimary}",
    "showProgressBar": true,
    "requireEmail": true
  }
}`;
  }

  if (mode === 'service_recommender') {
    return `${basePrompt}

Generate exactly 10 questions with 4 options each, and 3-5 service outcomes.
CRITICAL: Each outcome must have "price" field (e.g., "$299/month") and "cta_url" field.

Return this JSON structure:
{
  "title": "Which ${siteName} service is right for you?",
  "description": "Find your perfect match",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question about visitor needs?",
      "subtitle": "Optional context",
      "options": [
        { "id": "a", "text": "Option mapping to service A", "score": 3 },
        { "id": "b", "text": "Option mapping to service B", "score": 2 },
        { "id": "c", "text": "Option mapping to service C", "score": 1 },
        { "id": "d", "text": "Unsure", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Specific service name from ${siteName}",
      "description": "Why this service fits you best",
      "price": "$299/month",
      "cta_url": "https://example.com/service-page",
      "ctaText": "Learn more",
      "minScore": 10,
      "maxScore": 15
    }
  ],
  "leadGate": { "headline": "Your recommendation is ready!", "subtext": "Enter email to see it", "buttonText": "Show my recommendation" },
  "settings": { "primaryColor": "${brandColorPrimary}", "showProgressBar": true, "requireEmail": true }
}`;
  }

  if (mode === 'client_qualifier') {
    return `${basePrompt}

Generate exactly 10 questions with 4 options each, and 2-3 outcomes (qualified, nurture, and optionally another segment).
CRITICAL: Each outcome must have "type" field ("qualified" or "nurture") and "score_threshold" field.

Return this JSON structure:
{
  "title": "Are you ready for ${siteName}?",
  "description": "Let's see if we're a good fit",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question about visitor readiness/needs?",
      "subtitle": "Optional context",
      "options": [
        { "id": "a", "text": "Option indicating qualification", "score": 3 },
        { "id": "b", "text": "Option indicating strong interest", "score": 2 },
        { "id": "c", "text": "Option indicating interest but not ready", "score": 1 },
        { "id": "d", "text": "Option indicating poor fit", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r_qualified",
      "title": "You're a great fit!",
      "type": "qualified",
      "score_threshold": 20,
      "description": "Based on your answers, you're ready to move forward. Let's set up a call.",
      "ctaText": "Book a call",
      "ctaUrl": ""
    },
    {
      "id": "r_nurture",
      "title": "Let's build your foundation",
      "type": "nurture",
      "score_threshold": 0,
      "description": "You're interested but might benefit from more info first. Check out our resources.",
      "ctaText": "Learn more",
      "ctaUrl": ""
    }
  ],
  "leadGate": { "headline": "Let's check compatibility", "subtext": "Enter your email to see your fit", "buttonText": "Show my result" },
  "settings": { "primaryColor": "${brandColorPrimary}", "showProgressBar": true, "requireEmail": true }
}`;
  }

  if (mode === 'segmentation_quiz') {
    return `${basePrompt}

Generate exactly 10 questions with 4 options each, and 3-5 outcomes representing different visitor segments.
CRITICAL: Each outcome must have "tags" array (e.g., ["enterprise", "budget-conscious", "urgent"]).

Return this JSON structure:
{
  "title": "Let's learn about your business",
  "description": "Help us understand your needs",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question about visitor characteristics?",
      "subtitle": "Optional context",
      "options": [
        { "id": "a", "text": "Option A", "score": 3 },
        { "id": "b", "text": "Option B", "score": 2 },
        { "id": "c", "text": "Option C", "score": 1 },
        { "id": "d", "text": "Option D", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Enterprise segment",
      "tags": ["enterprise", "high-budget", "needs-support"],
      "description": "You're an enterprise buyer with specific needs",
      "minScore": 25,
      "maxScore": 30,
      "ctaText": "Talk to sales",
      "ctaUrl": ""
    }
  ],
  "leadGate": { "headline": "Let's get to know you", "subtext": "Enter your email to continue", "buttonText": "Show my segment" },
  "settings": { "primaryColor": "${brandColorPrimary}", "showProgressBar": true, "requireEmail": true }
}`;
  }

  // Default: lead_quiz mode
  return `${basePrompt}
4. Recommends specific products/services from ${siteName} in the outcomes

Generate exactly 10 questions with 4 options each, and 3-5 outcomes. Return this JSON structure:
{
  "title": "Which [specific product/service category from ${siteName}] is right for you?",
  "description": "One line promising personalized recommendation",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question about the visitor's needs that maps to products/services?",
      "subtitle": "Optional context",
      "options": [
        { "id": "a", "text": "Option mapping to product/service A", "score": 3 },
        { "id": "b", "text": "Option mapping to product/service B", "score": 2 },
        { "id": "c", "text": "Option mapping to product/service C", "score": 1 },
        { "id": "d", "text": "Option for unsure visitors", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Specific product/service name from ${siteName}",
      "description": "2-3 sentences explaining why this is the best fit, referencing specific features/benefits from the website.",
      "minScore": 10,
      "maxScore": 15,
      "ctaText": "Explore [product name]",
      "ctaUrl": ""
    }
  ],
  "leadGate": {
    "headline": "Your personalized recommendation is ready!",
    "subtext": "Enter your email to see which ${siteName} solution fits you best",
    "buttonText": "Show my results"
  },
  "settings": {
    "primaryColor": "${brandColorPrimary}",
    "showProgressBar": true,
    "requireEmail": true
  }
}`;
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.search(/[{[]/);
  if (start !== -1) {
    const chunk = text.slice(start);
    const end = Math.max(chunk.lastIndexOf('}'), chunk.lastIndexOf(']'));
    if (end !== -1) return chunk.slice(0, end + 1);
  }
  return text.trim();
}

/**
 * Normalize quiz JSON from Claude into a consistent shape the frontend expects.
 */
function normalizeQuiz(raw: any, ctx?: { websiteUrl?: string; navPages?: { text: string; url: string }[] }): any {
  console.log('[normalizeQuiz] Input keys:', Object.keys(raw || {}));

  // Handle case where AI wraps in { quiz: { ... } }
  const data = raw?.quiz || raw;

  // Normalize questions - handle various AI output formats
  const rawQuestions = data.questions || data.quiz_questions || [];
  console.log(`[normalizeQuiz] Raw questions count: ${rawQuestions.length}`);

  data.title = data.title || data.quiz_title || 'Your Quiz';
  data.description = data.description || data.quiz_description || '';

  // Strip em dashes from any text
  const stripEmDash = (s: string) => s.replace(/\u2014/g, ' - ').replace(/\u2013/g, '-').replace(/\s*--\s*/g, ' - ');

  data.questions = rawQuestions.map((q: any, i: number) => {
    // Handle options as strings OR objects
    const rawOptions = q.options || q.answers || q.choices || [];
    const options = rawOptions.map((o: any, j: number) => {
      if (typeof o === 'string') {
        return { id: String.fromCharCode(97 + j), text: stripEmDash(o), score: 0 };
      }
      return {
        id: o.id || String.fromCharCode(97 + j),
        text: stripEmDash(o.text || o.label || o.answer || String(o)),
        score: o.score ?? o.value ?? o.points ?? 0,
      };
    });

    return {
      id: q.id || `q${i + 1}`,
      type: q.type || 'single',
      text: stripEmDash(q.text || q.question || q.title || ''),
      subtitle: stripEmDash(q.subtitle || q.sub || ''),
      options,
    };
  });

  // Normalize outcomes - handle various AI output formats
  const rawOutcomes = data.outcomes || data.results || data.quiz_outcomes || data.quiz_results || [];
  console.log(`[normalizeQuiz] Raw outcomes count: ${rawOutcomes.length}`);

  // Build a set of real URLs we can validate against. If Claude returns
  // anything NOT in this list, fall back to the best-matching nav page or
  // the website root so CTA clicks never land on a 404.
  const realUrls = new Set<string>();
  let siteOrigin = '';
  if (ctx?.websiteUrl) {
    try { siteOrigin = new URL(ctx.websiteUrl).origin; } catch {}
  }
  if (ctx?.navPages) {
    for (const p of ctx.navPages) realUrls.add(p.url);
  }
  const siteRoot = siteOrigin || ctx?.websiteUrl || '';

  const matchCtaUrl = (rawUrl: string, ctaText: string, outcomeTitle: string): string => {
    const url = (rawUrl || '').trim();
    if (!url) return siteRoot;
    // Absolute URL that's on-site and in our real list - keep it
    if (/^https?:\/\//i.test(url)) {
      if (siteOrigin && url.startsWith(siteOrigin) && realUrls.has(url)) return url;
      // Off-site URL - reject (Claude guessed a URL that may 404)
      // Off-origin and not explicitly scraped - reject
    }
    // Relative URL - absolutize then check
    if (url.startsWith('/') && siteOrigin) {
      const abs = siteOrigin + url;
      if (realUrls.has(abs)) return abs;
    }
    // Try to fuzzy-match by text (ctaText or title) against nav page texts
    const needle = `${ctaText} ${outcomeTitle}`.toLowerCase();
    if (ctx?.navPages?.length) {
      let best: { url: string; score: number } | null = null;
      for (const p of ctx.navPages) {
        const t = (p.text || '').toLowerCase();
        if (!t) continue;
        const words = t.split(/\s+/).filter(w => w.length > 2);
        let score = 0;
        for (const w of words) if (needle.includes(w)) score += w.length;
        if (score > 0 && (!best || score > best.score)) best = { url: p.url, score };
      }
      if (best) return best.url;
    }
    return siteRoot;
  };

  data.outcomes = rawOutcomes.map((r: any, i: number) => {
    const rawCta = r.ctaUrl || r.cta_url || r.url || '';
    const ctaText = stripEmDash(r.ctaText || r.cta_text || r.cta || 'Learn More');
    const title = stripEmDash(r.title || r.name || `Result ${i + 1}`);
    return {
      id: r.id || `r${i + 1}`,
      title,
      description: stripEmDash(r.description || r.text || r.summary || ''),
      minScore: r.minScore ?? r.min_score ?? 0,
      maxScore: r.maxScore ?? r.max_score ?? 100,
      ctaText,
      ctaUrl: ctx ? matchCtaUrl(rawCta, ctaText, title) : rawCta,
    };
  });

  data.results = data.outcomes;

  console.log(`[normalizeQuiz] Final: ${data.questions.length} questions, ${data.outcomes.length} outcomes`);
  return data;
}

async function callClaude(
  websiteUrl: string,
  quizType: string,
  goal: string,
  brandData?: any,
  mode: string = 'lead_quiz'
): Promise<any> {
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();
  const brandColorPrimary = brandData?.colors?.primary || '#000000';

  console.log(`[Claude] Generating ${mode} quiz for: ${siteName} (${websiteUrl})`);
  console.log(`[Claude] Business summary available: ${businessSummary.length} chars`);

  const systemPrompt = getSystemPromptForMode(mode, quizType, websiteUrl);
  const userPrompt = getUserPromptForMode(mode, siteName, websiteUrl, businessSummary, brandColorPrimary);

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  console.log(`[Claude] Response length: ${raw.length} chars`);
  console.log(`[Claude] First 200 chars: ${raw.slice(0, 200)}`);

  try {
    const parsed = JSON.parse(extractJSON(raw));
    const normalized = normalizeQuiz(parsed, {
      websiteUrl,
      navPages: Array.isArray(brandData?.business?.nav_pages) ? brandData.business.nav_pages : [],
    });
    console.log(`[Claude] Quiz title: "${normalized.title}"`);
    console.log(`[Claude] Questions: ${normalized.questions?.length}, Outcomes: ${normalized.outcomes?.length}`);
    return normalized;
  } catch {
    console.error('[Claude] Parse failed, raw:', raw.substring(0, 500));
    throw new Error('Failed to generate quiz. Please try again.');
  }
}

/**
 * Generate 5 onboarding questions asked to the business owner.
 * These questions are tailored to what the scraped business appears to be,
 * so the owner's answers can steer the 10-question visitor quiz.
 */
async function generateOnboardingQuestions(
  websiteUrl: string,
  brandData?: any
): Promise<{ questions: { id: string; text: string; options: string[] }[] }> {
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();

  const systemPrompt = `You generate 5 onboarding questions that a quiz platform asks a BUSINESS OWNER about their own business. The owner's answers will then tailor a visitor-facing lead-generation quiz for their site.

RULES:
- Exactly 5 single-select questions.
- Each question has 3 to 5 short option labels.
- Questions are about the owner's goal, audience, offers, tone, and desired outcome, tailored to this specific business based on the scraped website content.
- Do not ask about Squarespace, templates, or website builders unless that is literally what the business sells.
- Keep question text under 90 characters. Keep option labels under 44 characters.
- Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `BUSINESS: ${siteName}
URL: ${websiteUrl}

WEBSITE CONTENT:
${businessSummary || `No scraped content. Infer from domain ${siteName}.`}

Return this exact JSON structure:
{
  "questions": [
    { "id": "o1", "text": "What is the primary goal of this quiz for your visitors?", "options": ["Capture qualified leads","Recommend the right product","Grow my email list","Segment by intent"] },
    { "id": "o2", "text": "...", "options": ["...","..."] },
    { "id": "o3", "text": "...", "options": ["...","..."] },
    { "id": "o4", "text": "...", "options": ["...","..."] },
    { "id": "o5", "text": "...", "options": ["...","..."] }
  ]
}

Make every question specific to ${siteName}. The first question should confirm the main goal. The others should ask about audience, offers, desired outcome, and tone, phrased for THIS business.`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  try {
    const parsed = JSON.parse(extractJSON(raw));
    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const normalized = questions.slice(0, 5).map((q: any, i: number) => ({
      id: q.id || `o${i + 1}`,
      text: String(q.text || q.question || '').slice(0, 160),
      options: (Array.isArray(q.options) ? q.options : []).slice(0, 5).map((o: any) => typeof o === 'string' ? o : (o?.text || o?.label || '')).filter(Boolean),
    })).filter((q: any) => q.text && q.options.length >= 2);

    if (normalized.length < 5) {
      const fallback = [
        { id: 'o1', text: 'What is the main goal of this quiz?', options: ['Capture qualified leads','Recommend the right product','Grow my email list','Segment by intent'] },
        { id: 'o2', text: 'Who are your typical visitors?', options: ['Small business owners','Consumers','Creators and freelancers','Enterprise teams'] },
        { id: 'o3', text: 'What will visitors get at the end?', options: ['A personalized recommendation','A free resource or download','A tailored plan','A discount or offer'] },
        { id: 'o4', text: 'Which tone best matches your brand?', options: ['Warm and friendly','Confident and expert','Playful and casual','Minimal and direct'] },
        { id: 'o5', text: 'What kind of business do you run?', options: ['Wellness or coaching','E-commerce or product','Service business','SaaS or software','Agency or studio'] },
      ];
      for (let i = normalized.length; i < 5; i++) normalized.push(fallback[i]);
    }
    return { questions: normalized };
  } catch {
    console.error('[Claude] Onboarding parse failed, raw:', raw.slice(0, 400));
    return {
      questions: [
        { id: 'o1', text: 'What is the main goal of this quiz?', options: ['Capture qualified leads','Recommend the right product','Grow my email list','Segment by intent'] },
        { id: 'o2', text: 'Who are your typical visitors?', options: ['Small business owners','Consumers','Creators and freelancers','Enterprise teams'] },
        { id: 'o3', text: 'What will visitors get at the end?', options: ['A personalized recommendation','A free resource or download','A tailored plan','A discount or offer'] },
        { id: 'o4', text: 'Which tone best matches your brand?', options: ['Warm and friendly','Confident and expert','Playful and casual','Minimal and direct'] },
        { id: 'o5', text: 'What kind of business do you run?', options: ['Wellness or coaching','E-commerce or product','Service business','SaaS or software','Agency or studio'] },
      ],
    };
  }
}

/**
 * Generate a 10-question quiz using the scraped brand PLUS the owner's
 * onboarding answers so the quiz is tailored to what the owner actually wants.
 */
async function generateTailoredQuiz(
  websiteUrl: string,
  brandData: any,
  onboarding: { question: string; answer: string }[],
  mode: string = 'lead_quiz'
): Promise<any> {
  const goal = onboarding.find(x => /goal|objective/i.test(x.question))?.answer || 'Generate more leads';
  const businessType = onboarding.find(x => /type|business/i.test(x.question))?.answer || '';
  const audience = onboarding.find(x => /audience/i.test(x.question))?.answer || '';
  const tone = onboarding.find(x => /tone/i.test(x.question))?.answer || 'Professional';
  const keyOffer = onboarding.find(x => /product|service|offer/i.test(x.question))?.answer || '';
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();
  const brandColorPrimary = brandData?.colors?.primary || '#000000';

  // Real scraped pages from the website (text + actual URL). The Claude prompt
  // must pick ctaUrl from this list so outcomes never link to guessed/404 pages.
  const navPages: { text: string; url: string }[] = Array.isArray(brandData?.business?.nav_pages)
    ? brandData.business.nav_pages
    : [];
  const navPagesBlock = navPages.length > 0
    ? navPages.map(p => `- "${p.text}" -> ${p.url}`).join('\n')
    : `- "Home" -> ${websiteUrl}`;

  const onboardingBlock = onboarding.map((o, i) => `${i + 1}. ${o.question}\n   Answer: ${o.answer}`).join('\n');

  const systemPrompt = `You are an expert lead-generation quiz creator for ${siteName}. You create quizzes that help website visitors discover which product, service, or solution is right for them.

CRITICAL RULES:
1. Every question MUST be specific to this exact business and what they sell/offer. Reference REAL product names, service tiers, or categories from the website content.
2. Questions should segment visitors based on the business's actual products and services.
3. Each option has a "score" value (0-3) that maps to outcomes.
4. Outcomes represent the business's real products, services, or recommendations.
5. The tone should be: ${tone}
6. The quiz goal is: ${goal}
7. Target audience: ${audience}
8. NEVER mention Squarespace, website builders, or templates unless the business actually sells those.
9. Return ONLY valid JSON. No markdown, no backticks, no explanation.
10. NEVER use em dashes (--) anywhere in question text or option text. Use commas, periods, or short hyphens instead.
11. NEVER write vague generic questions like "What is your biggest challenge?" or "What matters most to you?" - every single question must reference a SPECIFIC product, feature, service, price tier, or use case directly from the website.
12. For lead generation quizzes: questions should qualify the visitor (budget, timeline, team size, current tools, specific needs) so the business owner gets actionable lead data.
13. Options should be concrete and specific (e.g. "Under $500/month" not "Budget-friendly", "Team of 2-5" not "Small team").
14. The first 2-3 questions should be easy/engaging. The last 2-3 should be more qualifying (budget, timeline, decision stage).`;

  const userPrompt = `BUSINESS: ${siteName}
URL: ${websiteUrl}
BUSINESS TYPE: ${businessType}
KEY OFFER: ${keyOffer}

WEBSITE CONTENT:
${businessSummary.slice(0, 3000) || `Could not scrape. Infer from domain ${siteName}.`}

REAL PAGES ON THIS WEBSITE (you MUST pick ctaUrl from this list - nothing else):
${navPagesBlock}

OWNER'S PREFERENCES:
${onboardingBlock}

Generate a quiz with this EXACT JSON structure:
{
  "title": "Find Your Perfect [Thing] - specific to ${siteName}",
  "description": "Short 1-sentence description of what this quiz helps visitors discover",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Question text here - specific to the business",
      "subtitle": "",
      "options": [
        { "id": "a", "text": "Option text", "score": 2 },
        { "id": "b", "text": "Option text", "score": 1 },
        { "id": "c", "text": "Option text", "score": 3 },
        { "id": "d", "text": "Option text", "score": 0 }
      ]
    }
  ],
  "outcomes": [
    {
      "id": "r1",
      "title": "Outcome title - a real product/service from this business",
      "description": "2-3 sentences explaining why this is the right fit for the visitor based on their answers",
      "minScore": 0,
      "maxScore": 10,
      "ctaText": "Explore [Product Name]",
      "ctaUrl": "https://example.com/relevant-product-page"
    }
  ]
}

REQUIREMENTS:
- Exactly 10 questions, each with exactly 4 options
- 3 to 5 outcomes with non-overlapping score ranges
- Every question and option must reference THIS business's actual offers, product names, or service categories
- Score values: 0 (low fit), 1 (slight fit), 2 (good fit), 3 (best fit)
- Outcomes should map to real products/services/packages from the website
- Each outcome's "ctaUrl" MUST be one of the real URLs listed under REAL PAGES above. Do NOT invent URLs. Do NOT guess paths like /templates or /pricing - if they are not in the list, use the closest matching real URL or fall back to ${websiteUrl}
- Each outcome MUST have a specific "ctaText" like "Browse Templates", "Book a Call", "Shop Now", "Get Started" - not generic "Learn More"
- NEVER use em dashes (--). Use commas or hyphens (-) instead
- Questions 1-3: engaging questions about what the visitor is looking for (reference real products/services)
- Questions 4-7: deeper questions about their specific situation and needs
- Questions 8-10: qualifying questions (budget range, timeline, decision stage) for lead generation
- Option text must be concrete and specific, not abstract. Use real numbers, product names, and service tiers from the website content`;

  // Per product decision (Q5): API failures must NEVER block the user.
  // Claude call + parse are wrapped in a single try; any failure silently
  // returns the prototype-v4 hardcoded fallback quiz with the scraped primary
  // color applied. The user flow continues to Stage 3 without error UI.
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const parsed = JSON.parse(extractJSON(raw));
    return normalizeQuiz(parsed, { websiteUrl, navPages });
  } catch (err: any) {
    console.error(`[Claude] Tailored quiz generation failed for ${siteName}, using fallback quiz. Error:`, err?.message || err);
    return buildFallbackQuiz(brandColorPrimary);
  }
}

/**
 * Process an "Other" free-text answer by matching it to the closest outcome.
 */
async function processOtherAnswer(
  freeText: string,
  availableOutcomes: { id: string; title: string; description?: string }[]
): Promise<{ matched_outcome_id: string; personalised_insight: string }> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: 'You match free-text quiz answers to the best outcome. Respond with ONLY JSON.',
    messages: [{
      role: 'user',
      content: `The user wrote: "${freeText}"\n\nAvailable outcomes:\n${availableOutcomes.map(o => `- ${o.id}: ${o.title}  -  ${o.description || ''}`).join('\n')}\n\nReturn: { "matched_outcome_id": "...", "personalised_insight": "1 sentence of personalized insight" }`,
    }],
  });

  const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  try {
    return JSON.parse(extractJSON(raw));
  } catch {
    return { matched_outcome_id: availableOutcomes[0]?.id ?? '', personalised_insight: '' };
  }
}

/**
 * Analyze scraped website content and extract a concise business profile:
 * business type, target audience, brand tone, and key offer.
 * Used to populate the "AI detected from your site" panel in Step 2.
 */
async function analyzeBusinessProfile(
  websiteUrl: string,
  brandData?: any
): Promise<{ type: string; audience: string; tone: string; key_offer: string }> {
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();

  if (!businessSummary || businessSummary.length < 30) {
    // Not enough content to analyze - return sensible defaults from domain name
    return {
      type: 'Business',
      audience: 'General audience',
      tone: 'Professional',
      key_offer: 'Products and services',
    };
  }

  const systemPrompt = `You analyze a website's scraped content and extract a concise business profile. Return ONLY valid JSON with exactly these 4 fields:
- "type": The business category in 2-5 words (e.g. "Wellness coaching studio", "E-commerce fashion brand", "SaaS analytics platform", "Photography studio", "Marketing agency")
- "audience": The target audience in 2-6 words (e.g. "Health-conscious women 25-45", "Small business owners", "Creative professionals", "Tech startups", "Brides and couples")
- "tone": The brand's communication tone in 1-3 words (e.g. "Warm and friendly", "Bold and confident", "Minimal and elegant", "Playful and casual", "Professional and expert")
- "key_offer": The main product, service, or value proposition in 3-8 words (e.g. "Custom wedding photography packages", "AI-powered analytics dashboard", "Handmade organic skincare", "1-on-1 business coaching", "Web design for creators")

RULES:
- Be specific to THIS business. Never say generic things like "Various services" or "Products".
- Infer from the actual content: headings, paragraphs, meta descriptions, navigation, CTAs.
- Keep each value short and punchy. These appear as UI tags.
- Return ONLY the JSON object. No markdown, no backticks, no explanation.`;

  const userPrompt = `WEBSITE: ${siteName}
URL: ${websiteUrl}

SCRAPED CONTENT:
${businessSummary.slice(0, 2500)}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const parsed = JSON.parse(extractJSON(raw));
    return {
      type: String(parsed.type || 'Business').slice(0, 60),
      audience: String(parsed.audience || 'General audience').slice(0, 60),
      tone: String(parsed.tone || 'Professional').slice(0, 40),
      key_offer: String(parsed.key_offer || 'Products and services').slice(0, 80),
    };
  } catch (err: any) {
    console.error('[analyzeBusinessProfile] AI analysis failed:', err.message);
    return {
      type: 'Business',
      audience: 'General audience',
      tone: 'Professional',
      key_offer: 'Products and services',
    };
  }
}

async function suggestQuizIdeas(
  websiteUrl: string,
  brandData?: any,
  profile?: { type?: string; audience?: string; tone?: string; key_offer?: string }
): Promise<string[]> {
  const businessSummary = brandData?.business?.summary || '';
  const siteName = brandData?.site_name || (() => { try { return new URL(websiteUrl).hostname; } catch { return websiteUrl; } })();
  if (!businessSummary || businessSummary.length < 30) {
    return [];
  }
  const systemPrompt = `You suggest 4 short, concrete quiz TOPICS for a specific business. Each topic is a one-line angle that a lead-generation quiz could be built around.

RULES:
- Return ONLY valid JSON: {"ideas": ["...", "...", "...", "..."]}
- Exactly 4 ideas. Each 6-12 words. No punctuation at the end.
- Each idea must be SPECIFIC to this business - reference what they actually sell, offer, or teach.
- Mix angles: one diagnostic (e.g. "What is your X style"), one matchmaker (e.g. "Which X is right for you"), one readiness (e.g. "Are you ready for X"), one persona (e.g. "What type of X are you").
- Do NOT include the business name in the idea.
- No markdown, no backticks, no explanation outside JSON.`;
  const profileLine = profile ? `BUSINESS: ${profile.type || ''} | AUDIENCE: ${profile.audience || ''} | OFFER: ${profile.key_offer || ''}` : '';
  const userPrompt = `WEBSITE: ${siteName}
URL: ${websiteUrl}
${profileLine}
SCRAPED CONTENT:
${businessSummary.slice(0, 2000)}`;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const parsed = JSON.parse(extractJSON(raw));
    const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas : [];
    return ideas
      .map((s: any) => String(s || '').trim())
      .filter((s: string) => s.length >= 4 && s.length <= 120)
      .slice(0, 4);
  } catch (err: any) {
    console.error('[suggestQuizIdeas] AI suggestion failed:', err.message);
    return [];
  }
}

/**
 * Generate AI email subject line and body for a post-quiz follow-up email.
 * Takes quiz context (outcome, quiz title, business info) and returns
 * a compelling subject + personalized body with merge tags.
 */
async function generateEmailContent(
  quizTitle: string,
  outcomeName: string,
  outcomeDescription: string,
  businessName: string,
  fields: ('subject' | 'body')[] = ['subject', 'body']
): Promise<{ subject: string; body: string }> {
  const wantSubject = fields.includes('subject');
  const wantBody = fields.includes('body');

  const systemPrompt = `You write high-converting follow-up emails for quiz results. The email is sent immediately after someone completes a quiz and gets a specific outcome.

RULES:
- Subject line: 5-10 words, curiosity-driven, references the outcome. No clickbait. No ALL CAPS.
- Body: 3-5 short paragraphs of HTML. Warm, helpful tone. Reference the quiz result by name.
- Use these merge tags naturally: {{first_name}} (recipient name), {{outcome_name}} (their result), {{quiz_name}} (quiz title).
- Body should acknowledge their result, give a brief insight, and lead toward the CTA.
- Do NOT include a CTA button in the body - the platform adds that separately.
- Do NOT include subject/from/unsubscribe in the body - just the email content paragraphs.
- Do NOT use em dashes. Use commas, periods, or " - " instead.
- Return ONLY valid JSON. No markdown, no backticks.`;

  const userPrompt = `BUSINESS: ${businessName}
QUIZ: "${quizTitle}"
OUTCOME: "${outcomeName}"
OUTCOME DESCRIPTION: ${outcomeDescription || 'N/A'}

Return this JSON:
{
  ${wantSubject ? '"subject": "Your compelling subject line here",' : ''}
  ${wantBody ? '"body": "<p>Paragraph 1...</p><p>Paragraph 2...</p><p>Paragraph 3...</p>"' : ''}
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const parsed = JSON.parse(extractJSON(raw));
    return {
      subject: String(parsed.subject || '').slice(0, 200),
      body: String(parsed.body || '').slice(0, 5000),
    };
  } catch (err: any) {
    console.error('[generateEmailContent] AI generation failed:', err.message);
    return {
      subject: `Your ${outcomeName} result from ${quizTitle}`,
      body: `<p>Hi {{first_name}},</p><p>Thanks for completing ${quizTitle}. Your result was {{outcome_name}}.</p><p>We put together some next steps based on your answers.</p>`,
    };
  }
}

export { processOtherAnswer, generateOnboardingQuestions, generateTailoredQuiz, analyzeBusinessProfile, suggestQuizIdeas, generateEmailContent };
export const generateQuizWithClaude = callClaude;
export const generateQuiz = callClaude;
export const generateQuizContent = callClaude;
export default callClaude;
