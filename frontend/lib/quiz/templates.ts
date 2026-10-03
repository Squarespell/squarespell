/**
 * Quiz templates: 16 complete, ready-to-publish quiz funnels for the businesses that use Squarespell.
 *
 * Every template ships with:
 *   - 7 questions, each with helper text and a visual: an image per answer, a header photo, or a video
 *   - unique, license-free Unsplash photography (no photo is reused across templates) and self-hosted video
 *   - a lead gate before the results (email, first name, and phone where a call is the next step)
 *   - 3 scored outcomes covering every possible score (7-13, 14-20, 21-28) with a photo, 3 tips, a call to
 *     action and the result-page extras that fit the business: products, coupon, booking, before and after
 *   - default quiz settings (TEMPLATE_SETTINGS) that switch those extras on when a quiz is created from it
 *
 * Copy is complete and specific: no placeholders and no invented testimonials.
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
/*  1. photography_style */
/* ------------------------------------------------------------------ */

function photographyStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What moment matters most to you on your big day?",
      subtitle: "Pick the one you would be most upset to miss in your photos.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Candid, emotional moments", score: 4, imageUrl: "https://images.unsplash.com/photo-1593472129865-f71f62103a47?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Perfectly styled portraits", score: 3, imageUrl: "https://images.unsplash.com/photo-1517092756309-24071485f6db?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "The venue and the details", score: 2, imageUrl: "https://images.unsplash.com/photo-1723832348140-a2d9eb1753b1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "The party and the dancing", score: 1, imageUrl: "https://images.unsplash.com/photo-1560987617-6de57e3d0574?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which editing style are you drawn to?",
      subtitle: "Think about the photos you save on Pinterest or Instagram.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Light and airy", score: 4, imageUrl: "https://images.unsplash.com/photo-1707676828973-3435f2ed6a47?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Dark and moody", score: 3, imageUrl: "https://images.unsplash.com/photo-1612351641432-20a0f196086c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Warm film tones", score: 2, imageUrl: "https://images.unsplash.com/photo-1682951822164-f9f0a533b743?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Classic black and white", score: 1, imageUrl: "https://images.unsplash.com/photo-1569525987258-6aa03a5e4926?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Where would you love your photos taken?",
      subtitle: "Your setting shapes the light, the color and the whole feel of the gallery.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Garden or countryside", score: 4, imageUrl: "https://images.unsplash.com/photo-1572085313466-6710de8d7ba3?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Historic estate or ballroom", score: 3, imageUrl: "https://images.unsplash.com/photo-1630587148265-761cbd139043?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Beach or coast", score: 2, imageUrl: "https://images.unsplash.com/photo-1724863932148-2a6ec113359b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "City rooftop or loft", score: 1, imageUrl: "https://images.unsplash.com/photo-1656756501599-85afe3473a3a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many hours of coverage do you need?",
      subtitle: "Most full weddings need 8 or more hours to cover getting ready through the first dance.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1640349292911-7c1c4d9dd4e1?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Full day, 10 hours or more", score: 4, explanation: "From getting ready to the last song." },
        { id: uid(), text: "Most of the day, 8 hours", score: 3, explanation: "Ceremony, portraits and the reception." },
        { id: uid(), text: "Half day, 4 to 6 hours", score: 2, explanation: "Ceremony and portraits." },
        { id: uid(), text: "Just the ceremony, 2 hours", score: 1, explanation: "A short and sweet session." },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your photography budget?",
      subtitle: "This helps us recommend a package you will be comfortable with.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1598113082891-dcb7b2032b28?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$7,000 and above", score: 4 },
        { id: uid(), text: "$4,000 to $7,000", score: 3 },
        { id: uid(), text: "$2,000 to $4,000", score: 2 },
        { id: uid(), text: "Under $2,000", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How important is a second photographer?",
      subtitle: "A second shooter captures both sides of the aisle and the guests.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Essential, I want every angle", score: 4 },
        { id: uid(), text: "Nice to have", score: 3 },
        { id: uid(), text: "Only for the ceremony", score: 2 },
        { id: uid(), text: "One great photographer is enough", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When is your event?",
      subtitle: "Popular dates book 9 to 12 months ahead.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1506785017561-cd70a3c8d1c2?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Within 3 months", score: 4 },
        { id: uid(), text: "3 to 6 months away", score: 3 },
        { id: uid(), text: "6 to 12 months away", score: 2 },
        { id: uid(), text: "More than a year away", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your photography match is ready",
      subtext: "Enter your email to see the package that fits your answers, plus a pricing guide for your date.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my package",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Full-Day Collection",
      description: "The Full-Day Collection includes full-day coverage, a second photographer and a curated gallery of 500+ edited images, from getting ready to the last dance.",
      ctaText: "Book a consultation", ctaUrl: "/contact",
      imageUrl: "https://images.unsplash.com/photo-1705290304455-35ffb433f560?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "I matched with The Full-Day Collection. Find your wedding photography package.",
      tips: ["Send your date and venue so we can confirm availability.", "Plan an extra 30 minutes for golden-hour portraits.", "Share a list of the people and moments you must have."],
      bookingUrl: "/book", bookingText: "Book a 20-minute call",
      beforeText: "Worried you will forget the little moments.", afterText: "A gallery that tells your whole day, frame by frame.",
    },
    {
      id: uid(), type: 'outcome', title: "The Signature Session",
      description: "The Signature Session includes 6 hours of coverage, a planning call to build your shot list and 300+ edited images. It covers the ceremony, portraits and the first part of the reception.",
      ctaText: "View the portfolio", ctaUrl: "/portfolio",
      imageUrl: "https://images.unsplash.com/photo-1768050197707-5576b319e2d3?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "The Signature Session is my match. Take the quiz to find yours.",
      tips: ["Save 10 to 15 photos you love so we can match the look.", "Choose a portrait location with open shade.", "Book hair and makeup to finish 30 minutes early."],
      bookingUrl: "/book", bookingText: "Plan my Signature Session",
      beforeText: "Not sure your photos will look like the ones you saved.", afterText: "The ceremony, portraits and the start of the reception, all covered.",
    },
    {
      id: uid(), type: 'outcome', title: "The Essentials Package",
      description: "The Essentials Package covers the ceremony and portraits with 4 hours of coverage and 150+ edited images in a private online gallery. You can add hours later if your plans grow.",
      ctaText: "Check availability", ctaUrl: "/booking",
      imageUrl: "https://images.unsplash.com/photo-1763429450882-2f88073f2df5?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "The Essentials Package fits me perfectly. What is your match?",
      tips: ["Keep the ceremony and portraits close together.", "Pick one location for all your portraits.", "Add an hour later if your plans grow."],
      bookingUrl: "/book", bookingText: "Check my date",
      beforeText: "Not sure how much coverage you need.", afterText: "Beautiful ceremony and portrait photos that fit your plans.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  2. restaurant_menu */
/* ------------------------------------------------------------------ */

function restaurantMenuBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What kind of meal are you in the mood for?",
      subtitle: "Go with your gut, there are no wrong answers.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A slow, multi-course tasting", score: 4, imageUrl: "https://images.unsplash.com/photo-1785413287408-b4a4348412f6?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Something seasonal and fresh", score: 3, imageUrl: "https://images.unsplash.com/photo-1667657682263-86e924b34fd9?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A cozy comfort classic", score: 2, imageUrl: "https://images.unsplash.com/photo-1664214649076-7b17006db5b5?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Something quick and casual", score: 1, imageUrl: "https://images.unsplash.com/photo-1713330801172-03f8d1c0dde7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Pick the flavors you love most.",
      subtitle: "Your answer helps our chef recommend the right dishes.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Bold and spicy", score: 4, imageUrl: "https://images.unsplash.com/photo-1591272216626-b09e38519371?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Herby and bright", score: 3, imageUrl: "https://images.unsplash.com/photo-1591291294701-4f651ddd3556?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Rich and savory", score: 2, imageUrl: "https://images.unsplash.com/photo-1593030668930-8130abedd2b0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Sweet and simple", score: 1, imageUrl: "https://images.unsplash.com/photo-1628890444435-9e68e905773b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Who are you dining with?",
      subtitle: "We will suggest the right table and sharing plates.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1536392706976-e486e2ba97af?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "A celebration with a group", score: 4, explanation: "Birthdays, anniversaries and big nights." },
        { id: uid(), text: "A date night for two", score: 3, explanation: "Something a little special." },
        { id: uid(), text: "Friends or family", score: 2, explanation: "Relaxed plates to share." },
        { id: uid(), text: "Just me", score: 1, explanation: "A quiet seat at the bar." },
      ],
    },
    {
      id: uid(), type: 'question', text: "Any dietary preferences?",
      subtitle: "Our kitchen adapts most dishes, so this is only a starting point.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1489450278009-822e9be04dff?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "I eat everything", score: 4 },
        { id: uid(), text: "Pescatarian", score: 3 },
        { id: uid(), text: "Vegetarian or vegan", score: 2 },
        { id: uid(), text: "Gluten free", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What would you like to drink?",
      subtitle: "We will pair your dishes with something you will love.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A wine pairing", score: 4, imageUrl: "https://images.unsplash.com/photo-1610065333275-b3e5c63fc872?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A crafted cocktail", score: 3, imageUrl: "https://images.unsplash.com/photo-1632987788901-0c090e5f4eaf?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A local beer", score: 2, imageUrl: "https://images.unsplash.com/photo-1587582816472-81e94768469a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Something alcohol free", score: 1, imageUrl: "https://images.unsplash.com/photo-1623084921164-4a8c5c37a912?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How do you like your evening to feel?",
      subtitle: "The setting matters as much as the food.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1709548145082-04d0cde481d4?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Elegant and unhurried", score: 4 },
        { id: uid(), text: "Lively with a buzz", score: 3 },
        { id: uid(), text: "Warm and relaxed", score: 2 },
        { id: uid(), text: "Quick and easy", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When are you planning to visit?",
      subtitle: "Weekend tables book up fast.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1601321268954-22646044f7d0?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "This weekend", score: 4 },
        { id: uid(), text: "Within two weeks", score: 3 },
        { id: uid(), text: "Sometime this month", score: 2 },
        { id: uid(), text: "Just browsing for now", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your perfect menu is ready",
      subtext: "Enter your email to see your recommended dishes and a welcome offer for your first visit.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "Show my menu",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Chef's Tasting Experience",
      description: "Our suggestion: the chef's tasting menu, seven seasonal courses with optional wine pairings, served at an unhurried pace so you can enjoy every plate.",
      ctaText: "Reserve a table", ctaUrl: "/reservations",
      imageUrl: "https://images.unsplash.com/photo-1698434939525-dd584e446a29?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "I matched with the Chef's Tasting Experience. Find your perfect dish.",
      tips: ["Book the counter seats to watch the kitchen.", "Tell us about allergies when you reserve.", "Allow about 2.5 hours for the full menu."],
      products: [
        { title: "Seven-course tasting menu", price: "$95", url: "/menu#tasting", imageUrl: "https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Wine pairing", price: "$55", url: "/menu#wine", imageUrl: "https://images.unsplash.com/photo-1786034759981-9192a650692d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "TASTING10", couponLabel: "10% off the tasting menu for two",
    },
    {
      id: uid(), type: 'outcome', title: "The Seasonal Signature",
      description: "Our suggestion: start with our market plates, then choose one of our signature mains, all built around what our local growers bring in this week.",
      ctaText: "See the seasonal menu", ctaUrl: "/menu",
      imageUrl: "https://images.unsplash.com/photo-1712247452824-4c98e36925cc?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "The Seasonal Signature is my menu match. What is yours?",
      tips: ["Ask what came in from the farm today.", "Share two market plates before your mains.", "Midweek evenings are quieter and more relaxed."],
      products: [
        { title: "Market plates to share", price: "$24", url: "/menu#market", imageUrl: "https://images.unsplash.com/photo-1547573854-74d2a71d0826?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Signature main", price: "$32", url: "/menu#mains", imageUrl: "https://images.unsplash.com/photo-1665401015549-712c0dc5ef85?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "SEASON15", couponLabel: "15% off your first seasonal dinner",
    },
    {
      id: uid(), type: 'outcome', title: "The Classic Comfort Plate",
      description: "Our suggestion: our comfort classics, slow-cooked, served hot and made for sharing, perfect for a relaxed night out.",
      ctaText: "Order or reserve", ctaUrl: "/menu#classics",
      imageUrl: "https://images.unsplash.com/photo-1783683275671-ce9e1de86f12?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I got the Classic Comfort Plate. Take the quiz and find your dish.",
      tips: ["Our classics are also available for takeout.", "Order a side of house bread to share.", "Save room for dessert."],
      products: [
        { title: "House lasagne", price: "$21", url: "/menu#lasagne", imageUrl: "https://images.unsplash.com/photo-1654780105295-9227206f11ec?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Warm chocolate pudding", price: "$9", url: "/menu#dessert", imageUrl: "https://images.unsplash.com/photo-1590080875852-ba44f83ff2db?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "WELCOME10", couponLabel: "10% off your first order",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  3. fitness_goal */
/* ------------------------------------------------------------------ */

function fitnessGoalBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What is your main goal right now?",
      subtitle: "Choose the one that would make the biggest difference.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Build strength", score: 4, imageUrl: "https://images.unsplash.com/photo-1786389865984-1c3ae7b362b7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Lose fat and tone up", score: 3, imageUrl: "https://images.unsplash.com/photo-1591311630200-ffa9120a540f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Improve flexibility", score: 2, imageUrl: "https://images.unsplash.com/photo-1646239646963-b0b9be56d6b5?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Feel more energetic", score: 1, imageUrl: "https://images.unsplash.com/photo-1602389569471-5df5bde61968?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How would you describe your fitness level?",
      subtitle: "Be honest, every program starts where you are.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Advanced, I train most days", score: 4, explanation: "Ready for a serious challenge." },
        { id: uid(), text: "Intermediate, I train weekly", score: 3, explanation: "Consistent but want more." },
        { id: uid(), text: "Beginner, just getting started", score: 2, explanation: "Building the habit." },
        { id: uid(), text: "Returning after a long break", score: 1, explanation: "Easing back in safely." },
      ],
    },
    {
      id: uid(), type: 'question', text: "Where do you prefer to train?",
      subtitle: "We will design your plan around your space and equipment.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "In a fully equipped gym", score: 4, imageUrl: "https://images.unsplash.com/photo-1728486145245-d4cb0c9c3470?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "In a small group class", score: 3, imageUrl: "https://images.unsplash.com/photo-1637430308606-86576d8fef3c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "At home", score: 2, imageUrl: "https://images.unsplash.com/photo-1673563932951-cc2428db70eb?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Outdoors", score: 1, imageUrl: "https://images.unsplash.com/photo-1667579775110-670ae8a64100?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many days a week can you commit?",
      subtitle: "Consistency beats intensity.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1628678172909-13a7209c7d62?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "5 or more days", score: 4 },
        { id: uid(), text: "3 to 4 days", score: 3 },
        { id: uid(), text: "2 days", score: 2 },
        { id: uid(), text: "1 day to start", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What kind of workout do you enjoy most?",
      subtitle: "You will stick with what you enjoy.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Heavy lifting", score: 4, imageUrl: "https://images.unsplash.com/photo-1723744064150-eb939bed4661?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "High-intensity intervals", score: 3, imageUrl: "https://images.unsplash.com/photo-1588180576319-d31d0af3e7ad?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Pilates and mobility", score: 2, imageUrl: "https://images.unsplash.com/photo-1717500252297-b09508db7ceb?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Running and cycling", score: 1, imageUrl: "https://images.unsplash.com/photo-1760031670160-4da44e9596d0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How much support would you like?",
      subtitle: "From full coaching to a simple plan to follow.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1649888254873-d9870ee286ee?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "One-to-one coaching", score: 4 },
        { id: uid(), text: "Small group coaching", score: 3 },
        { id: uid(), text: "A plan with check-ins", score: 2 },
        { id: uid(), text: "A plan I follow alone", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When do you want to start?",
      subtitle: "Spots in our programs are limited each month.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1653397087561-e7425d6b5a2a?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "This week", score: 4 },
        { id: uid(), text: "Within two weeks", score: 3 },
        { id: uid(), text: "This month", score: 2 },
        { id: uid(), text: "Just exploring", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your training plan is ready",
      subtext: "Enter your email to get your recommended program and a free first session.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
        { id: uid(), type: 'phone', label: 'Phone number', required: false, placeholder: 'Optional' },
      ],
      buttonLabel: "Get my plan",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Transformation Program",
      description: "The Transformation Program combines one-to-one coaching, a personalized strength plan and weekly check-ins for 12 weeks. Book a first session to see how it fits your week.",
      ctaText: "Start my program", ctaUrl: "/programs/transformation",
      imageUrl: "https://images.unsplash.com/photo-1547919307-1ecb10702e6f?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "I matched with The Transformation Program. Find your fitness plan.",
      tips: ["Train 4 days a week with one full rest day.", "Track your lifts so you can see progress.", "Aim for 7 to 9 hours of sleep."],
      couponCode: "START20", couponLabel: "20% off your first month",
      bookingUrl: "/book", bookingText: "Book my free consultation",
      beforeText: "Training hard without a clear plan.", afterText: "Measurable strength gains in 12 weeks.",
    },
    {
      id: uid(), type: 'outcome', title: "The Balanced Lifestyle Plan",
      description: "The Balanced Lifestyle Plan mixes small group classes with a simple home routine, 3 to 4 sessions a week.",
      ctaText: "See class times", ctaUrl: "/classes",
      imageUrl: "https://images.unsplash.com/photo-1632077804406-188472f1a810?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "The Balanced Lifestyle Plan is my match. What is yours?",
      tips: ["Pick the same class times each week.", "Add a 20-minute walk on rest days.", "Bring a friend to stay consistent."],
      couponCode: "BALANCE15", couponLabel: "15% off a class pack",
      bookingUrl: "/book", bookingText: "Book a free class",
      beforeText: "Starting strong, then losing momentum.", afterText: "A routine you actually keep.",
    },
    {
      id: uid(), type: 'outcome', title: "The Jumpstart Challenge",
      description: "The 21-day Jumpstart Challenge gives you short, guided workouts and daily nudges to get moving.",
      ctaText: "Join the challenge", ctaUrl: "/jumpstart",
      imageUrl: "https://images.unsplash.com/photo-1591291621164-2c6367723315?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am starting the Jumpstart Challenge. Take the quiz.",
      tips: ["Start with 20 minutes, three times a week.", "Lay out your workout clothes the night before.", "Celebrate every completed week."],
      couponCode: "JUMP10", couponLabel: "$10 off the 21-day challenge",
      bookingUrl: "/book", bookingText: "Talk to a coach",
      beforeText: "Not sure where to begin.", afterText: "A daily habit in 21 days.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  4. product_finder */
/* ------------------------------------------------------------------ */

function productFinderBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Who are you shopping for?",
      subtitle: "We will tailor our picks to them.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Myself, a little treat", score: 4, imageUrl: "https://images.unsplash.com/photo-1610377507996-dcd4f0cfc125?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A partner", score: 3, imageUrl: "https://images.unsplash.com/photo-1766864498722-c9499760c901?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A friend or family member", score: 2, imageUrl: "https://images.unsplash.com/photo-1494336956603-39a3641efa1c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A colleague or client", score: 1, imageUrl: "https://images.unsplash.com/photo-1759563871375-d5b140f6646e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which style feels most like them?",
      subtitle: "Choose the look they would love.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Minimal and modern", score: 4, imageUrl: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Warm and natural", score: 3, imageUrl: "https://images.unsplash.com/photo-1762539747176-5d8f166346de?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Bold and colorful", score: 2, imageUrl: "https://images.unsplash.com/photo-1559644704-0eda1aa40c7e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Classic and timeless", score: 1, imageUrl: "https://images.unsplash.com/photo-1617177435596-1c9e30d6d608?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What do they enjoy most?",
      subtitle: "Hobbies are the fastest route to a gift they will use.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Cooking and hosting", score: 4, imageUrl: "https://images.unsplash.com/photo-1505165248533-c7d65ff76e21?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Self-care and relaxing", score: 3, imageUrl: "https://images.unsplash.com/photo-1720118509152-2df877673bee?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Reading and slow mornings", score: 2, imageUrl: "https://images.unsplash.com/photo-1561239905-d620f213c5f7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Being outdoors", score: 1, imageUrl: "https://images.unsplash.com/photo-1619035226152-81e29823b8d9?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your budget?",
      subtitle: "We have great picks at every price point.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1771148886038-eacb528e544e?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$150 or more", score: 4 },
        { id: uid(), text: "$75 to $150", score: 3 },
        { id: uid(), text: "$30 to $75", score: 2 },
        { id: uid(), text: "Under $30", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is the occasion?",
      subtitle: "So we can suggest the right wrapping and message.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1608824405605-88c9d2c847e8?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "A milestone celebration", score: 4 },
        { id: uid(), text: "A birthday", score: 3 },
        { id: uid(), text: "A holiday", score: 2 },
        { id: uid(), text: "Just because", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How soon do you need it?",
      subtitle: "We ship most orders within one working day.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1585221330389-24fb30535ec7?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Within 2 days", score: 4 },
        { id: uid(), text: "This week", score: 3 },
        { id: uid(), text: "Within two weeks", score: 2 },
        { id: uid(), text: "No rush", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Would you like it gift wrapped?",
      subtitle: "Every gift can include a handwritten card.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1649019489428-70f505daacd6?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Yes, with a handwritten card", score: 4 },
        { id: uid(), text: "Yes, gift wrap only", score: 3 },
        { id: uid(), text: "A gift receipt is enough", score: 2 },
        { id: uid(), text: "No wrapping needed", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your gift picks are ready",
      subtext: "Enter your email to see your three hand-picked products and an exclusive discount.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "Show my picks",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Curated Collection",
      description: "The Curated Collection brings together our best-selling premium pieces. Gift wrapping and a handwritten note can be added at checkout.",
      ctaText: "Shop the collection", ctaUrl: "/shop/curated",
      imageUrl: "https://images.unsplash.com/photo-1759563874676-d551447de3a8?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "I found the perfect gift with this quiz.",
      tips: ["Add a handwritten card at checkout.", "Order by 2pm for same-day shipping.", "Free returns within 30 days."],
      products: [
        { title: "Hand-poured candle set", price: "$68", url: "/shop/candle-set", imageUrl: "https://images.unsplash.com/photo-1777768785105-0a6245d28f28?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Ceramic vase", price: "$85", url: "/shop/vase", imageUrl: "https://images.unsplash.com/photo-1713191352960-911f277876a7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Linen throw", price: "$120", url: "/shop/throw", imageUrl: "https://images.unsplash.com/photo-1591625591034-75d303d2e1a4?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "GIFT15", couponLabel: "15% off your first order",
    },
    {
      id: uid(), type: 'outcome', title: "The Bestsellers Edit",
      description: "The Bestsellers Edit is a selection of our most-loved products, each one rated highly by our customers.",
      ctaText: "Shop bestsellers", ctaUrl: "/shop/bestsellers",
      imageUrl: "https://images.unsplash.com/photo-1724693322842-ef58a38ac50a?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "The Bestsellers Edit had exactly what I needed.",
      tips: ["Bundle two items to save on shipping.", "Gift wrap is free on orders over $50.", "Check sizing guides before you buy."],
      products: [
        { title: "Ceramic mug pair", price: "$42", url: "/shop/mugs", imageUrl: "https://images.unsplash.com/photo-1590422886897-7dd50e58577e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Leather journal", price: "$38", url: "/shop/journal", imageUrl: "https://images.unsplash.com/photo-1654542645651-5196f4931cd6?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "GIFT10", couponLabel: "10% off bestsellers",
    },
    {
      id: uid(), type: 'outcome', title: "The Starter Set",
      description: "The Starter Set brings together small, useful pieces that make a lovely present at a gentle price.",
      ctaText: "Shop gifts under $30", ctaUrl: "/shop/under-30",
      imageUrl: "https://images.unsplash.com/photo-1766512442064-0ffc39ce866f?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "The Starter Set is my pick. Find your perfect gift.",
      tips: ["Pair two small gifts for a fuller present.", "Add a card for a personal touch.", "Join our list for early access to new arrivals."],
      products: [
        { title: "Tea sampler tin", price: "$18", url: "/shop/tea", imageUrl: "https://images.unsplash.com/photo-1666113802599-e4c8b2b9c3a1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Hand cream duo", price: "$24", url: "/shop/hand-cream", imageUrl: "https://images.unsplash.com/photo-1786171154131-d522447af5a6?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "HELLO10", couponLabel: "10% off your first order",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  5. wedding_style */
/* ------------------------------------------------------------------ */

function weddingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Close your eyes and picture your wedding. What do you see?",
      subtitle: "Choose the scene that feels most like you.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A garden full of flowers", score: 4, imageUrl: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A grand ballroom", score: 3, imageUrl: "https://images.unsplash.com/photo-1764776709859-09e142936d1c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A rustic barn with string lights", score: 2, imageUrl: "https://images.unsplash.com/photo-1672190097834-0768cbbc2b01?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A modern city loft", score: 1, imageUrl: "https://images.unsplash.com/photo-1628611225249-6c3c7c689552?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Pick a color palette.",
      subtitle: "Your palette ties the flowers, stationery and decor together.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Soft blush and ivory", score: 4, imageUrl: "https://images.unsplash.com/photo-1611605469961-50d1e409622a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Deep jewel tones", score: 3, imageUrl: "https://images.unsplash.com/photo-1598961111901-e64e25bc0a4c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Earthy greens and neutrals", score: 2, imageUrl: "https://images.unsplash.com/photo-1612619278000-dedea83be032?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Crisp black and white", score: 1, imageUrl: "https://images.unsplash.com/photo-1610726390560-49954c8cb752?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which centerpiece would you choose?",
      subtitle: "Centerpieces set the mood for your reception.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Overflowing florals", score: 4, imageUrl: "https://images.unsplash.com/photo-1609670002360-153929958683?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Candles and greenery", score: 3, imageUrl: "https://images.unsplash.com/photo-1773370812364-7d0e882e0b4f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Wildflowers in jars", score: 2, imageUrl: "https://images.unsplash.com/photo-1613291511109-ea3d67e68a25?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Sleek modern sculpture", score: 1, imageUrl: "https://images.unsplash.com/photo-1678829953952-74847c950894?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many guests are you inviting?",
      subtitle: "Guest count shapes the venue and the budget.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1592677818395-72868c4b3c03?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Over 150", score: 4 },
        { id: uid(), text: "80 to 150", score: 3 },
        { id: uid(), text: "30 to 80", score: 2 },
        { id: uid(), text: "Fewer than 30", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your overall wedding budget?",
      subtitle: "We plan beautiful weddings at every budget.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1632610992723-82d7c212f6d7?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$60,000 or more", score: 4 },
        { id: uid(), text: "$30,000 to $60,000", score: 3 },
        { id: uid(), text: "$15,000 to $30,000", score: 2 },
        { id: uid(), text: "Under $15,000", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How much help would you like with planning?",
      subtitle: "From full planning to day-of coordination.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1531347472897-982afb0e23a9?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Full planning from start to finish", score: 4 },
        { id: uid(), text: "Partial planning and design", score: 3 },
        { id: uid(), text: "Month-of coordination", score: 2 },
        { id: uid(), text: "Just some advice", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When is your wedding?",
      subtitle: "Peak season dates book a year in advance.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1622673407969-3bc5c865739a?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Within 6 months", score: 4 },
        { id: uid(), text: "6 to 12 months away", score: 3 },
        { id: uid(), text: "12 to 18 months away", score: 2 },
        { id: uid(), text: "We have not set a date", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your wedding style is ready",
      subtext: "Enter your email to see your style guide, mood board and planning checklist.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my wedding style",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "Garden Romance",
      description: "Our suggestion: Garden Romance. Think a garden ceremony, blush and ivory florals, candlelit tables and a long, golden evening.",
      ctaText: "Plan my garden wedding", ctaUrl: "/services/full-planning",
      imageUrl: "https://images.unsplash.com/photo-1561593367-66c79c2294e6?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My wedding style is Garden Romance. Find yours.",
      tips: ["Book outdoor venues with a wet-weather backup.", "Choose seasonal flowers to stretch your budget.", "Plan your ceremony for the last two hours of daylight."],
      products: [
        { title: "Full planning package", price: "From $6,500", url: "/services/full-planning", imageUrl: "https://images.unsplash.com/photo-1667555150959-3e881131b9e4?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Floral design", price: "From $2,500", url: "/services/florals", imageUrl: "https://images.unsplash.com/photo-1556712691-5c39e0e32a8e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a planning call",
    },
    {
      id: uid(), type: 'outcome', title: "Modern Elegance",
      description: "Our suggestion: Modern Elegance. Expect a statement venue, a striking palette, sculptural florals and sharp, modern details.",
      ctaText: "Plan my modern wedding", ctaUrl: "/services/partial-planning",
      imageUrl: "https://images.unsplash.com/photo-1649615644623-a4f6220f4352?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My wedding style is Modern Elegance. What is yours?",
      tips: ["Pick one statement element and keep the rest simple.", "Use lighting to transform the room after dark.", "Match your stationery to your palette."],
      products: [
        { title: "Partial planning and design", price: "From $3,800", url: "/services/partial-planning", imageUrl: "https://images.unsplash.com/photo-1738898179451-b5fc497f9f8e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Lighting and styling", price: "From $1,800", url: "/services/styling", imageUrl: "https://images.unsplash.com/photo-1613068431228-8cb6a1e92573?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a design call",
    },
    {
      id: uid(), type: 'outcome', title: "Rustic Charm",
      description: "Our suggestion: Rustic Charm. Picture string lights, wildflowers, long tables and good food shared family style.",
      ctaText: "Plan my rustic wedding", ctaUrl: "/services/coordination",
      imageUrl: "https://images.unsplash.com/photo-1723832348105-2e69f948135a?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "My wedding style is Rustic Charm. Take the quiz.",
      tips: ["Rent long tables for a family-style feel.", "Add blankets and heaters for evening comfort.", "Use local wildflowers for a natural look."],
      products: [
        { title: "Month-of coordination", price: "From $1,900", url: "/services/coordination", imageUrl: "https://images.unsplash.com/photo-1568847811512-803314424fdc?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Rustic styling kit", price: "From $650", url: "/services/rustic-kit", imageUrl: "https://images.unsplash.com/photo-1787493454635-3072a8fbf9ea?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a free consultation",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  6. coaching_style */
/* ------------------------------------------------------------------ */

function coachingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What is the biggest challenge in your business right now?",
      subtitle: "Pick the one that is costing you the most.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Scaling beyond one-to-one work", score: 4, imageUrl: "https://images.unsplash.com/photo-1580934174026-8142803ebb5b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Pricing and packaging my offers", score: 3, imageUrl: "https://images.unsplash.com/photo-1620275765334-4ed948bb4502?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Getting enough clients", score: 2, imageUrl: "https://images.unsplash.com/photo-1628062699790-7c45262b82b4?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Finding clarity and focus", score: 1, imageUrl: "https://images.unsplash.com/photo-1603623898218-0cb7f493309b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How long have you been in business?",
      subtitle: "Every stage has its own priorities.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1707528041466-83a325f01a3c?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "More than 5 years", score: 4 },
        { id: uid(), text: "2 to 5 years", score: 3 },
        { id: uid(), text: "Under 2 years", score: 2 },
        { id: uid(), text: "I am just starting out", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What does your monthly revenue look like?",
      subtitle: "This stays private and helps us recommend the right program.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Over $25,000", score: 4 },
        { id: uid(), text: "$10,000 to $25,000", score: 3 },
        { id: uid(), text: "$3,000 to $10,000", score: 2 },
        { id: uid(), text: "Under $3,000", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How do you prefer to learn?",
      subtitle: "We will match the program to the way you work best.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Done-with-you strategy sessions", score: 4, imageUrl: "https://images.unsplash.com/photo-1763308373462-55ccb16f12b1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A small mastermind group", score: 3, imageUrl: "https://images.unsplash.com/photo-1787160074092-050d14e4d554?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A self-paced course", score: 2, imageUrl: "https://images.unsplash.com/photo-1774292476423-c3ee7ea107b9?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Books and resources", score: 1, imageUrl: "https://images.unsplash.com/photo-1695774165691-8a01a6045952?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many hours a week can you invest in growth?",
      subtitle: "Be realistic, the best plan is the one you will follow.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1753620064477-68ef5fbd9ef5?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "10 hours or more", score: 4 },
        { id: uid(), text: "5 to 10 hours", score: 3 },
        { id: uid(), text: "2 to 5 hours", score: 2 },
        { id: uid(), text: "Less than 2 hours", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Where do you want to be in 12 months?",
      subtitle: "Choose the outcome that excites you most.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Running a team", score: 4, imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Fully booked with premium clients", score: 3, imageUrl: "https://images.unsplash.com/photo-1505409859467-3a796fd5798e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Steady, predictable income", score: 2, imageUrl: "https://images.unsplash.com/photo-1633158829875-e5316a358c6f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A clear plan and more confidence", score: 1, imageUrl: "https://images.unsplash.com/photo-1689689753534-30a3182ed023?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How soon do you want to start?",
      subtitle: "Our next cohort starts at the beginning of the month.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1650735311937-1876825e971b?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Right away", score: 4 },
        { id: uid(), text: "Within a month", score: 3 },
        { id: uid(), text: "In the next 3 months", score: 2 },
        { id: uid(), text: "Just researching", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your growth plan is ready",
      subtext: "Enter your details to get your recommended program and a free strategy call.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
        { id: uid(), type: 'phone', label: 'Phone number', required: false, placeholder: 'Optional' },
      ],
      buttonLabel: "Get my plan",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Accelerator",
      description: "The Accelerator is a 6-month, one-to-one program covering offers, systems and hiring, with strategy sessions every two weeks.",
      ctaText: "Apply for the Accelerator", ctaUrl: "/programs/accelerator",
      imageUrl: "https://images.unsplash.com/photo-1571624436279-b272aff752b5?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "The Accelerator is my next step. Find yours.",
      tips: ["Write down the three tasks only you should be doing.", "Document one process this week.", "Review your pricing every quarter."],
      bookingUrl: "/book", bookingText: "Book a strategy call",
      beforeText: "Fully booked but stuck at your current income.", afterText: "A business that grows without you doing everything.",
    },
    {
      id: uid(), type: 'outcome', title: "The Growth Blueprint",
      description: "The Growth Blueprint is a 12-week group program to package your offers, raise your prices and build a steady flow of clients.",
      ctaText: "Join the Growth Blueprint", ctaUrl: "/programs/blueprint",
      imageUrl: "https://images.unsplash.com/photo-1542621334-a254cf47733d?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "The Growth Blueprint is my match. What is yours?",
      tips: ["Turn your most-requested service into a package.", "Ask three happy clients for referrals.", "Block two hours a week for marketing."],
      bookingUrl: "/book", bookingText: "Book a discovery call",
      beforeText: "Busy one month, quiet the next.", afterText: "Steady clients and clear, profitable offers.",
    },
    {
      id: uid(), type: 'outcome', title: "The Foundation Course",
      description: "The Foundation Course is a self-paced program to find your niche, shape your first offer and land your first clients.",
      ctaText: "Start the Foundation Course", ctaUrl: "/programs/foundation",
      imageUrl: "https://images.unsplash.com/photo-1679119790850-161688b0417e?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am starting with the Foundation Course. Take the quiz.",
      tips: ["Describe your ideal client in one sentence.", "Offer one clear service before adding more.", "Talk to five potential clients this month."],
      bookingUrl: "/book", bookingText: "Ask a question",
      beforeText: "Unsure who to serve or what to sell.", afterText: "A clear niche, an offer and your first clients.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  7. home_style */
/* ------------------------------------------------------------------ */

function homeStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Which room feels most like home to you?",
      subtitle: "Go with your first instinct.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A sunlit room full of plants", score: 4, imageUrl: "https://images.unsplash.com/photo-1656122381069-9ec666d95cf1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A sleek, calm kitchen", score: 3, imageUrl: "https://images.unsplash.com/photo-1610276099118-c929abaaa80a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A cozy reading nook", score: 2, imageUrl: "https://images.unsplash.com/photo-1765828313695-cd872255352f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A bold, collected lounge", score: 1, imageUrl: "https://images.unsplash.com/photo-1632119580908-ae947d4c7691?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Pick a color palette.",
      subtitle: "Your palette is the foundation of the whole design.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Warm whites and natural wood", score: 4, imageUrl: "https://images.unsplash.com/photo-1611072337226-1140ab367200?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Soft grays and stone", score: 3, imageUrl: "https://images.unsplash.com/photo-1712730324696-f95697a14f97?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Earthy terracotta and olive", score: 2, imageUrl: "https://images.unsplash.com/photo-1790343434182-872b9d1539c3?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Deep, moody colors", score: 1, imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which piece of furniture would you choose?",
      subtitle: "This tells us a lot about your style.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A curved boucle sofa", score: 4, imageUrl: "https://images.unsplash.com/photo-1684165610413-2401399e0e59?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A solid oak dining table", score: 3, imageUrl: "https://images.unsplash.com/photo-1758977403865-f79e156415b3?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A vintage leather armchair", score: 2, imageUrl: "https://images.unsplash.com/photo-1605702098590-d552a98dc93d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A statement velvet chair", score: 1, imageUrl: "https://images.unsplash.com/photo-1765663241884-ebd171bdda1d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which room are you designing first?",
      subtitle: "We will tailor your style guide to this space.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1770200574989-a4cca2c70c00?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "The whole home", score: 4 },
        { id: uid(), text: "Living room", score: 3 },
        { id: uid(), text: "Bedroom", score: 2 },
        { id: uid(), text: "Home office", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your budget for this project?",
      subtitle: "This helps us recommend the right level of design support.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1752321531399-1e2b66043b52?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$25,000 or more", score: 4 },
        { id: uid(), text: "$10,000 to $25,000", score: 3 },
        { id: uid(), text: "$3,000 to $10,000", score: 2 },
        { id: uid(), text: "Under $3,000", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How involved do you want to be?",
      subtitle: "From full service to a do-it-yourself plan.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1532455900982-24be47fa89de?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Design and manage everything for me", score: 4 },
        { id: uid(), text: "Design it, I will buy and install", score: 3 },
        { id: uid(), text: "A styling consult and shopping list", score: 2 },
        { id: uid(), text: "Just a mood board", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When would you like to start?",
      subtitle: "Our design calendar books 4 to 6 weeks ahead.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1581079289196-67865ea83118?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "As soon as possible", score: 4 },
        { id: uid(), text: "In the next 3 months", score: 3 },
        { id: uid(), text: "In 3 to 6 months", score: 2 },
        { id: uid(), text: "Just collecting ideas", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your home style is ready",
      subtext: "Enter your email to get your style guide, palette and a curated shopping list.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my style",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "Organic Modern",
      description: "Our suggestion: Organic Modern. Calm, natural spaces full of light, texture and wood: warm whites, oak, linen, stone and plenty of plants.",
      ctaText: "Book a design consultation", ctaUrl: "/services/full-design",
      imageUrl: "https://images.unsplash.com/photo-1649083048770-82e8ffd80431?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My home style is Organic Modern. Find yours.",
      tips: ["Layer three textures in every room.", "Choose warm white bulbs around 2700K.", "Bring in one large plant per room."],
      products: [
        { title: "Full-service interior design", price: "From $4,500", url: "/services/full-design", imageUrl: "https://images.unsplash.com/photo-1763076470404-23554ef26747?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Linen and oak style kit", price: "$420", url: "/shop/organic-kit", imageUrl: "https://images.unsplash.com/photo-1531877025030-f7696a50770f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a design call",
    },
    {
      id: uid(), type: 'outcome', title: "Collected Eclectic",
      description: "Our suggestion: Collected Eclectic. Vintage finds, art, color and pattern mixed into spaces that feel personal and alive.",
      ctaText: "Book a styling session", ctaUrl: "/services/styling",
      imageUrl: "https://images.unsplash.com/photo-1696454821089-eba4e8fcc24d?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My home style is Collected Eclectic. What is yours?",
      tips: ["Repeat one color three times in a room.", "Hang art at eye level, about 57 inches to center.", "Mix old and new in every space."],
      products: [
        { title: "E-design package", price: "$950", url: "/services/e-design", imageUrl: "https://images.unsplash.com/photo-1561123760-0b8467594a63?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Vintage art print set", price: "$180", url: "/shop/art-prints", imageUrl: "https://images.unsplash.com/photo-1452457005517-a0dd81caca2a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a styling session",
    },
    {
      id: uid(), type: 'outcome', title: "Bold Contemporary",
      description: "Our suggestion: Bold Contemporary. Deep colors, statement furniture and striking lighting that make a room unforgettable.",
      ctaText: "Get my mood board", ctaUrl: "/services/mood-board",
      imageUrl: "https://images.unsplash.com/photo-1640357897497-599b4fc84f51?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "My home style is Bold Contemporary. Take the quiz.",
      tips: ["Paint the ceiling the same color as the walls.", "Choose one oversized light fixture.", "Use mirrors to balance dark colors."],
      products: [
        { title: "Mood board and palette", price: "$290", url: "/services/mood-board", imageUrl: "https://images.unsplash.com/photo-1581079948988-537795b40f5f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Statement lighting edit", price: "$650", url: "/shop/lighting", imageUrl: "https://images.unsplash.com/photo-1608128947626-09e25f109c59?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a mood board session",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  8. skincare_routine */
/* ------------------------------------------------------------------ */

function skincareRoutineBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "How does your skin feel on a typical day?",
      subtitle: "Think about how it feels a few hours after cleansing.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Oily and shiny by noon", score: 4, imageUrl: "https://images.unsplash.com/photo-1632012643837-1163a4297c24?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Combination, oily here and dry there", score: 3, imageUrl: "https://images.unsplash.com/photo-1713768704571-6aeb0d0e5105?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Dry and tight", score: 2, imageUrl: "https://images.unsplash.com/photo-1728994062543-74a1dc2c9392?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Balanced and comfortable", score: 1, imageUrl: "https://images.unsplash.com/photo-1592397222482-f48a4da0b84f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your main skin concern?",
      subtitle: "We will build your routine around this.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Breakouts and blemishes", score: 4, imageUrl: "https://images.unsplash.com/photo-1782687529451-502c24091a0c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Fine lines and firmness", score: 3, imageUrl: "https://images.unsplash.com/photo-1608571424237-381e6b43a2a7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Dullness and uneven tone", score: 2, imageUrl: "https://images.unsplash.com/photo-1615396899839-c99c121888b0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Redness and sensitivity", score: 1, imageUrl: "https://images.unsplash.com/photo-1694274927845-b0693047fb6e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many steps are in your routine now?",
      subtitle: "There is no right answer, this sets our starting point.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1629380108599-ea06489d66f5?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "6 or more steps", score: 4 },
        { id: uid(), text: "3 to 5 steps", score: 3 },
        { id: uid(), text: "1 or 2 steps", score: 2 },
        { id: uid(), text: "I do not have a routine", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How much time can you give your routine?",
      subtitle: "We will keep it realistic.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1763485955998-a9284d042d50?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "15 minutes or more", score: 4 },
        { id: uid(), text: "About 10 minutes", score: 3 },
        { id: uid(), text: "About 5 minutes", score: 2 },
        { id: uid(), text: "As little as possible", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which ingredients do you prefer?",
      subtitle: "We only recommend products you will be happy using.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Clinical actives", score: 4, imageUrl: "https://images.unsplash.com/photo-1761948244770-c617aef59d90?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Clean and natural", score: 3, imageUrl: "https://images.unsplash.com/photo-1596344084757-b83f2081da8b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Fragrance free and gentle", score: 2, imageUrl: "https://images.unsplash.com/photo-1613803745799-ba6c10aace85?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "No preference", score: 1, imageUrl: "https://images.unsplash.com/photo-1779142077668-fe26a95f459c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How do you protect your skin from the sun?",
      subtitle: "Daily SPF is the single biggest step for healthy skin.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1594997791693-9e28b4bbad80?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "SPF every single day", score: 4 },
        { id: uid(), text: "Most days", score: 3 },
        { id: uid(), text: "Only when it is sunny", score: 2 },
        { id: uid(), text: "Rarely", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your monthly skincare budget?",
      subtitle: "Great skin does not have to be expensive.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1684430127653-c5436b095a34?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$100 or more", score: 4 },
        { id: uid(), text: "$50 to $100", score: 3 },
        { id: uid(), text: "$25 to $50", score: 2 },
        { id: uid(), text: "Under $25", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your skincare routine is ready",
      subtext: "Enter your email to get your personalized routine and 15% off your first order.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my routine",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Glow Protocol",
      description: "The Glow Protocol pairs a gentle exfoliant and targeted serum with barrier support and daily SPF. Book a consultation to adjust it to your skin.",
      ctaText: "Shop the Glow Protocol", ctaUrl: "/shop/glow",
      imageUrl: "https://images.unsplash.com/photo-1631390179406-0bfe17e9f89d?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My skincare match is The Glow Protocol. Find yours.",
      tips: ["Introduce one new active at a time.", "Use your exfoliant 2 to 3 nights a week.", "Apply SPF as the last morning step."],
      products: [
        { title: "Exfoliating toner", price: "$32", url: "/shop/toner", imageUrl: "https://images.unsplash.com/photo-1566557087503-b839ce6e5aa0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Targeted serum", price: "$48", url: "/shop/serum", imageUrl: "https://images.unsplash.com/photo-1671493235081-5842463637cd?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Daily SPF 50", price: "$28", url: "/shop/spf", imageUrl: "https://images.unsplash.com/photo-1633171036157-78d53387fdc0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "GLOW15", couponLabel: "15% off your first order",
      beforeText: "Dull, uneven skin.", afterText: "Brighter, smoother skin in about 6 weeks.",
    },
    {
      id: uid(), type: 'outcome', title: "The Essential Facial",
      description: "The Essential Facial routine keeps it simple: a gentle cleanser, a hydrating serum and a lightweight moisturizer.",
      ctaText: "Shop the essentials", ctaUrl: "/shop/essentials",
      imageUrl: "https://images.unsplash.com/photo-1556227703-b7668d8cff99?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "The Essential Facial is my routine. What is yours?",
      tips: ["Cleanse for a full 60 seconds.", "Apply serum to damp skin.", "Change your pillowcase twice a week."],
      products: [
        { title: "Gentle cleanser", price: "$22", url: "/shop/cleanser", imageUrl: "https://images.unsplash.com/photo-1623143445418-40c192fa3d11?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Hydrating serum", price: "$36", url: "/shop/hydrating-serum", imageUrl: "https://images.unsplash.com/photo-1710410815589-dd83514104d0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "SKIN10", couponLabel: "10% off the essentials set",
      beforeText: "Skin that changes from week to week.", afterText: "Calm, balanced skin you can rely on.",
    },
    {
      id: uid(), type: 'outcome', title: "The Skin Reset",
      description: "The Skin Reset is a three-step routine of soothing, fragrance-free products that support your skin barrier.",
      ctaText: "Start my skin reset", ctaUrl: "/shop/reset",
      imageUrl: "https://images.unsplash.com/photo-1677726050564-6abb77837338?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am starting The Skin Reset. Take the quiz.",
      tips: ["Pause strong actives for two weeks.", "Use lukewarm water, never hot.", "Patch test new products on your jaw."],
      products: [
        { title: "Barrier repair cream", price: "$34", url: "/shop/barrier-cream", imageUrl: "https://images.unsplash.com/photo-1763503836825-97f5450d155a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Mineral SPF 30", price: "$26", url: "/shop/mineral-spf", imageUrl: "https://images.unsplash.com/photo-1711779187543-78c33ee515c0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "RESET15", couponLabel: "15% off the reset kit",
      beforeText: "Red, reactive, uncomfortable skin.", afterText: "A calm, comfortable skin barrier.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  9. creative_archetype */
/* ------------------------------------------------------------------ */

function creativeArchetypeBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Where does inspiration usually find you?",
      subtitle: "Pick the place you would go to get unstuck.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "In the studio, hands in the work", score: 4, imageUrl: "https://images.unsplash.com/photo-1613746203812-717e6e5db3da?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Out in nature", score: 3, imageUrl: "https://images.unsplash.com/photo-1600340053706-32d1278206ef?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "In galleries and museums", score: 2, imageUrl: "https://images.unsplash.com/photo-1676806022089-0a235ffbfb48?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Online, scrolling and saving", score: 1, imageUrl: "https://images.unsplash.com/photo-1575909812264-6902b55846ad?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which medium do you love most?",
      subtitle: "Choose the one you could happily work in all day.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Paint", score: 4, imageUrl: "https://images.unsplash.com/photo-1526389157-6a5cc2bb4afa?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Clay and ceramics", score: 3, imageUrl: "https://images.unsplash.com/photo-1676125105332-608345abe20e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Photography", score: 2, imageUrl: "https://images.unsplash.com/photo-1613749742342-5abdaa0d0af3?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Digital design", score: 1, imageUrl: "https://images.unsplash.com/photo-1448471237638-f8ccc7d5ac9d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How do you start a new project?",
      subtitle: "There is no wrong way to begin.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1557243962-0a093922933f?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "I dive straight in", score: 4, explanation: "Momentum first, plans later." },
        { id: uid(), text: "I sketch and experiment", score: 3, explanation: "Lots of small tests." },
        { id: uid(), text: "I research and gather references", score: 2, explanation: "A full mood board first." },
        { id: uid(), text: "I wait for the perfect idea", score: 1, explanation: "Inspiration has to strike." },
      ],
    },
    {
      id: uid(), type: 'question', text: "What do you most want from your creativity?",
      subtitle: "Be honest, every answer is valid.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "To build a creative business", score: 4, imageUrl: "https://images.unsplash.com/photo-1767040276964-d2a39a86b1d4?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "To master my craft", score: 3, imageUrl: "https://images.unsplash.com/photo-1583162557635-53d9931332c5?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "To share my work with more people", score: 2, imageUrl: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "To relax and recharge", score: 1, imageUrl: "https://images.unsplash.com/photo-1601049320268-42a9b275068c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How often do you make something?",
      subtitle: "Frequency matters more than talent.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1513738260158-30e559c10093?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Every day", score: 4 },
        { id: uid(), text: "A few times a week", score: 3 },
        { id: uid(), text: "A few times a month", score: 2 },
        { id: uid(), text: "When I find the time", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What holds you back most?",
      subtitle: "Naming it is the first step to fixing it.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1580493113011-ad79f792a7c2?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Turning my work into income", score: 4 },
        { id: uid(), text: "Finding my own style", score: 3 },
        { id: uid(), text: "Finishing what I start", score: 2 },
        { id: uid(), text: "Finding time", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How would you like to grow?",
      subtitle: "We will recommend the right next step.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1633443245758-6a507463c89c?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "One-to-one mentoring", score: 4 },
        { id: uid(), text: "A structured course", score: 3 },
        { id: uid(), text: "A supportive community", score: 2 },
        { id: uid(), text: "Free resources to start", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your creative archetype is ready",
      subtext: "Enter your email to discover your archetype and get a free creative growth guide.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "Reveal my archetype",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Visionary",
      description: "Our suggestion for your next step: turn your creativity into a business with clear offers and a loyal audience.",
      ctaText: "Join the mentorship", ctaUrl: "/mentorship",
      imageUrl: "https://images.unsplash.com/photo-1618331833071-ce81bd50d300?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My creative archetype is The Visionary. Find yours.",
      tips: ["Price for profit, not for comparison.", "Release work in small, planned collections.", "Build an email list from day one."],
      products: [
        { title: "1:1 creative business mentoring", price: "$480", url: "/mentorship", imageUrl: "https://images.unsplash.com/photo-1698825598805-c9e788e6cff3?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Pricing your art workbook", price: "$29", url: "/shop/pricing-workbook", imageUrl: "https://images.unsplash.com/photo-1612367980327-7454a7276aa7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'outcome', title: "The Craftsperson",
      description: "Our suggestion for your next step: structured practice, honest feedback and time to master your medium.",
      ctaText: "Explore the course", ctaUrl: "/courses",
      imageUrl: "https://images.unsplash.com/photo-1610128361323-6e941c97f023?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My creative archetype is The Craftsperson. What is yours?",
      tips: ["Practice one technique for 20 minutes daily.", "Keep a process journal.", "Share work in progress for feedback."],
      products: [
        { title: "8-week technique course", price: "$249", url: "/courses/technique", imageUrl: "https://images.unsplash.com/photo-1582571881821-380713f48b29?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Studio practice planner", price: "$19", url: "/shop/planner", imageUrl: "https://images.unsplash.com/photo-1562217180-021f74991332?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'outcome', title: "The Explorer",
      description: "Our suggestion for your next step: gentle prompts, a supportive community and permission to play.",
      ctaText: "Join the community", ctaUrl: "/community",
      imageUrl: "https://images.unsplash.com/photo-1535673774336-ef95d2851cf3?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "My creative archetype is The Explorer. Take the quiz.",
      tips: ["Set a 15-minute timer and just start.", "Try one new medium a month.", "Make things nobody will ever see."],
      products: [
        { title: "Creative community membership", price: "$12 / month", url: "/community", imageUrl: "https://images.unsplash.com/photo-1610829152012-4570e63a2c41?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "30-day prompt cards", price: "$15", url: "/shop/prompts", imageUrl: "https://images.unsplash.com/photo-1533230019569-ea3cb2b98b1f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  10. podcast_personality */
/* ------------------------------------------------------------------ */

function podcastPersonalityBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What draws you to creating content?",
      subtitle: "Pick the reason that excites you most.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Building my authority", score: 4, imageUrl: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Telling stories", score: 3, imageUrl: "https://images.unsplash.com/photo-1619067321513-bb55a012e9b2?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Teaching what I know", score: 2, imageUrl: "https://images.unsplash.com/photo-1556196148-1fb724238998?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Connecting with people", score: 1, imageUrl: "https://images.unsplash.com/photo-1597207077833-9cfdb90c9fb8?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which format suits you best?",
      subtitle: "Choose the one you would enjoy most every week.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Interviews with guests", score: 4, imageUrl: "https://images.unsplash.com/photo-1556761175-129418cb2dfe?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Solo episodes", score: 3, imageUrl: "https://images.unsplash.com/photo-1648522168473-dfec1d2a5cde?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Co-hosted conversations", score: 2, imageUrl: "https://images.unsplash.com/photo-1618609377864-68609b857e90?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Short video clips", score: 1, imageUrl: "https://images.unsplash.com/photo-1673196649671-eb09066ad6c1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How far along are you?",
      subtitle: "Every creator starts somewhere.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1710265029735-434f63c672c4?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Over 50 episodes published", score: 4 },
        { id: uid(), text: "10 to 50 episodes", score: 3 },
        { id: uid(), text: "A few episodes", score: 2 },
        { id: uid(), text: "Still planning", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How big is your audience today?",
      subtitle: "This helps us recommend the right growth plan.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1724185773486-0b39642e607e?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Over 10,000 listeners", score: 4 },
        { id: uid(), text: "1,000 to 10,000", score: 3 },
        { id: uid(), text: "Under 1,000", score: 2 },
        { id: uid(), text: "Just getting started", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What gear do you use?",
      subtitle: "Good audio keeps listeners coming back.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A full studio setup", score: 4, imageUrl: "https://images.unsplash.com/photo-1636226570637-3fbda7ca09dc?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A USB mic and headphones", score: 3, imageUrl: "https://images.unsplash.com/photo-1585102651425-8caf7848e44b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "My phone or laptop mic", score: 2, imageUrl: "https://images.unsplash.com/photo-1650654631729-ce2fe3a00d1d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "No gear yet", score: 1, imageUrl: "https://images.unsplash.com/photo-1653242370332-e332a8103763?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your biggest challenge?",
      subtitle: "Name it and we will help you solve it.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1649298173603-9c95aa950879?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Monetizing my show", score: 4 },
        { id: uid(), text: "Growing my audience", score: 3 },
        { id: uid(), text: "Staying consistent", score: 2 },
        { id: uid(), text: "Getting started", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How much time can you give each week?",
      subtitle: "A realistic schedule beats an ambitious one.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1616175304583-ed54838016f3?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "10 hours or more", score: 4 },
        { id: uid(), text: "5 to 10 hours", score: 3 },
        { id: uid(), text: "2 to 5 hours", score: 2 },
        { id: uid(), text: "Under 2 hours", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your creator profile is ready",
      subtext: "Enter your email to get your creator type and a growth plan for your show.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my profile",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Authority Builder",
      description: "Our suggestion for your next step: turn your show into a business with sponsorships, premium content and a clear funnel.",
      ctaText: "Book a growth audit", ctaUrl: "/services/audit",
      imageUrl: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My creator type is The Authority Builder. Find yours.",
      tips: ["Publish a media kit with your audience numbers.", "Turn your best episodes into a lead magnet.", "Pitch three sponsors that fit your listeners."],
      products: [
        { title: "Show growth audit", price: "$350", url: "/services/audit", imageUrl: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Sponsorship media kit template", price: "$49", url: "/shop/media-kit", imageUrl: "https://images.unsplash.com/photo-1715154470884-1c2be0b0129f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Book a growth audit",
    },
    {
      id: uid(), type: 'outcome', title: "The Storyteller",
      description: "Our suggestion for your next step: a consistent schedule, stronger episode structure and clips that travel on social media.",
      ctaText: "Join the creator course", ctaUrl: "/courses/creator",
      imageUrl: "https://images.unsplash.com/photo-1531651008558-ed1740375b39?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My creator type is The Storyteller. What is yours?",
      tips: ["Record three episodes before you publish.", "Open every episode with a story hook.", "Cut a 30-second clip from each episode."],
      products: [
        { title: "Episode structure course", price: "$149", url: "/courses/creator", imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Show notes templates", price: "$29", url: "/shop/show-notes", imageUrl: "https://images.unsplash.com/photo-1611737833016-4c03cfb9faa0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Talk to a producer",
    },
    {
      id: uid(), type: 'outcome', title: "The Rising Creator",
      description: "Our suggestion for your next step: simple, reliable gear and a launch plan you can stick to.",
      ctaText: "Get the launch kit", ctaUrl: "/shop/launch-kit",
      imageUrl: "https://images.unsplash.com/photo-1660631228116-b3643559f611?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am a Rising Creator. Take the quiz.",
      tips: ["Pick one format and one day to publish.", "Record in a small room with rugs and curtains.", "Launch with three episodes at once."],
      products: [
        { title: "Podcast launch kit", price: "$99", url: "/shop/launch-kit", imageUrl: "https://images.unsplash.com/photo-1553775282-20af80779df7?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "30-day launch plan", price: "Free", url: "/resources/launch-plan", imageUrl: "https://images.unsplash.com/photo-1632772998001-cc9bf6f7c852?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      bookingUrl: "/book", bookingText: "Ask us anything",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  11. real_estate_buyer */
/* ------------------------------------------------------------------ */

function realEstateBuyerBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What is driving your home search right now?",
      subtitle: "Choose the reason that fits you best.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Upgrading to my forever home", score: 4, imageUrl: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Growing family, need more space", score: 3, imageUrl: "https://images.unsplash.com/photo-1669830866557-ea2d7bc6064c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "First home of my own", score: 2, imageUrl: "https://images.unsplash.com/photo-1617307074423-6344f18d357f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Downsizing and simplifying", score: 1, imageUrl: "https://images.unsplash.com/photo-1654445112674-85c94a3eae7b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which home style catches your eye?",
      subtitle: "Pick the one you would love to come home to.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Modern with clean lines", score: 4, imageUrl: "https://images.unsplash.com/photo-1766603636700-e9d80473f40f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Classic and traditional", score: 3, imageUrl: "https://images.unsplash.com/photo-1601041597271-71988152f98b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "City apartment", score: 2, imageUrl: "https://images.unsplash.com/photo-1762958266774-95abba6e0685?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Cottage or farmhouse", score: 1, imageUrl: "https://images.unsplash.com/photo-1754597215918-b4b1f113ca77?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your budget?",
      subtitle: "Include your deposit and expected mortgage.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1638953471155-7de7d58048b0?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$1M or more", score: 4 },
        { id: uid(), text: "$600K to $1M", score: 3 },
        { id: uid(), text: "$350K to $600K", score: 2 },
        { id: uid(), text: "Under $350K", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Where are you with financing?",
      subtitle: "Pre-approval makes your offer far stronger.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1631651693480-97f1132e333d?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Cash buyer", score: 4 },
        { id: uid(), text: "Pre-approved for a mortgage", score: 3 },
        { id: uid(), text: "Speaking to lenders", score: 2 },
        { id: uid(), text: "Not started yet", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which feature matters most?",
      subtitle: "We will prioritize homes that have it.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A big kitchen", score: 4, imageUrl: "https://images.unsplash.com/photo-1609347744403-2306e8a9ae27?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Outdoor space", score: 3, imageUrl: "https://images.unsplash.com/photo-1719324923613-ff0884b031ed?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A home office", score: 2, imageUrl: "https://images.unsplash.com/photo-1591382696684-38c427c7547a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Low maintenance", score: 1, imageUrl: "https://images.unsplash.com/photo-1738168246881-40f35f8aba0a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many bedrooms do you need?",
      subtitle: "Think about how your life might change in five years.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "5 or more", score: 4 },
        { id: uid(), text: "4", score: 3 },
        { id: uid(), text: "3", score: 2 },
        { id: uid(), text: "1 to 2", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When do you want to move?",
      subtitle: "We will match the search to your timeline.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1757742690834-aa581b9f53b2?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Within 3 months", score: 4 },
        { id: uid(), text: "3 to 6 months", score: 3 },
        { id: uid(), text: "6 to 12 months", score: 2 },
        { id: uid(), text: "Just browsing", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your home search plan is ready",
      subtext: "Enter your details to get your buyer profile and matching homes as soon as they list.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
        { id: uid(), type: 'phone', label: 'Phone number', required: false, placeholder: 'Optional' },
      ],
      buttonLabel: "See my matches",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Power Buyer",
      description: "Our suggestion: a tailored shortlist, private viewings and help making a strong offer on the right home.",
      ctaText: "Book a buyer consultation", ctaUrl: "/contact",
      imageUrl: "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "I am a Power Buyer. Find your home buyer type.",
      tips: ["Have your proof of funds ready.", "Decide your walk-away price before viewings.", "Ask about off-market listings."],
      bookingUrl: "/book", bookingText: "Book a buyer consultation",
    },
    {
      id: uid(), type: 'outcome', title: "The Smart Searcher",
      description: "Our suggestion: instant alerts for new listings and a walk-through of every step of buying.",
      ctaText: "Set up my home alerts", ctaUrl: "/alerts",
      imageUrl: "https://images.unsplash.com/photo-1698133468646-0fc9f395330b?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "I am a Smart Searcher. What is your buyer type?",
      tips: ["Get a mortgage pre-approval this month.", "View homes at different times of day.", "Budget for closing costs of 2 to 5%."],
      bookingUrl: "/book", bookingText: "Talk to an agent",
    },
    {
      id: uid(), type: 'outcome', title: "The First-Time Explorer",
      description: "Our suggestion: our free buyer's guide and a no-pressure chat to plan the next steps with confidence.",
      ctaText: "Get the buyer guide", ctaUrl: "/guides/first-time-buyer",
      imageUrl: "https://images.unsplash.com/photo-1643804926339-e94f0a655185?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am a First-Time Explorer. Take the quiz.",
      tips: ["Check your credit score early.", "Save for a down payment and an emergency fund.", "Make a must-have and nice-to-have list."],
      bookingUrl: "/book", bookingText: "Book a free chat",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  12. travel_style */
/* ------------------------------------------------------------------ */

function travelStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "What does your ideal vacation look like?",
      subtitle: "Pick the picture you would step into right now.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A private villa by the sea", score: 4, imageUrl: "https://images.unsplash.com/photo-1603995394003-43f7cc80525f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Exploring a historic city", score: 3, imageUrl: "https://images.unsplash.com/photo-1657891541332-6961bf2a560c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Hiking in the mountains", score: 2, imageUrl: "https://images.unsplash.com/photo-1604440095301-4ec2f9230155?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A lazy beach with a book", score: 1, imageUrl: "https://images.unsplash.com/photo-1620127682229-33388276e540?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Where would you love to stay?",
      subtitle: "Your stay sets the tone for the whole trip.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A luxury boutique hotel", score: 4, imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A characterful guesthouse", score: 3, imageUrl: "https://images.unsplash.com/photo-1673733229221-56dce3f07b4e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A cabin in the wild", score: 2, imageUrl: "https://images.unsplash.com/photo-1570793005386-840846445fed?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Wherever is cheapest", score: 1, imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Who is traveling?",
      subtitle: "We will plan around everyone in your group.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1759038085950-1234ca8f5fed?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "A group of friends", score: 4 },
        { id: uid(), text: "Just the two of us", score: 3 },
        { id: uid(), text: "Family with kids", score: 2 },
        { id: uid(), text: "Solo", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How long is your trip?",
      subtitle: "Longer trips let you slow down and see more.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1576737064520-f45d313d17ff?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "More than two weeks", score: 4 },
        { id: uid(), text: "One to two weeks", score: 3 },
        { id: uid(), text: "A long weekend", score: 2 },
        { id: uid(), text: "A short break", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Pick an experience you would love.",
      subtitle: "Your highlights shape the itinerary.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "A private food tour", score: 4, imageUrl: "https://images.unsplash.com/photo-1608479709386-98826dbb642b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A sunset sail", score: 3, imageUrl: "https://images.unsplash.com/photo-1580537735250-fcbc85749acc?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A wellness retreat", score: 2, imageUrl: "https://images.unsplash.com/photo-1731336479432-3eb5fdb3ab1c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A guided hike", score: 1, imageUrl: "https://images.unsplash.com/photo-1575987116913-e96e7d490b8a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your budget per person?",
      subtitle: "Flights, stays and experiences included.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1653560668256-6e074e914207?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "$5,000 or more", score: 4 },
        { id: uid(), text: "$2,500 to $5,000", score: 3 },
        { id: uid(), text: "$1,000 to $2,500", score: 2 },
        { id: uid(), text: "Under $1,000", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When do you want to travel?",
      subtitle: "Popular seasons book up months ahead.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1543797414-a0c3ad076f7c?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "In the next 2 months", score: 4 },
        { id: uid(), text: "In 2 to 6 months", score: 3 },
        { id: uid(), text: "In 6 to 12 months", score: 2 },
        { id: uid(), text: "Just dreaming", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your travel style is ready",
      subtext: "Enter your email to get your travel style and three destinations picked for you.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my trip ideas",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Luxury Escape",
      description: "Our suggestion: boutique villas, private tours and tables at the best restaurants in town.",
      ctaText: "Plan my luxury escape", ctaUrl: "/trips/luxury",
      imageUrl: "https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My travel style is The Luxury Escape. Find yours.",
      tips: ["Book flagship hotels 6 months ahead.", "Travel just before or after peak season.", "Add one private experience per trip."],
      couponCode: "ESCAPE200", couponLabel: "$200 off your first trip",
      bookingUrl: "/book", bookingText: "Talk to a travel designer",
    },
    {
      id: uid(), type: 'outcome', title: "The Culture Explorer",
      description: "Our suggestion: a trip full of food, history and neighborhoods off the usual tourist path.",
      ctaText: "Plan my city trip", ctaUrl: "/trips/culture",
      imageUrl: "https://images.unsplash.com/photo-1557154628-fd945296f794?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My travel style is The Culture Explorer. What is yours?",
      tips: ["Base yourself in a walkable neighborhood.", "Book one guided tour on your first day.", "Leave a free afternoon to wander."],
      couponCode: "EXPLORE10", couponLabel: "10% off your first trip",
      bookingUrl: "/book", bookingText: "Plan with an expert",
    },
    {
      id: uid(), type: 'outcome', title: "The Easy Getaway",
      description: "Our suggestion: a short, simple trip with great weather and nothing to organize. We will find it for you.",
      ctaText: "See getaway deals", ctaUrl: "/trips/getaways",
      imageUrl: "https://images.unsplash.com/photo-1552674510-62c267e73ada?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "My travel style is The Easy Getaway. Take the quiz.",
      tips: ["Choose direct flights under four hours.", "Book a stay with breakfast included.", "Travel midweek for better prices."],
      couponCode: "GETAWAY5", couponLabel: "5% off getaway deals",
      bookingUrl: "/book", bookingText: "Get help booking",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  13. nonprofit_engagement */
/* ------------------------------------------------------------------ */

function nonprofitEngagementBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Which cause is closest to your heart?",
      subtitle: "Choose the one you think about most.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Protecting nature", score: 4, imageUrl: "https://images.unsplash.com/photo-1658615324653-00fbdaee8a3f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Education and young people", score: 3, imageUrl: "https://images.unsplash.com/photo-1629652487043-fb2825838f8c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Health and wellbeing", score: 2, imageUrl: "https://images.unsplash.com/photo-1584451049700-ec9b394f3805?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Local community", score: 1, imageUrl: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How would you most like to help?",
      subtitle: "Every kind of support makes a difference.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Giving regularly", score: 4, imageUrl: "https://images.unsplash.com/photo-1512075135822-67cdd9dd7314?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Volunteering my time", score: 3, imageUrl: "https://images.unsplash.com/photo-1634852836003-c0aa5b67d243?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Fundraising with friends", score: 2, imageUrl: "https://images.unsplash.com/photo-1774557937677-7041873b227a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Spreading the word", score: 1, imageUrl: "https://images.unsplash.com/photo-1658062117791-18cae7ff46c1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How much time could you give each month?",
      subtitle: "A few hours can change a lot.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1578625155481-7bc40a6481b6?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "More than 10 hours", score: 4 },
        { id: uid(), text: "5 to 10 hours", score: 3 },
        { id: uid(), text: "A few hours", score: 2 },
        { id: uid(), text: "Not much right now", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which skills could you share?",
      subtitle: "We match volunteers to the work they enjoy.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Professional skills", score: 4, imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Hands-on work", score: 3, imageUrl: "https://images.unsplash.com/photo-1596277922657-f80257171aec?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Teaching or mentoring", score: 2, imageUrl: "https://images.unsplash.com/photo-1711062717319-393e424a3538?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Events and organizing", score: 1, imageUrl: "https://images.unsplash.com/photo-1743385779431-45d26d9775b1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Have you supported us before?",
      subtitle: "Thank you if you have.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1620843437920-ead942b3abd3?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Yes, many times", score: 4 },
        { id: uid(), text: "Once or twice", score: 3 },
        { id: uid(), text: "Not yet, but I follow your work", score: 2 },
        { id: uid(), text: "This is my first time here", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "How would you like to hear about our impact?",
      subtitle: "We will only send what you ask for.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1648994605501-fe0a391d2653?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Monthly impact updates", score: 4 },
        { id: uid(), text: "Event invitations", score: 3 },
        { id: uid(), text: "A quarterly newsletter", score: 2 },
        { id: uid(), text: "Only urgent appeals", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When could you get involved?",
      subtitle: "There is always a way to help.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1563760836797-bf5d5f9d2243?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Right away", score: 4 },
        { id: uid(), text: "Within a month", score: 3 },
        { id: uid(), text: "In a few months", score: 2 },
        { id: uid(), text: "Just learning for now", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your impact path is ready",
      subtext: "Enter your email to see how you can make the biggest difference.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "Show my impact path",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Changemaker",
      description: "Our suggestion: become a monthly supporter or a volunteer lead, so you can see the long-term impact of your help.",
      ctaText: "Become a monthly supporter", ctaUrl: "/give/monthly",
      imageUrl: "https://images.unsplash.com/photo-1591255199673-4e2b706645a2?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My impact path is The Changemaker. Find yours.",
      tips: ["Choose a monthly amount you can sustain.", "Ask your employer about gift matching.", "Join our next volunteer briefing."],
      beforeText: "Wanting to help but not sure how.", afterText: "Regular, measurable impact on a cause you love.",
    },
    {
      id: uid(), type: 'outcome', title: "The Active Volunteer",
      description: "Our suggestion: volunteer days matched to your skills and your schedule, so your time goes where it helps most.",
      ctaText: "Find volunteer days", ctaUrl: "/volunteer",
      imageUrl: "https://images.unsplash.com/photo-1599778150914-88e98e0c3a3e?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "I am an Active Volunteer. What is your impact path?",
      tips: ["Pick one regular day each month.", "Bring a friend to your first session.", "Tell us your skills so we can match you."],
      beforeText: "Spare time and the wish to help.", afterText: "A volunteer role that uses your skills.",
    },
    {
      id: uid(), type: 'outcome', title: "The Generous Supporter",
      description: "Our suggestion: a one-off gift or sharing our campaign. Every bit of support helps more people than you might think.",
      ctaText: "Give today", ctaUrl: "/give",
      imageUrl: "https://images.unsplash.com/photo-1761065110340-59c17804489e?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am a Generous Supporter. Take the quiz.",
      tips: ["Share our campaign with three friends.", "Follow us for urgent appeals.", "Ask your employer if they match donations."],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  14. video_fitness_challenge */
/* ------------------------------------------------------------------ */

function videoFitnessChallengeBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Watch this warm-up. How do you like to start a workout?",
      subtitle: "Pick the energy that matches you.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/fitness-warmup.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "High energy, straight in", score: 4, imageUrl: "https://images.unsplash.com/photo-1603665409265-bdc00027c217?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A gradual dynamic warm-up", score: 3, imageUrl: "https://images.unsplash.com/photo-1683758507025-6e74ad3ca1e5?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Slow and mindful", score: 2, imageUrl: "https://images.unsplash.com/photo-1603905179139-db12ab535ca9?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "I usually skip it", score: 1, imageUrl: "https://images.unsplash.com/photo-1735647134600-fd2b75fba36d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this run. How far could you go today?",
      subtitle: "An honest guess is all we need.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/fitness-run.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "10 km or more", score: 4, imageUrl: "https://images.unsplash.com/photo-1549896869-ca27eeffe4fb?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "About 5 km", score: 3, imageUrl: "https://images.unsplash.com/photo-1763477892865-3cb12b14b3f0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A couple of kilometres", score: 2, imageUrl: "https://images.unsplash.com/photo-1626031706819-da335408f197?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "I would rather walk", score: 1, imageUrl: "https://images.unsplash.com/photo-1571514507804-28e1f9ab5b94?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this mobility flow. How flexible are you?",
      subtitle: "Mobility is the base of every good program.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/fitness-mobility.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "Very, I stretch daily", score: 4, imageUrl: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Fairly, a few times a week", score: 3, imageUrl: "https://images.unsplash.com/photo-1579016749257-3f5205b5e5ae?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A little stiff", score: 2, imageUrl: "https://images.unsplash.com/photo-1653617748437-895c016e88b1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "I can barely touch my knees", score: 1, imageUrl: "https://images.unsplash.com/photo-1612372606404-0ab33e7187ee?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this strength set. How does it look to you?",
      subtitle: "There is no wrong reaction.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/fitness-strength.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "Easy, I lift regularly", score: 4, imageUrl: "https://images.unsplash.com/photo-1580261450046-d0a30080dc9b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A good challenge", score: 3, imageUrl: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Tough but doable", score: 2, imageUrl: "https://images.unsplash.com/photo-1689446802635-6c61ad0cc1d0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Not for me yet", score: 1, imageUrl: "https://images.unsplash.com/photo-1584827386916-b5351d3ba34b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How many days a week can you train?",
      subtitle: "Consistency beats intensity.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1652318969478-33e7baae6111?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "5 or more", score: 4 },
        { id: uid(), text: "3 to 4", score: 3 },
        { id: uid(), text: "2", score: 2 },
        { id: uid(), text: "1 to start", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What is your main goal?",
      subtitle: "We will build your challenge around it.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1580766770644-dc65facc3c48?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Get stronger", score: 4 },
        { id: uid(), text: "Get fitter", score: 3 },
        { id: uid(), text: "Move better", score: 2 },
        { id: uid(), text: "Build the habit", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "When do you want to start?",
      subtitle: "The next challenge group starts on Monday.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1759527588071-e143b4a451b0?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "This Monday", score: 4 },
        { id: uid(), text: "Within two weeks", score: 3 },
        { id: uid(), text: "This month", score: 2 },
        { id: uid(), text: "Just looking", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your challenge is ready",
      subtext: "Enter your email to get your personalized 4-week video challenge.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
        { id: uid(), type: 'phone', label: 'Phone number', required: false, placeholder: 'Optional' },
      ],
      buttonLabel: "Start my challenge",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Power Athlete",
      description: "Our suggestion: a 4-week challenge that mixes heavy strength days with high-intensity conditioning, all on video so you can train anywhere.",
      ctaText: "Start the advanced challenge", ctaUrl: "/challenge/advanced",
      imageUrl: "https://images.unsplash.com/photo-1521805103424-d8f8430e8933?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "I am a Power Athlete. Take the fitness challenge.",
      tips: ["Warm up for 10 minutes before heavy sets.", "Log every session to track progress.", "Take one full rest day each week."],
      couponCode: "POWER20", couponLabel: "20% off the 4-week challenge",
      bookingUrl: "/book", bookingText: "Book a form check",
      beforeText: "Training hard but plateauing.", afterText: "New personal bests in 4 weeks.",
    },
    {
      id: uid(), type: 'outcome', title: "The Balanced Mover",
      description: "Our suggestion: a challenge that balances strength, cardio and mobility, about 40 minutes a session.",
      ctaText: "Start the balanced challenge", ctaUrl: "/challenge/balanced",
      imageUrl: "https://images.unsplash.com/photo-1653647358769-c0465db60293?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "I am a Balanced Mover. What is your fitness type?",
      tips: ["Train 3 to 4 times a week.", "Mix one cardio day with two strength days.", "Stretch for 5 minutes after every session."],
      couponCode: "MOVE15", couponLabel: "15% off the 4-week challenge",
      bookingUrl: "/book", bookingText: "Talk to a coach",
      beforeText: "Fit, but inconsistent.", afterText: "A balanced routine you enjoy.",
    },
    {
      id: uid(), type: 'outcome', title: "The Fresh Starter",
      description: "Our suggestion: a challenge that starts with short 20-minute videos you can follow at home.",
      ctaText: "Start the beginner challenge", ctaUrl: "/challenge/beginner",
      imageUrl: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am a Fresh Starter. Take the challenge.",
      tips: ["Schedule your sessions like appointments.", "Start with three 20-minute sessions.", "Celebrate every finished week."],
      couponCode: "FRESH10", couponLabel: "$10 off the beginner challenge",
      bookingUrl: "/book", bookingText: "Ask a coach",
      beforeText: "Not sure where to start.", afterText: "A workout habit that sticks.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  15. video_cooking_style */
/* ------------------------------------------------------------------ */

function videoCookingStyleBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Watch these knife skills. How comfortable are you in the kitchen?",
      subtitle: "Be honest, every cook starts somewhere.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/cooking-knife.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "Very, I could teach this", score: 4, imageUrl: "https://images.unsplash.com/photo-1666013942797-9daa4b8b3b4f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Comfortable, I cook most nights", score: 3, imageUrl: "https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Learning, I follow recipes", score: 2, imageUrl: "https://images.unsplash.com/photo-1556909211-36987daf7b4d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Nervous with a knife", score: 1, imageUrl: "https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this pan. Which dish would you cook tonight?",
      subtitle: "Pick the one that makes you hungry.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/cooking-pan.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "A quick stir fry", score: 4, imageUrl: "https://images.unsplash.com/photo-1464500542410-1396074bf230?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A slow Sunday roast", score: 3, imageUrl: "https://images.unsplash.com/photo-1518133299975-8e1b628e1cfd?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A big bowl of pasta", score: 2, imageUrl: "https://images.unsplash.com/photo-1606091484089-089fa86fad4f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Something I can order in", score: 1, imageUrl: "https://images.unsplash.com/photo-1652862729869-2f4e80c1849d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this plating. How much do looks matter to you?",
      subtitle: "Presentation is part of the fun for some cooks.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/cooking-plating.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "A lot, I love plating", score: 4, imageUrl: "https://images.unsplash.com/photo-1519077336050-4ca5cac9d64f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Some, I like it to look nice", score: 3, imageUrl: "https://images.unsplash.com/photo-1591632288574-a387f820a1ca?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Taste is what counts", score: 2, imageUrl: "https://images.unsplash.com/photo-1679949479680-c65ef800b48b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Straight from the pan", score: 1, imageUrl: "https://images.unsplash.com/photo-1579805625996-db7b60587362?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How often do you cook from scratch?",
      subtitle: "Any amount counts.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1562874687-34420a9e8073?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Every day", score: 4 },
        { id: uid(), text: "A few times a week", score: 3 },
        { id: uid(), text: "At weekends", score: 2 },
        { id: uid(), text: "Rarely", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which cuisine do you love most?",
      subtitle: "We will tailor your recipes to it.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Japanese", score: 4, imageUrl: "https://images.unsplash.com/photo-1638866281450-3933540af86a?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Mediterranean", score: 3, imageUrl: "https://images.unsplash.com/photo-1666475877076-85f1d002c34f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Mexican", score: 2, imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Classic home cooking", score: 1, imageUrl: "https://images.unsplash.com/photo-1587248720327-8eb72564be1e?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "How much time do you usually have to cook?",
      subtitle: "We will match recipes to your schedule.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1588574757607-71e126aca63e?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Over an hour", score: 4 },
        { id: uid(), text: "About 45 minutes", score: 3 },
        { id: uid(), text: "About 20 minutes", score: 2 },
        { id: uid(), text: "10 minutes or less", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "What would help you most?",
      subtitle: "Choose your next step.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1656711781745-ba68661d06b7?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Advanced technique classes", score: 4 },
        { id: uid(), text: "New recipe ideas every week", score: 3 },
        { id: uid(), text: "Simple step-by-step basics", score: 2 },
        { id: uid(), text: "Ready-to-cook meal kits", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your cooking style is ready",
      subtext: "Enter your email to get your cooking style and five recipes picked for you.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my recipes",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Creative Chef",
      description: "Our suggestion: advanced technique classes, from knife work to restaurant-style plating.",
      ctaText: "Book a technique class", ctaUrl: "/classes/advanced",
      imageUrl: "https://images.unsplash.com/photo-1604543248368-da42b20dce5b?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My cooking style is The Creative Chef. Find yours.",
      tips: ["Sharpen your knives every few weeks.", "Taste and season at every stage.", "Plate on warm plates."],
      products: [
        { title: "Advanced technique class", price: "$85", url: "/classes/advanced", imageUrl: "https://images.unsplash.com/photo-1593618229012-8aaad1cfefc3?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Chef's knife", price: "$120", url: "/shop/chef-knife", imageUrl: "https://images.unsplash.com/photo-1596633609591-e4e1e9e06b7f?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "CHEF15", couponLabel: "15% off your first class",
    },
    {
      id: uid(), type: 'outcome', title: "The Confident Cook",
      description: "Our suggestion: the weekly recipe club, with new seasonal recipes sent straight to your inbox.",
      ctaText: "Join the recipe club", ctaUrl: "/recipe-club",
      imageUrl: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My cooking style is The Confident Cook. What is yours?",
      tips: ["Plan three dinners every Sunday.", "Batch-cook grains and sauces.", "Try one new cuisine a month."],
      products: [
        { title: "Weekly recipe club", price: "$9 / month", url: "/recipe-club", imageUrl: "https://images.unsplash.com/photo-1651255321576-3ef32d6fc88d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Cast iron skillet", price: "$65", url: "/shop/skillet", imageUrl: "https://images.unsplash.com/photo-1637739699971-7d4d5194e75c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "COOK10", couponLabel: "First month free",
    },
    {
      id: uid(), type: 'outcome', title: "The Kitchen Starter",
      description: "Our suggestion: the beginner course, with the ten recipes every cook should know.",
      ctaText: "Start the beginner course", ctaUrl: "/courses/beginner",
      imageUrl: "https://images.unsplash.com/photo-1759965670306-f055ff093752?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "I am a Kitchen Starter. Take the quiz.",
      tips: ["Read the whole recipe before you start.", "Prep every ingredient first.", "Start with one-pan meals."],
      products: [
        { title: "Beginner cooking course", price: "$49", url: "/courses/beginner", imageUrl: "https://images.unsplash.com/photo-1730597363352-0a8fe6eb5d12?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { title: "Starter meal kit", price: "$39", url: "/shop/meal-kit", imageUrl: "https://images.unsplash.com/photo-1622003275933-fc87f54913ab?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
      couponCode: "START10", couponLabel: "10% off the beginner course",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  16. video_brand_personality */
/* ------------------------------------------------------------------ */

function videoBrandPersonalityBlocks(): QuizBlock[] {
  return [
    {
      id: uid(), type: 'question', text: "Watch this. What should a visitor feel when they find you?",
      subtitle: "Pick the first impression you want to make.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/brand-workspace.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "Confident and inspired", score: 4, imageUrl: "https://images.unsplash.com/photo-1581080247486-57989c1f14ab?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Welcomed and understood", score: 3, imageUrl: "https://images.unsplash.com/photo-1728761390316-935ffeb3fbcc?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Reassured and safe", score: 2, imageUrl: "https://images.unsplash.com/photo-1637412816281-f80ec9948fea?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Curious and excited", score: 1, imageUrl: "https://images.unsplash.com/photo-1586032788085-d75f745f26e0?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this brainstorm. How do you make decisions?",
      subtitle: "Your style shapes how your brand sounds.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/brand-brainstorm.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "Fast and bold", score: 4, imageUrl: "https://images.unsplash.com/photo-1641355527446-232d7f1f2c10?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "With my heart", score: 3, imageUrl: "https://images.unsplash.com/photo-1483546363825-7ebf25fb7513?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "With data and evidence", score: 2, imageUrl: "https://images.unsplash.com/photo-1543286386-2e659306cd6c?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "By asking others", score: 1, imageUrl: "https://images.unsplash.com/photo-1671893671463-4f5664c5a299?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this setup. How do you feel about being on camera?",
      subtitle: "Video is the fastest way to build trust.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/brand-camera.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "I love it", score: 4, imageUrl: "https://images.unsplash.com/photo-1612548403247-aa2873e9422d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Happy with some practice", score: 3, imageUrl: "https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Nervous but willing", score: 2, imageUrl: "https://images.unsplash.com/photo-1699500518986-f43f798cde1b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "I would rather write", score: 1, imageUrl: "https://images.unsplash.com/photo-1558009250-d3d2229fdf28?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Which words describe your brand?",
      subtitle: "Pick the set that feels most true.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      options: [
        { id: uid(), text: "Bold, expert, premium", score: 4, imageUrl: "https://images.unsplash.com/photo-1760804876166-aae5861ec7c1?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Warm, caring, personal", score: 3, imageUrl: "https://images.unsplash.com/photo-1666445844615-0a3930270f13?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Clear, calm, trustworthy", score: 2, imageUrl: "https://images.unsplash.com/photo-1622579521534-8252f7da47fd?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Playful, fresh, creative", score: 1, imageUrl: "https://images.unsplash.com/photo-1627329472873-e0887df8dc5b?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "Who are your ideal clients?",
      subtitle: "Your brand should speak directly to them.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1643966391593-3c18419d9ae8?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "Executives and leaders", score: 4 },
        { id: uid(), text: "Small business owners", score: 3 },
        { id: uid(), text: "Individuals in a transition", score: 2 },
        { id: uid(), text: "Creatives and makers", score: 1 },
      ],
    },
    {
      id: uid(), type: 'question', text: "Watch this space. Where do you do your best work?",
      subtitle: "Your environment says a lot about your brand.",
      questionStyle: 'imageChoice', questionType: 'single', answerLayout: 'grid',
      mediaUrl: "/template-media/brand-studio.mp4", mediaType: 'video',
      options: [
        { id: uid(), text: "A premium studio", score: 4, imageUrl: "https://images.unsplash.com/photo-1786325492063-8967ed6ad88d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A cozy home office", score: 3, imageUrl: "https://images.unsplash.com/photo-1588495756528-01247aa51ec8?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "A shared workspace", score: 2, imageUrl: "https://images.unsplash.com/photo-1720139290958-d8676702c3ed?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
        { id: uid(), text: "Anywhere with a laptop", score: 1, imageUrl: "https://images.unsplash.com/photo-1629893250923-eff7863b6e7d?auto=format&fit=crop&crop=entropy&w=600&h=450&q=80" },
      ],
    },
    {
      id: uid(), type: 'question', text: "What do you need most right now?",
      subtitle: "We will recommend the right next step.",
      questionStyle: 'buttons', questionType: 'single', answerLayout: 'list',
      mediaUrl: "https://images.unsplash.com/photo-1763705857736-2b4f16a33758?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80", mediaType: 'image',
      options: [
        { id: uid(), text: "A complete brand strategy", score: 4 },
        { id: uid(), text: "A refreshed visual identity", score: 3 },
        { id: uid(), text: "Clear messaging", score: 2 },
        { id: uid(), text: "Just some guidance", score: 1 },
      ],
    },
    {
      id: uid(), type: 'leadGate', headline: "Your brand personality is ready",
      subtext: "Enter your email to get your brand personality and a free messaging guide.",
      fields: [
        { id: uid(), type: 'email', label: 'Email address', required: true, placeholder: 'you@example.com' },
        { id: uid(), type: 'name', label: 'First name', required: false, placeholder: 'Your first name' },
      ],
      buttonLabel: "See my brand personality",
      placement: 'before_results',
    },
    {
      id: uid(), type: 'outcome', title: "The Visionary Leader",
      description: "Our suggestion: premium visuals, confident language and thought-leadership content to position you as the go-to expert.",
      ctaText: "Book a brand strategy session", ctaUrl: "/services/brand-strategy",
      imageUrl: "https://images.unsplash.com/photo-1718670013988-c6e3edb92345?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 21, maxScore: 28, shareEnabled: true,
      shareText: "My brand personality is The Visionary Leader. Find yours.",
      tips: ["Publish one strong opinion every week.", "Use a consistent, premium color palette.", "Lead with results, not features."],
      bookingUrl: "/book", bookingText: "Book a strategy session",
      beforeText: "Great expertise, generic brand.", afterText: "A premium brand that matches your expertise.",
    },
    {
      id: uid(), type: 'outcome', title: "The Trusted Guide",
      description: "Our suggestion: story-led messaging, natural photography and a friendly voice that help clients feel understood.",
      ctaText: "Refresh my brand", ctaUrl: "/services/brand-refresh",
      imageUrl: "https://images.unsplash.com/photo-1627618997755-f12d6f6ae6fd?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 14, maxScore: 20, shareEnabled: true,
      shareText: "My brand personality is The Trusted Guide. What is yours?",
      tips: ["Share your story on your About page.", "Use real photos of your space and work.", "Write the way you speak."],
      bookingUrl: "/book", bookingText: "Book a brand call",
      beforeText: "Clients do not see the real you online.", afterText: "A brand that feels as warm as you are.",
    },
    {
      id: uid(), type: 'outcome', title: "The Clear Expert",
      description: "Our suggestion: simple design, plain language and proof of results to build trust fast.",
      ctaText: "Get my messaging guide", ctaUrl: "/resources/messaging-guide",
      imageUrl: "https://images.unsplash.com/photo-1614036634955-ae5e90f9b9eb?auto=format&fit=crop&crop=entropy&w=1200&h=630&q=80",
      minScore: 7, maxScore: 13, shareEnabled: true,
      shareText: "My brand personality is The Clear Expert. Take the quiz.",
      tips: ["Say what you do in one sentence.", "Add client results to your homepage.", "Keep your fonts and colors consistent."],
      bookingUrl: "/book", bookingText: "Ask a brand strategist",
      beforeText: "A message that is hard to explain.", afterText: "A clear brand people trust at first glance.",
    },
  ];
}

/**
 * Quiz settings each template turns on when a quiz is created from it, so the result-page extras
 * the template ships with (coupon, products, booking, before and after) are visible straight away.
 */
export var TEMPLATE_SETTINGS: Record<string, Record<string, boolean>> = {
  "photography_style": {
    "show_booking": true,
    "show_before_after": true
  },
  "restaurant_menu": {
    "show_coupon": true,
    "show_products": true
  },
  "fitness_goal": {
    "show_coupon": true,
    "show_booking": true,
    "show_before_after": true
  },
  "product_finder": {
    "show_coupon": true,
    "show_products": true
  },
  "wedding_style": {
    "show_booking": true,
    "show_products": true
  },
  "coaching_style": {
    "show_booking": true,
    "show_before_after": true
  },
  "home_style": {
    "show_booking": true,
    "show_products": true
  },
  "skincare_routine": {
    "show_coupon": true,
    "show_products": true,
    "show_before_after": true
  },
  "creative_archetype": {
    "show_products": true
  },
  "podcast_personality": {
    "show_booking": true,
    "show_products": true
  },
  "real_estate_buyer": {
    "show_booking": true
  },
  "travel_style": {
    "show_booking": true,
    "show_coupon": true
  },
  "nonprofit_engagement": {
    "show_booking": false
  },
  "video_fitness_challenge": {
    "show_coupon": true,
    "show_booking": true,
    "show_before_after": true
  },
  "video_cooking_style": {
    "show_coupon": true,
    "show_products": true
  },
  "video_brand_personality": {
    "show_booking": true,
    "show_before_after": true
  }
};

export function getTemplateSettings(id: string): Record<string, boolean> {
  return TEMPLATE_SETTINGS[id] || {};
}

export var QUIZ_TEMPLATE_CATALOG: QuizTemplateData[] = [
  {
    id: 'photography_style',
    category: 'Photography',
    name: 'Wedding Photography Style Quiz',
    description: 'Help potential clients discover their photography style and match them to the right package. Captures emails, qualifies leads by budget, and books more consultations by making the first interaction personal and visual.',
    audience: 'Wedding photographers',
    whyItWorks: 'Photography is a visual medium and clients struggle to articulate what they want. This quiz turns "I like your work" into a qualified lead with budget, timeline, and style preferences.',
    iconPath: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z',
    tags: ['photography', 'wedding', 'portrait', 'booking', 'style'],
    blocks: photographyStyleBlocks,
  },
  {
    id: 'restaurant_menu',
    category: 'Food & Dining',
    name: 'Menu Recommendation Quiz',
    description: 'Guide diners to their perfect dish while building your email list. Captures dietary preferences, party size, and taste profiles, then recommends the ideal menu experience. Boosts reservations and repeat visits.',
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
    description: 'Match shoppers to the right product for them. Captures emails, reduces decision fatigue, and turns browsing into personalized recommendations.',
    audience: 'Ecommerce stores, handmade goods shops, DTC brands, Squarespace stores',
    whyItWorks: 'Personalized recommendations make choosing easier. The quiz also captures emails from browsers who might otherwise leave without buying.',
    iconPath: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
    tags: ['ecommerce', 'product', 'recommendation', 'shopping', 'store'],
    blocks: productFinderBlocks,
  },
  {
    id: 'wedding_style',
    category: 'Weddings & Events',
    name: 'Wedding Style Quiz',
    description: 'Help engaged couples discover their wedding aesthetic and book a consultation. Captures dream venue, color palette, and guest count, qualifying leads before the first phone call.',
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
    description: 'Segment potential clients by business stage and route them to the right offer. Captures revenue level, biggest challenge, and learning style, so your sales conversation starts where it matters.',
    audience: 'Business coaches, life coaches, consultants, course creators, mentors',
    whyItWorks: 'Knowing each lead’s stage helps you focus. The quiz pre-qualifies prospects so you spend call time with people who are ready for your level of service.',
    iconPath: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3.01',
    tags: ['coaching', 'consulting', 'business', 'mentor', 'course'],
    blocks: coachingStyleBlocks,
  },
  {
    id: 'home_style',
    category: 'Interior Design',
    name: 'Home Style Quiz',
    description: 'Help potential clients discover their interior design style and visualize their dream space. Captures budget, room focus, and style preferences, qualifying leads before the consultation.',
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
    description: 'Guide visitors through a personalized skincare analysis instead of a static form. Builds trust, grows your email list, and points people to the right treatment in a single interaction.',
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
    whyItWorks: 'Real estate leads are expensive. This quiz pre-qualifies prospects for free, capturing the same info you would ask on a first call, but without the awkward cold outreach.',
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
    whyItWorks: 'Travelers dream before they book. A fun quiz that matches them to a destination or package captures that intent while the wanderlust is high, long before they comparison shop.',
    iconPath: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
    tags: ['travel', 'hotel', 'tourism', 'vacation', 'hospitality'],
    blocks: travelStyleBlocks,
  },
  {
    id: 'nonprofit_engagement',
    category: 'Nonprofits & Causes',
    name: 'Impact Path Quiz',
    description: 'Help supporters discover how they can make the biggest difference: donating, volunteering or advocating. Segments your audience so you can send the right ask to the right person.',
    audience: 'Nonprofits, charities, foundations, community organizations, advocacy groups',
    whyItWorks: 'Not every supporter wants the same thing. This quiz routes donors to donation pages, volunteers to sign-up forms, and advocates to share campaigns, maximizing engagement for everyone.',
    iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
    tags: ['nonprofit', 'charity', 'volunteer', 'donation', 'cause'],
    blocks: nonprofitEngagementBlocks,
  },
  {
    id: 'video_fitness_challenge',
    category: 'Fitness & Wellness',
    name: 'Video Fitness Challenge Quiz',
    description: 'Engage your audience with video-driven fitness questions. Show exercise demos, form checks, and workout clips, then match visitors to their ideal program. Video questions make the quiz feel more personal.',
    audience: 'Personal trainers, fitness studios, yoga instructors, online coaches',
    whyItWorks: 'Video questions show your expertise and build instant trust. Visitors see real workouts before signing up, so they know what to expect from your programs.',
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
    whyItWorks: 'Showing food being prepared brings your menu to life. Video questions keep people watching and answering.',
    iconPath: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
    tags: ['video', 'cooking', 'food', 'recipe', 'culinary', 'chef'],
    blocks: videoCookingStyleBlocks,
  },
  {
    id: 'video_brand_personality',
    category: 'Coaches & Consultants',
    name: 'Video Brand Personality Quiz',
    description: 'Use short video clips to reveal your brand personality and coaching style. Each question features a video scenario that visitors react to, creating a deeply engaging, memorable experience.',
    audience: 'Brand strategists, business coaches, marketing consultants, course creators',
    whyItWorks: 'Video quizzes feel premium and personal. Prospects see your face, hear your voice, and connect with your brand before the first call.',
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
