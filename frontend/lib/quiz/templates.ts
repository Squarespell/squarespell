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

/* ------------------------------------------------------------------ */
/*  9. PHOTOGRAPHY SESSION MATCHER — Photographers                      */
/* ------------------------------------------------------------------ */

function photographySessionBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is the occasion for your photos?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Wedding or engagement', score: 4 },
        { id: uid(), text: 'Family or newborn', score: 3 },
        { id: uid(), text: 'Personal branding or headshots', score: 2 },
        { id: uid(), text: 'Event or milestone celebration', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What style of photography do you prefer?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Light and airy with soft tones', score: 4 },
        { id: uid(), text: 'Bold and moody with deep contrast', score: 3 },
        { id: uid(), text: 'Natural and candid — as it happens', score: 2 },
        { id: uid(), text: 'Clean and classic — timeless poses', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you prefer indoor or outdoor settings?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Outdoor — golden hour, nature', score: 4 },
        { id: uid(), text: 'Studio — controlled lighting', score: 3 },
        { id: uid(), text: 'Urban — city streets, architecture', score: 2 },
        { id: uid(), text: 'Home or lifestyle setting', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How many people will be in the session?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Just me', score: 1 },
        { id: uid(), text: 'Me and a partner', score: 2 },
        { id: uid(), text: 'Small group (3-6 people)', score: 3 },
        { id: uid(), text: 'Large group (7+)', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is most important to you about the final images?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Gallery-worthy prints for my wall', score: 4 },
        { id: uid(), text: 'Social media-ready content', score: 2 },
        { id: uid(), text: 'Authentic memories to look back on', score: 3 },
        { id: uid(), text: 'Professional images for my business', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your session recommendation is ready',
      subtext: 'Enter your email to see which session package is perfect for you, plus get our preparation guide for your best photos ever.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'See my recommendation',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Signature Collection',
      description: 'You want a premium, full-experience session with artistic direction, multiple locations, and gallery-quality images. This package includes a pre-session consultation, 2-3 hour shoot, professional styling guidance, and 40+ edited images delivered in an online gallery.',
      ctaText: 'Book the Signature Collection', ctaUrl: '/sessions/signature',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'Just found my perfect photo session package!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Classic Session',
      description: 'You are looking for a focused, beautifully shot session that captures exactly what matters. This package includes a 60-90 minute shoot at one location, wardrobe guidance, and 20-25 edited images. Perfect for couples, families, and personal milestones.',
      ctaText: 'Book the Classic Session', ctaUrl: '/sessions/classic',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Found the perfect photo session for me!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Mini Session',
      description: 'You need great images without a big time commitment. This package is a 30-minute focused shoot at one location with 10-15 edited images. Ideal for headshots, social media content, or a quick family update.',
      ctaText: 'Book a Mini Session', ctaUrl: '/sessions/mini',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Booked my photo session!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  10. WEDDING STYLE FINDER — Wedding vendors                          */
/* ------------------------------------------------------------------ */

function weddingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How would you describe your dream wedding vibe?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Romantic and timeless — think candlelight and florals', score: 4 },
        { id: uid(), text: 'Modern and minimal — clean lines, neutral palette', score: 3 },
        { id: uid(), text: 'Bohemian and relaxed — outdoor, free-spirited', score: 2 },
        { id: uid(), text: 'Bold and dramatic — statement pieces, rich colors', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What season feels most like you?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Spring — soft blooms, pastels', score: 4 },
        { id: uid(), text: 'Summer — warm sun, vibrant greens', score: 3 },
        { id: uid(), text: 'Autumn — golden tones, harvest textures', score: 2 },
        { id: uid(), text: 'Winter — moody elegance, deep hues', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What kind of venue are you drawn to?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'A barn or vineyard with rustic charm', score: 2 },
        { id: uid(), text: 'A sleek hotel or gallery space', score: 3 },
        { id: uid(), text: 'A garden, beach, or open-air setting', score: 1 },
        { id: uid(), text: 'A historic estate or ballroom', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Pick the color palette that speaks to you.',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Blush, ivory, and gold', score: 4 },
        { id: uid(), text: 'White, sage, and eucalyptus', score: 3 },
        { id: uid(), text: 'Terracotta, burnt orange, and cream', score: 2 },
        { id: uid(), text: 'Black, burgundy, and emerald', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What matters most to you on the big day?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Every detail is styled and intentional', score: 4 },
        { id: uid(), text: 'It feels relaxed and genuinely us', score: 2 },
        { id: uid(), text: 'Our guests have an unforgettable experience', score: 3 },
        { id: uid(), text: 'The photos capture something real', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your wedding style is ready to reveal',
      subtext: 'Enter your email to see your personalized wedding style profile, complete with a mood board and vendor recommendations.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Reveal my wedding style',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Classic Romance',
      description: 'Your wedding style is timeless elegance with a romantic heart. Think cascading floral arrangements, soft candlelight, calligraphy details, and a neutral palette lifted by gold accents. Every element feels curated yet effortless. You value tradition but want it to feel fresh.',
      ctaText: 'See Classic Romance Inspiration', ctaUrl: '/styles/classic-romance',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'My wedding style is Classic Romance! Take the quiz to find yours.',
    },
    {
      id: uid(), type: 'outcome', title: 'Modern Organic',
      description: 'Your style blends clean modern design with natural textures and tones. Think long farm tables, sculptural floral installations, linen napkins, and a muted earthy palette. You want a celebration that feels designed but never overdone — sophistication meets nature.',
      ctaText: 'See Modern Organic Inspiration', ctaUrl: '/styles/modern-organic',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I got Modern Organic! What is your wedding style?',
    },
    {
      id: uid(), type: 'outcome', title: 'Free Spirit',
      description: 'Your wedding is all about feeling, not formulas. Think outdoor ceremonies, wildflower bouquets, mismatched vintage furniture, and barefoot dancing under string lights. You want your guests to feel the love in every unscripted moment.',
      ctaText: 'See Free Spirit Inspiration', ctaUrl: '/styles/free-spirit',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'My wedding style is Free Spirit! Find yours with this quiz.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  11. HAIR TREATMENT FINDER — Hair stylists / salons                  */
/* ------------------------------------------------------------------ */

function hairTreatmentBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is your hair type?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Straight — flat, sometimes oily at roots', score: 1 },
        { id: uid(), text: 'Wavy — loose S-shaped waves', score: 2 },
        { id: uid(), text: 'Curly — defined spirals or ringlets', score: 3 },
        { id: uid(), text: 'Coily — tight coils or zig-zag pattern', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest hair concern right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Damage and breakage from heat or color', score: 4 },
        { id: uid(), text: 'Frizz and lack of definition', score: 3 },
        { id: uid(), text: 'Thinning or hair loss', score: 2 },
        { id: uid(), text: 'Dullness and lack of shine', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How much time do you spend styling your hair daily?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under 5 minutes — wash and go', score: 1 },
        { id: uid(), text: '5-15 minutes — quick routine', score: 2 },
        { id: uid(), text: '15-30 minutes — I enjoy the process', score: 3 },
        { id: uid(), text: '30+ minutes — I go all out', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Have you had any chemical treatments in the past 6 months?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'No treatments at all', score: 1 },
        { id: uid(), text: 'Just color or highlights', score: 2 },
        { id: uid(), text: 'Keratin, relaxer, or perm', score: 3 },
        { id: uid(), text: 'Multiple treatments (color + straightening)', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your goal after your next salon visit?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Repair and restore my hair health', score: 4 },
        { id: uid(), text: 'A fresh new color or style', score: 3 },
        { id: uid(), text: 'More volume and body', score: 2 },
        { id: uid(), text: 'Low-maintenance effortless hair', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized treatment plan is ready',
      subtext: 'Get your hair treatment recommendation plus a first-visit discount and aftercare tips.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'See my treatment plan',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Deep Repair Treatment',
      description: 'Your hair needs serious TLC. We recommend starting with a bond-repair treatment like Olaplex or K18 to rebuild internal structure, followed by a moisture-rich deep conditioning mask. This will restore elasticity, reduce breakage, and bring back healthy shine before any color or styling services.',
      ctaText: 'Book a Repair Consultation', ctaUrl: '/services/deep-repair',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'Found my perfect hair treatment!',
    },
    {
      id: uid(), type: 'outcome', title: 'Hydration and Definition Service',
      description: 'Your hair is in decent shape but craving moisture and definition. A professional hydrating treatment combined with a precision cut to remove split ends will transform your texture. We will also recommend a simple 3-product home routine to maintain your results between visits.',
      ctaText: 'Book a Hydration Session', ctaUrl: '/services/hydration',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Just got matched with my ideal hair treatment!',
    },
    {
      id: uid(), type: 'outcome', title: 'Refresh and Enhance',
      description: 'Your hair is healthy and just needs a refresh. A gloss treatment will amplify shine and vibrancy, and a style consultation will help you make the most of your natural texture with minimal effort. Perfect for maintaining great hair without overprocessing.',
      ctaText: 'Book a Refresh Appointment', ctaUrl: '/services/refresh',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Found out exactly what my hair needs!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  12. COACHING READINESS — Coaches & course creators                  */
/* ------------------------------------------------------------------ */

function coachingReadinessBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Where is your business right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Pre-launch — still figuring out my offer', score: 1 },
        { id: uid(), text: 'Early stage — some clients but no consistency', score: 2 },
        { id: uid(), text: 'Growing — booked out but hitting a ceiling', score: 3 },
        { id: uid(), text: 'Established — want to scale beyond 1-on-1', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the biggest thing holding you back?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'I do not have a clear niche or offer', score: 1 },
        { id: uid(), text: 'I cannot get consistent clients or leads', score: 2 },
        { id: uid(), text: 'I am trading all my time for money', score: 3 },
        { id: uid(), text: 'I need systems and a team to grow', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How are you currently getting clients?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Word of mouth only', score: 1 },
        { id: uid(), text: 'Social media — posting and hoping', score: 2 },
        { id: uid(), text: 'Some email marketing and referrals', score: 3 },
        { id: uid(), text: 'A funnel or system that runs on its own', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you have an email list?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'No list yet', score: 1 },
        { id: uid(), text: 'Under 500 subscribers', score: 2 },
        { id: uid(), text: '500-2,000 subscribers', score: 3 },
        { id: uid(), text: '2,000+ engaged subscribers', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What would make the biggest difference for you right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Clarity — knowing exactly what to offer and to whom', score: 1 },
        { id: uid(), text: 'Visibility — getting in front of my ideal clients', score: 2 },
        { id: uid(), text: 'Leverage — packaging my expertise into scalable offers', score: 3 },
        { id: uid(), text: 'Operations — automating so I can focus on delivery', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your growth roadmap is ready',
      subtext: 'Get a personalized action plan based on your current stage, plus a free resource to help you take the next step.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Get my roadmap',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Ready to Scale',
      description: 'You have built a solid foundation and are ready to multiply your impact. Your next move is creating leveraged offers — group programs, courses, or memberships — supported by automated funnels and a small team. You do not need more hustle, you need better systems.',
      ctaText: 'Explore Scaling Strategies', ctaUrl: '/programs/scale',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'Turns out I am ready to scale! Take the quiz to find your stage.',
    },
    {
      id: uid(), type: 'outcome', title: 'Building Momentum',
      description: 'You are past the starting line and gaining traction. Your priority is building a repeatable client acquisition system — a lead magnet, nurture sequence, and clear offer suite. Once this engine runs, you can focus on refining and expanding without burning out.',
      ctaText: 'Download the Momentum Playbook', ctaUrl: '/programs/momentum',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Just discovered my business growth stage!',
    },
    {
      id: uid(), type: 'outcome', title: 'Foundation First',
      description: 'You are in the most exciting stage — everything is ahead of you. Right now, clarity is your superpower. Nail your niche, define one signature offer, and get your first 10 paying clients. Do not overthink funnels and systems yet — focus on conversations and delivery.',
      ctaText: 'Get the Foundation Guide', ctaUrl: '/programs/foundation',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Starting my coaching journey — just got my personalized roadmap!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  13. MEAL BUILDER — Restaurants & cafes                              */
/* ------------------------------------------------------------------ */

function mealBuilderBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Do you have any dietary preferences?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'No restrictions — I eat everything', score: 1 },
        { id: uid(), text: 'Vegetarian or plant-forward', score: 2 },
        { id: uid(), text: 'Gluten-free', score: 3 },
        { id: uid(), text: 'Vegan', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What kind of flavors do you gravitate toward?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Rich and savory — umami, roasted, caramelized', score: 4 },
        { id: uid(), text: 'Fresh and bright — citrus, herbs, acidity', score: 3 },
        { id: uid(), text: 'Warm and spiced — chili, cumin, ginger', score: 2 },
        { id: uid(), text: 'Simple and clean — quality ingredients, minimal fuss', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How hungry are you right now?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Just a little something', score: 1 },
        { id: uid(), text: 'A solid meal', score: 2 },
        { id: uid(), text: 'I could eat two entrees', score: 3 },
        { id: uid(), text: 'Feed me everything — full tasting experience', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the occasion?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Casual weeknight dinner', score: 1 },
        { id: uid(), text: 'Date night', score: 3 },
        { id: uid(), text: 'Celebration or special occasion', score: 4 },
        { id: uid(), text: 'Lunch break — need something quick', score: 2 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How adventurous are you feeling today?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Stick to the classics', score: 1 },
        { id: uid(), text: 'A familiar dish with a twist', score: 2 },
        { id: uid(), text: 'Something I have never tried before', score: 3 },
        { id: uid(), text: 'Surprise me — chef knows best', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your menu picks are ready',
      subtext: 'Enter your email to save your personalized recommendations and get a first-visit perk.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'See my recommendations',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Full Experience',
      description: 'Go big tonight. We recommend starting with a shareable appetizer, then our most talked-about entree, and finishing with the dessert that keeps people coming back. Add a cocktail pairing for the complete experience. You came here to enjoy yourself — let us make it memorable.',
      ctaText: 'View Full Experience Menu', ctaUrl: '/menu/experience',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'This restaurant quiz just nailed my perfect meal!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Perfect Plate',
      description: 'You know what you like and we have just the dish. A well-balanced entree that hits all the right notes, with an optional side or starter to round it out. Simple, satisfying, and exactly what you came for. Check out our seasonal feature — it was made for you.',
      ctaText: 'See Today\'s Specials', ctaUrl: '/menu/specials',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Found my perfect meal with this quiz!',
    },
    {
      id: uid(), type: 'outcome', title: 'Light and Easy',
      description: 'Something fresh, fast, and flavorful. We recommend one of our lighter plates — a seasonal salad, grain bowl, or one of our house soups. Quick without cutting corners. Perfect for a midday reset or when you want to keep things simple but still eat well.',
      ctaText: 'Browse Light Bites', ctaUrl: '/menu/light',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Just found my go-to order!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  14. STRESS PROFILE — Yoga / meditation / therapists                 */
/* ------------------------------------------------------------------ */

function stressProfileBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Where do you feel stress most in your body?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Neck and shoulders — constant tension', score: 4 },
        { id: uid(), text: 'Stomach and gut — digestive issues or nausea', score: 3 },
        { id: uid(), text: 'Chest — tightness, shallow breathing', score: 2 },
        { id: uid(), text: 'Head — tension headaches, racing thoughts', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you describe your sleep?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I fall asleep fine but wake up exhausted', score: 1 },
        { id: uid(), text: 'My mind races when I try to sleep', score: 2 },
        { id: uid(), text: 'I sleep okay but never feel rested', score: 3 },
        { id: uid(), text: 'I sleep well most nights', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'When you are overwhelmed, what do you usually do?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Push through — I will rest later', score: 1 },
        { id: uid(), text: 'Scroll my phone or distract myself', score: 2 },
        { id: uid(), text: 'Vent to a friend or family member', score: 3 },
        { id: uid(), text: 'Take a walk, breathe, or do something physical', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Have you tried any mindfulness practices before?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Never — totally new to this', score: 1 },
        { id: uid(), text: 'Tried a few apps but nothing stuck', score: 2 },
        { id: uid(), text: 'I practice occasionally when I remember', score: 3 },
        { id: uid(), text: 'I have a regular practice', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How much time could you realistically give to self-care each day?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: '5 minutes — I am being honest', score: 1 },
        { id: uid(), text: '10-15 minutes', score: 2 },
        { id: uid(), text: '20-30 minutes', score: 3 },
        { id: uid(), text: '30+ minutes — I will make time', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your stress profile is ready',
      subtext: 'Get your personalized results plus a free guided practice designed for your specific stress pattern.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'See my stress profile',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Grounded Practice',
      description: 'You already have good self-awareness and are ready for a deeper practice. We recommend a structured program that combines breathwork, restorative yoga, and guided meditation. Your stress pattern responds best to consistency — a 20-minute daily practice will be transformative within weeks.',
      ctaText: 'Start the Grounded Program', ctaUrl: '/programs/grounded',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'My stress profile says I need the Grounded Practice! Find yours:',
    },
    {
      id: uid(), type: 'outcome', title: 'The Release Practice',
      description: 'Your body is carrying more stress than your mind realizes. You need movement-based release — gentle yoga flows, body scanning, and progressive relaxation. Start with our beginner-friendly classes that focus on physical tension release. Even 10 minutes will help you notice a shift.',
      ctaText: 'Try a Release Class', ctaUrl: '/programs/release',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Discovered my stress profile — turns out I need more body-based practice!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Micro Practice',
      description: 'You are in survival mode and need practices that meet you where you are. Forget long sessions — we recommend 5-minute micro-practices you can do anywhere: desk breathing, a two-minute body scan before bed, or a walking meditation on your lunch break. Small shifts lead to big change.',
      ctaText: 'Get 5-Minute Practices', ctaUrl: '/programs/micro',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Just found out my stress type — this quiz was eye-opening!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  15. DESIGN STYLE FINDER — Interior designers                        */
/* ------------------------------------------------------------------ */

function interiorStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Which room are you most excited to transform?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Living room — the heart of my home', score: 3 },
        { id: uid(), text: 'Bedroom — my personal sanctuary', score: 2 },
        { id: uid(), text: 'Kitchen — where life happens', score: 4 },
        { id: uid(), text: 'Home office — my productive space', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you want your space to feel?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Warm and inviting — layered textures, earthy tones', score: 3 },
        { id: uid(), text: 'Calm and minimal — clean lines, breathing room', score: 4 },
        { id: uid(), text: 'Bold and collected — statement pieces, personality', score: 2 },
        { id: uid(), text: 'Bright and playful — color, pattern, energy', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you feel about clutter?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I love a clean, minimal look', score: 4 },
        { id: uid(), text: 'Some things on display, mostly tidy', score: 3 },
        { id: uid(), text: 'I like my collections visible', score: 2 },
        { id: uid(), text: 'Maximalist — more is more', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your timeline for this project?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I am just gathering inspiration', score: 1 },
        { id: uid(), text: 'Planning to start in the next 3 months', score: 2 },
        { id: uid(), text: 'Ready to start within a month', score: 3 },
        { id: uid(), text: 'I need help right now', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your approximate budget for the space?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $2,000 — refreshing what I have', score: 1 },
        { id: uid(), text: '$2,000-$5,000 — key pieces and updates', score: 2 },
        { id: uid(), text: '$5,000-$15,000 — full room transformation', score: 3 },
        { id: uid(), text: '$15,000+ — complete design overhaul', score: 4 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your design style profile is ready',
      subtext: 'See your personalized style direction with a curated mood board and product recommendations.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'See my style profile',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Scandinavian Modern',
      description: 'Your style is all about intentional simplicity. Clean lines, natural materials, and a neutral palette with strategic warmth. Think light wood, white walls, linen textures, and a few carefully chosen statement pieces. Every item in the room earns its place. We recommend starting with a consultation to build your design plan.',
      ctaText: 'Book a Design Consultation', ctaUrl: '/services/consultation',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'My design style is Scandinavian Modern! Find yours:',
    },
    {
      id: uid(), type: 'outcome', title: 'Warm Contemporary',
      description: 'You love modern design but want it to feel lived-in and welcoming. Think textured neutrals, organic shapes, mixed metals, and cozy layers. Your space should look curated but never cold. Our room refresh package is perfect for you — we work with what you have and add key pieces to complete the look.',
      ctaText: 'Explore Room Refresh', ctaUrl: '/services/room-refresh',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I am a Warm Contemporary! What is your interior style?',
    },
    {
      id: uid(), type: 'outcome', title: 'Eclectic Collector',
      description: 'Your home tells a story — and you want every chapter visible. You mix eras, origins, and styles fearlessly. Vintage finds next to modern art, bold wallpaper behind a mid-century credenza. The key is editing: our styling session helps you curate your collection so it feels intentional, not chaotic.',
      ctaText: 'Book a Styling Session', ctaUrl: '/services/styling',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'My design style is Eclectic Collector! Take the quiz:',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  16. SIGNATURE SCENT — Candle / artisan / handmade shops             */
/* ------------------------------------------------------------------ */

function signatureScentBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What season makes you feel most like yourself?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Autumn — cozy nights, warm spices', score: 4 },
        { id: uid(), text: 'Spring — fresh rain, blooming gardens', score: 3 },
        { id: uid(), text: 'Summer — salty air, sun-warmed skin', score: 2 },
        { id: uid(), text: 'Winter — crisp air, fireside evenings', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What kind of mood do you want to create?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Relaxing — wind-down, self-care, calm', score: 3 },
        { id: uid(), text: 'Energizing — fresh, uplifting, motivated', score: 2 },
        { id: uid(), text: 'Romantic — warm, intimate, soft', score: 4 },
        { id: uid(), text: 'Grounding — earthy, centered, focused', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How strong do you like your scents?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Very subtle — barely there', score: 1 },
        { id: uid(), text: 'Soft — noticeable but not overpowering', score: 2 },
        { id: uid(), text: 'Medium — fills the room nicely', score: 3 },
        { id: uid(), text: 'Strong — I want to walk into a wall of scent', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which scent family draws you in?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Floral — rose, jasmine, lavender', score: 3 },
        { id: uid(), text: 'Woody — cedar, sandalwood, pine', score: 4 },
        { id: uid(), text: 'Citrus — bergamot, lemon, grapefruit', score: 2 },
        { id: uid(), text: 'Gourmand — vanilla, cinnamon, caramel', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Where will you burn this candle most?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Bedroom — end-of-day ritual', score: 4 },
        { id: uid(), text: 'Living room — everyday ambiance', score: 3 },
        { id: uid(), text: 'Bathroom — spa vibes', score: 2 },
        { id: uid(), text: 'Office — focus and calm', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your signature scent is ready',
      subtext: 'Enter your email to discover your perfect match and get 10% off your first order.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'Reveal my scent',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Fireside Evening',
      description: 'Your signature scent is warm, rich, and enveloping. Think amber and sandalwood with hints of cinnamon and vanilla. This candle transforms any room into a cozy retreat. It is our best-seller for a reason — once you light it, you will understand.',
      ctaText: 'Shop Fireside Evening', ctaUrl: '/shop/fireside-evening',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'My signature candle scent is Fireside Evening! Find yours:',
    },
    {
      id: uid(), type: 'outcome', title: 'Garden After Rain',
      description: 'Your signature scent is fresh, green, and alive. Notes of eucalyptus, white tea, and dewy petals. It is the candle equivalent of opening a window on a perfect spring morning. Clean without being clinical, natural without being earthy.',
      ctaText: 'Shop Garden After Rain', ctaUrl: '/shop/garden-after-rain',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'Took a scent quiz and got Garden After Rain!',
    },
    {
      id: uid(), type: 'outcome', title: 'Citrus and Sun',
      description: 'Your signature scent is bright, uplifting, and effortlessly fresh. Bergamot and lemon zest meet light jasmine and a whisper of sea salt. This candle is sunshine in a jar — energizing during the day, refreshing in the evening.',
      ctaText: 'Shop Citrus and Sun', ctaUrl: '/shop/citrus-and-sun',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'My candle match is Citrus and Sun!',
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
  {
    id: 'photography_session',
    category: 'Creative Services',
    name: 'Photography Session Matcher',
    description: 'Help potential clients find the right session type and package based on their occasion, style preferences, and group size.',
    audience: 'Photographers, portrait studios, wedding photographers',
    whyItWorks: 'Photographers lose leads who feel overwhelmed by pricing pages. This quiz pre-qualifies and matches clients to the right package, cutting booking friction in half.',
    iconPath: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z',
    tags: ['photography', 'booking', 'creative', 'sessions', 'portraits'],
    blocks: photographySessionBlocks,
  },
  {
    id: 'wedding_style',
    category: 'Wedding',
    name: 'Wedding Style Finder',
    description: 'Reveal a couple\'s wedding aesthetic based on their preferences for venues, colors, and vibes. The most shareable quiz for wedding vendors.',
    audience: 'Wedding planners, florists, venues, wedding photographers',
    whyItWorks: 'Engaged couples share style quizzes with their wedding party. Average quiz generates 3-5 referral visits per completion — organic growth built into the format.',
    iconPath: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
    tags: ['wedding', 'style', 'planning', 'bridal', 'events'],
    blocks: weddingStyleBlocks,
  },
  {
    id: 'hair_treatment',
    category: 'Beauty & Wellness',
    name: 'Hair Treatment Finder',
    description: 'Match clients to the right hair service based on their hair type, concerns, and goals. Drives salon bookings by removing decision paralysis.',
    audience: 'Hair stylists, salons, hair care brands',
    whyItWorks: 'Salon clients often book the wrong service or delay booking because they are not sure what they need. This quiz eliminates that friction and builds trust before the first visit.',
    iconPath: 'M20 7h-7.18C11.7 5.21 10 4 8 4a4 4 0 00-4 4c0 2.22 1.21 4.16 3 5.19V20h10v-4h3a2 2 0 002-2V9a2 2 0 00-2-2z',
    tags: ['hair', 'salon', 'beauty', 'treatment', 'styling'],
    blocks: hairTreatmentBlocks,
  },
  {
    id: 'coaching_readiness',
    category: 'Lead Generation',
    name: 'Coaching Readiness Quiz',
    description: 'Assess where a potential client is in their business journey and match them to the right coaching program or service tier.',
    audience: 'Business coaches, life coaches, course creators, consultants',
    whyItWorks: 'The readiness format pre-qualifies leads by stage. Coaches report 2-3x higher conversion from quiz leads vs. cold leads because prospects self-identify their gap.',
    iconPath: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    tags: ['coaching', 'readiness', 'assessment', 'courses', 'consulting'],
    blocks: coachingReadinessBlocks,
  },
  {
    id: 'meal_builder',
    category: 'Food & Drink',
    name: 'Build Your Perfect Meal',
    description: 'Guide diners to the right menu items based on dietary needs, flavor preferences, and occasion. Fun, fast, and drives upsells.',
    audience: 'Restaurants, cafes, catering businesses, meal prep services',
    whyItWorks: 'Interactive menus increase average order value by 15-20%. Diners who feel guided spend more and leave more satisfied. Plus, the email capture enables repeat-visit marketing.',
    iconPath: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
    tags: ['restaurant', 'food', 'menu', 'dining', 'cafe'],
    blocks: mealBuilderBlocks,
  },
  {
    id: 'stress_profile',
    category: 'Health & Fitness',
    name: 'Stress Profile Assessment',
    description: 'Help people understand their stress patterns and match them to the right practice or program. Builds deep trust before the first session.',
    audience: 'Yoga studios, meditation teachers, therapists, wellness centers',
    whyItWorks: 'People searching for stress relief are high-intent but unsure where to start. This quiz meets them with empathy and gives a clear next step — conversion rates of 40-50%.',
    iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
    tags: ['wellness', 'yoga', 'meditation', 'stress', 'therapy', 'mindfulness'],
    blocks: stressProfileBlocks,
  },
  {
    id: 'interior_style',
    category: 'Lifestyle',
    name: 'Interior Design Style Quiz',
    description: 'Reveal a visitor\'s design style and connect them with the right service tier. The highest-converting quiz format for interior designers.',
    audience: 'Interior designers, home decor brands, furniture stores',
    whyItWorks: 'Design style quizzes are one of the most shared quiz types on Pinterest and Instagram. They drive organic traffic and pre-qualify leads by budget and timeline.',
    iconPath: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
    tags: ['interior', 'design', 'home', 'decor', 'style', 'furniture'],
    blocks: interiorStyleBlocks,
  },
  {
    id: 'signature_scent',
    category: 'Ecommerce',
    name: 'Find Your Signature Scent',
    description: 'Match shoppers to their perfect candle, fragrance, or scented product based on mood, season, and preferences.',
    audience: 'Candle makers, fragrance brands, artisan shops, bath and body',
    whyItWorks: 'Scent is subjective and hard to shop for online. This quiz removes guesswork and creates a personal connection to the product — resulting in fewer returns and higher satisfaction.',
    iconPath: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z',
    tags: ['candle', 'scent', 'fragrance', 'artisan', 'handmade', 'ecommerce'],
    blocks: signatureScentBlocks,
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
