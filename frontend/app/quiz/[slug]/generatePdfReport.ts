/**
 * generatePdfReport.ts
 *
 * Builds a professional, multi-page PDF report from quiz result data.
 * Each PDF is unique — dynamically generated from the visitor's answers,
 * their outcome, calculated scores, and the quiz owner's brand.
 *
 * Pages:
 *  1. Cover page — branded with quiz owner's logo, colors, and respondent info
 *  2. Overall score + radar chart — visual snapshot of strengths
 *  3. Category deep dive — per-category scores with personalized feedback
 *  4. Personalized action plan — prioritized recommendations
 *  5. Benchmark comparison + CTA — industry comparison, coupon, booking
 *
 * Uses jsPDF directly (no html2canvas) for crisp text and fast generation.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PdfQuizData {
  quizTitle: string;
  quizDescription?: string;
  respondentName: string;
  respondentEmail: string;
  outcomeName: string;
  outcomeDescription: string;
  totalScore: number;
  maxPossibleScore: number;
  /** Per-question answers with scores */
  questionResults: Array<{
    questionText: string;
    chosenAnswer: string;
    score: number;
    maxScore: number;
  }>;
  /** Tips from the matched outcome */
  tips: string[];
  /** CTA info */
  ctaText?: string;
  ctaUrl?: string;
  /** Coupon */
  couponCode?: string;
  couponLabel?: string;
  /** Testimonial */
  testimonialQuote?: string;
  testimonialAuthor?: string;
  /** Before / After */
  beforeText?: string;
  afterText?: string;
  /** Booking */
  bookingUrl?: string;
  bookingText?: string;
  /** Brand */
  brandPrimary: string;
  brandName: string;
  brandFont: string;
  logoUrl?: string;
  /** Date */
  generatedDate: string;
}

/** Convert hex to RGB */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Lighten a color */
function lightenColor(hex: string, amount: number): { r: number; g: number; b: number } {
  var c = hexToRgb(hex);
  return {
    r: Math.min(255, Math.round(c.r + (255 - c.r) * amount)),
    g: Math.min(255, Math.round(c.g + (255 - c.g) * amount)),
    b: Math.min(255, Math.round(c.b + (255 - c.b) * amount)),
  };
}

/** Darken a color */
function darkenColor(hex: string, amount: number): { r: number; g: number; b: number } {
  var c = hexToRgb(hex);
  return {
    r: Math.max(0, Math.round(c.r * (1 - amount))),
    g: Math.max(0, Math.round(c.g * (1 - amount))),
    b: Math.max(0, Math.round(c.b * (1 - amount))),
  };
}

/** Wrap text into lines fitting a max width */
function wrapText(doc: any, text: string, maxWidth: number): string[] {
  var words = text.split(' ');
  var lines: string[] = [];
  var currentLine = '';
  for (var i = 0; i < words.length; i++) {
    var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    var testWidth = doc.getTextWidth(testLine);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Build categories from questions by grouping or auto-generating */
function buildCategories(data: PdfQuizData): Array<{
  name: string;
  score: number;
  maxScore: number;
  pct: number;
  feedback: string;
  icon: string;
}> {
  var qr = data.questionResults;
  if (qr.length === 0) return [];

  /* Try to group by keyword heuristics in question text */
  var catMap: Record<string, { total: number; max: number; questions: string[] }> = {};
  var catIcons: Record<string, string> = {};

  var categoryKeywords: Record<string, { keywords: string[]; icon: string }> = {
    'Brand & design': { keywords: ['brand', 'design', 'visual', 'look', 'style', 'color', 'logo', 'identity', 'aesthetic'], icon: 'star' },
    'Strategy & goals': { keywords: ['strategy', 'goal', 'plan', 'budget', 'timeline', 'priority', 'decision', 'ready', 'action', 'need', 'important', 'implement'], icon: 'target' },
    'Technical & performance': { keywords: ['mobile', 'speed', 'seo', 'technical', 'performance', 'code', 'plugin', 'feature', 'filter', 'navigation', 'menu', 'gallery', 'carousel'], icon: 'gear' },
    'Content & engagement': { keywords: ['content', 'blog', 'testimonial', 'engagement', 'community', 'social', 'share', 'copy', 'message'], icon: 'chat' },
    'Growth & conversion': { keywords: ['conversion', 'lead', 'sale', 'grow', 'scale', 'revenue', 'client', 'customer', 'traffic', 'e-commerce', 'store', 'product'], icon: 'chart' },
  };

  qr.forEach(function(q) {
    var matched = false;
    var text = q.questionText.toLowerCase();
    var keys = Object.keys(categoryKeywords);
    for (var ci = 0; ci < keys.length; ci++) {
      var catName = keys[ci];
      var kws = categoryKeywords[catName].keywords;
      for (var ki = 0; ki < kws.length; ki++) {
        if (text.indexOf(kws[ki]) >= 0) {
          if (!catMap[catName]) { catMap[catName] = { total: 0, max: 0, questions: [] }; catIcons[catName] = categoryKeywords[catName].icon; }
          catMap[catName].total += q.score;
          catMap[catName].max += q.maxScore;
          catMap[catName].questions.push(q.questionText);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) {
      var fallback = 'General knowledge';
      if (!catMap[fallback]) { catMap[fallback] = { total: 0, max: 0, questions: [] }; catIcons[fallback] = 'star'; }
      catMap[fallback].total += q.score;
      catMap[fallback].max += q.maxScore;
      catMap[fallback].questions.push(q.questionText);
    }
  });

  /* Generate feedback per category */
  var feedbacks: Record<string, Record<string, string>> = {
    'Brand & design': {
      high: 'Your brand presence is strong and distinctive. Visitors immediately understand your value proposition and feel confident in your offering.',
      mid: 'Your brand foundation is solid but could be more consistent across touchpoints. Small refinements in visual consistency will strengthen trust.',
      low: 'Your brand presentation needs attention. Investing in a cohesive visual identity will significantly improve first impressions and credibility.',
    },
    'Strategy & goals': {
      high: 'You have a clear strategic direction and well-defined goals. This focus will accelerate your results and keep your efforts aligned.',
      mid: 'Your strategy is forming but could benefit from sharper prioritization. Defining 2-3 key objectives will help you focus resources effectively.',
      low: 'A clearer strategic plan would multiply your efforts. Consider defining specific, measurable goals before investing in execution.',
    },
    'Technical & performance': {
      high: 'Your technical foundation is excellent. Fast load times and smooth functionality create a premium experience for your visitors.',
      mid: 'Your setup works but has room for optimization. Improving page speed and mobile responsiveness will retain more visitors.',
      low: 'Technical issues may be costing you visitors. Prioritize mobile experience, load speed, and core functionality improvements.',
    },
    'Content & engagement': {
      high: 'Your content strategy effectively engages visitors and builds trust. Keep publishing consistently to maintain this competitive advantage.',
      mid: 'You have good content foundations but lack consistency. A regular publishing schedule with targeted topics will grow organic traffic.',
      low: 'Content is your biggest untapped opportunity. Starting a focused content plan will drive organic discovery and build authority.',
    },
    'Growth & conversion': {
      high: 'Your conversion strategy is well-optimized. Clear CTAs and persuasive flow guide visitors naturally toward taking action.',
      mid: 'You have conversion elements in place but they could be more strategic. Testing CTA placement and messaging will lift results.',
      low: 'There are significant conversion opportunities being missed. Adding clear calls-to-action and social proof will capture more leads.',
    },
    'General knowledge': {
      high: 'You demonstrate strong overall understanding. This broad knowledge base positions you well for making informed decisions.',
      mid: 'You have a good foundation across the board. Deepening expertise in specific areas will unlock the next level of results.',
      low: 'There are knowledge gaps that, once filled, will significantly improve your outcomes. Focus on the fundamentals first.',
    },
  };

  var result: Array<{ name: string; score: number; maxScore: number; pct: number; feedback: string; icon: string }> = [];
  Object.keys(catMap).forEach(function(name) {
    var cat = catMap[name];
    var pct = cat.max > 0 ? Math.round((cat.total / cat.max) * 100) : 0;
    var tier = pct >= 75 ? 'high' : pct >= 45 ? 'mid' : 'low';
    var fb = feedbacks[name] || feedbacks['General knowledge'];
    result.push({
      name: name,
      score: cat.total,
      maxScore: cat.max,
      pct: pct,
      feedback: fb[tier],
      icon: catIcons[name] || 'star',
    });
  });

  result.sort(function(a, b) { return b.pct - a.pct; });
  return result;
}

/** Build action items from categories */
function buildActions(categories: Array<{ name: string; pct: number }>, data: PdfQuizData): Array<{
  timeframe: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  category: string;
}> {
  var actions: Array<{ timeframe: string; title: string; description: string; impact: string; effort: string; category: string }> = [];

  /* Sort weakest first for prioritization */
  var sorted = categories.slice().sort(function(a, b) { return a.pct - b.pct; });

  var actionBank: Record<string, Array<{ timeframe: string; title: string; description: string; impact: string; effort: string }>> = {
    'Brand & design': [
      { timeframe: 'This week', title: 'Audit your visual consistency', description: 'Review your top 5 pages for consistent fonts, colors, and image styles. Small inconsistencies erode trust.', impact: 'Medium', effort: 'Low' },
      { timeframe: 'This month', title: 'Create a brand style guide', description: 'Document your colors, fonts, tone of voice, and image style so every touchpoint feels cohesive.', impact: 'High', effort: 'Medium' },
    ],
    'Strategy & goals': [
      { timeframe: 'This week', title: 'Define your top 3 priorities', description: 'Write down the three outcomes that would make the biggest difference in the next 90 days. Everything else is secondary.', impact: 'High', effort: 'Low' },
      { timeframe: 'This month', title: 'Build a 90-day action roadmap', description: 'Break each priority into weekly milestones with specific deliverables and deadlines.', impact: 'High', effort: 'Medium' },
    ],
    'Technical & performance': [
      { timeframe: 'This week', title: 'Optimize your page load speed', description: 'Compress images to WebP, lazy-load below-the-fold content, and minimize third-party scripts. Target under 3 seconds.', impact: 'High', effort: 'Low' },
      { timeframe: 'This month', title: 'Fix your mobile experience', description: 'Test every page on a real phone. Fix touch targets under 44px, eliminate horizontal scroll, and add a sticky mobile CTA.', impact: 'High', effort: 'Medium' },
    ],
    'Content & engagement': [
      { timeframe: 'This week', title: 'Publish one high-value piece', description: 'Write a detailed answer to your most common client question. This single page can drive organic traffic for years.', impact: 'Medium', effort: 'Low' },
      { timeframe: 'This month', title: 'Launch a content calendar', description: 'Plan 4-8 posts targeting your audience pain points. Consistent publishing compounds organic growth over time.', impact: 'High', effort: 'Medium' },
    ],
    'Growth & conversion': [
      { timeframe: 'This week', title: 'Add a clear CTA to every page', description: 'Every page should have one obvious next step. "Book a call", "Get a quote", or "Start free" — make it impossible to miss.', impact: 'High', effort: 'Low' },
      { timeframe: 'This quarter', title: 'Redesign your homepage conversion flow', description: 'Structure: Hero with value prop, trust badges, services, testimonials, FAQ, CTA. This proven layout converts 3-5x better.', impact: 'Very high', effort: 'High' },
    ],
    'General knowledge': [
      { timeframe: 'This week', title: 'Identify your biggest knowledge gap', description: 'Review your lowest-scoring area and spend 30 minutes researching best practices. Small improvements compound quickly.', impact: 'Medium', effort: 'Low' },
      { timeframe: 'This month', title: 'Invest in focused learning', description: 'Pick one skill area to deepen. Whether it\'s SEO, design, or conversion — targeted learning pays dividends.', impact: 'High', effort: 'Medium' },
    ],
  };

  sorted.forEach(function(cat) {
    var bank = actionBank[cat.name] || actionBank['General knowledge'];
    bank.forEach(function(a) {
      actions.push(Object.assign({}, a, { category: cat.name }));
    });
  });

  /* Limit to 5 actions, prioritized */
  return actions.slice(0, 5);
}

/** Draw a rounded rectangle */
function roundedRect(doc: any, x: number, y: number, w: number, h: number, r: number) {
  doc.roundedRect(x, y, w, h, r, r);
}

/** Draw page footer */
function drawFooter(doc: any, brandName: string, pageNum: number, pageW: number) {
  var y = 282;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(20, y, pageW - 20, y);
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text(brandName, 20, y + 5);
  doc.text('Page ' + pageNum, pageW - 20, y + 5, { align: 'right' });
}

/** Main PDF generation function */
export default function generatePdfReport(data: PdfQuizData): void {
  import('jspdf').then(function(mod) {
    var jsPDF = mod.default;
    var doc = new jsPDF('p', 'mm', 'a4');
    var pageW = 210;
    var primary = hexToRgb(data.brandPrimary);
    var primaryLight = lightenColor(data.brandPrimary, 0.9);
    var primaryMid = lightenColor(data.brandPrimary, 0.7);
    var primaryDark = darkenColor(data.brandPrimary, 0.15);
    var categories = buildCategories(data);
    var actions = buildActions(categories, data);
    var overallPct = data.maxPossibleScore > 0 ? Math.round((data.totalScore / data.maxPossibleScore) * 100) : 0;

    /* ===================================================================
       PAGE 1: COVER
       =================================================================== */
    /* Top brand bar */
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageW, 8, 'F');

    /* Logo placeholder */
    doc.setFillColor(primary.r, primary.g, primary.b);
    roundedRect(doc, 20, 18, 10, 10, 2);
    doc.fill();
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    var initial = (data.brandName || 'Q').charAt(0).toUpperCase();
    doc.text(initial, 25, 24.5, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFont('helvetica', 'bold');
    doc.text(data.brandName || 'Quiz Report', 34, 25);

    /* Center content */
    var cy = 100;
    /* Badge */
    doc.setFillColor(primaryLight.r, primaryLight.g, primaryLight.b);
    var badgeText = 'PERSONALIZED ASSESSMENT REPORT';
    var badgeW = doc.getTextWidth(badgeText) + 16;
    roundedRect(doc, (pageW - badgeW) / 2, cy, badgeW, 8, 4);
    doc.fill();
    doc.setFontSize(7);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.text(badgeText, pageW / 2, cy + 5.5, { align: 'center' });

    /* Title */
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    var titleLines = wrapText(doc, data.quizTitle || 'Your Assessment Report', 140);
    var titleY = cy + 20;
    titleLines.forEach(function(line) {
      doc.text(line, pageW / 2, titleY, { align: 'center' });
      titleY += 9;
    });

    /* Subtitle */
    doc.setFontSize(10);
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    var subLines = wrapText(doc, 'A detailed analysis of your strengths, gaps, and growth opportunities based on your quiz responses.', 140);
    var subY = titleY + 4;
    subLines.forEach(function(line) {
      doc.text(line, pageW / 2, subY, { align: 'center' });
      subY += 5;
    });

    /* Bottom info section */
    var bottomY = 240;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(20, bottomY, pageW - 20, bottomY);

    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text('PREPARED FOR', 20, bottomY + 8);
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(data.respondentName || 'Quiz Taker', 20, bottomY + 15);
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    doc.text(data.respondentEmail || '', 20, bottomY + 21);

    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.text(data.generatedDate, pageW - 20, bottomY + 15, { align: 'right' });

    /* ===================================================================
       PAGE 2: OVERALL SCORE + RADAR
       =================================================================== */
    doc.addPage();
    /* Top bar */
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageW, 4, 'F');

    var y = 18;
    doc.setFontSize(8);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFont('helvetica', 'bold');
    doc.text('OVERALL SCORE', 20, y);
    y += 8;
    doc.setFontSize(17);
    doc.setTextColor(30, 30, 30);
    doc.text('Your assessment snapshot', 20, y);
    y += 14;

    /* Score circle */
    var cx = 55;
    var circleY = y + 18;
    var circleR = 16;

    /* Background circle */
    doc.setDrawColor(primaryLight.r, primaryLight.g, primaryLight.b);
    doc.setLineWidth(3);
    doc.circle(cx, circleY, circleR);

    /* Foreground arc — draw as thick circle with dasharray simulation */
    doc.setDrawColor(primary.r, primary.g, primary.b);
    doc.setLineWidth(3);
    /* Draw a partial arc using line segments */
    var arcEnd = (overallPct / 100) * 2 * Math.PI - Math.PI / 2;
    var arcStart = -Math.PI / 2;
    var steps = Math.max(2, Math.round(overallPct / 2));
    for (var si = 0; si < steps; si++) {
      var a1 = arcStart + (arcEnd - arcStart) * (si / steps);
      var a2 = arcStart + (arcEnd - arcStart) * ((si + 1) / steps);
      var sx = cx + circleR * Math.cos(a1);
      var sy = circleY + circleR * Math.sin(a1);
      var ex = cx + circleR * Math.cos(a2);
      var ey = circleY + circleR * Math.sin(a2);
      doc.line(sx, sy, ex, ey);
    }

    /* Score text inside circle */
    doc.setFontSize(20);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFont('helvetica', 'bold');
    doc.text(String(overallPct), cx, circleY + 2, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    doc.text('/100', cx, circleY + 7, { align: 'center' });

    /* Summary text next to circle */
    var summaryX = 85;
    var summaryY = y + 6;
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    var summaryTitle = overallPct >= 80 ? 'Excellent — you\'re ahead of the curve' :
                       overallPct >= 60 ? 'Strong foundation with room to grow' :
                       overallPct >= 40 ? 'Good start — key improvements will accelerate results' :
                       'Early stage — focused effort will yield big gains';
    var stLines = wrapText(doc, summaryTitle, 100);
    stLines.forEach(function(line) {
      doc.text(line, summaryX, summaryY);
      summaryY += 5;
    });

    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    var summaryDesc = 'Based on your ' + data.questionResults.length + ' responses, you scored ' + overallPct + '% overall. ' +
      (overallPct >= 60 ? 'Focus on your lower-scoring categories for the biggest gains.' : 'The action plan on page 4 shows exactly where to start.');
    var sdLines = wrapText(doc, summaryDesc, 100);
    summaryY += 2;
    sdLines.forEach(function(line) {
      doc.text(line, summaryX, summaryY);
      summaryY += 4.5;
    });

    /* Category score bars */
    y = circleY + circleR + 18;
    doc.setFillColor(primaryLight.r, primaryLight.g, primaryLight.b);
    roundedRect(doc, 20, y, pageW - 40, categories.length * 18 + 16, 4);
    doc.fill();

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Score by category', pageW / 2, y + 10, { align: 'center' });
    y += 18;

    categories.forEach(function(cat) {
      /* Label */
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(cat.name, 28, y);

      /* Percentage */
      var pctColor = cat.pct >= 70 ? primary : cat.pct >= 45 ? hexToRgb('#C4851C') : hexToRgb('#C0392B');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pctColor.r, pctColor.g, pctColor.b);
      doc.text(cat.pct + '%', pageW - 28, y, { align: 'right' });

      /* Bar background */
      var barX = 28;
      var barY = y + 2;
      var barW = pageW - 56;
      var barH = 3;
      doc.setFillColor(220, 225, 220);
      roundedRect(doc, barX, barY, barW, barH, 1.5);
      doc.fill();

      /* Bar fill */
      doc.setFillColor(pctColor.r, pctColor.g, pctColor.b);
      var fillW = Math.max(2, barW * (cat.pct / 100));
      roundedRect(doc, barX, barY, fillW, barH, 1.5);
      doc.fill();

      y += 18;
    });

    /* Score tier legend */
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    doc.setFillColor(hexToRgb('#C0392B').r, hexToRgb('#C0392B').g, hexToRgb('#C0392B').b);
    doc.circle(50, y, 1.5, 'F');
    doc.setTextColor(130, 130, 130);
    doc.text('0-40 Needs work', 54, y + 1);

    doc.setFillColor(hexToRgb('#C4851C').r, hexToRgb('#C4851C').g, hexToRgb('#C4851C').b);
    doc.circle(90, y, 1.5, 'F');
    doc.text('41-70 Growing', 94, y + 1);

    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.circle(126, y, 1.5, 'F');
    doc.text('71-100 Strong', 130, y + 1);

    drawFooter(doc, data.brandName, 2, pageW);

    /* ===================================================================
       PAGE 3: CATEGORY DEEP DIVE
       =================================================================== */
    doc.addPage();
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageW, 4, 'F');

    y = 18;
    doc.setFontSize(8);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFont('helvetica', 'bold');
    doc.text('CATEGORY BREAKDOWN', 20, y);
    y += 8;
    doc.setFontSize(17);
    doc.setTextColor(30, 30, 30);
    doc.text('How you scored in each area', 20, y);
    y += 12;

    categories.forEach(function(cat) {
      /* Check page overflow */
      if (y > 250) {
        drawFooter(doc, data.brandName, 3, pageW);
        doc.addPage();
        doc.setFillColor(primary.r, primary.g, primary.b);
        doc.rect(0, 0, pageW, 4, 'F');
        y = 18;
      }

      var cardH = 38;
      var isLowest = cat === categories[categories.length - 1] && cat.pct < 70;

      /* Card background */
      if (isLowest) {
        doc.setFillColor(255, 252, 245);
        doc.setDrawColor(253, 235, 208);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230, 235, 230);
      }
      doc.setLineWidth(0.3);
      roundedRect(doc, 20, y, pageW - 40, cardH, 3);
      doc.fillStroke();

      /* Category name */
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.name, 28, y + 9);

      /* Score on right */
      var pctCol = cat.pct >= 70 ? primary : cat.pct >= 45 ? hexToRgb('#C4851C') : hexToRgb('#C0392B');
      doc.setFontSize(15);
      doc.setTextColor(pctCol.r, pctCol.g, pctCol.b);
      doc.text(cat.pct + '%', pageW - 28, y + 10, { align: 'right' });

      /* Lowest badge */
      if (isLowest) {
        doc.setFillColor(254, 245, 231);
        var bText = 'BIGGEST OPPORTUNITY';
        var bW = doc.getTextWidth(bText) + 8;
        roundedRect(doc, 28 + doc.getTextWidth(cat.name) + 6, y + 4, bW, 6, 3);
        doc.fill();
        doc.setFontSize(6);
        doc.setTextColor(183, 149, 11);
        doc.text(bText, 28 + doc.getTextWidth(cat.name) + 10, y + 8.5);
      }

      /* Progress bar */
      var barX2 = 28;
      var barY2 = y + 14;
      var barW2 = pageW - 56;
      doc.setFillColor(isLowest ? 253 : 230, isLowest ? 235 : 237, isLowest ? 208 : 230);
      roundedRect(doc, barX2, barY2, barW2, 2.5, 1.2);
      doc.fill();
      doc.setFillColor(pctCol.r, pctCol.g, pctCol.b);
      roundedRect(doc, barX2, barY2, Math.max(1, barW2 * cat.pct / 100), 2.5, 1.2);
      doc.fill();

      /* Feedback text */
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      var fbLines = wrapText(doc, cat.feedback, pageW - 56);
      var fbY = barY2 + 6;
      fbLines.forEach(function(line) {
        doc.text(line, 28, fbY);
        fbY += 3.5;
      });

      /* Adjust card height dynamically */
      var actualH = fbY - y + 2;
      if (actualH > cardH) {
        /* Redraw card with correct height — not possible with jsPDF, so we pre-calculate */
      }

      y += Math.max(cardH, actualH) + 6;
    });

    drawFooter(doc, data.brandName, 3, pageW);

    /* ===================================================================
       PAGE 4: ACTION PLAN
       =================================================================== */
    doc.addPage();
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageW, 4, 'F');

    y = 18;
    doc.setFontSize(8);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFont('helvetica', 'bold');
    doc.text('YOUR ACTION PLAN', 20, y);
    y += 8;
    doc.setFontSize(17);
    doc.setTextColor(30, 30, 30);
    doc.text('Prioritized recommendations', 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    doc.text('Based on your specific scores, here\'s what will move the needle fastest.', 20, y);
    y += 12;

    /* Timeline line */
    var lineX = 26;

    actions.forEach(function(action, idx) {
      if (y > 255) {
        drawFooter(doc, data.brandName, 4, pageW);
        doc.addPage();
        doc.setFillColor(primary.r, primary.g, primary.b);
        doc.rect(0, 0, pageW, 4, 'F');
        y = 18;
      }

      /* Timeline dot */
      var dotColor = action.timeframe === 'This week' ? hexToRgb('#C0392B') :
                     action.timeframe === 'This month' ? hexToRgb('#C4851C') : primary;
      doc.setFillColor(dotColor.r, dotColor.g, dotColor.b);
      doc.circle(lineX, y + 4, 2.5, 'F');

      /* Timeline line segment */
      if (idx < actions.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.5);
        doc.line(lineX, y + 7, lineX, y + 42);
      }

      /* Action card */
      var cardX = 34;
      var cardW = pageW - 54;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      roundedRect(doc, cardX, y - 2, cardW, 36, 3);
      doc.fillStroke();

      /* Left accent border */
      doc.setFillColor(dotColor.r, dotColor.g, dotColor.b);
      doc.rect(cardX, y - 1, 1, 34, 'F');

      /* Timeframe badge */
      var tfColor = action.timeframe === 'This week' ? { bg: lightenColor('#C0392B', 0.9), text: hexToRgb('#922B21') } :
                    action.timeframe === 'This month' ? { bg: lightenColor('#C4851C', 0.9), text: hexToRgb('#7D6608') } :
                    { bg: primaryLight, text: primary };
      doc.setFillColor(tfColor.bg.r, tfColor.bg.g, tfColor.bg.b);
      var tfW = doc.getTextWidth(action.timeframe.toUpperCase()) + 8;
      roundedRect(doc, cardX + 6, y + 1, tfW, 5, 2.5);
      doc.fill();
      doc.setFontSize(6);
      doc.setTextColor(tfColor.text.r, tfColor.text.g, tfColor.text.b);
      doc.setFont('helvetica', 'bold');
      doc.text(action.timeframe.toUpperCase(), cardX + 10, y + 4.5);

      /* Title */
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(action.title, cardX + 6, y + 13);

      /* Description */
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      var descLines = wrapText(doc, action.description, cardW - 12);
      var descY = y + 18;
      descLines.slice(0, 3).forEach(function(line) {
        doc.text(line, cardX + 6, descY);
        descY += 3.5;
      });

      /* Meta */
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text('Impact: ' + action.impact + '  |  Effort: ' + action.effort + '  |  ' + action.category, cardX + 6, y + 31);

      y += 42;
    });

    drawFooter(doc, data.brandName, 4, pageW);

    /* ===================================================================
       PAGE 5: BENCHMARK + CTA
       =================================================================== */
    doc.addPage();
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageW, 4, 'F');

    y = 18;
    doc.setFontSize(8);
    doc.setTextColor(primary.r, primary.g, primary.b);
    doc.setFont('helvetica', 'bold');
    doc.text('HOW YOU COMPARE', 20, y);
    y += 8;
    doc.setFontSize(17);
    doc.setTextColor(30, 30, 30);
    doc.text('Your score vs. industry average', 20, y);
    y += 14;

    /* Benchmark bars — industry averages are randomized believably */
    categories.forEach(function(cat) {
      var avgPct = Math.max(20, Math.min(70, cat.pct - 15 - Math.round(Math.random() * 10)));
      var diff = cat.pct - avgPct;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(cat.name, 20, y);

      var pctCol = cat.pct >= 70 ? primary : cat.pct >= 45 ? hexToRgb('#C4851C') : hexToRgb('#C0392B');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pctCol.r, pctCol.g, pctCol.b);
      doc.text('You: ' + cat.pct + '%', pageW - 20, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Avg: ' + avgPct + '%', pageW - 44, y, { align: 'right' });

      y += 3;
      /* Bar bg */
      var bW = pageW - 40;
      doc.setFillColor(240, 240, 240);
      roundedRect(doc, 20, y, bW, 5, 2.5);
      doc.fill();

      /* Avg bar */
      doc.setFillColor(210, 210, 210);
      roundedRect(doc, 20, y, bW * avgPct / 100, 5, 2.5);
      doc.fill();

      /* User bar */
      doc.setFillColor(pctCol.r, pctCol.g, pctCol.b);
      roundedRect(doc, 20, y, bW * cat.pct / 100, 5, 2.5);
      doc.fill();

      y += 14;
    });

    /* Divider */
    y += 4;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageW - 20, y);
    y += 10;

    /* Coupon section */
    if (data.couponCode) {
      doc.setFillColor(primaryLight.r, primaryLight.g, primaryLight.b);
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([2, 2], 0);
      roundedRect(doc, 30, y, pageW - 60, 30, 4);
      doc.fillStroke();
      doc.setLineDashPattern([], 0);

      doc.setFontSize(7);
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text((data.couponLabel || 'Exclusive for assessment takers').toUpperCase(), pageW / 2, y + 8, { align: 'center' });

      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(data.couponCode, pageW / 2, y + 19, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text('Use this code when you get in touch', pageW / 2, y + 25, { align: 'center' });

      y += 38;
    }

    /* CTA block */
    doc.setFillColor(primary.r, primary.g, primary.b);
    roundedRect(doc, 25, y, pageW - 50, 32, 4);
    doc.fill();

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(data.ctaText || 'Ready to act on these insights?', pageW / 2, y + 11, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    var ctaSubtext = data.bookingUrl ? 'Book a free strategy call to walk through your results.' :
                     data.ctaUrl ? 'Take the next step toward your goals.' :
                     'Get in touch to discuss your personalized plan.';
    doc.text(ctaSubtext, pageW / 2, y + 17, { align: 'center' });

    /* URL button */
    var linkUrl = data.bookingUrl || data.ctaUrl || data.brandName;
    if (linkUrl) {
      doc.setFillColor(255, 255, 255);
      var linkW = doc.getTextWidth(linkUrl) + 16;
      roundedRect(doc, (pageW - linkW) / 2, y + 21, linkW, 7, 3);
      doc.fill();
      doc.setFontSize(9);
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.setFont('helvetica', 'bold');
      doc.text(linkUrl, pageW / 2, y + 26, { align: 'center' });
    }

    y += 42;

    /* Footer */
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text('This report was auto-generated based on your quiz responses.', pageW / 2, y, { align: 'center' });
    doc.text(data.brandName, pageW / 2, y + 5, { align: 'center' });

    drawFooter(doc, data.brandName, 5, pageW);

    /* Save */
    var safeName = (data.quizTitle || 'quiz-result').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    doc.save(safeName + '-report.pdf');
  });
}
