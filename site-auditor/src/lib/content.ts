/**
 * The written content of the site, in one place.
 *
 * Everything here is answer-first: a question somebody actually types, then the
 * answer in the first sentence, then the detail. That shape is what a featured
 * snippet quotes, what an AI assistant can lift without rewriting, and what a
 * reader in a hurry needs, which happen to be the same thing.
 *
 * It lives in a module rather than in the pages because three surfaces use it:
 * the page itself, the structured data that describes the page, and the sitemap
 * that lists it. Copy that exists twice drifts.
 *
 * Every claim here has to be something the audit engine actually measures. A
 * page explaining a check we do not run would be the same fabrication the audit
 * exists to find on other people's sites.
 */

import type { CategoryId } from './audit/types';

export interface Answer {
  /** The question, phrased the way somebody would ask it. */
  q: string;
  /** The answer. First sentence answers it outright. */
  a: string;
}

/* ------------------------------------------------------------------ *
 * What each audit category means
 * ------------------------------------------------------------------ */

export const CATEGORY_EXPLAINER: Record<CategoryId, { heading: string; body: string }> = {
  tech: {
    heading: 'Technical SEO',
    body: 'Whether a search engine can reach, read and index your pages at all. This covers robots.txt, your sitemap, canonical addresses, redirects, HTTP status codes, pages accidentally marked noindex and broken internal links. Nothing else in a report matters if a page cannot be indexed, so this is scored first and weighted highest.',
  },
  onpage: {
    heading: 'On-Page SEO',
    body: 'What each page says it is about. Titles, meta descriptions, heading structure, internal linking and content depth. A Squarespace page with no SEO title falls back to the site name, which is why sites built quickly often show the same headline on every result.',
  },
  perf: {
    heading: 'Performance',
    body: 'How much work a browser has to do to show your page. Measured from your real responses: page weight, image sizes, render-blocking scripts, caching headers and server response time. Where Google has field data for your site, the report shows that too, because real visitor timings beat any simulation.',
  },
  aeo: {
    heading: 'AI search readiness',
    body: 'Whether ChatGPT, Claude, Perplexity and Google AI Overviews can reach your pages and find an answer worth citing. That means bot access rules, content that answers questions in plain sentences rather than implying answers, and the questions your own services raise that no page on the site answers.',
  },
  conv: {
    heading: 'Conversion',
    body: 'Whether a visitor who wants to hire or buy from you can actually do it. Contact forms, a visible phone number, tap-to-call on mobile, calls to action, pricing signals, booking links and trust markers. A site that ranks and converts nobody has an expensive problem.',
  },
  sqs: {
    heading: 'Squarespace setup',
    body: 'Configuration faults specific to the platform: 7.0 versus 7.1, Fluid Engine coverage, the duplicate /home address, pages left in Not Linked, default SEO titles, auto-generated URL slugs, category and tag archives in the sitemap, the default favicon and a site still on a squarespace.com address.',
  },
  schema: {
    heading: 'Structured data',
    body: 'The machine-readable description of your business, products and articles that powers rich results and knowledge panels. Squarespace emits some of this automatically and leaves the rest to you, which is why so many Squarespace sites have a website but no organisation, no local business and no product markup.',
  },
  a11y: {
    heading: 'Accessibility',
    body: 'Machine-checkable WCAG 2.2 AA issues in your markup: missing alt text, unlabelled form fields, skipped heading levels, link text that says nothing and images used as text. Automated checks find a meaningful share of real barriers, and none of them replace testing with actual assistive technology.',
  },
  sec: {
    heading: 'Security and privacy',
    body: 'HTTPS and certificate health, response headers, third-party trackers, cookie consent and whether a privacy policy exists for the tracking the site actually runs. Squarespace controls most response headers, so anything platform-locked is reported and not counted against your score.',
  },
  mobile: {
    heading: 'Mobile',
    body: 'Viewport configuration, zoom blocking and responsive layout signals read from the markup. Most Squarespace templates are responsive by default, so this section is usually short, and worth reading when it is not.',
  },
  social: {
    heading: 'Social sharing',
    body: 'What your link looks like when somebody pastes it into a message, a post or a chat: Open Graph title, description and image, and Twitter card markup. A missing share image is the difference between a link that looks like a business and one that looks like a spam URL.',
  },
};

/* ------------------------------------------------------------------ *
 * The faults we find most often on Squarespace sites
 * ------------------------------------------------------------------ */

export interface CommonIssue {
  slug: string;
  title: string;
  /** The question somebody would search for. */
  q: string;
  /** What it is and why it costs you. */
  a: string;
  /** The exact path in Squarespace. */
  fix: string;
}

export const COMMON_ISSUES: CommonIssue[] = [
  {
    slug: 'duplicate-home-page',
    title: 'Your homepage answers at two addresses',
    q: 'Why does my Squarespace site have a /home page as well as a homepage?',
    a: 'Squarespace serves the homepage at both your root address and at /home, so the same content sits at two URLs. Search engines treat those as two pages and split the signals each one collects, and the /home version is the one that tends to get linked internally by accident.',
    fix: 'Add a redirect from /home to / under Settings, then Developer Tools, then URL Mappings.',
  },
  {
    slug: 'default-seo-titles',
    title: 'Several pages share the site name as their title',
    q: 'Why do all my Squarespace pages have the same title in Google?',
    a: 'When the SEO title field on a page is left blank, Squarespace falls back to the site name. Leave it blank on six pages and six search results carry the same headline, so nothing tells a searcher which one answers their question.',
    fix: 'Set an SEO title for each page under page settings, then SEO. Describe that page, not the business.',
  },
  {
    slug: 'auto-generated-urls',
    title: 'Page addresses full of random characters',
    q: 'How do I fix Squarespace URLs with random letters and numbers?',
    a: 'Duplicated pages get an auto-generated slug such as /services-copy-a1b2c3. Those addresses appear in search results and in every shared link, and they usually mean the page was duplicated and then forgotten rather than deliberately published.',
    fix: 'Edit the URL slug under page settings, then General, and add a URL mapping from the old address if it has been shared.',
  },
  {
    slug: 'not-linked-pages',
    title: 'Pages stranded in Not Linked',
    q: 'Do Squarespace Not Linked pages show up in Google?',
    a: 'Yes. Not Linked only removes a page from your navigation, it does not hide it from search engines, and Squarespace still lists those pages in your sitemap. Old drafts, superseded landing pages and duplicate services pages sit there and compete with the pages you actually promote.',
    fix: 'Delete what is finished with, and set anything you need to keep but not rank to noindex under its SEO settings.',
  },
  {
    slug: 'hidden-from-search',
    title: 'A page is hidden from search engines',
    q: 'What does hide this page from search engines do in Squarespace?',
    a: 'It adds a noindex instruction, which removes the page from search results entirely, however good the content is. It is the single most expensive setting on the platform when it is left on by mistake, usually after a site launch or a staging page that was never switched back.',
    fix: 'Open page settings, then SEO, and clear "Hide this page from search engines".',
  },
  {
    slug: 'missing-meta-descriptions',
    title: 'Pages with no meta description',
    q: 'Do meta descriptions matter for Squarespace SEO?',
    a: 'They do not rank a page, and they decide whether anybody clicks it. With the field blank, Google writes its own summary from whatever text it finds first, which on a Squarespace page is often a navigation label or a cookie notice.',
    fix: 'Write a description under page settings, then SEO, in around 150 characters, describing what the visitor gets.',
  },
  {
    slug: 'no-h1',
    title: 'Pages with no H1 heading',
    q: 'Why does my Squarespace page have no H1?',
    a: 'Squarespace pages end up with no H1 when the top section uses styled text or an image rather than a heading block. The H1 is one of the strongest on-page signals of what a page is about, for search engines and for the AI systems that summarise pages.',
    fix: 'Select the main heading text and set it to Heading 1 in the text toolbar. One per page.',
  },
  {
    slug: 'oversized-images',
    title: 'Images far larger than they are displayed',
    q: 'What size should images be on Squarespace?',
    a: 'Squarespace resizes uploads, and it starts from what you gave it, so a 6 MB camera file still costs your visitors more than a 300 KB export of the same picture. Image weight is the most common cause of a slow Squarespace page by a wide margin.',
    fix: 'Export at around 2500 pixels on the long edge for full-width images, smaller for everything else, and re-upload the heaviest offenders first.',
  },
  {
    slug: 'category-archive-bloat',
    title: 'Tag and category archives in your sitemap',
    q: 'Should I noindex Squarespace category and tag pages?',
    a: 'Usually yes. Squarespace lists every category and tag archive in your sitemap, and those pages rarely carry unique content, so they compete with your real pages for crawl attention. The exception is an archive you genuinely use as a landing page.',
    fix: 'Set the archives you do not need to noindex, and keep the ones that earn their place.',
  },
  {
    slug: 'no-phone-number',
    title: 'No phone number anywhere on the site',
    q: 'Does a phone number affect Squarespace SEO?',
    a: 'It affects enquiries more than rankings. For a service business a visible phone number is the strongest trust signal on the page, and on mobile a number that is not a tap-to-call link asks the visitor to copy it out by hand. It also feeds local structured data.',
    fix: 'Add the number to the header or footer so it appears on every page, and link it as tel: so mobile visitors can tap it.',
  },
  {
    slug: 'no-answers-to-questions',
    title: 'Nothing on the site answers what you charge',
    q: 'Why does ChatGPT not recommend my Squarespace site?',
    a: 'Assistants cite pages that answer a question in plain sentences. Most service sites describe what they do and never state a price, a timeline, a service area or a policy, so there is nothing for an assistant to quote. The audit builds the questions from your own services and checks each one against every page it read.',
    fix: 'Answer the questions directly on the relevant page, in sentences: what it costs, how long it takes, where you work, what happens if plans change.',
  },
  {
    slug: 'missing-structured-data',
    title: 'No organisation or local business markup',
    q: 'Does Squarespace add schema markup automatically?',
    a: 'Partly. Squarespace emits some structured data for blogs, events and products, and it does not describe your business as an organisation or a local business unless you add that yourself. Those are the types that feed knowledge panels and local results.',
    fix: 'Add Organization or LocalBusiness JSON-LD through Settings, then Developer Tools, then Code Injection.',
  },
];

/* ------------------------------------------------------------------ *
 * Questions about the tool itself
 * ------------------------------------------------------------------ */

export const FAQ: Answer[] = [
  {
    q: 'Is this Squarespace audit really free?',
    a: 'Yes. There is no account, no card and no trial. Enter your address and the report appears in the browser, and you can have a PDF copy by email if you want one.',
  },
  {
    q: 'How long does the audit take?',
    a: 'About ten seconds for most sites. We crawl up to a few dozen pages, run around a hundred checks against what we find, and build the report as the results arrive.',
  },
  {
    q: 'What does the audit actually check?',
    a: 'Around a hundred checks across eleven categories: technical SEO, on-page SEO, performance, AI search readiness, conversion, Squarespace setup, structured data, accessibility, security and privacy, mobile and social sharing. Every finding carries the evidence it was based on, taken from your own pages.',
  },
  {
    q: 'Does it work on Squarespace 7.0 and 7.1?',
    a: 'Both. The report tells you which version you are on and how confident it is, and several checks apply to only one of them, so a 7.0 site is not marked down for missing 7.1 features it cannot have.',
  },
  {
    q: 'Do I need to install anything or paste a code snippet?',
    a: 'No. The audit reads your site the same way a search engine does, over the public web. Nothing is installed, nothing is injected and no access to your Squarespace account is needed.',
  },
  {
    q: 'Will this change anything on my site?',
    a: 'No. The audit only reads pages. Every fix in the report is something you apply yourself, and each one names the exact place in Squarespace to apply it.',
  },
  {
    q: 'How is the score calculated?',
    a: 'Each category is scored from the checks that applied to your site, then combined with a weighted harmonic mean, which means one very weak area pulls the total down rather than being averaged away. Checks that did not apply are excluded rather than counted as passes, and issues Squarespace controls are reported but not scored against you.',
  },
  {
    q: 'Is the report written by AI?',
    a: 'The measurements are not. Every number, every URL and every piece of evidence comes from the crawl. The written explanations are drawn from a fixed library of explanations keyed to each check, and where a model is used to phrase them it can only refer to evidence the engine already produced.',
  },
  {
    q: 'Why does the audit say it could not run JavaScript?',
    a: 'We read your page source rather than executing scripts, which is how most search and AI crawlers read pages too. Anything a script adds after load is not counted, and the report marks those findings so you know the limit of the measurement.',
  },
  {
    q: 'Can I compare my site against a competitor?',
    a: 'Yes. Name up to three sites and we run the same checks against them, scored on the categories that mean the same thing on any platform, so a competitor on WordPress is not marked down for not using Fluid Engine.',
  },
  {
    q: 'What is AI search readiness and why is it in an SEO audit?',
    a: 'It is whether an assistant such as ChatGPT, Claude, Perplexity or Google AI Overviews can reach your pages and find an answer worth citing. It is in the audit because a growing share of the questions your customers ask never reach a results page at all, and the work that earns a citation is not the same work that earns a ranking.',
  },
  {
    q: 'Does a good score mean I will rank first?',
    a: 'No, and any tool that says otherwise is selling something. A score measures how well your site is built and described, not how strong your competition is or how much anybody links to you. What it does tell you is which of your own problems are worth an afternoon.',
  },
];

/* ------------------------------------------------------------------ *
 * How the audit runs
 * ------------------------------------------------------------------ */

export const HOW_IT_WORKS: Array<{ title: string; body: string }> = [
  {
    title: 'We read your site the way a crawler does',
    body: 'Starting from the address you give us, we fetch your robots.txt and sitemap, then crawl the pages most likely to matter, following your own internal links. No JavaScript is executed, which is how most search and AI crawlers read a page.',
  },
  {
    title: 'We measure, rather than estimate',
    body: 'Page weight, response times, image dimensions, headers and markup all come from the actual responses. Where Google holds Core Web Vitals field data for your site, the report shows the real visitor timings alongside our own measurements.',
  },
  {
    title: 'Every finding carries its evidence',
    body: 'A finding names the pages it applies to and shows the exact value it was based on, whether that is a noindex directive, a title that repeats the site name or an image served at four times its display size.',
  },
  {
    title: 'You get an order of work, not a list',
    body: 'Findings are ranked by severity and effort, and the report opens with the three moves worth making first, each with the path to the setting inside Squarespace.',
  },
];
