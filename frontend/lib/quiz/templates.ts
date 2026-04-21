/**
 * Quiz templates — production-ready, Typeform-quality quiz structures
 * with real content, high-quality imagery, and polished interactions.
 *
 * 13 templates covering the most popular quiz categories:
 * product recommendation, skincare, feedback, research, lead gen,
 * product feedback, events, employee satisfaction, apparel orders,
 * subscription renewal, data capture, ecommerce lead gen, and trivia.
 *
 * Every template uses:
 *   - imageChoice questions with real Unsplash images on options
 *   - mediaUrl on questions for contextual visuals
 *   - imageUrl on outcomes for rich result pages
 *   - Real, specific copy — zero placeholders
 *   - 5-7 questions for optimal completion rates
 *   - Lead gate before results with compelling value exchange
 *   - 3 scored outcomes with distinct score ranges
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
/*  1. PRODUCT RECOMMENDATION QUIZ — Ecommerce stores                  */
/* ------------------------------------------------------------------ */

function productRecommendationBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What brings you here today?',
      subtitle: 'We will use this to personalize your recommendations.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Treating myself', score: 3, imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Finding a gift', score: 2, imageUrl: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Upgrading my wardrobe', score: 4, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Just browsing for ideas', score: 1, imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which style feels most like you?',
      questionStyle: 'imageChoice', questionType: 'single',
      options: [
        { id: uid(), text: 'Minimal and clean', score: 4, imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bold and expressive', score: 3, imageUrl: 'https://images.unsplash.com/photo-1534126416832-a88fdf2911c2?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Classic and timeless', score: 2, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Relaxed and effortless', score: 1, imageUrl: 'https://images.unsplash.com/photo-1523381294911-8d1acca0cba8?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your budget for this purchase?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $50', score: 1 },
        { id: uid(), text: '$50 to $150', score: 2 },
        { id: uid(), text: '$150 to $300', score: 3 },
        { id: uid(), text: '$300 and above', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What matters most when choosing a product?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Craftsmanship and materials', score: 4 },
        { id: uid(), text: 'How it looks and feels', score: 3 },
        { id: uid(), text: 'Sustainability and ethics', score: 2 },
        { id: uid(), text: 'Value for the price', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would your best friend describe your taste?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Refined and intentional', score: 4 },
        { id: uid(), text: 'Creative and surprising', score: 3 },
        { id: uid(), text: 'Practical and reliable', score: 2 },
        { id: uid(), text: 'Fun and spontaneous', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'When do you need this?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'As soon as possible', score: 3 },
        { id: uid(), text: 'Within a week or two', score: 2 },
        { id: uid(), text: 'No rush, just looking', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized picks are ready',
      subtext: 'Enter your email to see your curated selection and unlock 15% off your first order.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my recommendations',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Signature Collection',
      description: 'You have discerning taste and appreciate quality that lasts. We have curated our Signature Collection for you — handpicked pieces crafted from premium materials with clean silhouettes and intentional details. Each item is designed to become a staple you reach for again and again.',
      ctaText: 'Shop the Signature Collection', ctaUrl: '/shop/signature',
      imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80&fit=crop',
      minScore: 16, maxScore: 24, shareEnabled: true,
      shareText: 'I got The Signature Collection! Take the quiz to find your perfect match.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Essentials Edit',
      description: 'You know what you want — great quality, smart design, and honest pricing. Our Essentials Edit is built for you. These are the pieces that work hard, look sharp, and pair with everything in your closet. No filler, no fluff — just the good stuff.',
      ctaText: 'Shop the Essentials Edit', ctaUrl: '/shop/essentials',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80&fit=crop',
      minScore: 9, maxScore: 15, shareEnabled: true,
      shareText: 'The Essentials Edit is my match! Find yours with this quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Discovery Box',
      description: 'You are open to surprises and love exploring new things. Our Discovery Box is a curated selection of staff favorites and new arrivals, shipped to your door. Let us introduce you to your next obsession — no commitment, all fun.',
      ctaText: 'Get the Discovery Box', ctaUrl: '/shop/discovery',
      imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 8, shareEnabled: true,
      shareText: 'I am a Discovery Box person! What about you?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  2. PERSONALIZED SKINCARE QUIZ — Beauty brands                      */
/* ------------------------------------------------------------------ */

function personalizedSkincareBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How would you describe your skin on a typical day?',
      subtitle: 'Think about how your skin looks and feels by midafternoon.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Dry and tight', score: 1, imageUrl: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Oily and shiny', score: 2, imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Combination', score: 3, imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Sensitive and reactive', score: 4, imageUrl: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your number one skin concern right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Acne, breakouts, or clogged pores', score: 1 },
        { id: uid(), text: 'Fine lines, wrinkles, or loss of firmness', score: 2 },
        { id: uid(), text: 'Dark spots, hyperpigmentation, or uneven tone', score: 3 },
        { id: uid(), text: 'Redness, irritation, or sensitivity', score: 4 },
        { id: uid(), text: 'Dullness, dryness, or dehydration', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you describe your current skincare routine?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I barely wash my face', score: 1 },
        { id: uid(), text: 'Cleanser and moisturizer', score: 2 },
        { id: uid(), text: 'A few serums and SPF too', score: 3 },
        { id: uid(), text: 'Full multi-step ritual', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What kind of ingredients do you prefer?',
      questionStyle: 'imageChoice', questionType: 'single',
      options: [
        { id: uid(), text: 'Natural and plant-based', score: 3, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Science-backed actives', score: 2, imageUrl: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Gentle and fragrance-free', score: 4, imageUrl: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Whatever works, I am open', score: 1, imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How much time can you dedicate to skincare each morning?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under 2 minutes', score: 1 },
        { id: uid(), text: '2 to 5 minutes', score: 2 },
        { id: uid(), text: '5 to 10 minutes', score: 3 },
        { id: uid(), text: 'I love taking my time', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How does your skin react to sun exposure?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Burns easily, rarely tans', score: 4 },
        { id: uid(), text: 'Burns first then tans', score: 3 },
        { id: uid(), text: 'Tans easily, rarely burns', score: 2 },
        { id: uid(), text: 'I always wear SPF so I am not sure', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your custom skincare routine is ready',
      subtext: 'We built a personalized routine based on your skin profile. Enter your email to see your results and get a free skincare guide.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Reveal my routine',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Barrier Repair Ritual',
      description: 'Your skin is asking for extra care and gentleness. We recommend a calming cleanser with ceramides, a centella asiatica serum to reduce redness, and a rich barrier cream to lock in moisture. Skip harsh exfoliants for now — your skin will thank you. Most people see visible improvement in 10 to 14 days with this routine.',
      ctaText: 'Shop the Barrier Repair Kit', ctaUrl: '/shop/barrier-repair',
      imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80&fit=crop',
      minScore: 17, maxScore: 27, shareEnabled: true,
      shareText: 'Just found my perfect skincare routine! Take the quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Glow Reset System',
      description: 'Your skin has great potential but needs a targeted boost. We recommend a gentle vitamin C serum in the morning for brightness, a niacinamide treatment to refine pores and even tone, and a lightweight hydrating moisturizer with SPF. This three-step system is designed for visible results without complexity.',
      ctaText: 'Shop the Glow Reset', ctaUrl: '/shop/glow-reset',
      imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&q=80&fit=crop',
      minScore: 10, maxScore: 16, shareEnabled: true,
      shareText: 'Found my perfect skincare match with this quiz!',
    },
    {
      id: uid(), type: 'outcome', title: 'The Clear Skin Protocol',
      description: 'Your skin needs targeted treatment to get breakouts under control and balance oil production. We recommend a salicylic acid cleanser, a lightweight niacinamide serum to calm inflammation and minimize pores, and a gel moisturizer that hydrates without clogging. Consistency is key — stick with it for 21 days before switching anything.',
      ctaText: 'Shop the Clear Skin Kit', ctaUrl: '/shop/clear-skin',
      imageUrl: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 9, shareEnabled: true,
      shareText: 'This skincare quiz nailed my skin type!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  3. CUSTOMER FEEDBACK SURVEY — Post-purchase satisfaction            */
/* ------------------------------------------------------------------ */

function customerFeedbackBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Overall, how satisfied are you with your recent purchase?',
      subtitle: 'Your honest feedback helps us improve.',
      questionStyle: 'buttons', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Very satisfied', score: 5 },
        { id: uid(), text: 'Satisfied', score: 4 },
        { id: uid(), text: 'Neutral', score: 3 },
        { id: uid(), text: 'Dissatisfied', score: 2 },
        { id: uid(), text: 'Very dissatisfied', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you rate the quality of the product you received?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Exceeded expectations', score: 5 },
        { id: uid(), text: 'Met expectations', score: 4 },
        { id: uid(), text: 'About what I expected', score: 3 },
        { id: uid(), text: 'Below expectations', score: 2 },
        { id: uid(), text: 'Much worse than expected', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How was the ordering and delivery experience?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Seamless from start to finish', score: 5 },
        { id: uid(), text: 'Mostly smooth with minor hiccups', score: 3 },
        { id: uid(), text: 'Some frustrating issues', score: 2 },
        { id: uid(), text: 'I had a difficult experience', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How likely are you to recommend us to a friend or colleague?',
      subtitle: 'On a scale from "not likely" to "absolutely".',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Definitely would', score: 5 },
        { id: uid(), text: 'Probably would', score: 4 },
        { id: uid(), text: 'Not sure', score: 3 },
        { id: uid(), text: 'Probably not', score: 2 },
        { id: uid(), text: 'Definitely not', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What was the best part of your experience with us?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'The product quality', score: 4 },
        { id: uid(), text: 'The customer service', score: 3 },
        { id: uid(), text: 'The fast shipping', score: 2 },
        { id: uid(), text: 'The packaging and unboxing', score: 1 },
        { id: uid(), text: 'The overall value for money', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Will you be shopping with us again?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Already planning my next order', score: 5 },
        { id: uid(), text: 'Very likely', score: 4 },
        { id: uid(), text: 'Maybe, depends on new arrivals', score: 3 },
        { id: uid(), text: 'I need to think about it', score: 2 },
        { id: uid(), text: 'Unlikely', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Thank you for your feedback',
      subtext: 'As a thank you, we would like to send you 10% off your next order. Enter your email below.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'Get my 10% off',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'You are a superfan!',
      description: 'We are thrilled you had such a great experience. Customers like you are the reason we do what we do. As a loyal supporter, you will be the first to hear about new launches, exclusive drops, and VIP-only deals. Keep an eye on your inbox — something special is coming your way soon.',
      ctaText: 'Join the VIP List', ctaUrl: '/vip',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&fit=crop',
      minScore: 22, maxScore: 30, shareEnabled: true,
      shareText: 'Love this brand! Just shared my feedback.',
    },
    {
      id: uid(), type: 'outcome', title: 'Glad you had a solid experience',
      description: 'Thanks for sharing your thoughts. It sounds like things went well overall, and we want to make sure your next order is even better. We are always refining our products and process based on feedback like yours. Check out what is new — you might find your next favorite.',
      ctaText: 'See What is New', ctaUrl: '/new-arrivals',
      imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80&fit=crop',
      minScore: 13, maxScore: 21, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'We hear you and we will do better',
      description: 'We are sorry your experience was not what you hoped for. Your feedback is genuinely valuable and has been shared with our team. We take every concern seriously and are already working on improvements. A member of our customer care team will reach out to make things right.',
      ctaText: 'Contact Our Team', ctaUrl: '/support',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 12, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  4. PRODUCT RESEARCH SURVEY — Market research                       */
/* ------------------------------------------------------------------ */

function productResearchBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How did you first hear about us?',
      subtitle: 'Helps us understand what is working.',
      questionStyle: 'cards', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Social media (Instagram, TikTok, Facebook)', score: 3 },
        { id: uid(), text: 'A friend or family member told me', score: 4 },
        { id: uid(), text: 'Search engine (Google, Bing)', score: 2 },
        { id: uid(), text: 'Blog post or online article', score: 1 },
        { id: uid(), text: 'Podcast or YouTube', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What problem were you trying to solve when you found us?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'I could not find a product that fit my specific needs', score: 4 },
        { id: uid(), text: 'I was unhappy with my current solution', score: 3 },
        { id: uid(), text: 'I was researching options before making a decision', score: 2 },
        { id: uid(), text: 'A friend recommended you for a specific use case', score: 5 },
        { id: uid(), text: 'I stumbled on you by chance', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What was your first impression of our product?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Immediately impressed', score: 5 },
        { id: uid(), text: 'Intrigued but skeptical', score: 3 },
        { id: uid(), text: 'Confused about what it does', score: 1 },
        { id: uid(), text: 'Looked good but pricing concerned me', score: 2 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Compared to alternatives you have tried, how do we stack up?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Best option I have found', score: 5 },
        { id: uid(), text: 'Among the top contenders', score: 4 },
        { id: uid(), text: 'About the same as others', score: 3 },
        { id: uid(), text: 'I have not tried alternatives', score: 2 },
        { id: uid(), text: 'Others are better in some ways', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which feature or quality matters most to you?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Ease of use', score: 3 },
        { id: uid(), text: 'Build quality and materials', score: 4 },
        { id: uid(), text: 'Price and value', score: 2 },
        { id: uid(), text: 'Design and aesthetics', score: 5 },
        { id: uid(), text: 'Customer support and community', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How likely are you to switch from your current solution to ours?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Already made the switch', score: 5 },
        { id: uid(), text: 'Very likely', score: 4 },
        { id: uid(), text: 'Considering it', score: 3 },
        { id: uid(), text: 'Unlikely right now', score: 2 },
        { id: uid(), text: 'Not planning to switch', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Help us build what you actually want',
      subtext: 'Your insights are incredibly valuable. Leave your email and we will keep you posted on improvements inspired by your feedback.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'Full name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Submit my feedback',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Power User Profile',
      description: 'You are exactly the kind of customer we build for — engaged, opinionated, and high-intent. Your feedback tells us you value quality and thoughtful design. We would love to include you in our early access program for upcoming releases.',
      ctaText: 'Join Early Access', ctaUrl: '/early-access',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&fit=crop',
      minScore: 22, maxScore: 30, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Potential Champion',
      description: 'You see promise in what we are building and have given us thoughtful, balanced feedback. Customers like you help us prioritize the right improvements. Stay tuned — we are actively working on the areas you care about most.',
      ctaText: 'See Our Roadmap', ctaUrl: '/roadmap',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&fit=crop',
      minScore: 13, maxScore: 21, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'We Have Work To Do',
      description: 'Thank you for being candid with us. Your feedback highlights real gaps we need to address. We have shared your responses directly with our product team and will use them to guide our next round of improvements. We appreciate your time and hope to earn your trust.',
      ctaText: 'Share More Thoughts', ctaUrl: '/feedback',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 12, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  5. LEAD GENERATION QUIZ — B2B qualification                        */
/* ------------------------------------------------------------------ */

function leadGenerationBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What best describes your business?',
      subtitle: 'This helps us tailor our recommendation to your situation.',
      questionStyle: 'cards', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Solo founder or freelancer', score: 1 },
        { id: uid(), text: 'Small team (2 to 10 people)', score: 2 },
        { id: uid(), text: 'Growing company (11 to 50)', score: 3 },
        { id: uid(), text: 'Established business (50 and above)', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest challenge right now?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Getting enough qualified leads', score: 4 },
        { id: uid(), text: 'Converting leads into paying customers', score: 3 },
        { id: uid(), text: 'Retaining customers and reducing churn', score: 2 },
        { id: uid(), text: 'Scaling operations without losing quality', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your monthly marketing budget?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $1,000', score: 1 },
        { id: uid(), text: '$1,000 to $5,000', score: 2 },
        { id: uid(), text: '$5,000 to $20,000', score: 3 },
        { id: uid(), text: 'Over $20,000', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How are you currently generating leads?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Mostly word of mouth and referrals', score: 1 },
        { id: uid(), text: 'Social media and content marketing', score: 2 },
        { id: uid(), text: 'Paid ads (Google, Meta, LinkedIn)', score: 3 },
        { id: uid(), text: 'A mix of organic and paid channels', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How quickly are you looking to see results?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Within 30 days', score: 4 },
        { id: uid(), text: 'Within 90 days', score: 3 },
        { id: uid(), text: 'Over the next 6 months', score: 2 },
        { id: uid(), text: 'Building for the long term', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Are you the primary decision-maker for this?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Yes, I make the final call', score: 4 },
        { id: uid(), text: 'I influence the decision', score: 3 },
        { id: uid(), text: 'I am researching for someone else', score: 2 },
        { id: uid(), text: 'It is a team decision', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized growth plan is ready',
      subtext: 'See exactly which strategy matches your business stage, plus get a free consultation with our team.',
      fields: [
        { id: uid(), type: 'email', label: 'Work email', required: true, placeholder: 'you@company.com' },
        { id: uid(), type: 'name', label: 'Full name', required: true, placeholder: 'Your name' },
        { id: uid(), type: 'company', label: 'Company name', required: false, placeholder: 'Your company' },
      ],
      buttonLabel: 'Get my growth plan',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Enterprise Growth Package',
      description: 'Your business is ready for a full-scale growth engine. We recommend our Enterprise package — a done-for-you system that includes multi-channel lead generation, automated nurture sequences, CRM integration, and dedicated strategy calls. Designed for companies generating $5K or more in monthly marketing spend who want measurable ROI.',
      ctaText: 'Book a Strategy Call', ctaUrl: '/enterprise',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fit=crop',
      minScore: 17, maxScore: 24, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Growth Accelerator',
      description: 'You have momentum and need the right systems to scale. Our Growth Accelerator gives you a proven playbook: landing pages, lead magnets, email sequences, and analytics dashboards — all built and optimized for your market. Most clients see 2 to 3x their lead volume within 60 days.',
      ctaText: 'Explore the Accelerator', ctaUrl: '/accelerator',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&fit=crop',
      minScore: 10, maxScore: 16, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Starter Blueprint',
      description: 'You are building your foundation and need a smart starting point. Our Starter Blueprint is a self-paced program with templates, tutorials, and a step-by-step guide to setting up your first lead generation funnel. No fluff, no overwhelm — just the essentials that work.',
      ctaText: 'Get the Starter Blueprint', ctaUrl: '/starter',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 9, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  6. PRODUCT FEEDBACK SURVEY — Feature and UX feedback               */
/* ------------------------------------------------------------------ */

function productFeedbackBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How often do you use our product?',
      subtitle: 'Be honest — every data point helps.',
      questionStyle: 'buttons', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Every day', score: 5 },
        { id: uid(), text: 'A few times a week', score: 4 },
        { id: uid(), text: 'A few times a month', score: 3 },
        { id: uid(), text: 'Rarely', score: 2 },
        { id: uid(), text: 'I just started using it', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the single most valuable feature for you?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'The core workflow — it just works', score: 5 },
        { id: uid(), text: 'Integrations with other tools I use', score: 4 },
        { id: uid(), text: 'The design and user experience', score: 3 },
        { id: uid(), text: 'Analytics and reporting', score: 2 },
        { id: uid(), text: 'Collaboration features', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the most frustrating part of using our product?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'It is slow or has performance issues', score: 1 },
        { id: uid(), text: 'Missing features I need', score: 2 },
        { id: uid(), text: 'Confusing navigation or UI', score: 3 },
        { id: uid(), text: 'Bugs and reliability issues', score: 4 },
        { id: uid(), text: 'Honestly, nothing major', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How easy is our product to use?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Incredibly intuitive', score: 5 },
        { id: uid(), text: 'Easy after a short learning curve', score: 4 },
        { id: uid(), text: 'Takes some getting used to', score: 3 },
        { id: uid(), text: 'Often confusing', score: 2 },
        { id: uid(), text: 'Needs significant improvement', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'If you could change one thing about our product, what would it be?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Make it faster and more responsive', score: 3 },
        { id: uid(), text: 'Add more customization options', score: 4 },
        { id: uid(), text: 'Simplify the interface', score: 2 },
        { id: uid(), text: 'Better mobile experience', score: 1 },
        { id: uid(), text: 'I would not change much', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How likely are you to recommend us to a colleague?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Already have', score: 5 },
        { id: uid(), text: 'Very likely', score: 4 },
        { id: uid(), text: 'Somewhat likely', score: 3 },
        { id: uid(), text: 'Not likely', score: 2 },
        { id: uid(), text: 'Would not recommend', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Want to shape what we build next?',
      subtext: 'Join our product feedback community. You will get early access to new features and a direct line to our product team.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'Join the feedback community',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Power User',
      description: 'You are one of our most engaged and satisfied customers. Your deep usage gives you insights we cannot get anywhere else. We would love to invite you to our beta testing group for early access to upcoming features. Your feedback directly influences our product roadmap.',
      ctaText: 'Join Beta Testing', ctaUrl: '/beta',
      imageUrl: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80&fit=crop',
      minScore: 22, maxScore: 30, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Active User',
      description: 'You use our product regularly and see real value, with some areas for improvement. Your balanced perspective is exactly what helps us prioritize the right updates. We have noted your feedback and our product team is already working on several improvements you will appreciate.',
      ctaText: 'See Our Changelog', ctaUrl: '/changelog',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&fit=crop',
      minScore: 13, maxScore: 21, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'We Want to Win You Back',
      description: 'Your feedback tells us we have not delivered the experience you deserve. We genuinely appreciate you taking the time to share this. Our team will review your specific concerns and a product specialist will follow up with an update on what we are doing about it.',
      ctaText: 'Talk to Our Team', ctaUrl: '/support',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 12, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  7. EVENT FEEDBACK FORM — Post-event satisfaction                    */
/* ------------------------------------------------------------------ */

function eventFeedbackBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How would you rate the event overall?',
      subtitle: 'Think about the full experience from start to finish.',
      questionStyle: 'buttons', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1540575467063-178a50da2db7?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Outstanding', score: 5 },
        { id: uid(), text: 'Very good', score: 4 },
        { id: uid(), text: 'Good', score: 3 },
        { id: uid(), text: 'Fair', score: 2 },
        { id: uid(), text: 'Poor', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How relevant was the content to your needs?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Exactly what I needed', score: 5 },
        { id: uid(), text: 'Mostly relevant', score: 4 },
        { id: uid(), text: 'Somewhat relevant', score: 3 },
        { id: uid(), text: 'Not very relevant', score: 2 },
        { id: uid(), text: 'Not relevant at all', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How were the speakers and presenters?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Engaging, knowledgeable, and inspiring', score: 5 },
        { id: uid(), text: 'Good content but delivery could improve', score: 3 },
        { id: uid(), text: 'Hit or miss across different sessions', score: 2 },
        { id: uid(), text: 'Did not find the sessions very useful', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How was the venue and logistics?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Everything ran smoothly', score: 5 },
        { id: uid(), text: 'Mostly well organized', score: 4 },
        { id: uid(), text: 'Some organizational hiccups', score: 2 },
        { id: uid(), text: 'Significant issues with logistics', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What was the highlight of the event for you?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'The keynote presentations', score: 4 },
        { id: uid(), text: 'Networking and meeting new people', score: 5 },
        { id: uid(), text: 'The workshops and breakout sessions', score: 3 },
        { id: uid(), text: 'The overall atmosphere and energy', score: 2 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Would you attend this event again next year?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Absolutely, already planning on it', score: 5 },
        { id: uid(), text: 'Very likely', score: 4 },
        { id: uid(), text: 'Depends on the lineup and pricing', score: 3 },
        { id: uid(), text: 'Probably not', score: 2 },
        { id: uid(), text: 'No', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Get first access to next year\'s event',
      subtext: 'Be the first to know about early bird tickets and speaker announcements. Plus get a recap of this year\'s highlights.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'Full name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Get early access',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Event Superfan',
      description: 'You absolutely loved it. We are so glad this event delivered real value for you. You will be first in line for early bird tickets next year, and we are saving you a spot in our VIP attendee group for exclusive content, networking opportunities, and speaker Q&A sessions between events.',
      ctaText: 'Join the VIP Group', ctaUrl: '/events/vip',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50da2db7?w=800&q=80&fit=crop',
      minScore: 22, maxScore: 30, shareEnabled: true,
      shareText: 'What an incredible event! Already excited for next year.',
    },
    {
      id: uid(), type: 'outcome', title: 'Solid Experience',
      description: 'Glad the event was worthwhile for you. Your feedback helps us improve specific areas for next time. We are already working on better session curation and logistics based on attendee feedback like yours. Check your inbox for the full event recap and session recordings.',
      ctaText: 'View Event Recap', ctaUrl: '/events/recap',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80&fit=crop',
      minScore: 13, maxScore: 21, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Room for Improvement',
      description: 'We appreciate your honest feedback. The event did not meet your expectations and we want to understand why. Our events team will review your specific responses and use them to make meaningful improvements. If you would like to share more detail, we are all ears.',
      ctaText: 'Share More Feedback', ctaUrl: '/events/feedback',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 12, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  8. EMPLOYEE SATISFACTION SURVEY — HR and workplace culture          */
/* ------------------------------------------------------------------ */

function employeeSatisfactionBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How satisfied are you with your role and day-to-day work?',
      subtitle: 'Your responses are completely anonymous.',
      questionStyle: 'buttons', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Very satisfied — I love what I do', score: 5 },
        { id: uid(), text: 'Mostly satisfied', score: 4 },
        { id: uid(), text: 'It is okay', score: 3 },
        { id: uid(), text: 'Not very satisfied', score: 2 },
        { id: uid(), text: 'Actively unhappy', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you feel your manager supports your growth?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Absolutely — they invest in my development', score: 5 },
        { id: uid(), text: 'Yes, for the most part', score: 4 },
        { id: uid(), text: 'Sometimes', score: 3 },
        { id: uid(), text: 'Rarely', score: 2 },
        { id: uid(), text: 'Not at all', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you describe our company culture?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Collaborative, transparent, and energizing', score: 5 },
        { id: uid(), text: 'Generally positive with some areas to improve', score: 4 },
        { id: uid(), text: 'Depends on the team or department', score: 3 },
        { id: uid(), text: 'Could use significant improvement', score: 2 },
        { id: uid(), text: 'Toxic or draining', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you feel recognized for your contributions?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Regularly and meaningfully', score: 5 },
        { id: uid(), text: 'Sometimes, when I go above and beyond', score: 3 },
        { id: uid(), text: 'Rarely acknowledged', score: 2 },
        { id: uid(), text: 'Almost never', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How confident are you in leadership\'s direction for the company?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Very confident — clear vision and execution', score: 5 },
        { id: uid(), text: 'Mostly confident', score: 4 },
        { id: uid(), text: 'Uncertain', score: 3 },
        { id: uid(), text: 'Not very confident', score: 2 },
        { id: uid(), text: 'Concerned about the direction', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Would you recommend this company as a great place to work?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Enthusiastically yes', score: 5 },
        { id: uid(), text: 'Yes, with some caveats', score: 4 },
        { id: uid(), text: 'Maybe, depends on the person', score: 3 },
        { id: uid(), text: 'Probably not', score: 2 },
        { id: uid(), text: 'No', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your voice matters to us',
      subtext: 'Optionally leave your email to receive a summary of actions we are taking based on team feedback. All survey responses remain anonymous.',
      fields: [
        { id: uid(), type: 'email', label: 'Email (optional)', required: false, placeholder: 'you@company.com' },
      ],
      buttonLabel: 'Submit my feedback',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Thriving at Work',
      description: 'You are engaged, supported, and optimistic about where things are headed. That is exactly the kind of environment we are working to build for everyone. Thank you for letting us know what is working — it helps us protect and strengthen the things that matter most.',
      ctaText: 'View Company Updates', ctaUrl: '/internal/updates',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80&fit=crop',
      minScore: 22, maxScore: 30, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Room to Grow',
      description: 'Your feedback tells us things are going well in some areas but there is meaningful room for improvement in others. We hear you. Your responses have been flagged to our people team and will directly inform our next set of initiatives around culture, recognition, and development.',
      ctaText: 'View Our People Initiatives', ctaUrl: '/internal/people',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&fit=crop',
      minScore: 13, maxScore: 21, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'We Need to Do Better',
      description: 'We hear you, and we take this seriously. Your feedback signals that we are falling short in areas that matter. Our leadership team will be reviewing these results and committing to specific, measurable changes. If you feel comfortable, we encourage you to reach out to HR directly — every voice counts.',
      ctaText: 'Contact HR Confidentially', ctaUrl: '/internal/hr',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 12, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  9. CUSTOM APPAREL ORDER — T-shirt / merch ordering                 */
/* ------------------------------------------------------------------ */

function customApparelBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What are you ordering for?',
      subtitle: 'This helps us recommend the right style and quantity options.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Team or company merch', score: 4, imageUrl: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Event or conference swag', score: 3, imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50da2db7?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Personal or small batch', score: 1, imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Online store or brand launch', score: 2, imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which style do you prefer?',
      questionStyle: 'imageChoice', questionType: 'single',
      options: [
        { id: uid(), text: 'Classic crew neck tee', score: 1, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Premium heavyweight tee', score: 3, imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Pullover hoodie', score: 4, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Zip-up jacket', score: 2, imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How many pieces do you need?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: '1 to 10 pieces', score: 1 },
        { id: uid(), text: '11 to 50 pieces', score: 2 },
        { id: uid(), text: '51 to 200 pieces', score: 3 },
        { id: uid(), text: '200 or more', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Do you already have a design ready?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Yes, print-ready files are good to go', score: 4 },
        { id: uid(), text: 'I have a rough concept or sketch', score: 3 },
        { id: uid(), text: 'I have a logo but need design help', score: 2 },
        { id: uid(), text: 'Starting from scratch — I need everything', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'When do you need these delivered?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Within 2 weeks (rush)', score: 4 },
        { id: uid(), text: '2 to 4 weeks', score: 3 },
        { id: uid(), text: '4 to 6 weeks', score: 2 },
        { id: uid(), text: 'No rush, flexible timeline', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your custom order quote is ready',
      subtext: 'Get a detailed price estimate based on your selections. We will follow up within 24 hours with mockups and options.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'Full name', required: true, placeholder: 'Your name' },
        { id: uid(), type: 'phone', label: 'Phone (optional)', required: false, placeholder: '(555) 123-4567' },
      ],
      buttonLabel: 'Get my quote',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Premium Custom Package',
      description: 'For your order size and timeline, we recommend our Premium Custom Package. This includes premium-weight garments, up to 4-color screen printing or full DTG printing, custom hang tags, individual poly-bagging, and priority production. Design consultation included if needed. We will send you a detailed quote within 24 hours.',
      ctaText: 'View Premium Options', ctaUrl: '/orders/premium',
      imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Standard Order',
      description: 'Our Standard Order is the sweet spot for most customers. You get quality blanks, clean printing, and reliable turnaround at a great per-unit price. We handle everything from design proofing to shipping. Expect your quote and digital mockups in your inbox within 24 hours.',
      ctaText: 'See Standard Pricing', ctaUrl: '/orders/standard',
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80&fit=crop',
      minScore: 7, maxScore: 13, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Starter Order',
      description: 'Perfect for small batches and first-timers. Our Starter Order gives you access to our full catalog with no minimum quantity requirements. Choose from a curated selection of blanks, upload your design or work with our team, and get your order in as few as 5 business days. No setup fees.',
      ctaText: 'Start Your Order', ctaUrl: '/orders/starter',
      imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 6, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  10. SUBSCRIPTION RENEWAL — SaaS and service renewals               */
/* ------------------------------------------------------------------ */

function subscriptionRenewalBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How has your experience been with our service so far?',
      subtitle: 'Your renewal options are based on your answers.',
      questionStyle: 'buttons', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Excellent — it is essential to my workflow', score: 5 },
        { id: uid(), text: 'Good — I use it regularly', score: 4 },
        { id: uid(), text: 'Decent — it gets the job done', score: 3 },
        { id: uid(), text: 'Mixed — some things work, some do not', score: 2 },
        { id: uid(), text: 'Disappointing — considering alternatives', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which features do you use most?',
      questionStyle: 'cards', questionType: 'multiple',
      options: [
        { id: uid(), text: 'Core product features', score: 4 },
        { id: uid(), text: 'Reporting and analytics', score: 3 },
        { id: uid(), text: 'Integrations and API access', score: 2 },
        { id: uid(), text: 'Team collaboration tools', score: 1 },
        { id: uid(), text: 'Customer support resources', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Are there features on your current plan you are not using?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'I use everything available to me', score: 5 },
        { id: uid(), text: 'I use most features', score: 4 },
        { id: uid(), text: 'I probably only use half', score: 3 },
        { id: uid(), text: 'I mainly use a few key features', score: 2 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How important is this tool to your daily workflow?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Mission critical — can not work without it', score: 5 },
        { id: uid(), text: 'Very important — use it every day', score: 4 },
        { id: uid(), text: 'Useful but not essential', score: 3 },
        { id: uid(), text: 'Nice to have', score: 2 },
        { id: uid(), text: 'I could find an alternative', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Would you be interested in upgrading for additional features?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Yes, I need more than what I have now', score: 5 },
        { id: uid(), text: 'Maybe, if the price is right', score: 4 },
        { id: uid(), text: 'Happy with my current plan', score: 3 },
        { id: uid(), text: 'I actually want to downgrade', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized renewal offer is ready',
      subtext: 'Based on your usage and preferences, we have put together the best renewal option for you. See your custom pricing below.',
      fields: [
        { id: uid(), type: 'email', label: 'Account email', required: true, placeholder: 'you@company.com' },
      ],
      buttonLabel: 'See my renewal offer',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Upgrade to Pro — Save 20%',
      description: 'You are clearly getting massive value from our platform and are ready for more. We are offering you an exclusive upgrade to our Pro plan at 20% off the annual price. This unlocks advanced analytics, priority support, API access, and unlimited team members. Lock in this rate before your renewal date.',
      ctaText: 'Upgrade to Pro', ctaUrl: '/billing/upgrade',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&fit=crop',
      minScore: 20, maxScore: 29, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Renew Your Current Plan',
      description: 'Your current plan seems like a solid fit for how you use our platform. We are happy to renew you at the same rate with no changes. If you want to explore options, our team is available for a quick plan review to make sure you are getting the most out of your subscription.',
      ctaText: 'Renew My Plan', ctaUrl: '/billing/renew',
      imageUrl: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80&fit=crop',
      minScore: 11, maxScore: 19, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Let Us Find the Right Fit',
      description: 'It sounds like your current plan might not be the best match for your needs. No hard feelings — we want you on the plan that makes the most sense. Let us schedule a quick 15-minute call to review your usage and find the option that works best for you.',
      ctaText: 'Schedule a Plan Review', ctaUrl: '/billing/review',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 10, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  11. DATA CAPTURE FORM — Contact and interest capture                */
/* ------------------------------------------------------------------ */

function dataCaptureBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What brings you to us today?',
      subtitle: 'Select the option that best describes your situation.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Exploring for the first time', score: 1, imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Comparing options before deciding', score: 2, imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Ready to get started', score: 4, imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I have specific questions', score: 3, imageUrl: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What industry are you in?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Technology and software', score: 4 },
        { id: uid(), text: 'Retail and ecommerce', score: 3 },
        { id: uid(), text: 'Professional services', score: 2 },
        { id: uid(), text: 'Healthcare or education', score: 1 },
        { id: uid(), text: 'Creative and media', score: 5 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How big is your team?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Just me', score: 1 },
        { id: uid(), text: '2 to 10 people', score: 2 },
        { id: uid(), text: '11 to 50 people', score: 3 },
        { id: uid(), text: '50 or more', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is most important to you when choosing a solution?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Ease of setup and use', score: 2 },
        { id: uid(), text: 'Powerful features and flexibility', score: 4 },
        { id: uid(), text: 'Pricing and value', score: 1 },
        { id: uid(), text: 'Customer support quality', score: 3 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How soon are you looking to make a decision?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'This week', score: 4 },
        { id: uid(), text: 'Within a month', score: 3 },
        { id: uid(), text: 'Within 3 months', score: 2 },
        { id: uid(), text: 'Just exploring for now', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Let us get you the right information',
      subtext: 'Tell us how to reach you and we will send over exactly what you need — pricing, case studies, or a personal demo.',
      fields: [
        { id: uid(), type: 'email', label: 'Work email', required: true, placeholder: 'you@company.com' },
        { id: uid(), type: 'name', label: 'Full name', required: true, placeholder: 'Your name' },
        { id: uid(), type: 'company', label: 'Company', required: false, placeholder: 'Your company' },
        { id: uid(), type: 'phone', label: 'Phone (optional)', required: false, placeholder: '(555) 123-4567' },
      ],
      buttonLabel: 'Send me the details',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Ready for a Personal Demo',
      description: 'Based on your responses, you are ready to see our platform in action. We will set up a personalized demo tailored to your industry and team size, walking through exactly how our solution solves the challenges you described. Expect a calendar invite in your inbox within the hour.',
      ctaText: 'Book My Demo', ctaUrl: '/demo',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 22, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Check Out Our Resources',
      description: 'You are in research mode and we want to help you make a confident decision. We are sending you a curated package: an interactive product tour, relevant case studies from your industry, and a comparison guide. Take your time — we are here whenever you are ready to chat.',
      ctaText: 'View Resources', ctaUrl: '/resources',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fit=crop',
      minScore: 7, maxScore: 13, shareEnabled: false,
    },
    {
      id: uid(), type: 'outcome', title: 'Start Exploring on Your Own',
      description: 'No pressure at all. We have a free plan and a self-guided product tour that lets you explore at your own pace. When you are ready for more, our team is just a click away. In the meantime, check out our getting started guide for the fastest path to value.',
      ctaText: 'Start Free', ctaUrl: '/signup',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 6, shareEnabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  12. ECOMMERCE LEAD GEN QUIZ — Shopping preference quiz              */
/* ------------------------------------------------------------------ */

function ecommerceLeadGenBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What are you looking for today?',
      subtitle: 'Pick the category that excites you most.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Jewelry and accessories', score: 4, imageUrl: 'https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Home and living', score: 3, imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Fashion and clothing', score: 2, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Beauty and self-care', score: 1, imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the occasion?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Everyday essentials', score: 1 },
        { id: uid(), text: 'Something special for myself', score: 3 },
        { id: uid(), text: 'A gift for someone I care about', score: 2 },
        { id: uid(), text: 'A celebration or milestone', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which aesthetic draws you in?',
      questionStyle: 'imageChoice', questionType: 'single',
      options: [
        { id: uid(), text: 'Modern and sleek', score: 4, imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bohemian and free', score: 2, imageUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Classic and refined', score: 3, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Cozy and organic', score: 1, imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your comfort zone for this purchase?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $50', score: 1 },
        { id: uid(), text: '$50 to $100', score: 2 },
        { id: uid(), text: '$100 to $250', score: 3 },
        { id: uid(), text: '$250 and above', score: 4 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you prefer to shop?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'I know exactly what I want', score: 3 },
        { id: uid(), text: 'I like browsing and discovering', score: 2 },
        { id: uid(), text: 'Show me your bestsellers', score: 4 },
        { id: uid(), text: 'Curate something for me', score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What seals the deal for you?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'Free shipping', score: 2 },
        { id: uid(), text: 'A first-order discount', score: 3 },
        { id: uid(), text: 'Seeing great reviews', score: 4 },
        { id: uid(), text: 'Knowing the brand story', score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your curated picks are waiting',
      subtext: 'Enter your email to see products handpicked for your taste. Plus, get 15% off your first order as a welcome gift.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Show me my picks',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Luxe Edit',
      description: 'You have an eye for quality and appreciate pieces with presence. We have curated The Luxe Edit for you — our most coveted items, each one handpicked for craftsmanship, design, and that unmistakable something special. These are the pieces people ask about. Your 15% welcome code is in your inbox.',
      ctaText: 'Shop The Luxe Edit', ctaUrl: '/collections/luxe',
      imageUrl: 'https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=800&q=80&fit=crop',
      minScore: 17, maxScore: 24, shareEnabled: true,
      shareText: 'I got The Luxe Edit! Take the style quiz to find your match.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Everyday Collection',
      description: 'You value style and substance in equal measure. The Everyday Collection is designed for people like you — beautiful pieces that fit seamlessly into your life without overthinking it. Reliable quality, smart design, and prices that feel right. Your 15% welcome code is waiting in your inbox.',
      ctaText: 'Shop The Everyday Collection', ctaUrl: '/collections/everyday',
      imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80&fit=crop',
      minScore: 10, maxScore: 16, shareEnabled: true,
      shareText: 'Found my perfect shop match! Take the quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Starter Set',
      description: 'Welcome aboard! You are new here and we want to make a great first impression. The Starter Set is our most-loved entry point — a curated selection of customer favorites at accessible prices. It is the perfect way to discover what we are about. Check your inbox for 15% off your first order.',
      ctaText: 'Shop The Starter Set', ctaUrl: '/collections/starter',
      imageUrl: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 9, shareEnabled: true,
      shareText: 'Just found a new favorite shop with this quiz!',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  13. TRIVIA CHALLENGE — Knowledge and engagement quiz                */
/* ------------------------------------------------------------------ */

function triviaChallengeBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is the most effective way to increase website conversions?',
      subtitle: 'Let us test your marketing knowledge.',
      questionStyle: 'cards', questionType: 'single',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Add more pages and content', score: 1, explanation: 'More content helps SEO but does not directly improve conversion rates on existing pages.' },
        { id: uid(), text: 'Simplify your call-to-action', score: 3, explanation: 'Correct! A clear, focused CTA is one of the highest-impact changes you can make. Studies show reducing choices increases action.' },
        { id: uid(), text: 'Use more colors and animations', score: 0, explanation: 'Visual flair can actually hurt conversions if it distracts from the core message and slows load times.' },
        { id: uid(), text: 'Post more on social media', score: 1, explanation: 'Social media drives traffic but does not directly affect what happens once someone lands on your site.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How long does it take a visitor to form a first impression of your website?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: '30 seconds', score: 1, explanation: 'Close, but research shows it happens much faster than that.' },
        { id: uid(), text: '3 to 5 seconds', score: 3, explanation: 'Correct! Google research shows users form opinions in as little as 50 milliseconds, with meaningful judgments solidifying within 3 to 5 seconds.' },
        { id: uid(), text: '1 minute', score: 0, explanation: 'Most visitors have already decided whether to stay or bounce well before the one-minute mark.' },
        { id: uid(), text: '10 seconds', score: 2, explanation: 'Getting warmer, but the real window is even shorter than you might think.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which of these is the strongest trust signal for first-time visitors?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Customer reviews and testimonials', score: 3, explanation: 'Correct! 93% of consumers say online reviews influence their purchasing decisions. Social proof is consistently the most powerful trust builder.' },
        { id: uid(), text: 'A professional-looking logo', score: 1, explanation: 'Important for brand recognition but not the strongest trust signal on its own.' },
        { id: uid(), text: 'An About page with team photos', score: 2, explanation: 'Helpful for personal brands and small businesses but less impactful than social proof.' },
        { id: uid(), text: 'Fancy website animations', score: 0, explanation: 'These can actually slow load times and reduce trust. Speed beats flash every time.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What percentage of all web traffic now comes from mobile devices?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: 'About 30%', score: 0, explanation: 'That was accurate around 2015. Mobile usage has grown dramatically since then.' },
        { id: uid(), text: 'About 50%', score: 2, explanation: 'Close, but you are still underestimating how dominant mobile has become.' },
        { id: uid(), text: 'Over 60%', score: 3, explanation: 'Correct! Mobile accounts for over 60% of global web traffic as of 2025. If your site is not mobile-first, you are losing the majority of your visitors.' },
        { id: uid(), text: 'About 40%', score: 1, explanation: 'Mobile surpassed this threshold several years ago and keeps climbing.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the ideal length for an email subject line?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: '5 words or fewer', score: 2, explanation: 'Short subject lines can work, but they often lack enough context to drive opens.' },
        { id: uid(), text: '6 to 10 words', score: 3, explanation: 'Correct! Research from multiple email platforms consistently shows 6 to 10 words hit the sweet spot for open rates, giving enough context without getting cut off on mobile.' },
        { id: uid(), text: '15 to 20 words', score: 0, explanation: 'Too long — most email clients truncate subject lines after 50 to 60 characters, especially on mobile.' },
        { id: uid(), text: 'It does not matter', score: 1, explanation: 'It absolutely matters. Subject line length has a measurable impact on open rates across every study.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which metric matters most for measuring content marketing success?',
      questionStyle: 'cards', questionType: 'single',
      options: [
        { id: uid(), text: 'Page views', score: 1, explanation: 'Views tell you about reach but not about impact. A million views with zero engagement is a vanity metric.' },
        { id: uid(), text: 'Time on page and engagement rate', score: 3, explanation: 'Correct! Engagement metrics show whether your content actually resonates and drives meaningful action. Quality beats quantity.' },
        { id: uid(), text: 'Number of blog posts published', score: 0, explanation: 'Publishing more without measuring impact is one of the most common content marketing traps.' },
        { id: uid(), text: 'Social media shares', score: 2, explanation: 'Shares indicate resonance but do not always translate to business results or conversions.' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is the average return on investment for email marketing?',
      questionStyle: 'buttons', questionType: 'single',
      options: [
        { id: uid(), text: '$10 for every $1 spent', score: 1, explanation: 'A solid return, but email marketing actually does even better than this.' },
        { id: uid(), text: '$36 for every $1 spent', score: 3, explanation: 'Correct! According to the DMA and Litmus, email marketing delivers an average ROI of $36 for every dollar spent, making it one of the highest-returning marketing channels.' },
        { id: uid(), text: '$5 for every $1 spent', score: 0, explanation: 'This dramatically underestimates email marketing ROI. Even modest email programs typically exceed this.' },
        { id: uid(), text: '$100 for every $1 spent', score: 2, explanation: 'Some exceptional campaigns hit these numbers, but the industry average is lower than this.' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'See how you scored',
      subtext: 'Get your results plus a free cheat sheet with the strategies behind each answer.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
      ],
      buttonLabel: 'Show my score',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Marketing Expert — 7/7',
      description: 'Incredible! You clearly know your stuff and stay on top of the latest research. You understand the fundamentals that drive real business results. Share your score to challenge your network, and check out our advanced playbooks for the tactics that separate good marketers from great ones.',
      ctaText: 'Explore Advanced Playbooks', ctaUrl: '/resources/advanced',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&fit=crop',
      minScore: 17, maxScore: 21, shareEnabled: true,
      shareText: 'I scored 7/7 on this marketing quiz! Think you can beat me?',
    },
    {
      id: uid(), type: 'outcome', title: 'Strong Foundation — 4 to 6 correct',
      description: 'Nice work! You have a solid understanding of the fundamentals with a few knowledge gaps to fill. The good news is that closing those gaps can have an outsized impact on your results. We put together a guide covering the strategies you missed — it is a quick read with big upside.',
      ctaText: 'Download the Complete Guide', ctaUrl: '/resources/guide',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&fit=crop',
      minScore: 9, maxScore: 16, shareEnabled: true,
      shareText: 'Scored well on this marketing knowledge quiz! Test yourself.',
    },
    {
      id: uid(), type: 'outcome', title: 'Room to Grow — 0 to 3 correct',
      description: 'No shame in starting here — most business owners have never been taught this stuff formally. The fact that you took this quiz shows you care about growing. We put together a free starter guide that covers everything you need to know, explained simply and without jargon.',
      ctaText: 'Get the Free Starter Guide', ctaUrl: '/resources/starter',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 8, shareEnabled: true,
      shareText: 'Just took a marketing knowledge quiz and learned a ton!',
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
    name: 'Product Recommendation Quiz',
    description: 'Match shoppers to their perfect product based on style, budget, and preferences. Proven to increase average order value by personalizing the shopping experience.',
    audience: 'Online stores, DTC brands, product-based businesses',
    whyItWorks: 'Brands like Warby Parker and Function of Beauty built empires on recommendation quizzes. They reduce decision fatigue and drive higher cart values.',
    iconPath: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
    tags: ['ecommerce', 'product', 'recommendation', 'shopping', 'dTC'],
    blocks: productRecommendationBlocks,
  },
  {
    id: 'personalized_skincare',
    category: 'Beauty & Wellness',
    name: 'Personalized Skincare Quiz',
    description: 'Build a custom skincare routine based on skin type, concerns, and lifestyle. The most popular quiz format for beauty brands with 40-60% completion rates.',
    audience: 'Skincare brands, beauty retailers, estheticians, dermatologists',
    whyItWorks: 'Customers genuinely need help choosing skincare. This quiz builds trust, captures emails, and drives product bundle sales in a single interaction.',
    iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2',
    tags: ['beauty', 'skincare', 'wellness', 'routine', 'cosmetics', 'personalized'],
    blocks: personalizedSkincareBlocks,
  },
  {
    id: 'customer_feedback',
    category: 'Feedback',
    name: 'Customer Feedback Survey',
    description: 'Collect post-purchase satisfaction data with a conversational, engaging format. Covers product quality, delivery, and likelihood to recommend.',
    audience: 'Ecommerce brands, SaaS companies, service businesses',
    whyItWorks: 'One-question-at-a-time feedback forms get 3x higher completion than traditional surveys. The conversational format feels like a chat, not a chore.',
    iconPath: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM8 10h.01M12 10h.01M16 10h.01',
    tags: ['feedback', 'satisfaction', 'NPS', 'customer', 'survey', 'post-purchase'],
    blocks: customerFeedbackBlocks,
  },
  {
    id: 'product_research',
    category: 'Research',
    name: 'Product Research Survey',
    description: 'Understand your target audience: how they found you, what they think of your product, and how you compare to alternatives.',
    audience: 'Product teams, startups, marketing departments',
    whyItWorks: 'Research surveys that feel like conversations get richer, more honest data. Conditional logic skips irrelevant questions so respondents stay engaged.',
    iconPath: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
    tags: ['research', 'product', 'survey', 'market', 'audience', 'competitive'],
    blocks: productResearchBlocks,
  },
  {
    id: 'lead_generation',
    category: 'Lead Generation',
    name: 'Lead Generation Quiz',
    description: 'Qualify leads automatically by asking about business size, challenges, budget, and timeline. Routes prospects to the right service tier.',
    audience: 'B2B companies, agencies, SaaS, professional services',
    whyItWorks: 'Assessment-style quizzes generate 3-5x more leads than static forms. Prospects self-qualify by answering questions, making sales conversations more efficient.',
    iconPath: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM22 8l-4 4-2-2',
    tags: ['lead-gen', 'B2B', 'qualification', 'sales', 'funnel'],
    blocks: leadGenerationBlocks,
  },
  {
    id: 'product_feedback',
    category: 'Feedback',
    name: 'Product Feedback Survey',
    description: 'Gather actionable product feedback on features, usability, and satisfaction. Identifies power users and at-risk customers.',
    audience: 'SaaS companies, product teams, digital products',
    whyItWorks: 'Goes beyond NPS to understand which features matter, what frustrates users, and what to build next. The segmented results help prioritize your roadmap.',
    iconPath: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    tags: ['product', 'feedback', 'features', 'usability', 'NPS', 'satisfaction'],
    blocks: productFeedbackBlocks,
  },
  {
    id: 'event_feedback',
    category: 'Events',
    name: 'Event Feedback Form',
    description: 'Collect attendee feedback on content, speakers, venue, and logistics. Perfect for conferences, workshops, and corporate events.',
    audience: 'Event organizers, conference producers, corporate events teams',
    whyItWorks: 'Post-event feedback collected within 24 hours gets 4x more responses. The engaging format captures insights while the experience is still fresh.',
    iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    tags: ['event', 'conference', 'feedback', 'speakers', 'venue', 'satisfaction'],
    blocks: eventFeedbackBlocks,
  },
  {
    id: 'employee_satisfaction',
    category: 'Human Resources',
    name: 'Employee Satisfaction Survey',
    description: 'Anonymous pulse survey covering job satisfaction, management quality, company culture, recognition, and leadership confidence.',
    audience: 'HR teams, people operations, company leadership',
    whyItWorks: 'Anonymous, conversational surveys get 2x more honest responses than traditional engagement surveys. The scoring system flags teams and topics that need attention.',
    iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    tags: ['employee', 'HR', 'satisfaction', 'culture', 'engagement', 'anonymous'],
    blocks: employeeSatisfactionBlocks,
  },
  {
    id: 'custom_apparel',
    category: 'Ecommerce',
    name: 'Custom Apparel Order',
    description: 'Capture custom t-shirt and merch orders with style selection, quantity, design readiness, and timeline. Visual product choices included.',
    audience: 'Print shops, merch companies, promotional product suppliers',
    whyItWorks: 'Image choice questions let customers see exactly what they are ordering. The guided flow eliminates back-and-forth emails and produces clean, actionable orders.',
    iconPath: 'M20.38 3.46L16 2 12 5.5 8 2 3.62 3.46A2 2 0 002 5.4V21a1 1 0 001.5.86L8 19l4 3 4-3 4.5 2.86A1 1 0 0022 21V5.4a2 2 0 00-1.62-1.94z',
    tags: ['apparel', 'merch', 'tshirt', 'custom', 'order', 'printing'],
    blocks: customApparelBlocks,
  },
  {
    id: 'subscription_renewal',
    category: 'SaaS',
    name: 'Subscription Renewal',
    description: 'Streamline renewals by assessing satisfaction, feature usage, and upgrade interest. Routes customers to the right renewal offer.',
    audience: 'SaaS companies, subscription services, membership platforms',
    whyItWorks: 'Proactive renewal quizzes reduce churn by catching at-risk customers early and upselling satisfied ones. The personalized offers feel helpful, not pushy.',
    iconPath: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
    tags: ['subscription', 'renewal', 'SaaS', 'churn', 'upsell', 'retention'],
    blocks: subscriptionRenewalBlocks,
  },
  {
    id: 'data_capture',
    category: 'Lead Generation',
    name: 'Data Capture Form',
    description: 'Capture contact information and buying intent through an engaging, conversational flow. Routes prospects by readiness level.',
    audience: 'Any business collecting leads — agencies, SaaS, services, ecommerce',
    whyItWorks: 'Conversational forms get 40% higher completion rates than static forms. Each question feels like a natural conversation, not a data extraction.',
    iconPath: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    tags: ['data', 'capture', 'contact', 'form', 'lead', 'qualification'],
    blocks: dataCaptureBlocks,
  },
  {
    id: 'ecommerce_lead_gen',
    category: 'Ecommerce',
    name: 'Ecommerce Lead Gen Quiz',
    description: 'Convert browsers into subscribers with a visual style preference quiz. Image-rich questions and curated product recommendations drive email signups.',
    audience: 'Online stores, jewelry brands, home goods, fashion, beauty',
    whyItWorks: 'Visual quizzes with image choice questions see 60% higher engagement than text-only forms. The personalized results create an irresistible reason to hand over an email.',
    iconPath: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
    tags: ['ecommerce', 'lead-gen', 'email', 'visual', 'style', 'shopping'],
    blocks: ecommerceLeadGenBlocks,
  },
  {
    id: 'trivia_challenge',
    category: 'Engagement',
    name: 'Trivia Challenge',
    description: 'Test audience knowledge with scored questions and detailed answer explanations. Builds authority, drives sharing, and captures leads before revealing results.',
    audience: 'Educators, bloggers, thought leaders, course creators, brands',
    whyItWorks: 'Trivia quizzes trigger curiosity and competitiveness. The scored format drives repeat visits and social sharing, while explanations position you as the expert.',
    iconPath: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
    tags: ['trivia', 'knowledge', 'quiz', 'engagement', 'education', 'viral'],
    blocks: triviaChallengeBlocks,
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
