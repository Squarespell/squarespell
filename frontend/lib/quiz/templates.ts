/**
 * Quiz templates — pre-built, conversion-optimized quiz structures
 * tailored to the most common Squarespace user segments.
 *
 * Each template contains full quiz content: questions with realistic text,
 * scored options, outcomes with CTA copy, and a lead gate. Users pick a
 * template and customize it in the block editor.
 *
 * Template content is modeled on proven patterns from top quiz funnels
 * (Sephora, Warby Parker, Function of Beauty, ScoreApp, etc.)
 *
 * Adding a template:
 *   1. Add entry here with full block data
 *   2. Keep questions at 5-7 for optimal completion rate
 *   3. Score options 0-5 and map outcomes to score ranges
 *   4. Include a lead gate before results
 */

import { QuizBlock, uid } from './blocks';

export interface QuizTemplateData {
  id: string;
  category: string;
  name: string;
  description: string;
  /** Who this template is built for */
  audience: string;
  /** What makes this template convert */
  whyItWorks: string;
  /** SVG path for icon (stroke) */
  iconPath: string;
  /** Tags for filtering */
  tags: string[];
  /** Pre-built blocks */
  blocks: () => QuizBlock[];
}

/* ------------------------------------------------------------------ */
/*  1. PRODUCT RECOMMENDATION — Ecommerce stores                      */
/* ------------------------------------------------------------------ */

function productRecommendationBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What are you shopping for today?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Something for myself', score: 1 },
        { id: uid(), text: 'A gift for someone', score: 2 },
        { id: uid(), text: 'Restocking a favorite', score: 3 },
        { id: uid(), text: 'Just browsing for ideas', score: 0 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What matters most to you when choosing a product?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Quality and durability', score: 4 },
        { id: uid(), text: 'Design and aesthetics', score: 3 },
        { id: uid(), text: 'Value for money', score: 2 },
        { id: uid(), text: 'Brand reputation', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your typical budget range?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $50', score: 1 },
        { id: uid(), text: '$50 - $100', score: 2 },
        { id: uid(), text: '$100 - $200', score: 3 },
        { id: uid(), text: '$200+', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which style resonates with you?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Clean and minimal', score: 4 },
        { id: uid(), text: 'Bold and expressive', score: 3 },
        { id: uid(), text: 'Classic and timeless', score: 2 },
        { id: uid(), text: 'Trendy and modern', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How soon do you need this?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'As soon as possible', score: 3 },
        { id: uid(), text: 'Within the next week', score: 2 },
        { id: uid(), text: 'No rush, just exploring', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized picks are ready',
      subtext: 'Enter your email to see your curated recommendations and get 10% off your first order.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my recommendations',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Curated Collection',
      description: 'Based on your answers, you appreciate quality craftsmanship and clean design. We recommend starting with our bestselling collection — pieces that are built to last and look effortlessly put together.',
      ctaText: 'Shop the Collection', ctaUrl: '/shop/curated',
      minScore: 12, maxScore: 20, shareEnabled: true,
      shareText: 'I just found my perfect product match!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Essentials Edit',
      description: 'You know what you like and you want great value without compromising on style. Our Essentials range gives you exactly that — thoughtfully designed pieces at accessible prices.',
      ctaText: 'Shop Essentials', ctaUrl: '/shop/essentials',
      minScore: 6, maxScore: 11, shareEnabled: true,
      shareText: 'Found my perfect essentials!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Discovery Box',
      description: 'You are open to exploring and finding something unexpected. Our Discovery Box is perfect for you — a curated surprise selection based on what we think you will love.',
      ctaText: 'Explore the Discovery Box', ctaUrl: '/shop/discovery',
      minScore: 0, maxScore: 5, shareEnabled: true,
      shareText: 'Just discovered something amazing!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  2. SKINCARE ROUTINE FINDER — Beauty & wellness brands              */
/* ------------------------------------------------------------------ */

function skincareRoutineBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How would you describe your skin type?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Dry — tight, flaky, sometimes rough', score: 1 },
        { id: uid(), text: 'Oily — shiny by midday, visible pores', score: 2 },
        { id: uid(), text: 'Combination — oily T-zone, dry cheeks', score: 3 },
        { id: uid(), text: 'Sensitive — reacts easily, often red', score: 4 },
        { id: uid(), text: 'Normal — balanced, minimal issues', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest skin concern right now?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Acne and breakouts', score: 1 },
        { id: uid(), text: 'Fine lines and wrinkles', score: 2 },
        { id: uid(), text: 'Dark spots and uneven tone', score: 3 },
        { id: uid(), text: 'Dullness and dehydration', score: 4 },
        { id: uid(), text: 'Redness and irritation', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How many steps is your current routine?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I barely wash my face', score: 1 },
        { id: uid(), text: '2-3 steps (cleanser, moisturizer)', score: 2 },
        { id: uid(), text: '4-5 steps (includes serums)', score: 3 },
        { id: uid(), text: '6+ steps (full routine)', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How does your skin feel by the end of the day?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Tight and uncomfortable', score: 1 },
        { id: uid(), text: 'Oily and shiny', score: 2 },
        { id: uid(), text: 'Pretty much the same as morning', score: 4 },
        { id: uid(), text: 'Dry patches appearing', score: 3 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What ingredients do you prefer?',
      questionStyle: 'cards', questionType: 'multiple',
      options: [
        { id: uid(), text: 'Natural and organic only', score: 3 },
        { id: uid(), text: 'Science-backed actives (retinol, AHAs)', score: 2 },
        { id: uid(), text: 'Fragrance-free and gentle', score: 4 },
        { id: uid(), text: 'No preference, just results', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How much time can you dedicate to skincare daily?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under 2 minutes', score: 1 },
        { id: uid(), text: '2-5 minutes', score: 2 },
        { id: uid(), text: '5-10 minutes', score: 3 },
        { id: uid(), text: 'I enjoy a full ritual', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your custom routine is ready',
      subtext: 'We have built a personalized skincare routine based on your unique skin profile. Enter your email to see your results and receive expert tips.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Reveal my routine',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Hydration Reset',
      description: 'Your skin is craving moisture and gentle care. We recommend starting with our hydrating cleanser, hyaluronic acid serum, and barrier repair cream. This 3-step routine will restore your moisture balance within 2 weeks.',
      ctaText: 'Shop the Hydration Kit', ctaUrl: '/shop/hydration',
      minScore: 14, maxScore: 25, shareEnabled: true,
      shareText: 'Just found my perfect skincare routine!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Clarity Regimen',
      description: 'Your skin needs targeted treatment for breakouts and excess oil. Our clarity system uses salicylic acid and niacinamide to clear pores without stripping your skin. Most customers see visible improvement in 10 days.',
      ctaText: 'Shop the Clarity Kit', ctaUrl: '/shop/clarity',
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: 'Found the skincare routine my skin has been waiting for!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Radiance Boost',
      description: 'Your skin is in good shape but could use a glow-up. Our radiance collection features vitamin C serum and gentle exfoliants to brighten your complexion and even out your tone. Simple enough for any schedule.',
      ctaText: 'Shop the Radiance Kit', ctaUrl: '/shop/radiance',
      minScore: 0, maxScore: 6, shareEnabled: true,
      shareText: 'My custom skincare routine is here!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  3. SERVICE MATCHER — Coaches, consultants, agencies                */
/* ------------------------------------------------------------------ */

function serviceMatcherBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What best describes where you are right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Just getting started — I need a plan', score: 1 },
        { id: uid(), text: 'Growing but hitting a ceiling', score: 2 },
        { id: uid(), text: 'Established but ready to scale', score: 3 },
        { id: uid(), text: 'Successful but feeling overwhelmed', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest challenge right now?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Getting consistent clients', score: 1 },
        { id: uid(), text: 'Managing my time and energy', score: 2 },
        { id: uid(), text: 'Building systems that run without me', score: 3 },
        { id: uid(), text: 'Standing out in a crowded market', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What kind of support would help you most?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Step-by-step guidance and accountability', score: 1 },
        { id: uid(), text: 'Strategy sessions to solve specific problems', score: 2 },
        { id: uid(), text: 'Done-for-you implementation', score: 4 },
        { id: uid(), text: 'A community of peers to learn alongside', score: 3 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your current monthly revenue?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $5,000', score: 1 },
        { id: uid(), text: '$5,000 - $15,000', score: 2 },
        { id: uid(), text: '$15,000 - $50,000', score: 3 },
        { id: uid(), text: '$50,000+', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How quickly are you looking to see results?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Within 30 days', score: 4 },
        { id: uid(), text: 'Within 90 days', score: 3 },
        { id: uid(), text: 'Over the next 6 months', score: 2 },
        { id: uid(), text: 'No rush, building for the long term', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized recommendation is ready',
      subtext: 'Based on your answers, we have identified the perfect service tier for where you are. Enter your email to see your match and book a free consultation.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'Full name', required: true, placeholder: 'Your name' },
      ],
      buttonLabel: 'See my recommendation',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'VIP Intensive',
      description: 'You are ready for high-touch, accelerated support. Our VIP Intensive gives you a dedicated strategist, custom implementation, and weekly check-ins. This is for established businesses ready to break through to the next level fast.',
      ctaText: 'Book a VIP Discovery Call', ctaUrl: '/services/vip',
      minScore: 14, maxScore: 20, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Growth Program',
      description: 'You have momentum but need strategic direction. Our Growth Program combines monthly strategy sessions with templates, frameworks, and a private community. Built for businesses doing $5K-$50K/month who want to scale smarter.',
      ctaText: 'Learn About the Growth Program', ctaUrl: '/services/growth',
      minScore: 8, maxScore: 13, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Foundations Course',
      description: 'You are building from the ground up and need a proven roadmap. Our Foundations Course walks you through client acquisition, pricing, and systems step by step. Self-paced with group coaching calls twice a month.',
      ctaText: 'Explore Foundations', ctaUrl: '/services/foundations',
      minScore: 0, maxScore: 7, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  4. LEAD GEN ASSESSMENT — "How ready is your business?"             */
/* ------------------------------------------------------------------ */

function businessAssessmentBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How would you rate your current online presence?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I barely have a website', score: 1 },
        { id: uid(), text: 'Basic site but it could be better', score: 2 },
        { id: uid(), text: 'Professional site with some traffic', score: 3 },
        { id: uid(), text: 'Strong presence across multiple channels', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do most of your customers find you?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Word of mouth and referrals', score: 2 },
        { id: uid(), text: 'Social media', score: 3 },
        { id: uid(), text: 'Search engines (Google, Bing)', score: 4 },
        { id: uid(), text: 'Paid advertising', score: 4 },
        { id: uid(), text: 'I am not sure', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you have an email list?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'No email list yet', score: 1 },
        { id: uid(), text: 'Under 500 subscribers', score: 2 },
        { id: uid(), text: '500 - 2,000 subscribers', score: 3 },
        { id: uid(), text: '2,000+ subscribers', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How often do you engage with your audience?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Rarely or never', score: 1 },
        { id: uid(), text: 'A few times a month', score: 2 },
        { id: uid(), text: 'Weekly', score: 3 },
        { id: uid(), text: 'Multiple times per week', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you have a clear strategy for converting visitors into customers?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Not really, I wing it', score: 1 },
        { id: uid(), text: 'I have some ideas but nothing structured', score: 2 },
        { id: uid(), text: 'I have a funnel but it needs work', score: 3 },
        { id: uid(), text: 'My funnel converts consistently', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your top priority for the next 90 days?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Get more website traffic', score: 2 },
        { id: uid(), text: 'Convert more visitors into leads', score: 3 },
        { id: uid(), text: 'Increase revenue from existing customers', score: 4 },
        { id: uid(), text: 'Build brand awareness', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your growth score is ready',
      subtext: 'See how your business stacks up and get a personalized action plan to improve your weakest areas.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'Full name', required: true, placeholder: 'Your name' },
        { id: uid(), type: 'company', label: 'Business name', required: false, placeholder: 'Your business' },
      ],
      buttonLabel: 'Get my growth score',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Growth Leader — Score: Excellent',
      description: 'Your business is well-positioned for scale. You have strong foundations in place. Focus on optimization: A/B testing your funnel, segmenting your email list, and exploring new channels. You are ready for advanced strategies.',
      ctaText: 'Book a Strategy Session', ctaUrl: '/contact',
      minScore: 20, maxScore: 30, shareEnabled: true,
      shareText: 'I scored as a Growth Leader!',
    },
    {
      id: uid(), type: 'outcome', title: 'Rising Star — Score: Good',
      description: 'You have solid momentum. Your next step is systemizing what works. Focus on building an email nurture sequence, creating a lead magnet, and setting up analytics to track your best traffic sources.',
      ctaText: 'Download the Growth Playbook', ctaUrl: '/resources/playbook',
      minScore: 11, maxScore: 19, shareEnabled: true,
      shareText: 'Took a business growth assessment — I am a Rising Star!',
    },
    {
      id: uid(), type: 'outcome', title: 'Early Builder — Score: Getting Started',
      description: 'Every successful business started exactly where you are. Your priority is building your foundation: a professional website, a simple lead capture form, and consistent content. Small steps lead to big results.',
      ctaText: 'Get the Starter Guide', ctaUrl: '/resources/starter',
      minScore: 0, maxScore: 10, shareEnabled: true,
      shareText: 'Just assessed my business growth readiness!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  5. PERSONALITY / STYLE QUIZ — Creative, fashion, lifestyle         */
/* ------------------------------------------------------------------ */

function personalityStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'It is Saturday morning — what are you most likely doing?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Browsing a farmers market or flea market', score: 1 },
        { id: uid(), text: 'Working on a creative project at home', score: 2 },
        { id: uid(), text: 'Out for brunch with friends', score: 3 },
        { id: uid(), text: 'At a gallery or design showroom', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Pick the color palette that speaks to you:',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Warm neutrals — terracotta, sand, cream', score: 1 },
        { id: uid(), text: 'Cool minimalism — white, gray, black', score: 4 },
        { id: uid(), text: 'Rich jewel tones — emerald, navy, burgundy', score: 3 },
        { id: uid(), text: 'Playful brights — coral, teal, mustard', score: 2 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would your best friend describe your space?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Cozy and collected', score: 1 },
        { id: uid(), text: 'Clean and intentional', score: 4 },
        { id: uid(), text: 'Bold and eclectic', score: 2 },
        { id: uid(), text: 'Sophisticated and layered', score: 3 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'You are picking out a gift. You gravitate toward:',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Something handmade or artisan', score: 1 },
        { id: uid(), text: 'A beautifully designed object', score: 4 },
        { id: uid(), text: 'An experience, not a thing', score: 2 },
        { id: uid(), text: 'Something luxurious and indulgent', score: 3 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which word resonates with you most?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Warmth', score: 1 },
        { id: uid(), text: 'Simplicity', score: 4 },
        { id: uid(), text: 'Energy', score: 2 },
        { id: uid(), text: 'Elegance', score: 3 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Your dream vacation vibe:',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'A rustic cabin in the mountains', score: 1 },
        { id: uid(), text: 'A sleek boutique hotel in Tokyo', score: 4 },
        { id: uid(), text: 'A colorful riad in Marrakech', score: 2 },
        { id: uid(), text: 'A classic villa on the Amalfi Coast', score: 3 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your style profile is ready',
      subtext: 'See which style archetype matches your personality and get curated picks just for you.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Reveal my style',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Modernist',
      description: 'You are drawn to clean lines, purposeful design, and quiet confidence. Less is more for you — every piece in your space and wardrobe earns its place. Think Scandinavian design, architectural silhouettes, and a monochrome palette with one bold accent.',
      ctaText: 'Shop Modernist Picks', ctaUrl: '/collections/modernist',
      minScore: 19, maxScore: 24, shareEnabled: true,
      shareText: 'I am The Modernist! What is your style archetype?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Curator',
      description: 'You have an eye for the finer things and love layering textures, stories, and eras. Your style is refined but never stuffy. Think vintage finds next to contemporary art, rich fabrics, and spaces that feel like they have been collected over a lifetime.',
      ctaText: 'Shop Curator Picks', ctaUrl: '/collections/curator',
      minScore: 13, maxScore: 18, shareEnabled: true,
      shareText: 'I am The Curator! Take the style quiz to find yours.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Free Spirit',
      description: 'You follow your instincts and surround yourself with things that spark joy. Your style mixes patterns, colors, and cultures fearlessly. Think global textiles, unexpected pairings, and spaces that feel alive and full of personality.',
      ctaText: 'Shop Free Spirit Picks', ctaUrl: '/collections/free-spirit',
      minScore: 7, maxScore: 12, shareEnabled: true,
      shareText: 'I am The Free Spirit! What style archetype are you?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Naturalist',
      description: 'You are grounded, warm, and drawn to organic textures and earthy tones. Handmade over machine-made, every time. Think linen, wood, ceramics, and spaces that feel like a deep breath. Your style is lived-in and loved.',
      ctaText: 'Shop Naturalist Picks', ctaUrl: '/collections/naturalist',
      minScore: 0, maxScore: 6, shareEnabled: true,
      shareText: 'I am The Naturalist! Find your style archetype.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  6. WELLNESS PLAN FINDER — Health coaches, fitness, nutrition       */
/* ------------------------------------------------------------------ */

function wellnessPlanBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is your primary wellness goal right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Lose weight and feel lighter', score: 1 },
        { id: uid(), text: 'Build strength and muscle tone', score: 2 },
        { id: uid(), text: 'Reduce stress and improve sleep', score: 3 },
        { id: uid(), text: 'Boost energy and mental clarity', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How active are you currently?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Barely active — mostly sedentary', score: 1 },
        { id: uid(), text: 'Light activity 1-2 times per week', score: 2 },
        { id: uid(), text: 'Moderate — 3-4 workouts per week', score: 3 },
        { id: uid(), text: 'Very active — 5+ sessions per week', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What does your typical diet look like?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I eat whatever is convenient', score: 1 },
        { id: uid(), text: 'Mostly healthy with some indulgences', score: 2 },
        { id: uid(), text: 'Structured meal plan most days', score: 3 },
        { id: uid(), text: 'Very intentional about nutrition', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you rate your sleep quality?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I struggle to fall or stay asleep', score: 1 },
        { id: uid(), text: 'Inconsistent — some nights are fine', score: 2 },
        { id: uid(), text: 'Generally good, 6-7 hours', score: 3 },
        { id: uid(), text: 'Excellent — 7-8 hours consistently', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest obstacle to staying consistent?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'I do not know where to start', score: 1 },
        { id: uid(), text: 'Time — I am too busy', score: 2 },
        { id: uid(), text: 'Motivation fades after a few weeks', score: 3 },
        { id: uid(), text: 'I get bored with routines', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your wellness blueprint is ready',
      subtext: 'Get a personalized plan based on your goals, lifestyle, and current fitness level. Plus receive weekly tips to keep you on track.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Get my wellness plan',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Performance Plan',
      description: 'You already have strong habits in place — now it is time to optimize. Your plan focuses on progressive training splits, nutrient timing, and recovery protocols to push past plateaus and hit peak performance.',
      ctaText: 'Start the Performance Plan', ctaUrl: '/plans/performance',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'Just got matched with the Performance Plan!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Balance Plan',
      description: 'You are doing well but need structure to stay consistent. Your plan blends efficient workouts (3-4x/week, 30 minutes), simple meal templates, and stress management techniques. Designed for busy people who want results without burnout.',
      ctaText: 'Start the Balance Plan', ctaUrl: '/plans/balance',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Found my perfect wellness plan!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Fresh Start Plan',
      description: 'Everyone starts somewhere, and this plan meets you exactly where you are. Gentle daily movement, beginner-friendly meals, and habit-building exercises that grow with you. No pressure, no overwhelm — just steady progress.',
      ctaText: 'Start the Fresh Start Plan', ctaUrl: '/plans/fresh-start',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Starting my wellness journey with a personalized plan!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  7. GIFT FINDER — Ecommerce seasonal / holiday                      */
/* ------------------------------------------------------------------ */

function giftFinderBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Who are you shopping for?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'A partner or spouse', score: 4 },
        { id: uid(), text: 'A friend', score: 3 },
        { id: uid(), text: 'A parent or family member', score: 2 },
        { id: uid(), text: 'A coworker or acquaintance', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you describe their personality?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Practical — they love useful things', score: 1 },
        { id: uid(), text: 'Creative — they appreciate unique finds', score: 3 },
        { id: uid(), text: 'Luxurious — they enjoy the finer things', score: 4 },
        { id: uid(), text: 'Adventurous — they prefer experiences', score: 2 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your budget for this gift?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $30', score: 1 },
        { id: uid(), text: '$30 - $75', score: 2 },
        { id: uid(), text: '$75 - $150', score: 3 },
        { id: uid(), text: '$150+', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What do they already have too much of?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Clothes and accessories', score: 2 },
        { id: uid(), text: 'Home decor and candles', score: 3 },
        { id: uid(), text: 'Tech gadgets', score: 4 },
        { id: uid(), text: 'Honestly, they have everything', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do they like to relax?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Cooking or baking something new', score: 1 },
        { id: uid(), text: 'Reading, journaling, or self-care', score: 3 },
        { id: uid(), text: 'Getting outdoors and being active', score: 2 },
        { id: uid(), text: 'Hosting friends and entertaining', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'We found the perfect gift',
      subtext: 'Enter your email to see your personalized gift recommendation and save it for later.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'Show me the perfect gift',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Luxury Experience',
      description: 'They deserve something truly special. We suggest a premium gift set or curated experience that feels indulgent and memorable. Think quality over quantity — something they would never buy for themselves.',
      ctaText: 'Shop Luxury Gifts', ctaUrl: '/gifts/luxury',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'Found the perfect gift with this quiz!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Thoughtful Surprise',
      description: 'The best gifts show you really know someone. We recommend something creative and personal — a beautifully crafted item with a story behind it, or a curated set that matches their unique taste.',
      ctaText: 'Shop Thoughtful Gifts', ctaUrl: '/gifts/thoughtful',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'This gift finder quiz is so good!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Everyday Delight',
      description: 'Sometimes the best gift is something they will use and love every day. We suggest practical but elevated — the kind of thing that upgrades their daily routine and makes them think of you.',
      ctaText: 'Shop Everyday Gifts', ctaUrl: '/gifts/everyday',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Just found the perfect gift!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  8. KNOWLEDGE QUIZ — Educational, engagement, authority building     */
/* ------------------------------------------------------------------ */

function knowledgeQuizBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is the most effective way to improve your website conversion rate?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Add more pages and content', score: 1, explanation: 'More content helps SEO but does not directly improve conversion rates.' },
        { id: uid(), text: 'Simplify your call-to-action', score: 3, explanation: 'Correct! A clear, focused CTA is one of the highest-impact changes you can make.' },
        { id: uid(), text: 'Use more colors and animations', score: 0, explanation: 'Visual flair can actually hurt conversions if it distracts from the core message.' },
        { id: uid(), text: 'Post more on social media', score: 1, explanation: 'Social drives traffic but does not directly affect on-site conversion.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How long do you have to make a first impression on a website visitor?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: '30 seconds', score: 1, explanation: 'Close but research shows it is much faster than that.' },
        { id: uid(), text: 'About 3-5 seconds', score: 3, explanation: 'Correct! Studies show visitors form their opinion in 3-5 seconds.' },
        { id: uid(), text: '1 minute', score: 0, explanation: 'Most visitors have already decided whether to stay or leave by then.' },
        { id: uid(), text: '10 seconds', score: 2, explanation: 'Not bad, but the real window is even shorter.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which of these is the biggest trust signal for new visitors?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Customer reviews and testimonials', score: 3, explanation: 'Correct! Social proof is consistently the most powerful trust builder online.' },
        { id: uid(), text: 'A professional logo', score: 1, explanation: 'Important but not as impactful as social proof.' },
        { id: uid(), text: 'An About page with a photo', score: 2, explanation: 'Helpful for personal brands but not the top trust signal overall.' },
        { id: uid(), text: 'Fancy website animations', score: 0, explanation: 'These can actually slow your site and reduce trust.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What percentage of website traffic comes from mobile devices?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'About 30%', score: 0, explanation: 'That was true around 2015 but mobile has grown massively since then.' },
        { id: uid(), text: 'About 50%', score: 2, explanation: 'Getting closer but still underestimating mobile usage.' },
        { id: uid(), text: 'Over 60%', score: 3, explanation: 'Correct! As of 2024, mobile accounts for over 60% of all web traffic globally.' },
        { id: uid(), text: 'About 40%', score: 1, explanation: 'Mobile passed this threshold years ago.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which metric matters most for measuring content marketing success?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Page views', score: 1, explanation: 'Views tell you reach but not impact. Someone can view and immediately leave.' },
        { id: uid(), text: 'Time on page and engagement', score: 3, explanation: 'Correct! Engagement metrics show whether your content is actually resonating and driving action.' },
        { id: uid(), text: 'Number of blog posts published', score: 0, explanation: 'Quantity without quality is a common trap in content marketing.' },
        { id: uid(), text: 'Social media shares', score: 2, explanation: 'Shares indicate resonance but do not always translate to business results.' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'See how you scored',
      subtext: 'Get your results plus a free cheat sheet with the strategies behind each answer.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'See my score',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Marketing Expert — 5/5',
      description: 'Impressive! You clearly know your stuff. You understand the fundamentals that drive real business results online. Share your score to challenge your network, and check out our advanced strategies for taking things to the next level.',
      ctaText: 'Explore Advanced Strategies', ctaUrl: '/resources/advanced',
      minScore: 13, maxScore: 15, shareEnabled: true,
      shareText: 'I scored 5/5 on this marketing knowledge quiz! Think you can beat me?',
    },
    {
      id: uid(), type: 'outcome', title: 'Solid Foundation — 3-4/5',
      description: 'Great job! You have a strong understanding of the basics with a few gaps to fill. The good news is that closing those gaps can have an outsized impact on your results. Check out our guide for the strategies you missed.',
      ctaText: 'Download the Complete Guide', ctaUrl: '/resources/guide',
      minScore: 7, maxScore: 12, shareEnabled: true,
      shareText: 'Scored well on this marketing quiz! Test your knowledge too.',
    },
    {
      id: uid(), type: 'outcome', title: 'Room to Grow — 0-2/5',
      description: 'No shame in starting here — most business owners have not been taught this stuff. The fact that you took this quiz shows you care about growing. We have put together a free starter guide that covers everything you need to know.',
      ctaText: 'Get the Free Starter Guide', ctaUrl: '/resources/starter',
      minScore: 0, maxScore: 6, shareEnabled: true,
      shareText: 'Just took a marketing knowledge quiz — learned a lot!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Template catalog                                                   */
/* ------------------------------------------------------------------ */

export var QUIZ_TEMPLATE_CATALOG: QuizTemplateData[] = [
  {
    id: 'product_recommendation',
    category: 'Ecommerce',
    name: 'Product Recommendation',
    description: 'Match visitors to the right product based on their preferences, budget, and style. Works for any product catalog.',
    audience: 'Online stores, DTC brands, product-based businesses',
    whyItWorks: 'Proven to increase AOV by personalizing the shopping experience. Brands like Warby Parker and Function of Beauty built empires on this pattern.',
    iconPath: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
    tags: ['ecommerce', 'product', 'recommendation', 'shopping'],
    blocks: productRecommendationBlocks,
  },
  {
    id: 'skincare_routine',
    category: 'Beauty & Wellness',
    name: 'Skincare Routine Finder',
    description: 'Build a personalized skincare routine based on skin type, concerns, and lifestyle. The most popular quiz type for beauty brands.',
    audience: 'Skincare brands, beauty retailers, estheticians',
    whyItWorks: 'Skincare quizzes see 40-60% completion rates because customers genuinely need help choosing. This pattern drives both email signups and product bundles.',
    iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2',
    tags: ['beauty', 'skincare', 'wellness', 'routine', 'cosmetics'],
    blocks: skincareRoutineBlocks,
  },
  {
    id: 'service_matcher',
    category: 'Services',
    name: 'Service Package Matcher',
    description: 'Help potential clients find the right service tier or package. Qualifies leads automatically by matching them to your offerings.',
    audience: 'Coaches, consultants, agencies, freelancers',
    whyItWorks: 'Replaces the discovery call for initial qualification. Prospects self-select into service tiers, making sales conversations more efficient.',
    iconPath: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM22 8l-4 4-2-2',
    tags: ['services', 'coaching', 'consulting', 'packages', 'agency'],
    blocks: serviceMatcherBlocks,
  },
  {
    id: 'business_assessment',
    category: 'Lead Generation',
    name: 'Business Readiness Assessment',
    description: 'Score how ready someone is in a specific area and deliver a personalized action plan. The most powerful lead gen format for B2B.',
    audience: 'B2B services, marketing agencies, business coaches',
    whyItWorks: 'Assessment-style quizzes generate 3-5x more leads than static forms. The "score" creates urgency and the action plan builds trust.',
    iconPath: 'M3 14a9 9 0 0118 0M12 14l5-3M12 5v2M5.3 8.7l1.4 1.4M18.7 8.7l-1.4 1.4',
    tags: ['lead-gen', 'assessment', 'scorecard', 'b2b', 'readiness'],
    blocks: businessAssessmentBlocks,
  },
  {
    id: 'personality_style',
    category: 'Lifestyle',
    name: 'Style & Personality Quiz',
    description: 'Reveal a personal style archetype through fun, visual questions. High shareability drives organic traffic.',
    audience: 'Fashion brands, interior designers, lifestyle brands',
    whyItWorks: 'Personality quizzes are the most shared quiz type. The archetype format creates identity and belonging that drives both sharing and purchasing.',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    tags: ['personality', 'style', 'fashion', 'lifestyle', 'creative'],
    blocks: personalityStyleBlocks,
  },
  {
    id: 'wellness_plan',
    category: 'Health & Fitness',
    name: 'Wellness Plan Finder',
    description: 'Match people to the right fitness, nutrition, or wellness plan based on their goals, activity level, and obstacles.',
    audience: 'Fitness coaches, nutritionists, wellness practitioners',
    whyItWorks: 'Wellness quizzes build trust by showing expertise before asking for a commitment. The personalized plan creates an immediate value exchange.',
    iconPath: 'M22 12h-4l-3 9L9 3l-3 9H2',
    tags: ['wellness', 'fitness', 'health', 'nutrition', 'coaching'],
    blocks: wellnessPlanBlocks,
  },
  {
    id: 'gift_finder',
    category: 'Ecommerce',
    name: 'Gift Finder',
    description: 'Help shoppers find the perfect gift by asking about the recipient. Essential for holiday seasons and gifting-focused stores.',
    audience: 'Gift shops, artisan stores, any ecommerce during holidays',
    whyItWorks: 'Gift shoppers are high-intent but overwhelmed by choice. This quiz reduces decision fatigue and increases conversion by 25-40% during peak seasons.',
    iconPath: 'M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6M12 2v20M2 12h20M7.5 2C9 2 12 5 12 5s3-3 4.5-3a2.5 2.5 0 010 5H12',
    tags: ['gift', 'holiday', 'ecommerce', 'seasonal', 'shopping'],
    blocks: giftFinderBlocks,
  },
  {
    id: 'knowledge_quiz',
    category: 'Education',
    name: 'Knowledge Test',
    description: 'Test what your audience knows about a topic with scored questions and answer explanations. Builds authority and captures leads.',
    audience: 'Educators, bloggers, thought leaders, course creators',
    whyItWorks: 'Knowledge quizzes trigger curiosity and competitiveness. Answer explanations position you as the expert and create natural upsell to courses or services.',
    iconPath: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
    tags: ['education', 'knowledge', 'trivia', 'course', 'authority'],
    blocks: knowledgeQuizBlocks,
  },
];

export function findTemplateData(id: string): QuizTemplateData | undefined {
  return QUIZ_TEMPLATE_CATALOG.find(function(t) { return t.id === id; });
}

export function getTemplateCategories(): string[] {
  var cats: string[] = [];
  QUIZ_TEMPLATE_CATALOG.forEach(function(t) {
    if (cats.indexOf(t.category) === -1) cats.push(t.category);
  });
  return cats;
}
