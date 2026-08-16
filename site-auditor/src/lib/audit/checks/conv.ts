/** Conversion path: can a visitor actually contact, book or buy? */

import { AuditContext, count, fail, finding, na, pass, truncate } from '../context';
import type { CheckResult } from '../types';
import { pathOf } from '../url';

/**
 * Booking, scheduling and membership platforms.
 *
 * Deliberately broad. A yoga studio selling classes through Momence, or a
 * coach taking signups through MemberSpace, has a perfectly good conversion
 * path, and telling them they have none would be both wrong and insulting.
 * A missed platform here turns into a false "you have no way to be contacted",
 * which is the most damaging mistake this tool could make.
 */
const BOOKING_HOSTS =
  /calendly\.com|acuityscheduling\.com|squarespacescheduling\.com|\.as\.me|cal\.com|meetings\.hubspot\.com|youcanbook\.me|setmore\.com|simplybook\.me|booksy\.com|vagaro\.com|mindbodyonline\.com|resy\.com|opentable\.com|zocdoc\.com|memberspace\.com|momence\.com|punchpass\.com|wellnessliving\.com|glofox\.com|marianatek\.com|arketa\.co|hellowalla\.com|bookwhen\.com|eventbrite\.|tickettailor\.com|hisawyer\.com|fresha\.com|treatwell\.|janeapp\.com|cliniko\.com|squareup\.com|square\.site|gettimely\.com|phorest\.com|shedul\.com|10to8\.com|appointlet\.com|tidycal\.com|savvycal\.com|zcal\.co|typeform\.com|jotform\.com|forms\.gle|docs\.google\.com\/forms|hubspotusercontent|tally\.so|fillout\.com/i;

const SOCIAL_PROOF_RE =
  /\b(testimonial|what (our|my) (clients|customers|guests)|client stories|case stud(y|ies)|reviews?|rated|five[- ]star|5[- ]star|trusted by|as seen (in|on)|★|⭐)\b/i;

const REVIEW_WIDGETS = /trustindex|elfsight|birdeye|trustpilot|podium|reviews\.io|yotpo|judge\.me|okendo/i;

// Widened from the original English-only, trade-specific list: a keyword
// miss here is weak evidence of absence (a software company's SOC 2 line, an
// agency's client-logo wall, a restaurant's health rating all read as trust
// markers to a visitor but matched none of the original terms), so this is
// reported as informational rather than scored — see CONV-042 below.
const TRUST_RE =
  /\b(licensed|insured|bonded|certified|accredited|member of|award[- ]winning|guarantee|money[- ]back|warranty|BBB|Better Business Bureau|DBS checked|CQC|ISO \d|SOC ?2|compliant|verified|est\.?\s?\d{4}|since \d{4}|years? (of )?experience|trusted by|as (seen|featured) (in|on)|rated|five[- ]star|5[- ]star)/i;

const PRICING_RE = /(\$|£|€)\s?\d|(\bfrom \d)|\bprices? start/i;

export function convChecks(ctx: AuditContext): CheckResult[] {
  const out: CheckResult[] = [];
  const pages = ctx.htmlPages;
  const N = Math.max(1, pages.length);
  const home = ctx.homepage;
  const allText = pages.map((p) => p.mainText).join(' ');
  const allHtml = pages.map((p) => p.url).join(' ');

  const allTel = Array.from(new Set(pages.flatMap((p) => p.telLinks)));
  const allMailto = Array.from(new Set(pages.flatMap((p) => p.mailtoLinks)));
  const allForms = pages.flatMap((p) => p.forms.map((f) => ({ ...f, page: p.url })));
  const contactForms = allForms.filter((f) => f.isContact);
  const newsletterForms = allForms.filter((f) => f.isNewsletter);

  const hasBooking =
    pages.some((p) => p.links.some((l) => l.abs && BOOKING_HOSTS.test(l.abs))) ||
    pages.some((p) => p.thirdPartyHosts.some((h) => BOOKING_HOSTS.test(h))) ||
    pages.some((p) => p.iframes.some((f) => f.src && BOOKING_HOSTS.test(f.src))) ||
    ctx.squarespace.features.scheduling;

  // A Form Block that JavaScript builds at runtime is invisible to us, but it
  // is very much visible to a visitor. Count it, and say what we could not see.
  const placeholderPages = pages.filter((p) => p.formBlockPlaceholders > 0);
  // Third-party embeds behave the same way and are just as real to a visitor.
  const embedPages = pages.filter((p) => p.embeddedFormProviders.length > 0);
  const embedProviders = Array.from(new Set(embedPages.flatMap((p) => p.embeddedFormProviders)));
  const jsFormPages = Array.from(new Set([...placeholderPages, ...embedPages]));
  const hasJsForm = jsFormPages.length > 0;
  const allTextEmails = Array.from(new Set(pages.flatMap((p) => p.textEmails)));
  const markupEmails = Array.from(new Set(pages.flatMap((p) => p.markupContacts.emails)));
  const markupPhones = Array.from(new Set(pages.flatMap((p) => p.markupContacts.phones)));
  const hasStore = ctx.squarespace.features.commerce;

  /* ---------------- is there any conversion path at all? ---------------- */
  // A booking embed counts: it is a real way to reach the business, even
  // without a form or a phone number. Claiming otherwise would be wrong.
  const hasAnyPath =
    allTel.length > 0 ||
    allMailto.length > 0 ||
    contactForms.length > 0 ||
    hasBooking ||
    hasJsForm ||
    allTextEmails.length > 0 ||
    markupEmails.length > 0 ||
    markupPhones.length > 0 ||
    hasStore;
  if (!hasAnyPath) {
    out.push(
      fail(
        finding({
          id: 'CONV-010',
          category: 'conv',
          severity: 'critical',
          title: 'There is no way for a visitor to contact you',
          detail:
            'Across every page we crawled there is no contact form, no clickable phone number and no email link. A visitor who wants to hire you has nothing to click.',
          evidence: [
            { label: 'Contact forms found', value: '0' },
            { label: 'tel: links found', value: '0' },
            { label: 'mailto: links found', value: '0' },
            { label: 'Pages checked', value: String(pages.length) },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Edit a page → add a Form Block, and add a phone number as a link with the tel: prefix in your header or footer',
          effort: 'quick',
        }),
        1
      )
    );
  } else if (
    hasBooking &&
    !hasJsForm &&
    allTel.length === 0 &&
    allMailto.length === 0 &&
    contactForms.length === 0
  ) {
    out.push(
      fail(
        finding({
          id: 'CONV-010',
          category: 'conv',
          severity: 'high',
          title: 'Booking is the only way to reach you',
          detail:
            'We found a scheduling embed but no contact form, no clickable phone number and no email address. Anyone who is not yet ready to commit to a slot in your calendar, which is most first-time visitors, has nowhere to go.',
          evidence: [
            { label: 'Booking / scheduling', value: 'found' },
            { label: 'Contact forms', value: '0' },
            { label: 'tel: links', value: '0' },
            { label: 'mailto: links', value: '0' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Edit your contact page → add a Form Block alongside the booking embed',
          effort: 'quick',
          narrative: {
            why: 'A booking link asks for a commitment. Most first-time visitors have a question before they have a decision, and right now there is nowhere to ask it.',
            action: 'Add a short contact form or a plain email address next to the booking embed, so people can ask before they book.',
            impact: 'You capture the enquiries that are real but not yet ready to pick a time slot, rather than losing them.',
          },
        }),
        1
      )
    );
  } else if (
    (markupEmails.length > 0 || markupPhones.length > 0) &&
    allTextEmails.length === 0 &&
    allTel.length === 0 &&
    allMailto.length === 0 &&
    contactForms.length === 0 &&
    !hasJsForm &&
    !hasBooking
  ) {
    out.push(
      fail(
        finding({
          id: 'CONV-010',
          category: 'conv',
          severity: 'high',
          confidence: 'unrendered',
          title: 'Your contact details exist only in the page code, not in the page',
          detail:
            'We found contact details in your site settings and structured data, but nothing in the served page links to them. On the site they are most likely an icon in the footer that JavaScript draws after load. Anything reading the page without running JavaScript, which includes several AI crawlers, sees a site with no way to make contact.',
          evidence: [
            ...(markupEmails.length ? [{ label: 'Email in markup only', value: markupEmails[0] }] : []),
            ...(markupPhones.length ? [{ label: 'Phone in markup only', value: markupPhones[0] }] : []),
            { label: 'Visible mailto or tel links', value: '0' },
            { label: 'Contact forms', value: '0' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Add a Text Block or Button to your footer with the address written out and linked, rather than relying on the social icon row alone',
          effort: 'quick',
          narrative: {
            why: 'A contact route that only exists in code is invisible to anything that reads the page as text, and it is easy for a visitor to miss too. An icon does not tell somebody what they will get when they tap it.',
            action: 'Write the email address and phone number into the page as visible, linked text, ideally in the footer so they appear on every page.',
            impact: 'Both people and machines can see how to reach you, instead of only the visitors who think to try the icon row.',
          },
        }),
        1
      )
    );
  } else if (
    allTextEmails.length > 0 &&
    allTel.length === 0 &&
    allMailto.length === 0 &&
    contactForms.length === 0 &&
    !hasJsForm &&
    !hasBooking
  ) {
    out.push(
      fail(
        finding({
          id: 'CONV-010',
          category: 'conv',
          severity: 'high',
          title: 'Your email address is written out but is not clickable',
          detail:
            'The only way to reach you is an email address printed as plain text. On a phone that cannot be tapped, it has to be copied by hand, and every step between wanting to contact you and being able to loses some of the people who wanted to.',
          evidence: [
            { label: 'Email in text', value: allTextEmails[0] },
            { label: 'mailto: links', value: '0' },
            { label: 'Contact forms', value: '0' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Highlight the address in the text editor and link it to mailto:you@example.com, or add a Form Block',
          effort: 'quick',
          narrative: {
            why: 'A visible email address is better than nothing, but on a phone it cannot be tapped. Every visitor has to memorise or copy it by hand before they can write to you.',
            action: 'Link the address as a mailto link, and add a Form Block so people can write without leaving the page.',
            impact: 'Contacting you becomes a single tap, which is what turns intent into an actual enquiry on mobile.',
          },
        }),
        1
      )
    );
  } else {
    out.push(pass('CONV-010', 'conv', 'critical', 1, 'Visitors have a clear way to get in touch'));
  }

  /* ---------------- JavaScript-rendered forms ---------------- */
  if (hasJsForm && contactForms.length === 0) {
    out.push(
      fail(
        finding({
          id: 'CONV-015',
          category: 'conv',
          severity: 'low',
          confidence: 'unrendered',
          title: 'Your contact form is built by JavaScript, so we could not inspect it',
          detail: embedProviders.length
            ? `Your form is embedded from ${embedProviders.join(' and ')} and is created in the browser rather than sent with the page. Your visitors see it normally. We mention it because search engines and AI assistants that read pages without running JavaScript cannot see it either, so make sure your email address or phone number also appears as plain text somewhere as a fallback.`
            : 'Squarespace\'s current Form Block creates the form in the browser rather than sending it in the page. Your visitors see it normally. We mention it because search engines and AI assistants that read pages without running JavaScript also cannot see it, so make sure your email address or phone number appears as plain text somewhere too, as a fallback.',
          evidence: jsFormPages.slice(0, 3).map((p) => ({
            label: pathOf(p.url),
            value: p.embeddedFormProviders.length
              ? `${p.embeddedFormProviders.join(', ')} embed, no <form> element in the served HTML`
              : `${count(p.formBlockPlaceholders, 'Squarespace Form Block placeholder')}, no <form> element in the served HTML`,
            url: p.url,
          })),
          urls: jsFormPages.map((p) => p.url),
          affected: jsFormPages.length,
          applicable: N,
          effort: 'quick',
        }),
        N
      )
    );
  }

  /* ---------------- phone ---------------- */
  const phoneInText = /(\+?\d[\d\s().-]{7,}\d)/.test(allText);
  if (allTel.length === 0) {
    out.push(
      fail(
        finding({
          id: 'CONV-001',
          category: 'conv',
          severity: phoneInText ? 'medium' : 'high',
          title: phoneInText
            ? 'Your phone number is not clickable'
            : 'No phone number appears anywhere on the site',
          detail: phoneInText
            ? 'A phone number appears as plain text but is not a tel: link, so tapping it on a phone does nothing. Most enquiries from mobile start with a tap-to-call.'
            : 'No phone number was found on any crawled page. For most service businesses, a visible phone number is the single strongest trust signal on the site.',
          evidence: [
            { label: 'tel: links', value: '0' },
            { label: 'Phone-like text found', value: phoneInText ? 'yes' : 'no' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Add a Text Block or Button, highlight the number, and link it to tel:+15551234567',
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    out.push(pass('CONV-001', 'conv', 'high', 1, 'A tap-to-call phone number is available'));
  }

  /* ---------------- form field count ---------------- */
  if (contactForms.length) {
    const bloated = contactForms.filter((f) => f.fieldCount >= 8);
    if (bloated.length) {
      out.push(
        fail(
          finding({
            id: 'CONV-011',
            category: 'conv',
            severity: 'medium',
            title: 'Your contact form asks for too much information',
            detail:
              'Every extra field measurably reduces the number of people who finish the form. Three to five fields is the sweet spot for a first enquiry; anything you genuinely need can be asked in the follow-up.',
            evidence: bloated.slice(0, 3).map((f) => ({ label: pathOf(f.page), value: `${f.fieldCount} fields`, url: f.page })),
            urls: bloated.map((f) => f.page),
            affected: bloated.length,
            applicable: contactForms.length,
            squarespacePath: 'Click the Form Block → Edit Form → remove non-essential fields',
            effort: 'quick',
          }),
          contactForms.length
        )
      );
    } else {
      out.push(pass('CONV-011', 'conv', 'medium', contactForms.length, 'Your contact form is short enough to actually get completed'));
    }
  } else {
    out.push(na('CONV-011', 'conv', 'medium'));
  }

  /* ---------------- CTA presence on homepage ---------------- */
  if (home.ctas.length === 0) {
    out.push(
      fail(
        finding({
          id: 'CONV-020',
          category: 'conv',
          severity: 'high',
          title: 'Your homepage has no call to action',
          detail:
            'We could not find a single button or link on the homepage that asks the visitor to do something, book, enquire, call, buy or get a quote. Without one, visitors browse and leave.',
          evidence: [{ label: 'Action buttons/links detected on the homepage', value: '0' }],
          urls: [home.url],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Edit your homepage → add a Button Block near the top linking to your contact or booking page',
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    const aboveFold = home.ctas.filter((c) => c.offsetPct <= 25);
    if (aboveFold.length === 0) {
      out.push(
        fail(
          finding({
            id: 'CONV-022',
            category: 'conv',
            severity: 'medium',
            title: 'Nothing asks the visitor to act until well down the homepage',
            detail:
              'The first call to action sits far down the page. Many visitors never scroll that far, particularly on a phone.',
            evidence: [
              { label: 'First call to action appears at', value: `${home.ctas[0].offsetPct}% down the page` },
              { label: 'Its wording', value: `"${truncate(home.ctas[0].text, 60)}"` },
            ],
            urls: [home.url],
            affected: 1,
            applicable: 1,
            effort: 'quick',
          }),
          1
        )
      );
    } else {
      out.push(pass('CONV-022', 'conv', 'medium', 1, 'A clear call to action appears near the top of your homepage'));
    }

    // Previously fired whenever *none* of the homepage's CTAs matched the
    // strong-verb list, and listed every CTA found as evidence — so one
    // genuinely vague button sitting alongside several fine ones still read
    // as "your buttons use vague wording" (plural, overstating the problem).
    // Now: report only the specific weak CTAs as evidence, and only fire when
    // the *primary* CTA (the one appearing first on the page) is itself weak,
    // rather than requiring zero strong CTAs among possibly several correct
    // ones (AUDIT-OF-THE-AUDIT.md, Step 3, CONV-021).
    const weakCtas = home.ctas.filter((c) => !c.strong);
    const primaryCta = [...home.ctas].sort((a, b) => a.offsetPct - b.offsetPct)[0];
    if (primaryCta && !primaryCta.strong) {
      out.push(
        fail(
          finding({
            id: 'CONV-021',
            category: 'conv',
            severity: 'medium',
            title: 'Your main call to action uses vague wording',
            detail:
              'The first button a visitor reaches, usually the one that matters most, uses generic wording like "Submit" or "Learn More" rather than naming the outcome. Wording that names the outcome, "Get a free quote", "Book a call", consistently converts better.',
            evidence: weakCtas.slice(0, 4).map((c) => ({ label: 'Button text', value: `"${truncate(c.text, 50)}"` })),
            urls: [home.url],
            affected: weakCtas.length,
            applicable: home.ctas.length,
            effort: 'quick',
          }),
          Math.max(1, home.ctas.length)
        )
      );
    } else {
      out.push(pass('CONV-021', 'conv', 'medium', Math.max(1, home.ctas.length), 'Your calls to action use clear, action-led wording'));
    }
    out.push(pass('CONV-020', 'conv', 'high', 1));
  }

  /* ---------------- social proof ---------------- */
  const hasSocialProof =
    SOCIAL_PROOF_RE.test(allText) ||
    pages.some((p) => p.thirdPartyHosts.some((h) => REVIEW_WIDGETS.test(h))) ||
    pages.some((p) => p.schemaTypes.some((t) => /Review|AggregateRating/.test(t)));
  if (!hasSocialProof) {
    out.push(
      fail(
        finding({
          id: 'CONV-040',
          category: 'conv',
          severity: 'high',
          title: 'No testimonials, reviews or client proof appear anywhere',
          detail:
            'We searched every crawled page for testimonials, review widgets and rating markup and found none. Social proof is consistently the highest-leverage addition to a small business site, visitors need evidence that someone else trusted you first.',
          evidence: [
            { label: 'Pages searched', value: String(pages.length) },
            { label: 'Testimonial / review text found', value: 'none' },
            { label: 'Review widget or rating markup', value: 'none' },
          ],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Add a Quote Block or a Testimonials section to your homepage with at least three client quotes and full names',
          effort: 'medium',
        }),
        1
      )
    );
  } else {
    out.push(pass('CONV-040', 'conv', 'high', 1, 'Testimonials or reviews are visible on the site'));
  }

  /* ---------------- booking ---------------- */
  if (hasBooking) {
    out.push(pass('CONV-030', 'conv', 'medium', 1, 'Visitors can book or schedule directly from the site'));
  } else {
    // Booking/scheduling is a normal, expected conversion path for
    // appointment-led local-service trades (salons, clinics, contractors,
    // coaches...) but not for e-commerce stores, portfolios, content sites or
    // most B2B companies — none of which are missing anything by not having a
    // booking widget. Scoring this unconditionally penalised most
    // non-appointment businesses (AUDIT-OF-THE-AUDIT.md, Step 3, CONV-030).
    // Reuse the same business-profile signal AEO-036 already gates the
    // "no location stated" check behind, rather than a second hand-rolled
    // judgement call.
    const profileForBooking = ctx.aeo?.profile;
    const appointmentLed = Boolean(
      profileForBooking &&
        !profileForBooking.isCommerce &&
        (profileForBooking.categoryConfident ||
          (profileForBooking.entityType &&
            /LocalBusiness|Store|Restaurant|Salon|Spa|Gym|Dentist|Clinic|MedicalBusiness|HealthAndBeautyBusiness|HomeAndConstructionBusiness/i.test(
              profileForBooking.entityType
            )))
    );
    if (appointmentLed) {
      out.push(
        fail(
          finding({
            id: 'CONV-030',
            category: 'conv',
            severity: 'medium',
            title: 'There is no way to book an appointment directly',
            detail:
              'No scheduling link or booking embed was found. For appointment-led businesses like yours, letting someone pick a slot themselves removes the back-and-forth that loses most enquiries.',
            evidence: [{ label: 'Scheduling providers checked', value: 'Squarespace Scheduling, Acuity, Calendly, Cal.com, HubSpot Meetings and 10 others' }],
            affected: 1,
            applicable: 1,
            squarespacePath: 'Add a Scheduling Block, or embed your booking provider with an Embed Block',
            effort: 'medium',
          }),
          1
        )
      );
    } else {
      // Not confidently an appointment-led business — the absence of a
      // booking path is not evidence of a problem here, so this check is not
      // applicable rather than firing a false positive.
      out.push(na('CONV-030', 'conv', 'medium'));
    }
  }

  /* ---------------- newsletter capture ---------------- */
  if (newsletterForms.length === 0 && hasJsForm) {
    out.push(na('CONV-014', 'conv', 'low'));
  } else if (newsletterForms.length === 0) {
    out.push(
      fail(
        finding({
          id: 'CONV-014',
          category: 'conv',
          severity: 'low',
          title: 'Nothing captures an email address from visitors who are not ready to buy',
          detail:
            'Most first-time visitors will not enquire immediately. Without a newsletter or lead-magnet signup you have no way to reach them again.',
          evidence: [{ label: 'Newsletter / signup forms found', value: '0' }],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Add a Newsletter Block, then connect it under Marketing → Email Campaigns',
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    out.push(pass('CONV-014', 'conv', 'low', 1, 'You capture email addresses from visitors'));
  }

  /* ---------------- pricing ---------------- */
  // Not publishing prices is standard, often deliberate practice for law
  // firms, healthcare providers, agencies and many B2B companies. Scoring its
  // absence as a fault treated a considered business decision as an error
  // (AUDIT-OF-THE-AUDIT.md, Step 3, CONV-032). Kept as a visible,
  // informational note — genuinely useful for the businesses where it does
  // apply — but no longer counted toward the score.
  const hasPricing = PRICING_RE.test(allText) || /\/(pricing|rates|packages|plans|menu)/i.test(allHtml);
  if (!hasPricing) {
    out.push(
      fail(
        finding({
          id: 'CONV-032',
          category: 'conv',
          severity: 'low',
          title: 'No pricing information appears anywhere on the site',
          detail:
            'Visitors who cannot find any indication of cost frequently leave to check a competitor who shows one. Even a "from" figure or a typical project range removes that friction. Note: not publishing prices is a normal, deliberate choice in several industries (law, healthcare, agencies), so treat this as worth considering rather than a defect.',
          evidence: [{ label: 'Price figures or pricing page', value: 'none found across crawled pages' }],
          affected: 1,
          applicable: 1,
          effort: 'medium',
        }),
        1,
        { unscored: true }
      )
    );
  } else {
    out.push(pass('CONV-032', 'conv', 'low', 1, 'Pricing information is available to visitors'));
  }

  /* ---------------- trust markers ---------------- */
  // A keyword miss here is weak evidence of absence — the regex is
  // English-only and trade-specific, so it systematically misses trust
  // signals phrased differently, in another language, or specific to
  // industries the list doesn't anticipate (AUDIT-OF-THE-AUDIT.md, Step 3,
  // CONV-042). Widened above, and no longer scored: still worth surfacing,
  // not confident enough to penalise.
  if (!TRUST_RE.test(allText)) {
    out.push(
      fail(
        finding({
          id: 'CONV-042',
          category: 'conv',
          severity: 'low',
          title: 'No credentials, guarantees or trust markers were found',
          detail:
            'Qualifications, insurance, memberships, awards and guarantees reassure a visitor who has never heard of you. We searched for common English phrasings of these and found none. This is a keyword search, so it can miss real trust signals phrased differently or written in another language.',
          evidence: [{ label: 'Searched for', value: 'licensed, insured, certified, accredited, member of, award-winning, guarantee, warranty, SOC 2, years of experience, and related phrasing' }],
          affected: 1,
          applicable: 1,
          effort: 'quick',
        }),
        1,
        { unscored: true }
      )
    );
  } else {
    out.push(pass('CONV-042', 'conv', 'low', 1, 'Credentials or guarantees are stated on the site'));
  }

  /* ---------------- social profiles ---------------- */
  const socialLinks = pages.flatMap((p) =>
    p.links.filter((l) => l.abs && /facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|pinterest\.|yelp\./i.test(l.abs))
  );
  if (socialLinks.length === 0) {
    out.push(
      fail(
        finding({
          id: 'CONV-045',
          category: 'conv',
          severity: 'low',
          title: 'Your site does not link to any social profiles',
          detail:
            'Links to your active profiles give visitors somewhere to check you out and give search engines a way to connect this site to the rest of your online presence.',
          evidence: [{ label: 'Social profile links found', value: '0' }],
          affected: 1,
          applicable: 1,
          squarespacePath: 'Settings → Social Links, then add a Social Links Block to your footer',
          effort: 'quick',
        }),
        1
      )
    );
  } else {
    out.push(pass('CONV-045', 'conv', 'low', 1, 'Social profiles are linked from the site'));
  }

  return out;
}
