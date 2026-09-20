/**
 * Quiz templates — Squarespace-focused, production-ready quiz structures
 * with real content, high-quality Unsplash imagery, and polished interactions.
 *
 * 13 templates built for the businesses that actually use Squarespace:
 * photographers, restaurants, fitness coaches, online stores, wedding planners,
 * coaches & consultants, real estate, beauty & salons, interior designers,
 * artists & creatives, podcasters & creators, nonprofits, and travel.
 *
 * Every template uses:
 *   - imageChoice questions with real Unsplash images on options
 *   - mediaUrl on questions for contextual visuals
 *   - imageUrl on outcomes for rich result pages
 *   - Real, specific copy — zero placeholders
 *   - 5-7 questions for optimal completion rates
 *   - Lead gate before results with compelling value exchange
 *   - 3 scored outcomes with distinct score ranges
 *
 * Inspired by Interact's template library (tryinteract.com) and adapted
 * specifically for Squarespace site owners.
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
/*  1. PHOTOGRAPHY STYLE QUIZ — Photographers                          */
/* ------------------------------------------------------------------ */

function photographyStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What moment matters most to you on your big day?',
      subtitle: 'This helps us understand your photography priorities.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Candid, emotional moments', score: 4, imageUrl: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Perfectly styled portraits', score: 3, imageUrl: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80&fit=crop' },
        { id: uid(), text: 'The venue and details', score: 2, imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Fun party and dancing shots', score: 1, imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which editing style are you drawn to?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Light and airy', score: 4, imageUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bold and dramatic', score: 3, imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Warm and vintage', score: 2, imageUrl: 'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Classic and timeless', score: 1, imageUrl: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you describe the vibe of your event?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Intimate and romantic', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Grand and elegant', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bohemian and outdoor', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Modern and minimal', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your photography budget?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $2,000', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80&fit=crop' },
        { id: uid(), text: '$2,000 to $4,000', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=400&q=80&fit=crop' },
        { id: uid(), text: '$4,000 to $7,000', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80&fit=crop' },
        { id: uid(), text: '$7,000 and above', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1563808599481-34a342e44508?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How important is having a second photographer?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Essential — I want every angle covered', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Nice to have but not required', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'One great photographer is enough', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'When is your event?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Within 3 months', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=400&q=80&fit=crop' },
        { id: uid(), text: '3 to 6 months from now', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80&fit=crop' },
        { id: uid(), text: '6 to 12 months out', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Still in the planning stage', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your photography match is ready',
      subtext: 'Enter your email to see which package fits your style and get a personalized pricing guide.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my perfect package',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Storyteller Collection',
      description: 'You want a photographer who disappears into the day and captures raw, unscripted emotion. The Storyteller Collection includes full-day coverage, a second photographer, and a curated gallery of 500+ images that tell the complete story of your day from getting ready to the last dance.',
      ctaText: 'Book a consultation', ctaUrl: '/contact',
      imageUrl: 'https://images.unsplash.com/photo-1617725145063-56958eadf557?w=800&q=80&fit=crop',
      minScore: 16, maxScore: 24, shareEnabled: true,
      shareText: 'I matched with The Storyteller Collection! Find your photography style.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Portrait Session',
      description: 'You appreciate beautifully composed, magazine-worthy shots that you will frame and display for years. The Portrait Session includes 6 hours of coverage, a pre-shoot consultation to plan your shot list, and a gallery of 300+ carefully edited images with your choice of editing style.',
      ctaText: 'View the portfolio', ctaUrl: '/portfolio',
      imageUrl: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=800&q=80&fit=crop',
      minScore: 9, maxScore: 15, shareEnabled: true,
      shareText: 'The Portrait Session is my match! Take the quiz to find yours.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Essentials Package',
      description: 'You want stunning photos without the extras. The Essentials Package gives you 4 hours of beautiful coverage, capturing the key moments that matter most. Perfect for elopements, intimate gatherings, or couples who want quality over quantity. Includes 150+ edited images delivered in a private gallery.',
      ctaText: 'Check availability', ctaUrl: '/booking',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 8, shareEnabled: true,
      shareText: 'I got The Essentials Package! What is your photography match?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  2. RESTAURANT MENU QUIZ — Restaurants & Cafes                      */
/* ------------------------------------------------------------------ */

function restaurantMenuBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What kind of dining experience are you in the mood for?',
      subtitle: 'Let us help you find the perfect dish.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'A cozy comfort meal', score: 1, imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Something light and fresh', score: 2, imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A bold flavor adventure', score: 3, imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Chef surprise — thrill me', score: 4, imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Any dietary preferences we should know about?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'multiple',
      options: [
        { id: uid(), text: 'No restrictions — I eat everything', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Vegetarian', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Vegan', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Gluten-free', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Dairy-free', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Pick the ingredient that excites you most right now.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Fresh seafood', score: 4, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Grilled meats', score: 3, imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Seasonal vegetables', score: 2, imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Handmade pasta', score: 1, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Are you dining solo, as a couple, or with a group?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Just me', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A date night for two', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A small group of 3 to 5', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A big party of 6 or more', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How adventurous are you feeling tonight?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Keep it classic — I know what I like', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Open to something new', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Surprise me completely', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your perfect dish is ready',
      subtext: 'Enter your email to see our recommendation and get 10% off your first visit.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Show me my dish',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Chef\'s Tasting Experience',
      description: 'You are the kind of diner every chef dreams of — adventurous, curious, and ready to be impressed. We recommend our multi-course tasting menu where the chef selects the freshest seasonal ingredients and takes you on a culinary journey. Pair it with our sommelier-selected wine flight for the complete experience.',
      ctaText: 'Reserve a table', ctaUrl: '/reservations',
      imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 22, shareEnabled: true,
      shareText: 'I got the Chef\'s Tasting Experience! What dish matches your mood?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Seasonal Signature',
      description: 'You appreciate bold flavors but like knowing what is coming. Our seasonal signature dishes are crafted from the freshest local ingredients, combining familiar favorites with unexpected twists. Right now we are featuring dishes that highlight the best of the season. Ask your server about tonight\'s specials.',
      ctaText: 'See the menu', ctaUrl: '/menu',
      imageUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'The Seasonal Signature is my match! Find your dish.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Classic Comfort Plate',
      description: 'Sometimes the best meal is the one that feels like home. Our classic comfort dishes are made with premium ingredients and time-honored recipes — elevated comfort food that hits every note. Generous portions, familiar flavors, and the kind of satisfaction that keeps you coming back.',
      ctaText: 'Order for pickup', ctaUrl: '/order',
      imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a Classic Comfort Plate person! What about you?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  3. FITNESS GOAL QUIZ — Fitness Coaches & Studios                    */
/* ------------------------------------------------------------------ */

function fitnessGoalBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is your primary fitness goal right now?',
      subtitle: 'Be honest — there are no wrong answers here.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Lose weight and tone up', score: 1, imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Build strength and muscle', score: 2, imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Improve flexibility and mobility', score: 3, imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Reduce stress and boost energy', score: 4, imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How many days per week can you realistically work out?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: '1 to 2 days', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80&fit=crop' },
        { id: uid(), text: '3 to 4 days', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=400&q=80&fit=crop' },
        { id: uid(), text: '5 to 6 days', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Every single day', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What best describes your current fitness level?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Complete beginner — just getting started', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Somewhat active — I work out sometimes', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Regular exerciser — looking to level up', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Advanced — I train consistently', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which workout environment do you prefer?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'At home with minimal equipment', score: 1, imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'In a gym with full equipment', score: 2, imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Outdoors — parks, trails, fresh air', score: 3, imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Group classes — I need the energy', score: 4, imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What has held you back from reaching your goals before?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Lack of time or consistency', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Not knowing what to do', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Injuries or physical limitations', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Motivation — I start but lose steam', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized fitness plan is ready',
      subtext: 'Enter your email to see your recommended program and get a free 7-day starter guide.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Get my fitness plan',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Transformation Program',
      description: 'You are ready to go all in and you thrive with structure. The Transformation Program is a 12-week guided journey with progressive workouts, nutrition coaching, and weekly check-ins. It is designed for people who are committed, consistent, and ready to see real results. Your coach will customize every phase to your body and goals.',
      ctaText: 'Start the Transformation', ctaUrl: '/programs/transformation',
      imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I matched with The Transformation Program! Find your fitness path.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Balanced Lifestyle Plan',
      description: 'You want results but you also want a life. The Balanced Lifestyle Plan fits around your schedule with 3 to 4 workouts per week, simple nutrition guidelines, and the flexibility to adjust when things get busy. Perfect for someone who wants steady, sustainable progress without burning out. No extreme diets, no 6 AM alarms required.',
      ctaText: 'Join the Balanced Plan', ctaUrl: '/programs/balanced',
      imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'The Balanced Lifestyle Plan is my match! Take the quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Jumpstart Challenge',
      description: 'Everyone starts somewhere, and this is your somewhere. The Jumpstart Challenge is a 21-day beginner-friendly program designed to build the habit first, then the body. Short workouts, simple moves, daily guidance, and a supportive community to keep you going. No experience needed — just show up.',
      ctaText: 'Join the Jumpstart', ctaUrl: '/programs/jumpstart',
      imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am starting with The Jumpstart Challenge! Join me.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  4. PRODUCT FINDER QUIZ — Online Stores (Ecommerce)                 */
/* ------------------------------------------------------------------ */

function productFinderBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Who are you shopping for today?',
      subtitle: 'We will personalize your recommendations based on this.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Myself — treating me', score: 3, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A gift for someone special', score: 2, imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Stocking up on essentials', score: 1, imageUrl: 'https://images.unsplash.com/photo-1558234200-3efd43232f08?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Just browsing for ideas', score: 4, imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which style resonates with you?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Minimal and clean', score: 4, imageUrl: 'https://images.unsplash.com/photo-1605513524042-426bace35fc9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Warm and natural', score: 3, imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bold and colorful', score: 2, imageUrl: 'https://images.unsplash.com/photo-1599408444232-8947844d94e2?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Classic and timeless', score: 1, imageUrl: 'https://images.unsplash.com/photo-1539278383962-a7774385fa02?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your budget range?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $50', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80&fit=crop' },
        { id: uid(), text: '$50 to $100', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80&fit=crop' },
        { id: uid(), text: '$100 to $200', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80&fit=crop' },
        { id: uid(), text: '$200 and above', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1536924430914-91f9e2041b83?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What matters most when choosing a product?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Quality and craftsmanship', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Unique and one-of-a-kind design', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Sustainability and eco-friendliness', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Great value for the price', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How soon do you need this?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'As soon as possible', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Within a week or two', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'No rush — just exploring', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
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
      id: uid(), type: 'outcome', title: 'The Curated Collection',
      description: 'You have refined taste and you are willing to invest in pieces that last. We have handpicked our Curated Collection for you — premium items crafted with exceptional materials, clean design, and the kind of quality you can feel the moment you hold them. These are the pieces that become your favorites.',
      ctaText: 'Shop the Curated Collection', ctaUrl: '/shop/curated',
      imageUrl: 'https://images.unsplash.com/photo-1605513524006-063ed6ed31e7?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I got The Curated Collection! Take the quiz to find your match.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Bestsellers Edit',
      description: 'You want the proven hits — the products our customers love most and keep coming back for. The Bestsellers Edit is our collection of crowd favorites: great quality, beautiful design, and a price that feels right. These are the items with hundreds of five-star reviews for a reason.',
      ctaText: 'Shop the Bestsellers', ctaUrl: '/shop/bestsellers',
      imageUrl: 'https://images.unsplash.com/photo-1617724975854-70b5d0cedb0a?w=800&q=80&fit=crop',
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: 'The Bestsellers Edit is my match! Find yours.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Starter Set',
      description: 'New here? Welcome. The Starter Set is the perfect introduction to our brand — a thoughtfully bundled collection of our most-loved essentials at a special price. Try a little of everything, find your favorites, and come back for more. It is the best way to discover what we are all about.',
      ctaText: 'Get the Starter Set', ctaUrl: '/shop/starter',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 6, shareEnabled: true,
      shareText: 'I am starting with The Starter Set! What about you?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  5. WEDDING STYLE QUIZ — Wedding Planners & Florists                */
/* ------------------------------------------------------------------ */

function weddingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Close your eyes and picture your dream wedding. What do you see?',
      subtitle: 'Go with your gut — there are no wrong answers.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1519741196428-6a2175fa2557?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'A garden overflowing with flowers', score: 4, imageUrl: 'https://images.unsplash.com/photo-1533091090875-1ff4acc497dd?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A grand ballroom with crystal chandeliers', score: 3, imageUrl: 'https://images.unsplash.com/photo-1563808599481-34a342e44508?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A rustic barn with string lights', score: 2, imageUrl: 'https://images.unsplash.com/photo-1573676048035-9c2a72b6a12a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A sleek rooftop with city views', score: 1, imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What color palette speaks to your soul?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Soft blush and sage greens', score: 4, imageUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bold jewel tones — emerald, burgundy, gold', score: 3, imageUrl: 'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'All white and ivory', score: 2, imageUrl: 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Black and white with metallic accents', score: 1, imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How many guests are you expecting?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Under 30 — intimate', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80&fit=crop' },
        { id: uid(), text: '30 to 75', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80&fit=crop' },
        { id: uid(), text: '75 to 150', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80&fit=crop' },
        { id: uid(), text: '150 or more — the more the merrier', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which detail matters most to you?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Stunning florals and tablescapes', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Incredible food and drinks', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1563808599481-34a342e44508?w=400&q=80&fit=crop' },
        { id: uid(), text: 'The perfect venue', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1573676048035-9c2a72b6a12a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'An unforgettable dance floor', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'When is the big day?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Within 6 months', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
        { id: uid(), text: '6 to 12 months', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
        { id: uid(), text: '12 to 18 months', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Just starting to dream', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your wedding style is ready to reveal',
      subtext: 'Enter your email to see your result and receive a free planning checklist tailored to your style.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your name' },
      ],
      buttonLabel: 'Reveal my wedding style',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Garden Romance',
      description: 'Your dream wedding is lush, romantic, and bursting with natural beauty. Think overflowing floral arches, soft candlelight, handwritten calligraphy, and a ceremony surrounded by greenery. You want every guest to feel like they have stepped into a secret garden. We specialize in bringing this vision to life with locally sourced flowers and organic design elements.',
      ctaText: 'See Garden Romance weddings', ctaUrl: '/portfolio/garden-romance',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80&fit=crop',
      minScore: 15, maxScore: 21, shareEnabled: true,
      shareText: 'My wedding style is Garden Romance! What is yours?',
    },
    {
      id: uid(), type: 'outcome', title: 'Modern Elegance',
      description: 'You are drawn to clean lines, bold statements, and understated luxury. Your wedding will be refined without feeling stuffy — think sculptural centerpieces, architectural venues, and a color palette that makes a statement. Every detail will feel intentional and every photo will look like it belongs in a magazine.',
      ctaText: 'See Modern Elegance weddings', ctaUrl: '/portfolio/modern-elegance',
      imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 14, shareEnabled: true,
      shareText: 'My wedding style is Modern Elegance! Take the quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'Rustic Charm',
      description: 'Your wedding is warm, relaxed, and full of character. Think exposed wood, twinkling string lights, wildflower bouquets, and a celebration where everyone kicks off their shoes and dances barefoot. You want it to feel like the best dinner party you have ever been to — beautiful, personal, and completely you.',
      ctaText: 'See Rustic Charm weddings', ctaUrl: '/portfolio/rustic-charm',
      imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a Rustic Charm wedding! What about you?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  6. COACHING STYLE QUIZ — Coaches & Consultants                     */
/* ------------------------------------------------------------------ */

function coachingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is the biggest challenge you are facing in your business right now?',
      subtitle: 'Pick the one that keeps you up at night.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Getting enough clients', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Pricing and packaging my offers', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Scaling beyond one-on-one work', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Finding clarity on my direction', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How long have you been in business?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'I am just starting out', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80&fit=crop' },
        { id: uid(), text: '1 to 2 years', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80&fit=crop' },
        { id: uid(), text: '3 to 5 years', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80&fit=crop' },
        { id: uid(), text: '5 or more years', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What does your current revenue look like?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Pre-revenue — still building', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Under $50K per year', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop' },
        { id: uid(), text: '$50K to $150K per year', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Over $150K per year', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you learn best?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'One-on-one coaching with personalized feedback', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Group programs with peer accountability', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Self-paced courses I can do on my own time', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1529634597503-139d3726fed5?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Live workshops and intensives', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What would a win look like for you in the next 90 days?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Filling my client roster consistently', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Launching a group program or course', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Doubling my revenue', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Getting clear on my niche and messaging', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your coaching recommendation is ready',
      subtext: 'Enter your email to see your result and receive a free strategy guide matched to your stage.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Show me my path',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Accelerator',
      description: 'You have the foundation and you are ready to scale. The Accelerator is our signature coaching program for established business owners who want to break through their revenue ceiling. You will get a custom growth strategy, weekly coaching calls, and access to our proven frameworks for scaling without burning out. This is where six-figure businesses become seven-figure businesses.',
      ctaText: 'Apply for The Accelerator', ctaUrl: '/programs/accelerator',
      imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80&fit=crop',
      minScore: 15, maxScore: 20, shareEnabled: true,
      shareText: 'I matched with The Accelerator! Find your coaching path.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Growth Blueprint',
      description: 'You are past the beginning but stuck in the messy middle. The Growth Blueprint is a 6-month group coaching program where you will nail your positioning, build a scalable offer suite, and create a marketing system that works without you posting on social media all day. Includes bi-weekly group calls, templates, and a private community of business owners at your level.',
      ctaText: 'Join The Growth Blueprint', ctaUrl: '/programs/growth',
      imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 14, shareEnabled: true,
      shareText: 'The Growth Blueprint is my match! Take the quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Foundation Course',
      description: 'You are at the exciting beginning and you need a clear path forward. The Foundation Course is a self-paced program that walks you through everything from defining your niche to landing your first five clients. No fluff, no overwhelm — just the essential steps in the right order. Includes video lessons, workbooks, and email support for when you get stuck.',
      ctaText: 'Start The Foundation', ctaUrl: '/programs/foundation',
      imageUrl: 'https://images.unsplash.com/photo-1588800347304-ec7e6f353327?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am starting with The Foundation! What about you?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  7. HOME STYLE QUIZ — Interior Designers & Home Decor               */
/* ------------------------------------------------------------------ */

function homeStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Which room feels most like home to you?',
      subtitle: 'Where you spend the most time says a lot about your style.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'A sunlit living room with plants', score: 4, imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A sleek kitchen with clean counters', score: 3, imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A cozy reading nook with textures', score: 2, imageUrl: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A bold dining room that makes a statement', score: 1, imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Pick the material that draws you in.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Natural wood and rattan', score: 4, imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Marble and brass', score: 3, imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Velvet and rich fabrics', score: 2, imageUrl: 'https://images.unsplash.com/photo-1618221710640-c0eaaa2adb49?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Concrete and matte black', score: 1, imageUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What best describes your ideal space?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Calm, airy, and minimal', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Warm, layered, and collected', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bold, colorful, and eclectic', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Sleek, modern, and dramatic', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your design budget for this project?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $5,000', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80&fit=crop' },
        { id: uid(), text: '$5,000 to $15,000', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&q=80&fit=crop' },
        { id: uid(), text: '$15,000 to $40,000', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=400&q=80&fit=crop' },
        { id: uid(), text: '$40,000 and above', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which room needs the most attention?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Living room', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Kitchen', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Bedroom', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Whole home refresh', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your design style has been revealed',
      subtext: 'Enter your email to see your result and get a curated mood board to inspire your project.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my design style',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'Organic Modern',
      description: 'Your style is a beautiful balance of nature and sophistication. You gravitate toward warm wood tones, natural textures, abundant greenery, and open spaces that feel effortlessly curated. Think Japandi meets California cool — every piece has a purpose, every corner breathes, and the whole space feels like a calm retreat from the chaos of daily life.',
      ctaText: 'Book a design consultation', ctaUrl: '/book',
      imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80&fit=crop',
      minScore: 15, maxScore: 21, shareEnabled: true,
      shareText: 'My home style is Organic Modern! What is yours?',
    },
    {
      id: uid(), type: 'outcome', title: 'Collected Eclectic',
      description: 'Your home tells a story. You mix vintage finds with modern pieces, layer textures and patterns, and are not afraid of color. Every room has character because you fill it with things that make you happy rather than following trends. The result is a space that feels warm, personal, and impossible to replicate — because it is uniquely you.',
      ctaText: 'See our portfolio', ctaUrl: '/portfolio',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 14, shareEnabled: true,
      shareText: 'I am Collected Eclectic! Take the style quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'Bold Contemporary',
      description: 'You are drawn to spaces that make a statement. Clean lines, high contrast, dramatic lighting, and statement furniture are your love language. You want your home to feel like a curated gallery — every piece intentional, nothing accidental. Black, white, and metallics form the foundation, with one or two bold accent colors that command attention.',
      ctaText: 'Start your project', ctaUrl: '/contact',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'My style is Bold Contemporary! What is yours?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  8. SKINCARE ROUTINE QUIZ — Beauty & Salons                         */
/* ------------------------------------------------------------------ */

function skincareRoutineBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'How would you describe your skin on a typical day?',
      subtitle: 'Think about how your skin looks and feels by midafternoon.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1611169035510-f9af52e6dbe2?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Dry and tight', score: 1, imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Oily and shiny by noon', score: 2, imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Combination — oily here, dry there', score: 3, imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Sensitive and easily irritated', score: 4, imageUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your number one skin concern right now?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Breakouts and clogged pores', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Fine lines and loss of firmness', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Dark spots and uneven tone', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Redness and sensitivity', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Dullness and dehydration', score: 5 , imageUrl: 'https://images.unsplash.com/photo-1588800347304-ec7e6f353327?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would you describe your current skincare routine?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'What routine? I just use water', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Cleanser and moisturizer', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A proper multi-step routine', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I am obsessed — I have a full regimen', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How much time are you willing to spend on skincare each day?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: '2 minutes — keep it simple', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=400&q=80&fit=crop' },
        { id: uid(), text: '5 to 10 minutes', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&fit=crop' },
        { id: uid(), text: '15 to 20 minutes — I enjoy the ritual', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'As long as it takes to get results', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What ingredients do you prefer?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Natural and clean beauty only', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Science-backed actives like retinol and acids', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Whatever works — I am not picky', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I have no idea — help me', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1588800347304-ec7e6f353327?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your personalized routine is ready',
      subtext: 'Enter your email to see your custom skincare recommendation and get 15% off your first treatment.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my skincare routine',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Glow Protocol',
      description: 'You are ready for serious results and you are willing to invest in your skin. The Glow Protocol is our signature treatment plan combining professional facials with a customized at-home regimen. We use targeted actives, clinical-grade products, and advanced techniques to address your specific concerns. Expect visible changes within 4 to 6 weeks.',
      ctaText: 'Book The Glow Protocol', ctaUrl: '/book/glow-protocol',
      imageUrl: 'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=800&q=80&fit=crop',
      minScore: 16, maxScore: 26, shareEnabled: true,
      shareText: 'I got The Glow Protocol! Find your skincare match.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Essential Facial',
      description: 'You want great skin without a complicated routine. The Essential Facial is our most popular treatment — a 60-minute deep-cleansing, hydrating facial customized to your skin type. We will address your top concern, recommend 3 key products for your at-home routine, and have you glowing by the time you walk out the door.',
      ctaText: 'Book The Essential Facial', ctaUrl: '/book/essential',
      imageUrl: 'https://images.unsplash.com/photo-1635083705167-485053848455?w=800&q=80&fit=crop',
      minScore: 9, maxScore: 15, shareEnabled: true,
      shareText: 'The Essential Facial is my match! Take the quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Skin Reset',
      description: 'Your skin is calling for a fresh start. The Skin Reset is a gentle introductory treatment perfect for skincare beginners or anyone whose skin needs a break from everything. We strip it back to basics, calm any irritation, and build a simple, effective routine that even the busiest person can stick with. Three products, two minutes, real results.',
      ctaText: 'Book The Skin Reset', ctaUrl: '/book/reset',
      imageUrl: 'https://images.unsplash.com/photo-1622336889416-8d790ad807d7?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 8, shareEnabled: true,
      shareText: 'I am starting with The Skin Reset! What about you?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  9. CREATIVE ARCHETYPE QUIZ — Artists & Creatives                   */
/* ------------------------------------------------------------------ */

function creativeArchetypeBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'When inspiration strikes, where does it usually find you?',
      subtitle: 'Think about your most recent creative breakthrough.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'In nature — walking, hiking, observing', score: 4, imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'In my studio — hands deep in materials', score: 3, imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Scrolling, reading, or researching', score: 2, imageUrl: 'https://images.unsplash.com/photo-1629927464439-6ba2167656fb?w=400&q=80&fit=crop' },
        { id: uid(), text: 'In conversation with other creatives', score: 1, imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you feel about selling your work?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'I love it — it validates my art', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I am learning to get comfortable with it', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I would rather someone else handle that part', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I create for the process, not the sale', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What does success look like for your creative business?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Full-time income from my art', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Gallery shows and recognition', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Teaching and inspiring others', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Freedom to create on my own terms', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which best describes your creative process?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Planned and intentional', score: 1, imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Intuitive and flowing', score: 3, imageUrl: 'https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Experimental and chaotic', score: 4, imageUrl: 'https://images.unsplash.com/photo-1536924430914-91f9e2041b83?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Collaborative and community-driven', score: 2, imageUrl: 'https://images.unsplash.com/photo-1581462702378-9c5b5f23e3ec?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest creative struggle?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Consistency — I create in bursts', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Visibility — no one sees my work', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Pricing — I undervalue my art', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Focus — I have too many ideas', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1524758870432-af57e54afa26?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your creative archetype has been revealed',
      subtext: 'Enter your email to discover your archetype and get a free guide on how to use it to grow your creative business.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Reveal my archetype',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Visionary',
      description: 'You create from a place of pure imagination and your work often feels ahead of its time. You are the artist who sees what others cannot yet see, and your greatest gift is translating that vision into something tangible. Your challenge is finishing projects and getting your work in front of the right people. When you channel your visionary energy with intention, your impact is extraordinary.',
      ctaText: 'Explore The Visionary guide', ctaUrl: '/archetypes/visionary',
      imageUrl: 'https://images.unsplash.com/photo-1669858873972-34e68ab79aaf?w=800&q=80&fit=crop',
      minScore: 15, maxScore: 20, shareEnabled: true,
      shareText: 'I am The Visionary! What is your creative archetype?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Craftsperson',
      description: 'You are in love with the process. Mastery of materials, technique, and skill is what drives you. You would rather spend a year perfecting one piece than rush out ten. Your work speaks for itself because the quality is undeniable. The world needs more people like you who care this deeply about how things are made. Your path to growth is letting more people see your process.',
      ctaText: 'Explore The Craftsperson guide', ctaUrl: '/archetypes/craftsperson',
      imageUrl: 'https://images.unsplash.com/photo-1725819242793-e83d3e08d439?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 14, shareEnabled: true,
      shareText: 'I am The Craftsperson! Take the archetype quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Entrepreneur',
      description: 'You see art as both a calling and a business, and you are not afraid to put yourself out there. You understand that great work deserves an audience, and you are building the systems to make that happen. You balance creativity with strategy, and your commercial mindset does not diminish your art — it amplifies it. Your superpower is turning creative talent into a sustainable career.',
      ctaText: 'Explore The Entrepreneur guide', ctaUrl: '/archetypes/entrepreneur',
      imageUrl: 'https://images.unsplash.com/photo-1692859532235-c93fa73bd5d0?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am The Entrepreneur! Find your creative archetype.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  10. PODCAST PERSONALITY QUIZ — Podcasters & Content Creators       */
/* ------------------------------------------------------------------ */

function podcastPersonalityBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What draws you to creating content?',
      subtitle: 'Pick the answer that feels most true.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Sharing stories and conversations', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Teaching and educating my audience', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Building a personal brand', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1524758870432-af57e54afa26?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Entertaining and making people laugh', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How often do you publish new content?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Multiple times per week', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Once a week consistently', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A few times a month', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Whenever I feel inspired', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your primary goal for your content?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Growing my audience and email list', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Selling my products or services', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Attracting sponsorships and brand deals', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Building authority in my space', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you feel about showing your face on camera?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Love it — I am a natural on camera', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Comfortable enough — it gets easier', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I prefer audio or writing', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Terrified but willing to try', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your biggest content challenge?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Coming up with ideas consistently', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80&fit=crop' },
        { id: uid(), text: 'The technical side — editing, production', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1524758870432-af57e54afa26?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Growing beyond my current audience', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Monetizing my content', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your creator personality is ready',
      subtext: 'Enter your email to see your result and get a free content calendar template matched to your style.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my creator type',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Authority Builder',
      description: 'You are building a media empire, one piece of content at a time. Your content strategy is focused, consistent, and designed to position you as the go-to expert in your niche. You do not just create content — you create influence. Your audience trusts you because you show up with substance, not just style. The next step is leveraging that authority into premium offers.',
      ctaText: 'Get the Authority Playbook', ctaUrl: '/resources/authority',
      imageUrl: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I am The Authority Builder! What is your creator type?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Storyteller',
      description: 'People follow you because they feel connected to you, not just your expertise. Your gift is turning everyday moments into compelling narratives that resonate with your audience. You do not need a script — your authenticity is your superpower. Focus on building deeper engagement through email and community, and your audience will become your biggest advocates.',
      ctaText: 'Get the Storyteller Toolkit', ctaUrl: '/resources/storyteller',
      imageUrl: 'https://images.unsplash.com/photo-1620245446020-879dc5cf2414?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I am The Storyteller! Take the creator quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Rising Creator',
      description: 'You are at the start of an exciting journey. You have the ideas and the passion — now you need the systems. The Rising Creator path is about building sustainable habits first, then scaling. Start with one platform, one format, one schedule you can stick to. Master that, then expand. Every great creator started exactly where you are right now.',
      ctaText: 'Get the Starter Kit', ctaUrl: '/resources/starter',
      imageUrl: 'https://images.unsplash.com/photo-1533073526757-2c8ca1df9f1c?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a Rising Creator! Find your creator type.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  11. REAL ESTATE BUYER QUIZ — Real Estate Agents                    */
/* ------------------------------------------------------------------ */

function realEstateBuyerBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What is driving your home search right now?',
      subtitle: 'Understanding your motivation helps us find the right match.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'First-time buyer — ready for my own place', score: 1, imageUrl: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Growing family — need more space', score: 2, imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Downsizing — simplifying my life', score: 3, imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Investment property', score: 4, imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which neighborhood vibe suits you best?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Walkable urban with restaurants and shops', score: 4, imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Quiet suburban with good schools', score: 3, imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Rural with land and privacy', score: 2, imageUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Beachside or waterfront', score: 1, imageUrl: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your timeline for buying?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Actively looking — ready to move fast', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Within 3 to 6 months', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400&q=80&fit=crop' },
        { id: uid(), text: '6 to 12 months from now', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Just exploring my options', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your approximate budget?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $300K', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80&fit=crop' },
        { id: uid(), text: '$300K to $500K', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80&fit=crop' },
        { id: uid(), text: '$500K to $800K', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80&fit=crop' },
        { id: uid(), text: '$800K and above', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What feature is a non-negotiable for you?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'A big backyard or outdoor space', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'An updated kitchen', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A home office or studio space', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Move-in ready — no renovations needed', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your home buying profile is ready',
      subtext: 'Enter your email to see your recommended neighborhoods and get a free buyer guide.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'Full name', required: true, placeholder: 'Your full name' },
        { id: uid(), type: 'phone', label: 'Phone number', required: false, placeholder: '(555) 555-5555' },
      ],
      buttonLabel: 'See my recommendations',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Power Buyer',
      description: 'You know what you want and you are ready to move. With a strong budget and a clear vision, you are in a great position to compete in today\'s market. We recommend scheduling a strategy session to discuss off-market opportunities, pre-market listings, and neighborhoods that match your criteria. The best properties move fast — having an agent who knows the inventory is your biggest advantage.',
      ctaText: 'Schedule a strategy session', ctaUrl: '/contact',
      imageUrl: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80&fit=crop',
      minScore: 15, maxScore: 20, shareEnabled: true,
      shareText: 'I am a Power Buyer! What is your home buyer profile?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Smart Searcher',
      description: 'You are doing your homework and taking a thoughtful approach. You have a good sense of your budget and preferences, and you are building a shortlist of neighborhoods. We recommend signing up for our curated listings email — we handpick properties that match your profile every week so you never miss a great opportunity. When you are ready, we are here.',
      ctaText: 'Get curated listings', ctaUrl: '/listings',
      imageUrl: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 14, shareEnabled: true,
      shareText: 'I am a Smart Searcher! Take the home buyer quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The First-Time Explorer',
      description: 'Welcome to the exciting world of home buying! The process can feel overwhelming, but it does not have to be. We recommend starting with our free First-Time Buyer Guide that walks you through every step from pre-approval to closing day. When you are ready to start looking, we will be here to make sure your first home is one you love.',
      ctaText: 'Download the buyer guide', ctaUrl: '/guide',
      imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a First-Time Explorer! Find your buyer profile.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  12. TRAVEL STYLE QUIZ — Travel & Hospitality                       */
/* ------------------------------------------------------------------ */

function travelStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What does your ideal vacation look like?',
      subtitle: 'Think about the trip you would book right now if money were no object.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Relaxing on a beach with a book', score: 1, imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Exploring a new city on foot', score: 2, imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'An adventure in the mountains', score: 3, imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A luxury wellness retreat', score: 4, imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Who are you traveling with?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Solo — just me', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80&fit=crop' },
        { id: uid(), text: 'With my partner', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Family with kids', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A group of friends', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your travel budget per person?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Under $1,000', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&q=80&fit=crop' },
        { id: uid(), text: '$1,000 to $3,000', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=400&q=80&fit=crop' },
        { id: uid(), text: '$3,000 to $5,000', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=400&q=80&fit=crop' },
        { id: uid(), text: '$5,000 and above — go big', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you feel about planning?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'I want every detail handled for me', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A rough itinerary with room to explore', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Just book the flights — I will figure out the rest', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Spontaneous — no plans, no stress', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What experience do you value most?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Local food and dining', score: 1, imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Culture, history, and museums', score: 2, imageUrl: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Outdoor activities and nature', score: 3, imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Spa, relaxation, and wellness', score: 4, imageUrl: 'https://images.unsplash.com/photo-1476900164809-ff19b8ae5968?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your perfect trip is waiting',
      subtext: 'Enter your email to see your travel recommendation and get an exclusive packing guide.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Show me my trip',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Luxury Escape',
      description: 'You travel to recharge, and you deserve every ounce of luxury along the way. We recommend a curated itinerary featuring boutique hotels, private tours, spa treatments, and fine dining. From Amalfi Coast villas to Bali wellness retreats, your perfect trip is one where every detail is handled and every moment feels extraordinary.',
      ctaText: 'Browse luxury packages', ctaUrl: '/packages/luxury',
      imageUrl: 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=800&q=80&fit=crop',
      minScore: 15, maxScore: 20, shareEnabled: true,
      shareText: 'I am a Luxury Escape traveler! What is your travel style?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Culture Explorer',
      description: 'You travel to learn, taste, and experience the world. Your ideal trip balances guided experiences with free time to get lost in a new neighborhood. We recommend destinations rich in history, local cuisine, and authentic culture — think Barcelona, Tokyo, Marrakech, or Buenos Aires. You will come home with stories, not just photos.',
      ctaText: 'Browse explorer trips', ctaUrl: '/packages/explorer',
      imageUrl: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 14, shareEnabled: true,
      shareText: 'I am a Culture Explorer! Take the travel quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Beach and Breeze',
      description: 'You travel to unplug, slow down, and soak up the sun. Your ideal trip is simple — warm sand, clear water, a good book, and absolutely zero agenda. We recommend destinations like the Maldives, Tulum, the Greek Islands, or Costa Rica where the hardest decision you will make is whether to nap in a hammock or by the pool.',
      ctaText: 'Browse beach getaways', ctaUrl: '/packages/beach',
      imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am Beach and Breeze! What is your travel style?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  13. NONPROFIT ENGAGEMENT QUIZ — Nonprofits & Causes                */
/* ------------------------------------------------------------------ */

function nonprofitEngagementBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'What issue is closest to your heart?',
      subtitle: 'Choose the cause that makes you want to take action.',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      mediaUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&q=80&fit=crop',
      mediaType: 'image',
      options: [
        { id: uid(), text: 'Environmental protection', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Education and youth development', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Health and wellness access', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Community and social justice', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you prefer to make an impact?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Donating — my money can do the work', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Volunteering my time and skills', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Spreading awareness and advocacy', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Organizing events and fundraisers', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How much time can you give each month?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'A few minutes online', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop' },
        { id: uid(), text: '1 to 2 hours', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
        { id: uid(), text: '3 to 5 hours', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'As much as needed — I am all in', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What would make you feel most connected to the cause?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Seeing exactly where my donation goes', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Meeting the people I am helping', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Being part of a passionate community', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Leading a project and seeing results', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Have you supported a nonprofit before?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Yes — I am an active supporter', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Occasionally — when something moves me', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Rarely — I want to start', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Never — this is my first step', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your impact profile is ready',
      subtext: 'Enter your email to see how you can make the biggest difference and receive our monthly impact newsletter.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'See my impact path',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Changemaker',
      description: 'You are not just a supporter — you are a leader. You have the passion, the time, and the drive to organize, advocate, and rally others around a cause. We need people like you on the front lines. Join our Changemaker program where you will lead local initiatives, attend exclusive events, and work directly with our team to shape the direction of our mission.',
      ctaText: 'Become a Changemaker', ctaUrl: '/get-involved/changemaker',
      imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I am a Changemaker! Find your impact path.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Active Volunteer',
      description: 'You believe in showing up and making a tangible difference. Whether it is tutoring, building, or organizing — you want to see the impact of your effort firsthand. Our volunteer program matches you with opportunities that fit your skills and schedule. From weekend events to ongoing programs, there is a perfect fit waiting for you.',
      ctaText: 'Browse volunteer opportunities', ctaUrl: '/volunteer',
      imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I am an Active Volunteer! Take the impact quiz.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Generous Supporter',
      description: 'Your time is limited but your generosity is not. You believe the best way to create change is to fund the people doing the work. As a monthly donor, your contribution provides reliable support that lets us plan long-term projects and respond quickly when needs arise. Every dollar is tracked and reported so you always know your impact.',
      ctaText: 'Start a monthly donation', ctaUrl: '/donate',
      imageUrl: 'https://images.unsplash.com/photo-1524758870432-af57e54afa26?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a Generous Supporter! Find your impact path.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  14. VIDEO FITNESS CHALLENGE — Fitness (Video)                       */
/* ------------------------------------------------------------------ */

function videoFitnessChallengeBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Watch this warm-up clip — which style gets you most pumped?',
      subtitle: 'Pick the energy level that matches how you like to start a workout.',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4057411/4057411-sd_640_360_25fps.mp4',
      mediaType: 'video',
      options: [
        { id: uid(), text: 'High-energy, jump-right-in', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Gradual build with dynamic stretches', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Slow and mindful — yoga-style', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I usually skip warm-ups (be honest!)', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you feel about this HIIT sequence?',
      subtitle: 'Watch the video and pick your honest reaction.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4057519/4057519-sd_640_360_25fps.mp4',
      mediaType: 'video',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Love it — bring on the intensity!', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Looks tough but I would try it', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I prefer something gentler', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Hard pass — not my thing', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Check out this strength training form — which muscle group is your priority?',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4162451/4162451-sd_640_360_30fps.mp4',
      mediaType: 'video',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Upper body and arms', score: 4, imageUrl: 'https://images.unsplash.com/photo-1506784926709-22f1ec395907?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Core and abs', score: 3, imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Legs and glutes', score: 2, imageUrl: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Full body balance', score: 1, imageUrl: 'https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Watch this recovery routine — how important is stretching and cooldown to you?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4536236/4536236-sd_640_360_25fps.mp4',
      mediaType: 'video',
      options: [
        { id: uid(), text: 'Critical — I never skip it', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I do it when I have time', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Only when I am really sore', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop' },
        { id: uid(), text: 'What cooldown?', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How many days per week can you commit to working out?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: '1 to 2 days', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80&fit=crop' },
        { id: uid(), text: '3 to 4 days', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&fit=crop' },
        { id: uid(), text: '5 to 6 days', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Every day', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your custom workout plan is ready!',
      subtext: 'Enter your email to get a free 7-day program tailored to your fitness style, plus weekly workout videos.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Get my free plan',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Power Athlete',
      description: 'You thrive on intensity and love pushing your limits. Your ideal program combines HIIT, heavy lifting, and explosive movements. We recommend our Power Program — 4 days of structured training with video-guided form checks and progressive overload built in.',
      ctaText: 'Start the Power Program', ctaUrl: '/programs/power',
      imageUrl: 'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I am a Power Athlete! Take the quiz to find your fitness style.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Balanced Mover',
      description: 'You want a well-rounded approach that builds strength, flexibility, and endurance without burning out. Our Balanced Body program alternates between strength days, cardio, and recovery — with video walkthroughs for every exercise.',
      ctaText: 'Try Balanced Body free', ctaUrl: '/programs/balanced',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I am a Balanced Mover! Find your fitness type.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Mindful Mover',
      description: 'You believe fitness should feel good, not punishing. Your ideal program emphasizes yoga, pilates, mobility work, and mindful movement. Our Mindful Movement series uses guided video sessions to help you build strength gently while reducing stress.',
      ctaText: 'Explore Mindful Movement', ctaUrl: '/programs/mindful',
      imageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a Mindful Mover! What is your fitness type?',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  15. VIDEO COOKING STYLE — Food (Video)                              */
/* ------------------------------------------------------------------ */

function videoCookingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Watch this knife skills demo — how comfortable are you in the kitchen?',
      subtitle: 'No judgment! We are matching you to recipes that fit YOUR level.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/3195394/3195394-sd_640_360_25fps.mp4',
      mediaType: 'video',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Pro level — I could do that blindfolded', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Comfortable — I cook most nights', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Learning — I follow recipes closely', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Beginner — I burn toast sometimes', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Check out this plating technique — what matters most when you cook?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/3298572/3298572-sd_640_360_30fps.mp4',
      mediaType: 'video',
      options: [
        { id: uid(), text: 'Speed — I need meals in 30 minutes or less', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Flavor — I will spend time for incredible taste', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Health — nutrition is my priority', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Presentation — I eat with my eyes first', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Which cuisine excites you the most?',
      questionStyle: 'imageChoice', questionType: 'single',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Italian — pasta, pizza, risotto', score: 1, imageUrl: 'https://images.unsplash.com/photo-1485637701894-09ad422f6de6?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Asian — stir-fry, sushi, curry', score: 3, imageUrl: 'https://images.unsplash.com/photo-1707127784732-254c78d1f953?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Mediterranean — fresh and light', score: 2, imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80&fit=crop' },
        { id: uid(), text: 'American — comfort food classics', score: 1, imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Watch this baking video — are you a baker or a cook?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4253234/4253234-sd_640_360_25fps.mp4',
      mediaType: 'video',
      options: [
        { id: uid(), text: 'Definitely a cook — savory all the way', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A baker at heart — pastries and bread', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Both! I love it all', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Neither yet — but I want to learn', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How do you prefer to learn new recipes?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'Step-by-step video tutorials', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Written recipes with photos', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Live cooking classes', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Experimenting on my own', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your recipe collection is ready!',
      subtext: 'Get a curated recipe pack matched to your cooking style, plus weekly video tutorials delivered to your inbox.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Send me my recipes',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Creative Chef',
      description: 'You treat cooking as an art form. You love experimenting with flavors, techniques, and plating. Our Advanced Recipe Series features video masterclasses on sauce-making, fermentation, and restaurant-level dishes you can make at home.',
      ctaText: 'Browse masterclasses', ctaUrl: '/classes/advanced',
      imageUrl: 'https://images.unsplash.com/photo-1546427660-eb346c344ba5?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I am a Creative Chef! What is your cooking style?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Confident Cook',
      description: 'You are comfortable in the kitchen and ready to expand your repertoire. Our Weekly Recipe Plan delivers 5 new recipes each week with video walkthroughs, shopping lists, and prep guides — perfect for leveling up without overwhelm.',
      ctaText: 'Get the weekly plan', ctaUrl: '/plans/weekly',
      imageUrl: 'https://images.unsplash.com/photo-1550367363-ea12860cc124?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I am a Confident Cook! Find your cooking personality.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Kitchen Starter',
      description: 'Welcome to your cooking journey! Everyone starts somewhere, and we have the perfect beginner-friendly video course for you. Learn essential techniques, basic recipes, and kitchen confidence in our 30-Day Cooking Basics series — one short video lesson per day.',
      ctaText: 'Start the 30-day course', ctaUrl: '/courses/basics',
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'Starting my cooking journey! Join me.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  16. VIDEO BRAND PERSONALITY — Coaches (Video)                       */
/* ------------------------------------------------------------------ */

function videoBrandPersonalityBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: 'Watch this scenario — a potential client lands on your website. What do they see first?',
      subtitle: 'This reveals your brand personality and how you connect with prospects.',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/5077066/5077066-sd_640_360_25fps.mp4',
      mediaType: 'video',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'A bold statement that demands attention', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A warm welcome video introducing myself', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Client testimonials and social proof', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
        { id: uid(), text: 'A clean, minimal design with clear CTA', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Check out this workspace setup — which environment feels most like you?',
      questionStyle: 'imageChoice', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4065924/4065924-sd_640_360_25fps.mp4',
      mediaType: 'video',
      answerLayout: 'grid',
      options: [
        { id: uid(), text: 'Creative studio with color everywhere', score: 4, imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Minimalist desk with curated details', score: 1, imageUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Cozy home office with plants', score: 3, imageUrl: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Coffee shop — I work everywhere', score: 2, imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'How would your best client describe working with you?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/4063585/4063585-sd_640_360_25fps.mp4',
      mediaType: 'video',
      options: [
        { id: uid(), text: 'Transformative — they completely changed my perspective', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Supportive — they believed in me when I did not', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Strategic — they gave me a clear roadmap', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Efficient — they got results fast', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'Watch this content creation clip — what type of content do you create most?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      mediaUrl: 'https://videos.pexels.com/video-files/5077422/5077422-sd_640_360_25fps.mp4',
      mediaType: 'video',
      options: [
        { id: uid(), text: 'Long-form video and podcasts', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Blog posts and newsletters', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Social media reels and stories', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop' },
        { id: uid(), text: 'Courses and downloadable guides', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'question', text: 'What is your superpower as a coach or consultant?',
      questionStyle: 'imageChoice',
      answerLayout: 'grid', questionType: 'single',
      options: [
        { id: uid(), text: 'I see the big picture others miss', score: 4 , imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I create deep connection and trust', score: 3 , imageUrl: 'https://images.unsplash.com/photo-1524758870432-af57e54afa26?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I simplify the complex', score: 2 , imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80&fit=crop' },
        { id: uid(), text: 'I hold people accountable', score: 1 , imageUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&q=80&fit=crop' },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: 'Your brand personality report is ready!',
      subtext: 'Get your personalized brand archetype with a visual mood board, messaging guide, and content strategy — free.',
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: 'Reveal my brand archetype',
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: 'The Visionary Leader',
      description: 'Your brand is bold, inspiring, and future-focused. You attract clients who want transformation, not just information. Your visual identity should use strong colors, confident typography, and aspirational imagery. Lead with big ideas and back them with proof.',
      ctaText: 'Book a brand strategy session', ctaUrl: '/work-with-me',
      imageUrl: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&q=80&fit=crop',
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: 'I am a Visionary Leader brand! Discover your brand personality.',
    },
    {
      id: uid(), type: 'outcome', title: 'The Trusted Guide',
      description: 'Your brand is warm, approachable, and deeply trustworthy. Clients choose you because they feel safe and seen. Your visual identity should use soft, warm tones, friendly photography, and conversational copy. Lead with empathy and follow with expertise.',
      ctaText: 'Explore coaching packages', ctaUrl: '/services',
      imageUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80&fit=crop',
      minScore: 8, maxScore: 13, shareEnabled: true,
      shareText: 'I am a Trusted Guide brand! What is yours?',
    },
    {
      id: uid(), type: 'outcome', title: 'The Strategic Expert',
      description: 'Your brand is polished, precise, and results-driven. Clients come to you for clarity and a proven system. Your visual identity should be clean and professional with structured layouts, data-backed content, and case studies. Lead with results and let the numbers speak.',
      ctaText: 'See client case studies', ctaUrl: '/results',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fit=crop',
      minScore: 0, maxScore: 7, shareEnabled: true,
      shareText: 'I am a Strategic Expert brand! Take the quiz.',
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Template catalog                                                   */
/* ------------------------------------------------------------------ */

export var QUIZ_TEMPLATE_CATALOG: QuizTemplateData[] = [
  {
    id: 'photography_style',
    category: 'Photography',
    name: 'Photography Style Quiz',
    description: 'Help potential clients discover their photography style and match them to the right package. Captures emails, qualifies leads by budget, and books more consultations by making the first interaction personal and visual.',
    audience: 'Wedding photographers, portrait photographers, event photographers',
    whyItWorks: 'Photography is a visual medium and clients struggle to articulate what they want. This quiz turns "I like your work" into a qualified lead with budget, timeline, and style preferences.',
    iconPath: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z',
    tags: ['photography', 'wedding', 'portrait', 'booking', 'style'],
    blocks: photographyStyleBlocks,
  },
  {
    id: 'restaurant_menu',
    category: 'Food & Dining',
    name: 'Menu Recommendation Quiz',
    description: 'Guide diners to their perfect dish while building your email list. Captures dietary preferences, party size, and taste profiles — then recommends the ideal menu experience. Boosts reservations and repeat visits.',
    audience: 'Restaurants, cafes, catering companies, food trucks, bakeries',
    whyItWorks: 'Menu fatigue is real. A fun quiz that recommends dishes feels like a personalized concierge, not a marketing form. Diners share it with friends, driving organic referrals.',
    iconPath: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
    tags: ['restaurant', 'food', 'menu', 'dining', 'cafe', 'reservation'],
    blocks: restaurantMenuBlocks,
  },
  {
    id: 'fitness_goal',
    category: 'Fitness & Wellness',
    name: 'Fitness Goal Quiz',
    description: 'Match potential clients to the right program based on their goals, experience level, and schedule. Captures qualified leads who self-select into beginner, intermediate, or advanced tracks.',
    audience: 'Personal trainers, yoga studios, gyms, fitness coaches, wellness centers',
    whyItWorks: 'Fitness clients need to feel understood before they commit. This quiz builds trust by showing you get their goals, then recommends the perfect program before they even ask.',
    iconPath: 'M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9',
    tags: ['fitness', 'gym', 'trainer', 'yoga', 'wellness', 'coaching'],
    blocks: fitnessGoalBlocks,
  },
  {
    id: 'product_finder',
    category: 'Online Store',
    name: 'Product Finder Quiz',
    description: 'Increase average order value by 15-30% by matching shoppers to their perfect product. Captures emails, reduces decision fatigue, and drives higher cart values through personalized recommendations.',
    audience: 'Ecommerce stores, handmade goods shops, DTC brands, Squarespace stores',
    whyItWorks: 'Shoppers who receive personalized recommendations spend 40% more and return 3x more often. The quiz also captures emails from browsers who would otherwise leave without buying.',
    iconPath: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
    tags: ['ecommerce', 'product', 'recommendation', 'shopping', 'store'],
    blocks: productFinderBlocks,
  },
  {
    id: 'wedding_style',
    category: 'Weddings & Events',
    name: 'Wedding Style Quiz',
    description: 'Help engaged couples discover their wedding aesthetic and book a consultation. Captures dream venue, color palette, and guest count — qualifying leads before the first phone call.',
    audience: 'Wedding planners, florists, event venues, bridal shops, invitation designers',
    whyItWorks: 'Couples planning a wedding are overwhelmed with choices. A quiz that crystallizes their style into a clear vision builds instant trust and positions you as the expert who understands them.',
    iconPath: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
    tags: ['wedding', 'planner', 'florist', 'events', 'bridal'],
    blocks: weddingStyleBlocks,
  },
  {
    id: 'coaching_style',
    category: 'Coaches & Consultants',
    name: 'Coaching Readiness Quiz',
    description: 'Segment potential clients by business stage and route them to the right offer. Captures revenue level, biggest challenge, and learning style — so your sales conversation starts where it matters.',
    audience: 'Business coaches, life coaches, consultants, course creators, mentors',
    whyItWorks: 'Coaches who segment leads by stage close 3x more sales. The quiz pre-qualifies prospects so you only spend time on calls with people who are ready for your level of service.',
    iconPath: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3.01',
    tags: ['coaching', 'consulting', 'business', 'mentor', 'course'],
    blocks: coachingStyleBlocks,
  },
  {
    id: 'home_style',
    category: 'Interior Design',
    name: 'Home Style Quiz',
    description: 'Help potential clients discover their interior design style and visualize their dream space. Captures budget, room focus, and style preferences — qualifying leads before the consultation.',
    audience: 'Interior designers, home stagers, furniture stores, home decor shops',
    whyItWorks: 'Clients often cannot describe what they want until they see it. The image-heavy quiz helps them discover their style, and the result page proves you can deliver it.',
    iconPath: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
    tags: ['interior', 'design', 'home', 'decor', 'furniture', 'staging'],
    blocks: homeStyleBlocks,
  },
  {
    id: 'skincare_routine',
    category: 'Beauty & Salons',
    name: 'Skincare Routine Quiz',
    description: 'Capture 40-60% more leads than static forms by guiding visitors through a personalized skincare analysis. Builds trust, grows your email list, and drives treatment bookings in a single interaction.',
    audience: 'Estheticians, skincare brands, beauty salons, dermatologists, spas',
    whyItWorks: 'Customers genuinely need help choosing treatments. This quiz builds trust by demonstrating expertise, captures emails, and drives bookings by matching people to the right service.',
    iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2',
    tags: ['beauty', 'skincare', 'salon', 'spa', 'esthetician', 'treatment'],
    blocks: skincareRoutineBlocks,
  },
  {
    id: 'creative_archetype',
    category: 'Artists & Creatives',
    name: 'Creative Archetype Quiz',
    description: 'Help fellow creatives discover their artistic identity and connect with your brand. A personality-style quiz that builds community, drives email signups, and positions you as a creative leader.',
    audience: 'Artists, illustrators, makers, craftspeople, creative entrepreneurs',
    whyItWorks: 'Personality quizzes are the most shared quiz type on social media. Creatives love self-discovery, and sharing their archetype drives organic traffic back to your site.',
    iconPath: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 13a2 2 0 11-4 0 2 2 0 014 0z',
    tags: ['artist', 'creative', 'maker', 'personality', 'archetype'],
    blocks: creativeArchetypeBlocks,
  },
  {
    id: 'podcast_personality',
    category: 'Podcasters & Creators',
    name: 'Creator Personality Quiz',
    description: 'Help your audience discover their content creation style while growing your email list. The shareable results drive organic referrals and position you as the go-to resource for creators.',
    audience: 'Podcasters, YouTubers, bloggers, newsletter writers, content creators',
    whyItWorks: 'Creators love taking quizzes about their craft. The personality format drives social sharing and the results naturally funnel people toward your courses, memberships, or services.',
    iconPath: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
    tags: ['podcast', 'creator', 'content', 'youtube', 'blogger'],
    blocks: podcastPersonalityBlocks,
  },
  {
    id: 'real_estate_buyer',
    category: 'Real Estate',
    name: 'Home Buyer Quiz',
    description: 'Qualify potential buyers by capturing budget, timeline, neighborhood preferences, and must-haves. Route hot leads to your CRM and nurture browsers with curated listings until they are ready.',
    audience: 'Real estate agents, brokers, property developers, mortgage lenders',
    whyItWorks: 'Real estate leads are expensive. This quiz pre-qualifies prospects for free, capturing the same info you would ask on a first call — but without the awkward cold outreach.',
    iconPath: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 100 6 3 3 0 000-6z',
    tags: ['real-estate', 'property', 'buyer', 'agent', 'home'],
    blocks: realEstateBuyerBlocks,
  },
  {
    id: 'travel_style',
    category: 'Travel & Hospitality',
    name: 'Travel Style Quiz',
    description: 'Match travelers to their ideal trip type and capture leads for your travel packages. Segments by budget, style, and timeline so you can send personalized offers that convert.',
    audience: 'Travel agencies, tour operators, hotels, resorts, Airbnb hosts',
    whyItWorks: 'Travelers dream before they book. A fun quiz that matches them to a destination or package captures that intent while the wanderlust is high — long before they comparison shop.',
    iconPath: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
    tags: ['travel', 'hotel', 'tourism', 'vacation', 'hospitality'],
    blocks: travelStyleBlocks,
  },
  {
    id: 'nonprofit_engagement',
    category: 'Nonprofits & Causes',
    name: 'Impact Path Quiz',
    description: 'Help supporters discover how they can make the biggest difference — donating, volunteering, or advocating. Segments your audience so you can send the right ask to the right person.',
    audience: 'Nonprofits, charities, foundations, community organizations, advocacy groups',
    whyItWorks: 'Not every supporter wants the same thing. This quiz routes donors to donation pages, volunteers to sign-up forms, and advocates to share campaigns — maximizing engagement for everyone.',
    iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    tags: ['nonprofit', 'charity', 'volunteer', 'donation', 'cause'],
    blocks: nonprofitEngagementBlocks,
  },
  {
    id: 'video_fitness_challenge',
    category: 'Fitness & Wellness',
    name: 'Video Fitness Challenge Quiz',
    description: 'Engage your audience with video-driven fitness questions. Show exercise demos, form checks, and workout clips — then match visitors to their ideal program. Video questions boost completion rates by 40%.',
    audience: 'Personal trainers, fitness studios, yoga instructors, online coaches',
    whyItWorks: 'Video questions show your expertise and build instant trust. Visitors see real workouts before signing up, which dramatically increases conversion to paid programs.',
    iconPath: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
    tags: ['video', 'fitness', 'workout', 'exercise', 'training', 'challenge'],
    blocks: videoFitnessChallengeBlocks,
  },
  {
    id: 'video_cooking_style',
    category: 'Food & Dining',
    name: 'Video Cooking Style Quiz',
    description: 'Use cooking clips and recipe videos to match visitors to their culinary personality. Video-based questions create an immersive experience that drives cookbook sales, class signups, and meal plan subscriptions.',
    audience: 'Food bloggers, cooking instructors, meal kit services, recipe sites',
    whyItWorks: 'Showing food being prepared is infinitely more engaging than static photos. Video questions keep people watching and answering — completion rates are 2x higher than image-only quizzes.',
    iconPath: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
    tags: ['video', 'cooking', 'food', 'recipe', 'culinary', 'chef'],
    blocks: videoCookingStyleBlocks,
  },
  {
    id: 'video_brand_personality',
    category: 'Coaches & Consultants',
    name: 'Video Brand Personality Quiz',
    description: 'Use short video clips to reveal your brand personality and coaching style. Each question features a video scenario that visitors react to — creating a deeply engaging, memorable experience.',
    audience: 'Brand strategists, business coaches, marketing consultants, course creators',
    whyItWorks: 'Video quizzes feel premium and personal. Prospects see your face, hear your voice, and connect with your brand before the first call — shortening the sales cycle dramatically.',
    iconPath: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
    tags: ['video', 'brand', 'personality', 'coaching', 'consulting'],
    blocks: videoBrandPersonalityBlocks,
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

/**
 * Get the first imageChoice option URL from a template's first question
 * as a thumbnail for the template card.
 */
export function getTemplateThumbnail(templateId: string): string | null {
  var tpl = findTemplateData(templateId);
  if (!tpl) return null;
  var blocks = tpl.blocks();
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    /* Only use image mediaUrls — skip video (.mp4) */
    if (b.type === 'question' && (b as any).mediaUrl && (b as any).mediaType !== 'video') {
      return (b as any).mediaUrl;
    }
    if (b.type === 'question' && (b as any).options) {
      var opts = (b as any).options;
      for (var j = 0; j < opts.length; j++) {
        if (opts[j].imageUrl) return opts[j].imageUrl;
      }
    }
  }
  /* Fallback: check outcome images */
  for (var k = 0; k < blocks.length; k++) {
    if (blocks[k].type === 'outcome' && (blocks[k] as any).imageUrl) {
      return (blocks[k] as any).imageUrl;
    }
  }
  return null;
}

/**
 * Count the number of question blocks in a template.
 */
export function getTemplateQuestionCount(templateId: string): number {
  var tpl = findTemplateData(templateId);
  if (!tpl) return 0;
  var blocks = tpl.blocks();
  var count = 0;
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'question') count++;
  }
  return count;
}
