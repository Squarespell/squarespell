// Seed data for 20 professional templates
// All templates are production-ready and immediately usable

export const seedTemplates = [
  // ========== LEAD QUIZ TEMPLATES (4) ==========

  {
    title: "What's Your Brand Personality?",
    description: "Help clients discover their unique brand personality and get tailored insights.",
    mode: "lead_quiz",
    category: "Brand",
    quiz_data: {
      title: "What's Your Brand Personality?",
      description: "Discover your brand's unique personality type in under 2 minutes.",
      questions: [
        {
          id: "q1",
          text: "When you think about your brand's ideal customer, what word resonates most?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Sophisticated and discerning" },
            { id: "o1-b", text: "Bold and adventurous" },
            { id: "o1-c", text: "Reliable and trustworthy" },
            { id: "o1-d", text: "Trendy and innovative" }
          ]
        },
        {
          id: "q2",
          text: "What aesthetic best represents your brand vision?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Clean lines, white space, essentials only" },
            { id: "o2-b", text: "Bold colors, dynamic energy, eye-catching" },
            { id: "o2-c", text: "Traditional elegance, timeless design" },
            { id: "o2-d", text: "Modern, cutting-edge, future-forward" }
          ]
        },
        {
          id: "q3",
          text: "How would your brand communicate with customers?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Quietly confident and understated" },
            { id: "o3-b", text: "Loud, energetic, and unapologetic" },
            { id: "o3-c", text: "Professional, clear, and straightforward" },
            { id: "o3-d", text: "Playful, conversational, and trendy" }
          ]
        },
        {
          id: "q4",
          text: "What's your brand's superpower?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Doing more with less" },
            { id: "o4-b", text: "Making a memorable impact" },
            { id: "o4-c", text: "Building lasting relationships" },
            { id: "o4-d", text: "Setting new trends" }
          ]
        },
        {
          id: "q5",
          text: "What level of personality do you want to project?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Minimal, focus on substance" },
            { id: "o5-b", text: "Highly expressive and distinctive" },
            { id: "o5-c", text: "Professional but approachable" },
            { id: "o5-d", text: "Constantly evolving and fresh" }
          ]
        },
        {
          id: "q6",
          text: "What matters most to your brand?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Perfection and precision" },
            { id: "o6-b", text: "Impact and disruption" },
            { id: "o6-c", text: "Stability and integrity" },
            { id: "o6-d", text: "Innovation and excitement" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-minimalist",
          title: "The Minimalist",
          description: "Your brand thrives on simplicity and essentials. Less is more for you. Focus on clean design, clear messaging, and removing friction from every customer interaction. Your strength is making complex things feel simple.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-a": 1, "o2-a": 1, "o3-a": 1, "o4-a": 1, "o5-a": 1, "o6-a": 1
            }
          }
        },
        {
          id: "outcome-bold",
          title: "The Bold Creative",
          description: "Your brand is a creative powerhouse built on making an impact. You're not afraid to be different. Use bold visuals, daring messaging, and memorable experiences. Your strength is creating conversations and standing out.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-b": 1, "o2-b": 1, "o3-b": 1, "o4-b": 1, "o5-b": 1, "o6-b": 1
            }
          }
        },
        {
          id: "outcome-classic",
          title: "The Classic Professional",
          description: "Your brand is built on trust and timeless values. Consistency and professionalism are your hallmarks. Focus on clear communication, proven track records, and building confidence with your audience. Your strength is reliability.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-c": 1, "o2-c": 1, "o3-c": 1, "o4-c": 1, "o5-c": 1, "o6-c": 1
            }
          }
        },
        {
          id: "outcome-trendsetter",
          title: "The Trendsetter",
          description: "Your brand leads the way with innovation and forward-thinking. You're always exploring what's next. Embrace modern aesthetics, emerging platforms, and cutting-edge solutions. Your strength is staying ahead of the curve.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-d": 1, "o2-d": 1, "o3-d": 1, "o4-d": 1, "o5-d": 1, "o6-d": 1
            }
          }
        }
      ]
    }
  },

  {
    title: "Website Health Check",
    description: "Assess your website's performance and get personalized improvement recommendations.",
    mode: "lead_quiz",
    category: "Website",
    quiz_data: {
      title: "Website Health Check",
      description: "Get a professional assessment of your website's effectiveness in 3 minutes.",
      questions: [
        {
          id: "q1",
          text: "How easy is it for visitors to find what they need on your website?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Very clear navigation and intuitive layout" },
            { id: "o1-b", text: "Reasonably clear, but some confusion possible" },
            { id: "o1-c", text: "Navigation is confusing or unclear" },
            { id: "o1-d", text: "Visitors struggle to find information" }
          ]
        },
        {
          id: "q2",
          text: "How does your website look and perform on mobile devices?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Excellent responsive design, fast loading" },
            { id: "o2-b", text: "Decent mobile experience, minor issues" },
            { id: "o2-c", text: "Poor mobile experience, slow or broken" },
            { id: "o2-d", text: "Not mobile optimized at all" }
          ]
        },
        {
          id: "q3",
          text: "How well does your website convert visitors into leads or customers?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Strong conversion rate, clear calls-to-action" },
            { id: "o3-b", text: "Okay conversion, but could improve CTAs" },
            { id: "o3-c", text: "Weak conversion, vague next steps" },
            { id: "o3-d", text: "Very few visitors convert" }
          ]
        },
        {
          id: "q4",
          text: "How current and relevant is your website content?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Fresh, regularly updated, highly relevant" },
            { id: "o4-b", text: "Mostly current, some outdated sections" },
            { id: "o4-c", text: "Several outdated pages and information" },
            { id: "o4-d", text: "Content feels stale or severely outdated" }
          ]
        },
        {
          id: "q5",
          text: "Does your website communicate your unique value proposition clearly?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Crystal clear, differentiates well from competitors" },
            { id: "o5-b", text: "Mentioned, but could be clearer" },
            { id: "o5-c", text: "Unclear or generic messaging" },
            { id: "o5-d", text: "No clear unique value communicated" }
          ]
        },
        {
          id: "q6",
          text: "How well integrated are your contact and lead capture methods?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Multiple easy ways to contact/convert" },
            { id: "o6-b", text: "Some contact options available" },
            { id: "o6-c", text: "Difficult to find contact information" },
            { id: "o6-d", text: "No clear way to contact or convert" }
          ]
        },
        {
          id: "q7",
          text: "How does your website compare to your top 3 competitors?",
          type: "single_choice",
          options: [
            { id: "o7-a", text: "Better or equal in quality and functionality" },
            { id: "o7-b", text: "Comparable, similar strengths and weaknesses" },
            { id: "o7-c", text: "Falls behind in several areas" },
            { id: "o7-d", text: "Significantly behind competitors" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-thriving",
          title: "Thriving",
          description: "Your website is in excellent shape! Keep maintaining that quality and continue testing new features to stay competitive.",
          scoring_rule: {
            type: "score_range",
            min: 25,
            max: 35,
            evaluation: "sum"
          }
        },
        {
          id: "outcome-good",
          title: "Good Foundation",
          description: "You have a solid foundation. Focus on improving conversions and updating content to unlock greater potential.",
          scoring_rule: {
            type: "score_range",
            min: 16,
            max: 24,
            evaluation: "sum"
          }
        },
        {
          id: "outcome-needs",
          title: "Needs Attention",
          description: "Your website has room for improvement. Prioritize mobile experience and clearer value messaging to boost results.",
          scoring_rule: {
            type: "score_range",
            min: 8,
            max: 15,
            evaluation: "sum"
          }
        },
        {
          id: "outcome-critical",
          title: "Critical Overhaul",
          description: "Your website needs significant updates. Start with mobile optimization, navigation clarity, and modernizing outdated content.",
          scoring_rule: {
            type: "score_range",
            min: 0,
            max: 7,
            evaluation: "sum"
          }
        }
      ]
    }
  },

  {
    title: "Find Your Style",
    description: "Discover your personal aesthetic and design style preferences.",
    mode: "lead_quiz",
    category: "Design",
    quiz_data: {
      title: "Find Your Style",
      description: "Discover which design style matches your aesthetic in just 2 minutes.",
      questions: [
        {
          id: "q1",
          text: "What draws you in when you see a beautiful space?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Perfect symmetry and clean lines" },
            { id: "o1-b", text: "Cozy, eclectic mix of elements" },
            { id: "o1-c", text: "Rich textures and ornate details" },
            { id: "o1-d", text: "Cutting-edge, avant-garde elements" }
          ]
        },
        {
          id: "q2",
          text: "Which color palette resonates most with you?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Neutral tones - whites, grays, beige" },
            { id: "o2-b", text: "Warm naturals - terracotta, olive, cream" },
            { id: "o2-c", text: "Deep jewel tones - emerald, sapphire, plum" },
            { id: "o2-d", text: "Bold brights - neon, electric colors" }
          ]
        },
        {
          id: "q3",
          text: "How much pattern and texture do you want in your space?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Minimal, mostly solid colors" },
            { id: "o3-b", text: "Some patterns and varied textures" },
            { id: "o3-c", text: "Lots of layered textures and patterns" },
            { id: "o3-d", text: "Abstract and experimental patterns" }
          ]
        },
        {
          id: "q4",
          text: "What's your ideal balance between function and decoration?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Pure function, decoration is unnecessary" },
            { id: "o4-b", text: "Practical with some decorative touches" },
            { id: "o4-c", text: "Beautiful and detailed, function secondary" },
            { id: "o4-d", text: "Unique statement pieces that make a visual impact" }
          ]
        },
        {
          id: "q5",
          text: "Which era's design philosophy appeals to you most?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Contemporary and minimal" },
            { id: "o5-b", text: "Vintage and nostalgic" },
            { id: "o5-c", text: "Classic and timeless" },
            { id: "o5-d", text: "Futuristic and experimental" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-modern",
          title: "Modern Minimalist",
          description: "You value clean aesthetics, functionality, and simplicity. Your style emphasizes space, light, and purposeful design.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-a": 1, "o2-a": 1, "o3-a": 1, "o4-a": 1, "o5-a": 1
            }
          }
        },
        {
          id: "outcome-rustic",
          title: "Rustic Natural",
          description: "You love warmth, natural materials, and cozy atmospheres. Your style blends vintage charm with comfortable, livable spaces.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-b": 1, "o2-b": 1, "o3-b": 1, "o4-b": 1, "o5-b": 1
            }
          }
        },
        {
          id: "outcome-classic",
          title: "Classic Elegant",
          description: "You appreciate timeless beauty, rich details, and sophisticated spaces. Your style balances ornamentation with restraint.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-c": 1, "o2-c": 1, "o3-c": 1, "o4-c": 1, "o5-c": 1
            }
          }
        },
        {
          id: "outcome-avant",
          title: "Avant-Garde Bold",
          description: "You're drawn to bold statements and cutting-edge design. Your style isn't afraid to experiment and push boundaries.",
          scoring_rule: {
            type: "option_match",
            mapping: {
              "o1-d": 1, "o2-d": 1, "o3-d": 1, "o4-d": 1, "o5-d": 1
            }
          }
        }
      ]
    }
  },

  {
    title: "What Type of Client Are You?",
    description: "Identify your client type to receive tailored business solutions.",
    mode: "lead_quiz",
    category: "Business",
    quiz_data: {
      title: "What Type of Client Are You?",
      description: "Let us know your business profile so we can tailor our services for you.",
      questions: [
        {
          id: "q1",
          text: "How long has your business been operating?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Less than 1 year (startup phase)" },
            { id: "o1-b", text: "1-3 years (growth phase)" },
            { id: "o1-c", text: "3-10 years (established)" },
            { id: "o1-d", text: "10+ years (mature business)" }
          ]
        },
        {
          id: "q2",
          text: "What's your approximate annual revenue?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Under 50k (bootstrapping)" },
            { id: "o2-b", text: "50k-250k (early revenue)" },
            { id: "o2-c", text: "250k-1M (solid revenue)" },
            { id: "o2-d", text: "1M+ (high revenue)" }
          ]
        },
        {
          id: "q3",
          text: "How many employees or team members do you have?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Just me (solopreneur)" },
            { id: "o3-b", text: "2-5 people" },
            { id: "o3-c", text: "6-20 people" },
            { id: "o3-d", text: "20+ people" }
          ]
        },
        {
          id: "q4",
          text: "What's your biggest business challenge right now?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Getting customers and generating leads" },
            { id: "o4-b", text: "Converting leads into paying customers" },
            { id: "o4-c", text: "Retaining and scaling with existing customers" },
            { id: "o4-d", text: "Optimizing operations and profitability" }
          ]
        },
        {
          id: "q5",
          text: "What's your primary business channel?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Local/in-person services" },
            { id: "o5-b", text: "E-commerce or digital products" },
            { id: "o5-c", text: "Consulting or professional services" },
            { id: "o5-d", text: "Saas or technology platform" }
          ]
        },
        {
          id: "q6",
          text: "How invested are you in digital transformation?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Just starting my online presence" },
            { id: "o6-b", text: "Have some digital tools, want to improve" },
            { id: "o6-c", text: "Already well-integrated, seeking optimization" },
            { id: "o6-d", text: "Highly digital, seeking cutting-edge solutions" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-startup",
          title: "Ambitious Startup",
          description: "You're building something new from the ground up. Focus on finding product-market fit, validating your business idea, and getting early customers.",
          scoring_rule: {
            type: "score_range",
            min: 0,
            max: 10,
            evaluation: "sum"
          }
        },
        {
          id: "outcome-growth",
          title: "Growth-Stage Business",
          description: "You're past the startup phase and scaling. Optimize your sales funnel, improve conversion rates, and systematize your operations.",
          scoring_rule: {
            type: "score_range",
            min: 11,
            max: 18,
            evaluation: "sum"
          }
        },
        {
          id: "outcome-established",
          title: "Established Business",
          description: "You have solid operations and revenue. Focus on diversification, market expansion, and building strategic partnerships.",
          scoring_rule: {
            type: "score_range",
            min: 19,
            max: 24,
            evaluation: "sum"
          }
        },
        {
          id: "outcome-mature",
          title: "Enterprise Leader",
          description: "You're leading a mature, successful business. Focus on innovation, operational excellence, and legacy building.",
          scoring_rule: {
            type: "score_range",
            min: 25,
            max: 24,
            evaluation: "sum"
          }
        }
      ]
    }
  },

  // ========== PRICE CALCULATOR TEMPLATES (4) ==========

  {
    title: "Wedding Photography Estimate",
    description: "Calculate wedding photography package pricing based on client needs.",
    mode: "price_calculator",
    category: "Pricing",
    quiz_data: {
      title: "Wedding Photography Estimate",
      description: "Get an instant quote for your wedding photography needs.",
      questions: [
        {
          id: "q1",
          text: "How many hours of coverage do you need?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Up to 4 hours", value: 400 },
            { id: "o1-b", text: "6-8 hours", value: 250 },
            { id: "o1-c", text: "10-12 hours (full day)", value: 150 },
            { id: "o1-d", text: "12+ hours (multi-day)", value: 100 }
          ]
        },
        {
          id: "q2",
          text: "What's your wedding location?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Local (within 30 miles)", value: 0 },
            { id: "o2-b", text: "Regional (30-100 miles)", value: 500 },
            { id: "o2-c", text: "Destination (100+ miles)", value: 1000 }
          ]
        },
        {
          id: "q3",
          text: "Do you want an album?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Yes, premium custom album", value: 800 },
            { id: "o3-b", text: "Yes, standard album", value: 400 },
            { id: "o3-c", text: "No, just digital files", value: 0 }
          ]
        },
        {
          id: "q4",
          text: "Do you want a second photographer?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Yes", value: 600 },
            { id: "o4-b", text: "No", value: 0 }
          ]
        },
        {
          id: "q5",
          text: "Do you need a rehearsal shoot?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes", value: 300 },
            { id: "o5-b", text: "No", value: 0 }
          ]
        },
        {
          id: "q6",
          text: "Do you want engagement photos included?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Yes", value: 500 },
            { id: "o6-b", text: "No", value: 0 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-estimate",
          title: "Your Estimate",
          description: "Based on your answers, here's your personalized wedding photography quote.",
          result_type: "calculator"
        }
      ]
    }
  },

  {
    title: "Web Design Project Quote",
    description: "Get an instant web design quote based on your project scope.",
    mode: "price_calculator",
    category: "Pricing",
    quiz_data: {
      title: "Web Design Project Quote",
      description: "Receive an instant estimate for your web design project.",
      questions: [
        {
          id: "q1",
          text: "How many pages does your website need?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Landing page (1 page)", value: 1000 },
            { id: "o1-b", text: "Basic site (3-5 pages)", value: 500 },
            { id: "o1-c", text: "Medium site (6-10 pages)", value: 300 },
            { id: "o1-d", text: "Large site (10+ pages)", value: 200 }
          ]
        },
        {
          id: "q2",
          text: "Do you need an e-commerce store?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Yes, with 50+ products", value: 4000 },
            { id: "o2-b", text: "Yes, with under 50 products", value: 2000 },
            { id: "o2-c", text: "No, not needed", value: 0 }
          ]
        },
        {
          id: "q3",
          text: "Do you need a mobile app or complex integrations?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Yes, mobile app required", value: 5000 },
            { id: "o3-b", text: "Yes, complex integrations", value: 2000 },
            { id: "o3-c", text: "Basic integrations only", value: 500 },
            { id: "o3-d", text: "No special requirements", value: 0 }
          ]
        },
        {
          id: "q4",
          text: "What's your project timeline?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Rush (2 weeks)", value: 1500 },
            { id: "o4-b", text: "Standard (4-6 weeks)", value: 0 },
            { id: "o4-c", text: "Flexible (8+ weeks)", value: -500 }
          ]
        },
        {
          id: "q5",
          text: "Do you need SEO optimization and content creation?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, full SEO and content", value: 1500 },
            { id: "o5-b", text: "Yes, basic SEO setup", value: 500 },
            { id: "o5-c", text: "No, not needed", value: 0 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-quote",
          title: "Your Web Design Quote",
          description: "Here's your personalized web design project estimate.",
          result_type: "calculator"
        }
      ]
    }
  },

  {
    title: "Event Planning Budget",
    description: "Calculate your event planning costs based on guest count and venue.",
    mode: "price_calculator",
    category: "Pricing",
    quiz_data: {
      title: "Event Planning Budget",
      description: "Get an instant budget estimate for your event.",
      questions: [
        {
          id: "q1",
          text: "How many guests are you expecting?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Intimate (under 50)", value: 50 },
            { id: "o1-b", text: "Small (50-100)", value: 100 },
            { id: "o1-c", text: "Medium (100-200)", value: 150 },
            { id: "o1-d", text: "Large (200+ guests)", value: 200 }
          ]
        },
        {
          id: "q2",
          text: "What type of venue do you prefer?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Budget venue", value: 1000 },
            { id: "o2-b", text: "Mid-range venue", value: 3000 },
            { id: "o2-c", text: "Premium venue", value: 7000 },
            { id: "o2-d", text: "Luxury venue", value: 15000 }
          ]
        },
        {
          id: "q3",
          text: "Will you have full catering service?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Full meal service", value: 50 },
            { id: "o3-b", text: "Cocktail reception only", value: 25 },
            { id: "o3-c", text: "Appetizers only", value: 15 },
            { id: "o3-d", text: "Beverages only", value: 5 }
          ]
        },
        {
          id: "q4",
          text: "Do you need entertainment or live music?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Yes, live band", value: 2000 },
            { id: "o4-b", text: "Yes, DJ only", value: 800 },
            { id: "o4-c", text: "No entertainment", value: 0 }
          ]
        },
        {
          id: "q5",
          text: "Do you need full event planning coordination?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, full coordination", value: 3000 },
            { id: "o5-b", text: "Partial planning help", value: 1000 },
            { id: "o5-c", text: "DIY, no planning service", value: 0 }
          ]
        },
        {
          id: "q6",
          text: "Do you need photography and videography?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Photography and video", value: 1500 },
            { id: "o6-b", text: "Photography only", value: 800 },
            { id: "o6-c", text: "No professional media", value: 0 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-budget",
          title: "Your Event Budget",
          description: "Here's your estimated event planning budget.",
          result_type: "calculator"
        }
      ]
    }
  },

  {
    title: "Home Renovation Estimate",
    description: "Get a rough estimate for your home renovation project costs.",
    mode: "price_calculator",
    category: "Pricing",
    quiz_data: {
      title: "Home Renovation Estimate",
      description: "Get an instant estimate for your home renovation project.",
      questions: [
        {
          id: "q1",
          text: "How many rooms are you renovating?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Just 1 room", value: 0 },
            { id: "o1-b", text: "2-3 rooms", value: 1000 },
            { id: "o1-c", text: "4-5 rooms", value: 3000 },
            { id: "o1-d", text: "Whole house", value: 10000 }
          ]
        },
        {
          id: "q2",
          text: "What's the scope of work?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Cosmetic only (paint, fixtures)", value: 100 },
            { id: "o2-b", text: "Minor updates (new finishes)", value: 200 },
            { id: "o2-c", text: "Major renovation (structural changes)", value: 500 },
            { id: "o2-d", text: "Complete gut renovation", value: 1000 }
          ]
        },
        {
          id: "q3",
          text: "What quality of materials do you want?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Budget materials", value: 0 },
            { id: "o3-b", text: "Standard quality", value: 1000 },
            { id: "o3-c", text: "Premium materials", value: 3000 },
            { id: "o3-d", text: "Luxury/high-end", value: 7000 }
          ]
        },
        {
          id: "q4",
          text: "Do you need new plumbing or electrical work?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Extensive updates needed", value: 5000 },
            { id: "o4-b", text: "Some updates", value: 2000 },
            { id: "o4-c", text: "Minor updates only", value: 500 },
            { id: "o4-d", text: "No updates needed", value: 0 }
          ]
        },
        {
          id: "q5",
          text: "Do you need HVAC or major system work?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, complete replacement", value: 3000 },
            { id: "o5-b", text: "Yes, upgrades needed", value: 1500 },
            { id: "o5-c", text: "No new systems needed", value: 0 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-estimate",
          title: "Your Renovation Estimate",
          description: "Here's your estimated home renovation budget.",
          result_type: "calculator"
        }
      ]
    }
  },

  // ========== SERVICE RECOMMENDER TEMPLATES (4) ==========

  {
    title: "Which Coaching Package Fits You?",
    description: "Find the right coaching package for your business goals.",
    mode: "service_recommender",
    category: "Services",
    quiz_data: {
      title: "Which Coaching Package Fits You?",
      description: "Discover the coaching package that matches your needs.",
      questions: [
        {
          id: "q1",
          text: "How much ongoing support do you need?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Minimal, mostly self-guided" },
            { id: "o1-b", text: "Moderate, some check-ins" },
            { id: "o1-c", text: "High, frequent support needed" }
          ]
        },
        {
          id: "q2",
          text: "What's your budget range?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Budget-conscious, under 500/month" },
            { id: "o2-b", text: "Moderate, 500-1500/month" },
            { id: "o2-c", text: "Premium, 1500+/month" }
          ]
        },
        {
          id: "q3",
          text: "Do you need group or one-on-one coaching?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Group coaching (more affordable)" },
            { id: "o3-b", text: "No preference" },
            { id: "o3-c", text: "One-on-one (personalized)" }
          ]
        },
        {
          id: "q4",
          text: "What's your primary goal?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Learning and education" },
            { id: "o4-b", text: "Growth and scaling" },
            { id: "o4-c", text: "Deep transformation" }
          ]
        },
        {
          id: "q5",
          text: "How quickly do you need results?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Flexible timeline" },
            { id: "o5-b", text: "Within 3-6 months" },
            { id: "o5-c", text: "Fast, within 30-60 days" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-starter",
          title: "Starter Group Coaching",
          description: "Perfect for learning at your own pace. Get monthly group sessions and community support.",
          price: 297,
          cta_text: "Choose Starter Package",
          details: "Monthly group coaching sessions, community forum access, resource library, email support"
        },
        {
          id: "outcome-pro",
          title: "Pro One-on-One Coaching",
          description: "Personalized coaching with bi-weekly sessions. Ideal for serious progress.",
          price: 1497,
          cta_text: "Choose Pro Package",
          details: "Bi-weekly 1-on-1 sessions, email support, customized plan, accountability check-ins"
        },
        {
          id: "outcome-vip",
          title: "VIP Premium Coaching",
          description: "Intensive transformation program with weekly sessions and priority support.",
          price: 2997,
          cta_text: "Choose VIP Package",
          details: "Weekly 1-on-1 sessions, 24-hour response time, customized strategy, bonus resources"
        }
      ]
    }
  },

  {
    title: "Find Your Perfect Facial Treatment",
    description: "Discover the right facial treatment for your skin type.",
    mode: "service_recommender",
    category: "Services",
    quiz_data: {
      title: "Find Your Perfect Facial Treatment",
      description: "Get matched with the ideal facial treatment for your skin.",
      questions: [
        {
          id: "q1",
          text: "What's your primary skin concern?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Acne and breakouts" },
            { id: "o1-b", text: "Aging and wrinkles" },
            { id: "o1-c", text: "Dryness and sensitivity" },
            { id: "o1-d", text: "General maintenance" }
          ]
        },
        {
          id: "q2",
          text: "How much downtime can you tolerate?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "None, need instant results" },
            { id: "o2-b", text: "Minimal, less than 24 hours" },
            { id: "o2-c", text: "Some, up to 3-5 days" },
            { id: "o2-d", text: "Don't mind longer recovery" }
          ]
        },
        {
          id: "q3",
          text: "Do you prefer natural or clinical treatments?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "All-natural, organic only" },
            { id: "o3-b", text: "Natural with some clinical elements" },
            { id: "o3-c", text: "Proven clinical results" },
            { id: "o3-d", text: "Advanced technology or injectables" }
          ]
        },
        {
          id: "q4",
          text: "What's your budget?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Budget-friendly (under 100)" },
            { id: "o4-b", text: "Moderate (100-250)" },
            { id: "o4-c", text: "Premium (250-500)" },
            { id: "o4-d", text: "Luxury (500+)" }
          ]
        },
        {
          id: "q5",
          text: "How often can you come in for treatments?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Monthly or less" },
            { id: "o5-b", text: "Bi-monthly" },
            { id: "o5-c", text: "Monthly or more frequently" },
            { id: "o5-d", text: "One-time special treatment" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-classic",
          title: "Classic European Facial",
          description: "Gentle, hydrating facial perfect for maintenance and sensitive skin.",
          price: 85,
          cta_text: "Book Classic Facial",
          details: "45-minute treatment, customized for your skin, monthly maintenance recommended"
        },
        {
          id: "outcome-chemical",
          title: "Chemical Peel Facial",
          description: "Powerful treatment for acne, hyperpigmentation, and renewal.",
          price: 150,
          cta_text: "Book Chemical Peel",
          details: "60-minute treatment, 3-5 days downtime, visible results in one session"
        },
        {
          id: "outcome-microderm",
          title: "Microdermabrasion Facial",
          description: "Effective for texture, tone, and anti-aging results.",
          price: 120,
          cta_text: "Book Microdermabrasion",
          details: "45-minute treatment, minimal downtime, series of 6 recommended"
        },
        {
          id: "outcome-advanced",
          title: "Advanced Tech Facial",
          description: "State-of-the-art laser or RF technology for dramatic results.",
          price: 300,
          cta_text: "Book Advanced Facial",
          details: "60-minute treatment, professional strength results, 2-3 day recovery"
        }
      ]
    }
  },

  {
    title: "Which Photography Session Do You Need?",
    description: "Find the perfect photography session type for your needs.",
    mode: "service_recommender",
    category: "Services",
    quiz_data: {
      title: "Which Photography Session Do You Need?",
      description: "Get matched with the ideal photography session.",
      questions: [
        {
          id: "q1",
          text: "What's the primary purpose of your shoot?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Personal/family memories" },
            { id: "o1-b", text: "Business/professional branding" },
            { id: "o1-c", text: "Special event/milestone" }
          ]
        },
        {
          id: "q2",
          text: "How many people will be in photos?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Just me (1 person)" },
            { id: "o2-b", text: "Small group (2-4 people)" },
            { id: "o2-c", text: "Larger group (5+ people)" }
          ]
        },
        {
          id: "q3",
          text: "How much time do you need?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Quick session (30-45 min)" },
            { id: "o3-b", text: "Standard session (1-2 hours)" },
            { id: "o3-c", text: "Extended session (3+ hours)" }
          ]
        },
        {
          id: "q4",
          text: "Do you need location assistance?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Use my preferred location" },
            { id: "o4-b", text: "Need suggestions and scouting" },
            { id: "o4-c", text: "Need multiple location shoots" }
          ]
        },
        {
          id: "q5",
          text: "What's your turnaround time preference?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Express (same week)" },
            { id: "o5-b", text: "Standard (2-3 weeks)" },
            { id: "o5-c", text: "Flexible (4+ weeks)" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-mini",
          title: "Mini Session",
          description: "Perfect for quick updates, seasonal memories, or trying out the photographer.",
          price: 199,
          cta_text: "Book Mini Session",
          details: "30-45 minutes, one location, digital gallery with 25+ edited images"
        },
        {
          id: "outcome-standard",
          title: "Standard Session",
          description: "Ideal for family portraits, professional headshots, and milestone events.",
          price: 495,
          cta_text: "Book Standard Session",
          details: "2 hours, up to 2 locations, digital gallery with 75+ edited images"
        },
        {
          id: "outcome-premium",
          title: "Premium Half-Day Session",
          description: "Comprehensive coverage for important events and extensive sessions.",
          price: 895,
          cta_text: "Book Premium Session",
          details: "4 hours, multiple locations, 150+ images, custom album option available"
        }
      ]
    }
  },

  {
    title: "What Marketing Service Is Right For You?",
    description: "Find the right marketing service for your business goals.",
    mode: "service_recommender",
    category: "Services",
    quiz_data: {
      title: "What Marketing Service Is Right For You?",
      description: "Discover which marketing service will grow your business.",
      questions: [
        {
          id: "q1",
          text: "What's your biggest marketing need?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Building brand awareness" },
            { id: "o1-b", text: "Generating qualified leads" },
            { id: "o1-c", text: "Converting leads to sales" },
            { id: "o1-d", text: "Retaining and growing customers" }
          ]
        },
        {
          id: "q2",
          text: "What's your preferred marketing channel?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Social media marketing" },
            { id: "o2-b", text: "Email marketing" },
            { id: "o2-c", text: "Content/SEO marketing" },
            { id: "o2-d", text: "Paid advertising (Google/Facebook)" }
          ]
        },
        {
          id: "q3",
          text: "Do you need strategy or execution?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Just execution and management" },
            { id: "o3-b", text: "Some strategy guidance" },
            { id: "o3-c", text: "Full strategy and execution" },
            { id: "o3-d", text: "Training and consultation only" }
          ]
        },
        {
          id: "q4",
          text: "What's your marketing budget?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Limited (under 500/month)" },
            { id: "o4-b", text: "Moderate (500-2000/month)" },
            { id: "o4-c", text: "Substantial (2000+/month)" },
            { id: "o4-d", text: "Looking for ROI-based pricing" }
          ]
        },
        {
          id: "q5",
          text: "How soon do you need results?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Immediate (weeks)" },
            { id: "o5-b", text: "Short-term (1-3 months)" },
            { id: "o5-c", text: "Long-term (6+ months)" }
          ]
        },
        {
          id: "q6",
          text: "How much hands-on involvement do you want?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Fully managed, I'm hands off" },
            { id: "o6-b", text: "Weekly check-ins and updates" },
            { id: "o6-c", text: "Collaborative, I'm heavily involved" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-startup",
          title: "Startup Marketing Package",
          description: "Perfect for new businesses needing foundational marketing.",
          price: 999,
          cta_text: "Choose Startup Package",
          details: "Strategy consultation, content calendar, basic social setup, monthly reporting"
        },
        {
          id: "outcome-growth",
          title: "Growth Marketing Service",
          description: "For established businesses ready to scale.",
          price: 2499,
          cta_text: "Choose Growth Service",
          details: "Full strategy, channel management, content creation, weekly check-ins, optimization"
        },
        {
          id: "outcome-enterprise",
          title: "Enterprise Marketing Management",
          description: "Comprehensive marketing for serious growth.",
          price: 4999,
          cta_text: "Choose Enterprise Service",
          details: "Dedicated team, multi-channel management, advanced analytics, daily optimization, quarterly strategy"
        },
        {
          id: "outcome-consulting",
          title: "Marketing Consulting",
          description: "For businesses who want to DIY with expert guidance.",
          price: 1499,
          cta_text: "Choose Consulting",
          details: "Monthly strategy sessions, framework and templates, quarterly reviews, unlimited email support"
        }
      ]
    }
  },

  // ========== CLIENT QUALIFIER TEMPLATES (4) ==========

  {
    title: "Are You Ready for a Brand Redesign?",
    description: "Determine if your business is ready for a comprehensive brand redesign.",
    mode: "client_qualifier",
    category: "Qualification",
    quiz_data: {
      title: "Are You Ready for a Brand Redesign?",
      description: "Let's assess if a brand redesign is right for you now.",
      questions: [
        {
          id: "q1",
          text: "How old is your current brand identity?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Less than 2 years old", points: 0 },
            { id: "o1-b", text: "2-5 years old", points: 5 },
            { id: "o1-c", text: "5-10 years old", points: 15 },
            { id: "o1-d", text: "10+ years old", points: 20 }
          ]
        },
        {
          id: "q2",
          text: "Do customers recognize and remember your brand?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Strongly yes, very memorable", points: 0 },
            { id: "o2-b", text: "Somewhat, but it could be better", points: 10 },
            { id: "o2-c", text: "Not really, fairly forgettable", points: 15 },
            { id: "o2-d", text: "No, people often confuse us with competitors", points: 20 }
          ]
        },
        {
          id: "q3",
          text: "Does your brand accurately reflect your current positioning?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Yes, perfectly aligned", points: 0 },
            { id: "o3-b", text: "Mostly, with some misalignment", points: 10 },
            { id: "o3-c", text: "Somewhat, significant gaps", points: 15 },
            { id: "o3-d", text: "No, we've evolved significantly", points: 20 }
          ]
        },
        {
          id: "q4",
          text: "How often do you compete on price versus brand value?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Rarely, our brand commands premium pricing", points: 0 },
            { id: "o4-b", text: "Sometimes, we compete on both factors", points: 10 },
            { id: "o4-c", text: "Often, price is a key competitive factor", points: 15 },
            { id: "o4-d", text: "Always, brand doesn't support premium pricing", points: 20 }
          ]
        },
        {
          id: "q5",
          text: "Is your brand consistent across all touchpoints?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, completely consistent", points: 0 },
            { id: "o5-b", text: "Mostly consistent with minor variations", points: 10 },
            { id: "o5-c", text: "Inconsistent, needs improvement", points: 15 },
            { id: "o5-d", text: "Very inconsistent, chaotic across channels", points: 20 }
          ]
        },
        {
          id: "q6",
          text: "Do you have budget allocated for a redesign?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Yes, substantial budget approved", points: 0 },
            { id: "o6-b", text: "Yes, but limited budget", points: 5 },
            { id: "o6-c", text: "Possibly, need to secure funding", points: 10 },
            { id: "o6-d", text: "No budget available", points: 20 }
          ]
        },
        {
          id: "q7",
          text: "Are you committed to implementing the redesign fully?",
          type: "single_choice",
          options: [
            { id: "o7-a", text: "Yes, fully committed to rollout", points: 0 },
            { id: "o7-b", text: "Mostly committed", points: 10 },
            { id: "o7-c", text: "Uncertain, need convincing", points: 15 },
            { id: "o7-d", text: "Hesitant, just exploring options", points: 20 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-qualified",
          title: "You're Ready to Redesign",
          description: "Your business is ready for a brand redesign. The timing is right.",
          qualification_threshold: 70,
          outcome_type: "qualified",
          cta_text: "Let's Start Your Redesign",
          next_step: "Schedule a discovery call to discuss your vision and goals."
        },
        {
          id: "outcome-nurture",
          title: "You Might Be Ready Soon",
          description: "You show some readiness, but a few factors suggest waiting or addressing first.",
          qualification_threshold: 70,
          outcome_type: "nurture",
          cta_text: "Let's Discuss Strategy",
          next_step: "We can help you prepare for a future redesign with actionable steps."
        }
      ]
    }
  },

  {
    title: "Is Your Business Ready to Scale?",
    description: "Evaluate your business's readiness for rapid growth and scaling.",
    mode: "client_qualifier",
    category: "Qualification",
    quiz_data: {
      title: "Is Your Business Ready to Scale?",
      description: "Assess whether your business has the foundations to scale successfully.",
      questions: [
        {
          id: "q1",
          text: "Do you have documented processes and SOPs?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Yes, comprehensive documentation", points: 0 },
            { id: "o1-b", text: "Partial documentation", points: 10 },
            { id: "o1-c", text: "Minimal documentation", points: 15 },
            { id: "o1-d", text: "No, everything is in my head", points: 20 }
          ]
        },
        {
          id: "q2",
          text: "Is your cash flow stable and predictable?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Yes, stable and growing", points: 0 },
            { id: "o2-b", text: "Mostly stable, some variation", points: 10 },
            { id: "o2-c", text: "Unpredictable, cash flow concerns", points: 15 },
            { id: "o2-d", text: "Struggling, negative cash flow", points: 20 }
          ]
        },
        {
          id: "q3",
          text: "Do you have systems to handle growth?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Yes, scalable systems in place", points: 0 },
            { id: "o3-b", text: "Some systems, but need upgrades", points: 10 },
            { id: "o3-c", text: "Outdated or ad-hoc systems", points: 15 },
            { id: "o3-d", text: "No systems, manual everything", points: 20 }
          ]
        },
        {
          id: "q4",
          text: "Do you have a leadership team in place?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Yes, strong leadership team", points: 0 },
            { id: "o4-b", text: "Partial team, need more", points: 10 },
            { id: "o4-c", text: "Just me and a couple people", points: 15 },
            { id: "o4-d", text: "Just me, solo operation", points: 20 }
          ]
        },
        {
          id: "q5",
          text: "Is your product or service tested and refined?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, proven market fit", points: 0 },
            { id: "o5-b", text: "Good feedback, fine-tuning", points: 10 },
            { id: "o5-c", text: "Still testing the concept", points: 15 },
            { id: "o5-d", text: "Brand new, untested", points: 20 }
          ]
        },
        {
          id: "q6",
          text: "Do you have capital available for growth investments?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Yes, substantial capital available", points: 0 },
            { id: "o6-b", text: "Some capital, can raise more", points: 10 },
            { id: "o6-c", text: "Limited capital", points: 15 },
            { id: "o6-d", text: "No capital, bootstrapping", points: 20 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-ready",
          title: "Ready to Scale",
          description: "Your business has the foundations to scale effectively. Let's accelerate growth.",
          qualification_threshold: 75,
          outcome_type: "qualified",
          cta_text: "Start Your Scaling Plan",
          next_step: "We'll create a growth roadmap tailored to your business."
        },
        {
          id: "outcome-prepare",
          title: "Prepare First, Then Scale",
          description: "You're close, but addressing a few gaps will make scaling much smoother.",
          qualification_threshold: 75,
          outcome_type: "nurture",
          cta_text: "Build Your Foundation",
          next_step: "Let's focus on strengthening key areas before aggressive scaling."
        }
      ]
    }
  },

  {
    title: "Do You Need a Custom Website?",
    description: "Determine if a custom website is the right solution for your business.",
    mode: "client_qualifier",
    category: "Qualification",
    quiz_data: {
      title: "Do You Need a Custom Website?",
      description: "Let's figure out if a custom website is right for you.",
      questions: [
        {
          id: "q1",
          text: "How unique are your business needs compared to competitors?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Highly unique, need custom functionality", points: 20 },
            { id: "o1-b", text: "Somewhat unique", points: 15 },
            { id: "o1-c", text: "Pretty standard", points: 5 },
            { id: "o1-d", text: "Same as most competitors", points: 0 }
          ]
        },
        {
          id: "q2",
          text: "What's your website traffic expectation?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "High volume, 100k+ monthly visitors", points: 20 },
            { id: "o2-b", text: "Moderate, 10k-100k monthly", points: 10 },
            { id: "o2-c", text: "Low, under 10k monthly", points: 0 }
          ]
        },
        {
          id: "q3",
          text: "Do you need e-commerce functionality?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Yes, complex product catalog", points: 20 },
            { id: "o3-b", text: "Yes, simple product store", points: 10 },
            { id: "o3-c", text: "No, just info and contact", points: 0 }
          ]
        },
        {
          id: "q4",
          text: "Will you need integrations with third-party tools?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Yes, many custom integrations", points: 20 },
            { id: "o4-b", text: "Yes, a few standard ones", points: 10 },
            { id: "o4-c", text: "No, none needed", points: 0 }
          ]
        },
        {
          id: "q5",
          text: "Do you need advanced SEO and performance?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, critical for my business", points: 15 },
            { id: "o5-b", text: "Somewhat important", points: 10 },
            { id: "o5-c", text: "Not a priority", points: 0 }
          ]
        },
        {
          id: "q6",
          text: "Is your budget adequate for custom development?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Yes, 5k+", points: 0 },
            { id: "o6-b", text: "Moderate, 2k-5k", points: 5 },
            { id: "o6-c", text: "Limited, under 2k", points: 20 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-custom",
          title: "Yes, Custom Website Recommended",
          description: "A custom website is the right choice for your business needs.",
          qualification_threshold: 65,
          outcome_type: "qualified",
          cta_text: "Build Your Custom Site",
          next_step: "Let's discuss your unique requirements and create a roadmap."
        },
        {
          id: "outcome-template",
          title: "Template Website May Suffice",
          description: "A modern template-based solution might meet your needs at lower cost.",
          qualification_threshold: 65,
          outcome_type: "nurture",
          cta_text: "Explore Template Options",
          next_step: "We can show you what's possible with a premium template first."
        }
      ]
    }
  },

  {
    title: "Are You Our Ideal Client?",
    description: "See if your business is a good fit for our premium services.",
    mode: "client_qualifier",
    category: "Qualification",
    quiz_data: {
      title: "Are You Our Ideal Client?",
      description: "Let's see if we're a good match for your business.",
      questions: [
        {
          id: "q1",
          text: "What's your annual revenue?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Under 100k", points: 0 },
            { id: "o1-b", text: "100k-500k", points: 10 },
            { id: "o1-c", text: "500k-2M", points: 15 },
            { id: "o1-d", text: "2M+", points: 20 }
          ]
        },
        {
          id: "q2",
          text: "Are you open to strategic advice and recommendations?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Yes, very open to guidance", points: 20 },
            { id: "o2-b", text: "Mostly open", points: 15 },
            { id: "o2-c", text: "Somewhat, I have my own ideas", points: 5 },
            { id: "o2-d", text: "No, just execute what I want", points: 0 }
          ]
        },
        {
          id: "q3",
          text: "What's your commitment level to a long-term partnership?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Long-term, 12+ months", points: 20 },
            { id: "o3-b", text: "Medium-term, 6-12 months", points: 15 },
            { id: "o3-c", text: "Short-term, project-based", points: 5 },
            { id: "o3-d", text: "One-off, not ongoing", points: 0 }
          ]
        },
        {
          id: "q4",
          text: "Are you willing to invest in professional solutions?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Yes, quality is worth the investment", points: 20 },
            { id: "o4-b", text: "Yes, if ROI is clear", points: 15 },
            { id: "o4-c", text: "Maybe, price is a factor", points: 5 },
            { id: "o4-d", text: "No, looking for cheapest option", points: 0 }
          ]
        },
        {
          id: "q5",
          text: "Are you responsive and action-oriented?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Yes, very quick decision maker", points: 20 },
            { id: "o5-b", text: "Mostly, some delays", points: 15 },
            { id: "o5-c", text: "Slow decision process", points: 5 },
            { id: "o5-d", text: "Very slow, lots of analysis", points: 0 }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-ideal",
          title: "You're Our Ideal Client",
          description: "Perfect fit! You have the business profile and mindset we love to work with.",
          qualification_threshold: 70,
          outcome_type: "qualified",
          cta_text: "Start Working Together",
          next_step: "Schedule a consultation to explore how we can transform your business."
        },
        {
          id: "outcome-possible",
          title: "Possible Fit",
          description: "There's potential here, but let's discuss alignment first.",
          qualification_threshold: 70,
          outcome_type: "nurture",
          cta_text: "Have a Chat",
          next_step: "A brief call will help us determine if this is a good partnership."
        }
      ]
    }
  },

  // ========== SEGMENTATION QUIZ TEMPLATES (4) ==========

  {
    title: "What Type of Wellness Journey Are You On?",
    description: "Segment respondents by their wellness lifestyle and preferences.",
    mode: "segmentation_quiz",
    category: "Segmentation",
    quiz_data: {
      title: "What Type of Wellness Journey Are You On?",
      description: "Tell us about your wellness approach so we can personalize your experience.",
      questions: [
        {
          id: "q1",
          text: "What aspect of wellness is most important to you?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Physical fitness and exercise" },
            { id: "o1-b", text: "Mental health and stress relief" },
            { id: "o1-c", text: "Nutrition and healthy eating" },
            { id: "o1-d", text: "Overall balance and lifestyle" }
          ]
        },
        {
          id: "q2",
          text: "How would you describe your current fitness level?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Very active, exercise regularly" },
            { id: "o2-b", text: "Moderately active" },
            { id: "o2-c", text: "Trying to improve" },
            { id: "o2-d", text: "Just starting my fitness journey" }
          ]
        },
        {
          id: "q3",
          text: "What motivates your wellness choices?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Performance and achievement" },
            { id: "o3-b", text: "Stress relief and relaxation" },
            { id: "o3-c", text: "Health and longevity" },
            { id: "o3-d", text: "Appearance and aesthetics" }
          ]
        },
        {
          id: "q4",
          text: "What's your preferred wellness practice?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Intense workouts and strength training" },
            { id: "o4-b", text: "Mind-body practices like yoga" },
            { id: "o4-c", text: "Outdoor activities and nature" },
            { id: "o4-d", text: "Holistic wellness and nutrition" }
          ]
        },
        {
          id: "q5",
          text: "How important are wellness communities to you?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Very important, I love group activities" },
            { id: "o5-b", text: "Somewhat important" },
            { id: "o5-c", text: "Not very important, I'm solo" },
            { id: "o5-d", text: "Don't care either way" }
          ]
        },
        {
          id: "q6",
          text: "What's your budget comfort level for wellness services?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Premium, invest in quality" },
            { id: "o6-b", text: "Moderate, willing to spend" },
            { id: "o6-c", text: "Budget-conscious" },
            { id: "o6-d", text: "Minimal, mostly DIY" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-athlete",
          title: "The Athlete",
          description: "You're focused on performance, strength, and pushing your limits.",
          tags: ["fitness", "performance", "strength", "competitive"],
          messaging: "You're dedicated to athletic excellence. Explore advanced training programs and performance optimization."
        },
        {
          id: "outcome-mindful",
          title: "The Mindful Wellness Seeker",
          description: "You balance physical and mental wellness with mindfulness practices.",
          tags: ["yoga", "meditation", "mindfulness", "balance"],
          messaging: "You embrace holistic wellness. Discover mind-body practices and stress relief solutions."
        },
        {
          id: "outcome-nature",
          title: "The Nature Lover",
          description: "You find wellness through outdoor activities and natural approaches.",
          tags: ["outdoor", "nature", "holistic", "natural"],
          messaging: "You thrive in nature. Explore outdoor activities and natural wellness approaches."
        },
        {
          id: "outcome-balanced",
          title: "The Balanced Enthusiast",
          description: "You seek overall wellness across all life dimensions.",
          tags: ["balance", "holistic", "lifestyle", "wellbeing"],
          messaging: "You're building sustainable wellness habits. Access integrated wellness resources."
        }
      ]
    }
  },

  {
    title: "What's Your Learning Style?",
    description: "Identify the best way for people to learn and consume content.",
    mode: "segmentation_quiz",
    category: "Segmentation",
    quiz_data: {
      title: "What's Your Learning Style?",
      description: "Help us personalize learning content for your style.",
      questions: [
        {
          id: "q1",
          text: "How do you learn best?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Through visual content (videos, diagrams)" },
            { id: "o1-b", text: "Through reading and written content" },
            { id: "o1-c", text: "Through listening (podcasts, lectures)" },
            { id: "o1-d", text: "Through hands-on practice" }
          ]
        },
        {
          id: "q2",
          text: "What's your preferred pace of learning?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Fast, get to the point" },
            { id: "o2-b", text: "Moderate, balanced detail" },
            { id: "o2-c", text: "Slow and deep, comprehensive" },
            { id: "o2-d", text: "Self-paced, flexible" }
          ]
        },
        {
          id: "q3",
          text: "Do you prefer structure or flexibility in learning?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Structured courses and curriculum" },
            { id: "o3-b", text: "Guided but flexible" },
            { id: "o3-c", text: "Self-directed exploration" },
            { id: "o3-d", text: "Mix of both" }
          ]
        },
        {
          id: "q4",
          text: "How important is community in your learning?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Very important, group learning" },
            { id: "o4-b", text: "Somewhat important" },
            { id: "o4-c", text: "Not important, I prefer solo" },
            { id: "o4-d", text: "Doesn't matter" }
          ]
        },
        {
          id: "q5",
          text: "What's your biggest learning challenge?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Staying motivated" },
            { id: "o5-b", text: "Finding time to learn" },
            { id: "o5-c", text: "Understanding complex topics" },
            { id: "o5-d", text: "Applying what I learn" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-visual",
          title: "Visual Learner",
          description: "You learn best through videos, infographics, and visual demonstrations.",
          tags: ["visual", "video", "diagrams", "interactive"],
          messaging: "We'll send you video tutorials, visual guides, and infographics."
        },
        {
          id: "outcome-reader",
          title: "Reader-Writer Learner",
          description: "You prefer reading, writing, and detailed written explanations.",
          tags: ["reading", "writing", "detailed", "articles"],
          messaging: "You'll receive in-depth articles, guides, and written resources."
        },
        {
          id: "outcome-auditory",
          title: "Auditory Learner",
          description: "You learn best through listening to lectures, podcasts, and discussions.",
          tags: ["audio", "podcast", "listening", "discussion"],
          messaging: "We'll share podcasts, audio lessons, and discussion groups."
        },
        {
          id: "outcome-kinesthetic",
          title: "Kinesthetic Learner",
          description: "You learn best by doing and hands-on practice.",
          tags: ["hands-on", "practice", "projects", "experiential"],
          messaging: "You'll get practical exercises, projects, and actionable activities."
        }
      ]
    }
  },

  {
    title: "What's Your Business Growth Stage?",
    description: "Segment businesses by their current stage and growth needs.",
    mode: "segmentation_quiz",
    category: "Segmentation",
    quiz_data: {
      title: "What's Your Business Growth Stage?",
      description: "Let us know where you are in your business journey.",
      questions: [
        {
          id: "q1",
          text: "How long has your business been operating?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "Less than 6 months (idea stage)" },
            { id: "o1-b", text: "6 months to 1 year (launch phase)" },
            { id: "o1-c", text: "1-3 years (growth phase)" },
            { id: "o1-d", text: "3+ years (mature phase)" }
          ]
        },
        {
          id: "q2",
          text: "What's your current revenue level?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Pre-revenue or under 10k/month" },
            { id: "o2-b", text: "10k-50k/month" },
            { id: "o2-c", text: "50k-250k/month" },
            { id: "o2-d", text: "250k+/month" }
          ]
        },
        {
          id: "q3",
          text: "What's your main business challenge?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "Finding product-market fit" },
            { id: "o3-b", text: "Getting initial customers" },
            { id: "o3-c", text: "Scaling and growing faster" },
            { id: "o3-d", text: "Optimizing and staying competitive" }
          ]
        },
        {
          id: "q4",
          text: "How much team do you have?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Just me" },
            { id: "o4-b", text: "Small team (2-5)" },
            { id: "o4-c", text: "Growing team (6-20)" },
            { id: "o4-d", text: "Established team (20+)" }
          ]
        },
        {
          id: "q5",
          text: "What's your growth target for next 12 months?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Achieve product-market fit" },
            { id: "o5-b", text: "3x revenue growth" },
            { id: "o5-c", text: "10x revenue growth" },
            { id: "o5-d", text: "Maintain and optimize" }
          ]
        },
        {
          id: "q6",
          text: "What support do you need most?",
          type: "single_choice",
          options: [
            { id: "o6-a", text: "Validation and guidance" },
            { id: "o6-b", text: "Customer acquisition" },
            { id: "o6-c", text: "Systems and scaling" },
            { id: "o6-d", text: "Strategic optimization" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-ideation",
          title: "Ideation Stage",
          description: "You're in the early conceptual phase of building your business.",
          tags: ["idea", "validation", "founding", "pre-launch"],
          messaging: "Focus on validating your idea and finding your first customers."
        },
        {
          id: "outcome-launch",
          title: "Launch Stage",
          description: "You're launching and getting your first customers.",
          tags: ["launch", "mvp", "early-customers", "product"],
          messaging: "Build momentum, refine your offering, and establish product-market fit."
        },
        {
          id: "outcome-growth",
          title: "Growth Stage",
          description: "You're scaling with proven product-market fit.",
          tags: ["scaling", "growth", "revenue", "expansion"],
          messaging: "Accelerate customer acquisition and optimize your operations."
        },
        {
          id: "outcome-mature",
          title: "Mature Stage",
          description: "You're an established business optimizing for efficiency and profitability.",
          tags: ["mature", "established", "profitable", "optimization"],
          messaging: "Focus on innovation, diversification, and market leadership."
        }
      ]
    }
  },

  {
    title: "What Kind of Support Do You Need?",
    description: "Identify the best support type for individual needs.",
    mode: "segmentation_quiz",
    category: "Segmentation",
    quiz_data: {
      title: "What Kind of Support Do You Need?",
      description: "Let's figure out the best way we can support you.",
      questions: [
        {
          id: "q1",
          text: "What's your biggest challenge right now?",
          type: "single_choice",
          options: [
            { id: "o1-a", text: "I don't know where to start" },
            { id: "o1-b", text: "I have a problem I need to solve" },
            { id: "o1-c", text: "I need to learn new skills" },
            { id: "o1-d", text: "I need accountability and motivation" }
          ]
        },
        {
          id: "q2",
          text: "How much time can you dedicate per week?",
          type: "single_choice",
          options: [
            { id: "o2-a", text: "Less than 2 hours" },
            { id: "o2-b", text: "2-5 hours" },
            { id: "o2-c", text: "5-10 hours" },
            { id: "o2-d", text: "10+ hours" }
          ]
        },
        {
          id: "q3",
          text: "Do you prefer one-on-one or group support?",
          type: "single_choice",
          options: [
            { id: "o3-a", text: "One-on-one personalized help" },
            { id: "o3-b", text: "Group with expert guidance" },
            { id: "o3-c", text: "Self-service with resources" },
            { id: "o3-d", text: "No preference" }
          ]
        },
        {
          id: "q4",
          text: "What's your preferred communication method?",
          type: "single_choice",
          options: [
            { id: "o4-a", text: "Synchronous (live calls, chat)" },
            { id: "o4-b", text: "Asynchronous (email, message boards)" },
            { id: "o4-c", text: "Self-directed resources (courses, docs)" },
            { id: "o4-d", text: "Mix of everything" }
          ]
        },
        {
          id: "q5",
          text: "What's your main support need?",
          type: "single_choice",
          options: [
            { id: "o5-a", text: "Strategic guidance and direction" },
            { id: "o5-b", text: "Technical implementation help" },
            { id: "o5-c", text: "Education and skill building" },
            { id: "o5-d", text: "Emotional support and motivation" }
          ]
        }
      ],
      outcomes: [
        {
          id: "outcome-coaching",
          title: "Coaching and Mentoring",
          description: "You benefit from personalized guidance and strategic direction.",
          tags: ["coaching", "mentoring", "guidance", "strategy"],
          messaging: "We'll provide one-on-one coaching sessions and personalized advice."
        },
        {
          id: "outcome-consulting",
          title: "Consulting and Problem-Solving",
          description: "You need expert help solving specific problems.",
          tags: ["consulting", "problem-solving", "expertise", "solutions"],
          messaging: "We'll provide expert consulting and tactical solutions for your challenges."
        },
        {
          id: "outcome-training",
          title: "Training and Education",
          description: "You want to build skills through structured learning.",
          tags: ["training", "education", "learning", "skills"],
          messaging: "We'll provide courses, training programs, and educational resources."
        },
        {
          id: "outcome-community",
          title: "Community and Accountability",
          description: "You thrive with group support and accountability partners.",
          tags: ["community", "accountability", "group", "support"],
          messaging: "Join our community for peer support, accountability, and group learning."
        }
      ]
    }
  }
];
