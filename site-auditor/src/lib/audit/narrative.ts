/**
 * Deterministic narrative layer.
 *
 * Every finding the engine can emit has hand-written interpretation attached to
 * its check ID: why it matters, what to change, and what changes if you do it.
 * This is not filler waiting for an AI to replace it. It is the shipped copy.
 * The AI layer, when a key is present, rewrites the same three fields using the
 * same measured evidence. If the AI is unavailable the report reads identically
 * well, which is the whole point of keeping the deterministic engine as the
 * source of truth.
 *
 * Rules followed throughout:
 *   - no invented numbers, no revenue estimates, no ranking promises
 *   - the impact is phrased as the mechanism that changes, not a metric
 *   - second person, plain British English, no jargon left unexplained
 */

import type { AuditReport, CategoryId, Finding } from './types';

export interface CheckNarrative {
  /** Why this matters to the business, in practical terms. */
  why: string;
  /** The specific change to make. */
  action: string;
  /** What measurably changes once it is fixed. */
  impact: string;
}

/* ------------------------------------------------------------------ *
 * Technical SEO
 * ------------------------------------------------------------------ */
const TECH: Record<string, CheckNarrative> = {
  'TECH-001': {
    why: 'robots.txt is the first file every crawler requests. Without one, each crawler decides for itself what to do with your site, and you lose the one place you can point them at your sitemap.',
    action: 'Squarespace generates robots.txt for you, so a missing file usually means the site is not fully published or a redirect is intercepting the request. Load the file in a browser and confirm it returns plain text.',
    impact: 'Crawlers get an explicit instruction set instead of guessing, and your sitemap becomes discoverable from the one file every crawler is guaranteed to read.',
  },
  'TECH-010': {
    why: 'A sitemap is how search engines learn about pages that are not linked from your navigation. Squarespace builds one automatically, so its absence points at a publishing or domain problem rather than a setting.',
    action: 'Check that the site is fully published and that your primary domain is the one being served. Then confirm /sitemap.xml loads and lists your pages.',
    impact: 'Every published page becomes discoverable in one request instead of relying on a crawler following links to find it.',
  },
  'TECH-010b': {
    why: 'Your sitemap exists but robots.txt does not mention it. Crawlers that do not guess the standard filename may never request it, and third-party SEO tools frequently rely on the declaration.',
    action: 'This line is normally added by Squarespace. If it is missing, verify you have not replaced robots.txt with a custom file through code injection or a proxy.',
    impact: 'Crawlers find your full page list on their first visit rather than discovering pages gradually through links.',
  },
  'TECH-011': {
    why: 'A sitemap that is not valid XML is discarded silently. Search engines do not warn you, they simply fall back to crawling links, and any page not linked from your navigation may never be found.',
    action: 'Malformed sitemaps on Squarespace almost always come from a proxy, a redirect service or custom code sitting in front of the site. Remove whatever is rewriting the response.',
    impact: 'The sitemap starts being parsed instead of ignored, which restores discovery for pages that are not in your navigation.',
  },
  'TECH-016': {
    why: 'You are telling search engines to crawl pages that you have separately told them not to index. The instructions contradict each other, which wastes crawl budget and is a common source of confusing coverage reports.',
    action: 'Decide which is right for each page. If a page should stay out of search, that is fine, but it should not be advertised in the sitemap.',
    impact: 'Your sitemap becomes an accurate list of pages you actually want ranked, and coverage reports stop filling with warnings you have to ignore.',
  },
  'TECH-017': {
    why: 'Last-modified dates tell crawlers which pages have changed since their last visit. Without them, a crawler either re-checks everything or, more often, re-checks nothing and your updates take longer to appear.',
    action: 'Squarespace sets these dates automatically when a page is edited and republished. Pages missing a date have usually not been republished since being created.',
    impact: 'Search engines recrawl the pages you have actually changed, so edits reach search results sooner.',
  },
  'TECH-018': {
    why: 'These pages are in your sitemap but nothing on the site links to them. Search engines treat internal links as a signal of importance, so an unlinked page reads as one you do not care about, and visitors cannot reach it at all by navigating.',
    action: 'Either link each page from somewhere sensible, a navigation item, a related page, a footer link, or remove it from the site if it is no longer needed.',
    impact: 'Orphaned pages start receiving internal link signals and become reachable by visitors, not just by search engines.',
  },
  'TECH-030': {
    why: 'A noindex instruction removes a page from search results entirely. On a page you want found, this is the single most expensive setting on the whole site, because everything else you do to that page is irrelevant while it is set.',
    action: 'In Squarespace, open the page settings, go to the SEO tab and clear the "Hide this page from search engines" option.',
    impact: 'The page becomes eligible to appear in search results again. Nothing else in this report can help a page that is hidden.',
  },
  'TECH-033': {
    why: 'These directives tell Google not to show a text snippet, an image preview or a video preview for the page. A result with no snippet is far less likely to be clicked, even when it ranks well.',
    action: 'Remove the nosnippet, max-snippet:0 or noimageindex directives from the page, usually added through code injection or a custom meta tag.',
    impact: 'Your results regain their description text and image previews, which is what makes a listing worth clicking.',
  },
  'TECH-040': {
    why: 'A canonical tag tells search engines which address is the real one when the same content is reachable several ways. Without it, Squarespace URL variants can be treated as separate pages competing with each other.',
    action: 'Squarespace adds canonical tags automatically, so a missing one usually means custom code has removed or overwritten the head. Check any code injection you have added.',
    impact: 'Duplicate addresses consolidate into one page, so the ranking signals they each collect are combined rather than split.',
  },
  'TECH-041': {
    why: 'When a page declares two different canonical URLs, search engines cannot tell which one you mean. Google resolves the conflict itself, and it may not choose the one you wanted.',
    action: 'Find the second tag, which is almost always injected by custom code or a third-party SEO script, and remove it so only the Squarespace tag remains.',
    impact: 'You regain control of which address ranks, instead of leaving the decision to a search engine.',
  },
  'TECH-044': {
    why: 'Your pages are telling search engines that the real version of this content lives on another domain. Taken at face value, this hands the ranking to that other site and removes yours from results.',
    action: 'This normally happens after a site has been duplicated or migrated and the old domain is still hard-coded. Remove the cross-domain canonical so it points at your own address.',
    impact: 'Search engines start attributing the content to your domain again rather than to somebody else.',
  },
  'TECH-050': {
    why: 'Your site answers on plain HTTP. A temporary redirect does not pass full ranking signal and does not let browsers remember the secure version, so some visitors keep making an insecure first request.',
    action: 'Squarespace serves a permanent HTTPS redirect once SSL is set to "Secure" with HSTS enabled. Check Settings, then Developer Tools, then SSL.',
    impact: 'Every visitor lands on the secure version on the first request, and the ranking signal from the old address transfers fully.',
  },
  'TECH-051': {
    why: 'The same site loading on both www and non-www means search engines see two copies. Links, rankings and any authority you build get divided between two addresses instead of accumulating on one.',
    action: 'In Squarespace, open Settings, then Domains, and set one address as primary. The other should then redirect to it.',
    impact: 'All the signals from both addresses consolidate onto one, so your strongest pages stop competing with their own duplicates.',
  },
  'TECH-052': {
    why: 'A redirect chain makes every visitor and every crawler perform several round trips before seeing anything. On mobile connections this is a visible delay before the page even starts loading.',
    action: 'Update the links pointing at these pages so they target the final address directly, and collapse any multi-step redirect rules into one.',
    impact: 'The wasted round trips disappear, so the page starts rendering sooner for everyone who arrives through those links.',
  },
  'TECH-055': {
    why: 'Internal links that lead to a broken page waste the visitor who clicked and waste the crawl that followed them. They are also the clearest signal to a visitor that a site is not maintained.',
    action: 'Fix or remove each link. If the target page moved, add a redirect in Squarespace under Settings, then Developer Tools, then URL Mappings.',
    impact: 'Visitors stop hitting dead ends, and crawl effort goes to pages that exist instead of pages that do not.',
  },
  'TECH-057': {
    why: 'Your server returns a success code for addresses that do not exist. Search engines then index empty pages as though they were real content, which dilutes the quality signal for the whole site.',
    action: 'Soft 404s on Squarespace usually come from a catch-all redirect or a custom 404 handler. Remove it so missing pages return a genuine 404 status.',
    impact: 'Search engines drop the phantom pages instead of indexing them, and your indexed page count starts reflecting what you actually published.',
  },
  'TECH-059': {
    why: 'Pages that fail to load cost you the visit outright. When the failure is a server error rather than a missing page, search engines also slow their crawling of the whole site until it stabilises.',
    action: 'Open each affected address and confirm what it returns. Fix the page, or redirect it under Settings, then Developer Tools, then URL Mappings.',
    impact: 'Visitors and crawlers reach real content instead of an error, and crawl rate recovers once the errors stop.',
  },
};

/* ------------------------------------------------------------------ *
 * On-page SEO
 * ------------------------------------------------------------------ */
const ONPAGE: Record<string, CheckNarrative> = {
  'ONPAGE-001': {
    why: 'The title tag is the clickable line in every search result and the label on every browser tab. A page without one has no headline in search, so Google writes its own from whatever text it finds.',
    action: 'In Squarespace, open the page, go to Settings, then SEO, and write an SEO title that names the page and the business.',
    impact: 'You control the headline searchers read before deciding whether to click, rather than leaving it to an algorithm.',
  },
  'ONPAGE-002': {
    why: 'Google truncates long titles and gains nothing from short ones. A title cut off mid-phrase loses exactly the part that would have persuaded someone to click.',
    action: 'Rewrite these titles to roughly 50 to 60 characters, leading with what the page is about and ending with the business name.',
    impact: 'The full title displays in results, so the whole proposition is visible rather than the first half of it.',
  },
  'ONPAGE-004': {
    why: 'Duplicate titles make several of your pages look identical in search results. Google has to pick one, and searchers cannot tell them apart even when it picks well.',
    action: 'Give each page a title that describes only that page. Service pages in particular should name the specific service, not the business generally.',
    impact: 'Each page competes for its own searches instead of several pages competing for the same one.',
  },
  'ONPAGE-005': {
    why: 'Placeholder titles left over from the template tell every visitor and every search result that the site is unfinished. It is the fastest available way to lose credibility before anyone reads a word.',
    action: 'Replace the template text with a real title for each page under Settings, then SEO.',
    impact: 'Search results stop advertising an unfinished site, which is the first thing a prospective customer sees.',
  },
  'ONPAGE-010': {
    why: 'The meta description is the paragraph under your link in search results. Without one Google assembles a sentence from the page, which frequently means a menu item or a cookie notice.',
    action: 'Write a 120 to 155 character description for each page under Settings, then SEO, saying what the page offers and what to do next.',
    impact: 'Your own sales sentence appears under every listing instead of a fragment the algorithm happened to pick.',
  },
  'ONPAGE-011': {
    why: 'Descriptions outside the displayed range are either cut off mid-sentence or too thin to persuade. Both waste the only free advertising copy search engines will show for you.',
    action: 'Trim or expand these to roughly 120 to 155 characters, keeping the offer and the call to action inside the visible portion.',
    impact: 'The full description reads as a complete sentence in results rather than trailing off.',
  },
  'ONPAGE-020': {
    why: 'The H1 is the page heading that tells both a reader and a search engine what the page is about in one line. Squarespace pages can easily end up with none if the top section uses styled text rather than a heading block.',
    action: 'Set the main heading on each page to Heading 1 in the text editor. Every page should have exactly one.',
    impact: 'Each page gains a clear topical label, which is one of the strongest on-page relevance signals available.',
  },
  'ONPAGE-021': {
    why: 'Several H1 headings on one page means several competing claims about the topic. It also breaks the document outline that screen readers use to let people skim.',
    action: 'Keep one H1 for the page subject and demote the rest to Heading 2 or Heading 3.',
    impact: 'The page topic becomes unambiguous, and screen reader users regain a usable outline of the page.',
  },
  'ONPAGE-024': {
    why: 'Heading levels are a structure, not a set of font sizes. Skipping from H1 to H4 tells parsers there is a missing level, which weakens how well the page can be summarised and quoted.',
    action: 'Reorder the headings so levels descend one step at a time, and use the style controls rather than heading levels to change size.',
    impact: 'The page becomes cleanly parseable, which is what lets search and AI systems extract a section rather than the whole page.',
  },
  'ONPAGE-030': {
    why: 'A page with almost no readable text gives search engines nothing to match a query against. Image-led Squarespace layouts fall into this easily, because a beautiful page can contain very few actual words.',
    action: 'Add real copy to these pages, what the service is, who it is for, what happens next. Aim for at least a few hundred words on any page you want found.',
    impact: 'The page becomes eligible for searches it currently cannot match, because there is finally text to match against.',
  },
  'ONPAGE-033': {
    why: 'Template filler text that is still live tells visitors nobody has finished the site. It also gets indexed, so the placeholder can appear in search results under your brand.',
    action: 'Search each page for the leftover text and replace it with your own copy.',
    impact: 'The site stops reading as a half-finished template to the people you most want to impress.',
  },
  'ONPAGE-040': {
    why: 'Internal links carry both visitors and ranking signal between pages. A page with almost no links in or out sits on an island, so it neither passes authority nor receives it.',
    action: 'Add contextual links from related pages, and link out from these pages to your services, contact page or relevant posts.',
    impact: 'Authority starts flowing between your pages instead of pooling on the homepage, and visitors have somewhere to go next.',
  },
  'ONPAGE-043': {
    why: 'Link text is one of the clearest signals of what the linked page is about. "Click here" and "read more" describe nothing, and screen reader users navigating by link list hear the same meaningless phrase repeatedly.',
    action: 'Rewrite the link text to describe the destination, for example "see our pricing" instead of "read more".',
    impact: 'Every link starts contributing a relevance signal to its target page, and the site becomes navigable by link text alone.',
  },
  'ONPAGE-050': {
    why: 'Alt text is what a search engine reads instead of the picture, and what a screen reader speaks aloud. Missing alt text on content images removes both the accessibility and the image search opportunity.',
    action: 'In Squarespace, click each image, open the design panel and add a short description of what the image shows. Purely decorative images should be marked as decorative rather than described.',
    impact: 'Your images become eligible for image search, and the page becomes usable by anyone browsing without sight of it.',
  },
  'ONPAGE-051': {
    why: 'Alt text that repeats a filename describes nothing. Squarespace uses the uploaded filename by default, so this is what you get when the field is left untouched.',
    action: 'Replace the filename with a short plain description of the image content.',
    impact: 'The alt text starts carrying meaning for both search engines and screen readers instead of an upload artefact.',
  },
};

/* ------------------------------------------------------------------ *
 * AI search readiness
 * ------------------------------------------------------------------ */
const AEO: Record<string, CheckNarrative> = {
  'AEO-001': {
    why: 'Your robots.txt blocks the crawlers that feed AI search answers. When someone asks an assistant about your industry, your site is not in the set of pages it can draw from, regardless of how well you rank on Google.',
    action: 'Remove the disallow rules for the search crawlers you want to be visible to. Blocking training crawlers is a separate and legitimate choice, but blocking search crawlers removes you from AI answers.',
    impact: 'Your pages become eligible to be read and cited when someone asks an assistant a question your site answers.',
  },
  'AEO-002': {
    why: 'Assistants fetch a page live when a user asks about a specific site. If that fetch is blocked, the assistant answers from whatever it already believes about you, which may be nothing or may be out of date.',
    action: 'Allow the live-fetch user agents in robots.txt, or remove the firewall rule that is refusing them.',
    impact: 'Assistants answer questions about your business from your current pages rather than from memory or guesswork.',
  },
  'AEO-003': {
    why: 'Training crawlers are blocked. This is a policy decision rather than a fault, and plenty of businesses make it deliberately, but it does mean your content is less likely to inform models over time.',
    action: 'No change is required. Review it only if you decided to block these crawlers without intending to.',
    impact: 'Nothing changes unless you want it to. This is listed so the decision is visible rather than accidental.',
  },
  'AEO-005': {
    why: 'Your robots.txt allows AI search crawlers but the server refuses them anyway, which usually means a firewall or bot rule is doing it. The result is the same as blocking them outright, except you cannot see it in robots.txt.',
    action: 'Find the rule refusing these user agents, normally in a security or bot-protection layer in front of the site, and allow the search crawlers through.',
    impact: 'The permission you already granted in robots.txt starts taking effect, so those crawlers can actually read the pages.',
  },
  'AEO-010': {
    why: 'AI systems and featured snippets both work by matching a question to an answer. Pages built entirely from statement headings give them nothing to match, so your content is harder to quote even when it contains the answer.',
    action: 'Add question-shaped headings to your substantial pages, phrased the way a customer would ask, and answer each in the first two or three sentences beneath.',
    impact: 'Your pages become directly quotable, which is the mechanism behind both AI citations and featured snippets.',
  },
  'AEO-014': {
    why: 'A main landmark tells any parser which part of the page is the content and which parts are navigation, header and footer. Without it, extraction tools have to guess, and they frequently pull menu text into the summary.',
    action: 'This is usually controlled by the template. If you have overridden the layout with custom code, wrap the primary content region in a main element.',
    impact: 'Extractors pull your actual content instead of your navigation, so summaries and citations reflect the page.',
  },
  'AEO-017': {
    why: 'Your homepage does not state in plain text what the business does. A human can infer it from images and design, but a search engine or assistant reading the text alone cannot, and that text is all they read.',
    action: 'Add a sentence near the top of the homepage naming what you do and who you do it for, in the words a customer would use.',
    impact: 'The single most important sentence on the site becomes machine readable, which is what allows anything to describe you correctly.',
  },
  'AEO-018': {
    why: 'Your business name appears in several different forms across the site. Search engines and AI systems use consistent naming to decide that all these mentions describe one entity, and inconsistency weakens that link.',
    action: 'Pick one canonical form of the name and use it in your site title, page titles, footer and structured data. Keep it identical to your Google Business Profile.',
    impact: 'Mentions of your business consolidate into one recognised entity rather than being read as several loosely related ones.',
  },
  'AEO-019': {
    why: 'Nothing on the site connects it to your profiles elsewhere. Those links are how search engines verify that the business on your website is the same one on your directory listings and social profiles.',
    action: 'Add links to your Google Business Profile, main social accounts and any professional directory you appear in, and add a sameAs list to your structured data.',
    impact: 'Your separate online presences link into one verifiable entity, which is what supports a knowledge panel and confident AI answers.',
  },
  'AEO-024': {
    why: 'About and Contact pages are among the strongest trust signals a site can carry. Search quality guidance treats them as basic evidence that a real business stands behind the content, and assistants look for them when asked who somebody is.',
    action: 'Add the missing page. It should name the people or the business, say where you are based, and give a way to make contact.',
    impact: 'The site gains the standard evidence of a real business, which is a prerequisite for being cited confidently.',
  },
};

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */
const CONV: Record<string, CheckNarrative> = {
  'CONV-001': {
    why: 'Contact details that appear on only one page force an interested visitor to go looking. Every extra step between wanting to get in touch and being able to costs some of them.',
    action: 'Put your phone number, email or contact link in the header or footer so it is present on every page.',
    impact: 'A visitor can act at the moment they decide to, rather than having to navigate to find out how.',
  },
  'CONV-010': {
    why: 'We could not find any way to contact you from the pages we crawled. Whatever else the site does well, a visitor who wants to speak to you has nothing to act on.',
    action: 'Add a contact page with a form and a direct method, and link to it from the main navigation. Where booking is your only route, still add a way to ask a question first.',
    impact: 'Interested visitors gain a route to you instead of leaving to find a competitor who published one.',
  },
  'CONV-011': {
    why: 'Every additional field on a contact form reduces the number of people who complete it. Fields that are not needed to reply are asking a stranger to work before you have earned it.',
    action: 'Cut the form to the minimum you need to respond, usually a name, a contact method and a message. Ask the rest in your reply.',
    impact: 'More of the people who start the form finish it, because you are asking for less before they know you.',
  },
  'CONV-014': {
    why: 'Most first-time visitors are not ready to buy. With no way to stay in touch, everyone who is interested but not ready is lost entirely rather than kept.',
    action: 'Offer something worth an email address, a guide, a checklist, a price list, and add a newsletter block near the end of your main pages.',
    impact: 'Interest that is real but early converts into a contact you can follow up rather than an anonymous visit.',
  },
  'CONV-015': {
    why: 'Your form is a Squarespace Form Block, which is built by JavaScript after the page loads. We can see the placeholder but not the fields, so we cannot check what it asks for.',
    action: 'No fix is needed. Submit the form yourself occasionally to confirm it still delivers, because a silently broken form is invisible from the outside.',
    impact: 'Nothing changes. This is noted so you know why the form was not assessed rather than assuming it passed.',
  },
  'CONV-020': {
    why: 'Your homepage does not ask the visitor to do anything. People do not usually go looking for the next step, they take it when it is offered.',
    action: 'Add one clear primary action near the top of the homepage, phrased as the thing the visitor wants, and repeat it at the end.',
    impact: 'Visitors arrive at a next step instead of arriving at a dead end and leaving.',
  },
  'CONV-021': {
    why: 'Vague button wording like "submit" or "learn more" makes a visitor guess what happens next. Uncertainty at the moment of clicking is what stops the click.',
    action: 'Rewrite button text to name the outcome, for example "book a free call" or "see our prices".',
    impact: 'The visitor knows what they are agreeing to before they click, which is what makes them willing to.',
  },
  'CONV-022': {
    why: 'Nothing asks the visitor to act until well down the homepage. Most people never reach that far, so the offer is made only to the minority who scrolled.',
    action: 'Move a primary action into the first screen of the homepage, above where a phone screen cuts off.',
    impact: 'The offer reaches everyone who arrives rather than only the people who scrolled far enough to find it.',
  },
  'CONV-030': {
    why: 'There is no way to book directly. Every enquiry has to become a conversation before it can become an appointment, which loses the people who would have booked but will not write a message.',
    action: 'Add Squarespace Scheduling, or link an external booking tool from your main navigation and your primary call to action.',
    impact: 'People who are ready to commit can do so immediately instead of joining a queue of enquiries to answer.',
  },
  'CONV-032': {
    why: 'No pricing information appears anywhere. Price is one of the first things buyers try to establish, and a site that avoids the question entirely loses the people who assume the answer is "too much".',
    action: 'Publish something, a starting price, a range, typical project sizes, or an explanation of how you price. Precision matters less than removing the silence.',
    impact: 'You filter out enquiries you cannot serve and stop losing the ones you can, before either side spends time.',
  },
  'CONV-040': {
    why: 'No testimonials, reviews or client proof appear anywhere. Everything on the site is currently a claim you make about yourself, which is the weakest form of evidence available.',
    action: 'Add named testimonials with a role or company, case studies with outcomes, or a review widget pulling from a platform you already use.',
    impact: 'Your claims start being supported by somebody other than you, which is what a stranger needs before making contact.',
  },
  'CONV-042': {
    why: 'No credentials, guarantees or trust markers were found. For services people buy on trust, these are often the deciding factor between two similar-looking options.',
    action: 'Add whatever is true and relevant, qualifications, accreditations, insurance, years established, memberships, or a clear guarantee.',
    impact: 'The site gives a cautious buyer a reason to choose you rather than leaving them to compare on price alone.',
  },
  'CONV-045': {
    why: 'The site does not link to any social profiles. Beyond the social traffic itself, those links are one of the ways search engines confirm that the business is real and active.',
    action: 'Add your active profiles to the footer through Squarespace social links, and leave out any account you no longer post to.',
    impact: 'Visitors can check that the business is active, and your profiles connect back into one verifiable entity.',
  },
};

/* ------------------------------------------------------------------ *
 * Performance
 * ------------------------------------------------------------------ */
const PERF: Record<string, CheckNarrative> = {
  'PERF-001': {
    why: 'This is the time before the browser receives anything at all, so every other part of loading is delayed behind it. It is also measured directly by Google as part of page experience.',
    action: 'Squarespace controls the server, so the usual causes are heavy third-party code, very large pages or a slow custom domain configuration. Removing unused scripts is the lever you have.',
    impact: 'The whole load sequence starts sooner, which moves every downstream timing with it.',
  },
  'PERF-002': {
    why: 'A very large HTML document has to be downloaded and parsed before anything can appear. On a mobile connection this is dead time in front of a blank screen.',
    action: 'Reduce the number of blocks and sections on these pages, and split very long pages into several shorter ones.',
    impact: 'The browser reaches the point where it can render sooner, so visible content appears earlier.',
  },
  'PERF-003': {
    why: 'Uncompressed pages transfer several times more data than they need to. Compression is the single cheapest performance win available and it is normally on by default.',
    action: 'Squarespace compresses responses automatically, so an uncompressed page usually means a proxy or CDN in front of the site is stripping it. Check anything sitting between your domain and Squarespace.',
    impact: 'Page transfer size drops sharply with no change to the page itself.',
  },
  'PERF-006': {
    why: 'A blocking script in the head stops the browser building the page until it has been fetched and run. Every one of them is a pause before anything can be drawn.',
    action: 'Move injected scripts to the footer where you can, and add async or defer where the script does not need to run before render.',
    impact: 'The browser stops waiting on scripts before drawing, so first paint happens earlier.',
  },
  'PERF-009': {
    why: 'Each third-party service adds a DNS lookup, a connection and code that runs on your visitors devices. They also each collect data, which is what brings cookie consent obligations with them.',
    action: 'Audit what is loading and remove anything you are not actively using. Old analytics, abandoned chat widgets and unused pixels are the usual candidates.',
    impact: 'Fewer connections and less third-party code on every page load, and a smaller privacy surface to disclose.',
  },
  'PERF-013': {
    why: 'Oversized images are the most common reason a Squarespace site feels slow, because the platform serves what you upload. A single large photo can outweigh the rest of the page combined.',
    action: 'Resize images to at most 2500 pixels wide before uploading, and compress them. Replacing an existing image is enough, no rebuild needed.',
    impact: 'Page weight falls immediately, and the largest visible element appears faster on mobile connections.',
  },
  'PERF-014': {
    why: 'Modern image formats transfer substantially less data for the same visible quality. Older formats mean every visitor downloads more than they need to.',
    action: 'Squarespace converts many uploads automatically. Where it has not, re-upload the image as WebP.',
    impact: 'The same images transfer in less data, which is most noticeable on mobile.',
  },
  'PERF-015': {
    why: 'Images without declared dimensions cause the layout to jump as they load. Google measures this shifting directly, and for a reader it is the thing that makes you lose your place mid-sentence.',
    action: 'Use Squarespace image blocks rather than raw HTML, since the blocks set dimensions for you. Where you have injected custom markup, add width and height.',
    impact: 'The layout holds still while images load instead of reflowing under the reader.',
  },
  'PERF-017': {
    why: 'Lazy loading the first image on a page delays the one image the visitor is guaranteed to see. It is the correct technique applied to the wrong image.',
    action: 'Load the first image on each page eagerly and keep lazy loading for everything below the fold.',
    impact: 'The main visual appears without the deliberate delay currently applied to it.',
  },
  'PERF-021': {
    why: 'Short cache lifetimes mean returning visitors re-download files that have not changed. Every repeat visit costs more than it should.',
    action: 'Caching headers are set by Squarespace for platform assets. Where the short lifetime is on files you host elsewhere, extend it there.',
    impact: 'Repeat visits reuse files already on the device instead of fetching them again.',
  },
};

/* ------------------------------------------------------------------ *
 * Structured data
 * ------------------------------------------------------------------ */
const SCHEMA: Record<string, CheckNarrative> = {
  'SCHEMA-002': {
    why: 'Structured data that fails to parse is discarded entirely. You are carrying the markup and getting none of the benefit, and no warning is shown anywhere.',
    action: 'Fix the malformed block, usually a trailing comma or an unescaped quote in code you have injected, and validate it before republishing.',
    impact: 'The markup starts being read instead of silently thrown away, making rich results possible again.',
  },
  'SCHEMA-008': {
    why: 'Star ratings are declared in your markup but the ratings are not visible on the page. Search engines require the rating to be shown to the user, and enforcement is a manual action against the site.',
    action: 'Either display the reviews on the page as the markup describes, or remove the rating markup.',
    impact: 'You remove a policy violation that risks losing rich results across the whole site, not just this page.',
  },
  'SCHEMA-030': {
    why: 'Nothing in your markup states what kind of business you are, where you are, or how to reach you. Structured data is the machine readable version of your identity, and it is what feeds knowledge panels and AI answers.',
    action: 'Add LocalBusiness or Organization markup through code injection, with your name, address, phone, opening hours and links to your other profiles.',
    impact: 'Search and AI systems gain a definitive statement of who you are rather than inferring it from body copy.',
  },
  'SCHEMA-040': {
    why: 'Breadcrumb markup is what turns the grey URL line in a search result into a readable path. It is a small, reliable improvement to how your listings look.',
    action: 'Add BreadcrumbList markup reflecting your real navigation hierarchy.',
    impact: 'Search results show a readable path instead of a raw address, which makes the listing easier to scan.',
  },
};

/* ------------------------------------------------------------------ *
 * Squarespace platform
 * ------------------------------------------------------------------ */
const SQS: Record<string, CheckNarrative> = {
  'SQS-001': {
    why: 'Squarespace 7.0 no longer receives new features. Fluid Engine, the current section layouts and several newer SEO and commerce capabilities are 7.1 only, so the gap widens with every release.',
    action: 'Migrating means rebuilding on 7.1 rather than upgrading in place. Plan it as a project, and treat it as the moment to fix structure and copy rather than recreating the old site.',
    impact: 'You regain access to the features being built, instead of maintaining a version that is now only receiving fixes.',
  },
  'SQS-002': {
    why: 'Classic Editor sections do not use the newer layout engine, so they are harder to make work well on mobile and cannot use the current section features.',
    action: 'Rebuild these sections using Fluid Engine. Adding a new section on 7.1 uses it automatically.',
    impact: 'Those sections gain proper mobile layout control instead of inheriting a desktop arrangement.',
  },
  'SQS-003': {
    why: 'The default Squarespace favicon is the small icon in the browser tab and in every bookmark. Leaving it says the site was never finished, in the one place people look when they have twenty tabs open.',
    action: 'Upload a square icon under Design, then Browser Icon. A simplified mark reads better than a full logo at that size.',
    impact: 'Your site becomes identifiable in a crowded tab bar rather than showing a platform default.',
  },
  'SQS-004': {
    why: 'A squarespace.com address tells every visitor which builder you used and gives you no brand of your own. It also means any authority you build is attached to a subdomain you do not control.',
    action: 'Buy or connect a custom domain under Settings, then Domains, and set it as primary so the old address redirects.',
    impact: 'Your site starts building authority on an address you own, and stops advertising the platform in every link.',
  },
  'SQS-006': {
    why: 'These pages fall back to the site name as their title, so several results carry the same headline. Squarespace does this whenever the SEO title field is left blank.',
    action: 'Set an SEO title on each page under Settings, then SEO, describing that page specifically.',
    impact: 'Each page gains its own headline in search results instead of repeating the site name.',
  },
  'SQS-007': {
    why: 'Squarespace serves the homepage at both the root address and /home. Two addresses with identical content split whatever signals each collects.',
    action: 'Add a redirect from /home to / under Settings, then Developer Tools, then URL Mappings.',
    impact: 'Homepage signals consolidate on one address rather than being divided between two copies.',
  },
  'SQS-008': {
    why: 'Auto-generated URLs full of random characters appear in search results and in anything shared. They also tell you the page slug was never set, which usually means the page was duplicated and forgotten.',
    action: 'Edit the URL slug for each page under Settings, then General, and add a redirect from the old address if it has been shared.',
    impact: 'Your addresses become readable and describe their page, which helps both search results and anyone pasting a link.',
  },
  'SQS-009': {
    why: 'Squarespace lists tag and category archive pages in the sitemap. These pages usually hold no unique content, so they compete with your real pages for attention and crawl budget.',
    action: 'Set the archive pages you do not need to noindex under their SEO settings, keeping any that genuinely serve as landing pages.',
    impact: 'Crawl effort concentrates on the pages you actually want ranked rather than on thin archives.',
  },
  'SQS-010': {
    why: 'A password on a page that is otherwise public means visitors and search engines both hit a wall. Search engines index the password prompt rather than the content behind it.',
    action: 'Remove the page password under page settings if the page is meant to be public, or set it to noindex if it is genuinely private.',
    impact: 'The real content becomes visible to visitors and indexable by search engines, rather than a login screen.',
  },
  'SQS-011': {
    why: 'Developer Mode replaces the standard template with custom code, which disables the visual editor and means future Squarespace template improvements do not reach the site.',
    action: 'Keep it only if you actively need custom templating. Otherwise plan a return to a standard template.',
    impact: 'Content editing becomes possible without a developer, and platform improvements start applying again.',
  },
  'SQS-012': {
    why: 'Your product pages carry no product structured data, so search engines cannot read price, availability or reviews. Those are exactly the fields that produce the rich shopping results people compare.',
    action: 'Enable product structured data in your commerce settings, or add Product markup through code injection where the template does not emit it.',
    impact: 'Product listings become eligible to show price and availability directly in results rather than a plain link.',
  },
  'SQS-013': {
    why: 'You are on a plan that includes features the site does not appear to use. That is money leaving every month for capability sitting idle.',
    action: 'Either start using the features, they are already paid for, or move to a plan that matches what the site actually does.',
    impact: 'Your plan and your site match, so you stop paying for capability that is not in use.',
  },
};

/* ------------------------------------------------------------------ *
 * Security, privacy, accessibility, mobile, social
 * ------------------------------------------------------------------ */
const MISC: Record<string, CheckNarrative> = {
  'SEC-001': {
    why: 'Without HTTPS, browsers mark the site as not secure in the address bar, and anything typed into a form travels in the clear. Search engines have treated encryption as a ranking signal for years.',
    action: 'Enable SSL under Settings, then Developer Tools, then SSL, and set it to Secure. Squarespace provides the certificate.',
    impact: 'The browser warning disappears and form submissions are encrypted in transit.',
  },
  'SEC-002': {
    why: 'An expired or nearly expired certificate produces a full-page browser warning that most visitors will not click past. It is one of very few faults that stops a site working outright.',
    action: 'Squarespace renews certificates automatically when the domain is correctly connected, so a failure normally means a DNS record is pointing elsewhere. Check your domain configuration.',
    impact: 'Visitors reach the site instead of a security interstitial telling them to turn back.',
  },
  'SEC-007': {
    why: 'These headers tell the browser how to protect your visitors from common attacks. Their absence is not an active vulnerability, but it removes defences that cost nothing to have.',
    action: 'Squarespace controls most response headers, so your options are limited. Where you have a proxy or CDN in front of the site, add them there.',
    impact: 'Browsers apply additional protections on your behalf rather than falling back to the least strict defaults.',
  },
  'SEC-013': {
    why: 'A secure page loading resources over plain HTTP produces mixed content. Browsers block or downgrade these resources, so the affected part of the page may simply not appear.',
    action: 'Find the HTTP references, usually in injected code or an embed, and change them to HTTPS.',
    impact: 'The blocked resources load again, and the browser stops downgrading the page security indicator.',
  },
  'SEC-016': {
    why: 'Files that should not be publicly readable are being served. Depending on the file, this can expose configuration or credentials to anyone who asks for it.',
    action: 'Remove the files from anything publicly served. If they contain credentials, rotate those credentials, because you cannot know who has already read them.',
    impact: 'The exposure closes. Rotating the credentials is what makes the closure meaningful.',
  },
  'SEC-020': {
    why: 'No privacy policy is linked from the site. If you run analytics, embed third-party services or collect anything through a form, most privacy regimes require one.',
    action: 'Add a privacy policy page covering what you collect, why, how long you keep it and how to request deletion, and link it from the footer.',
    impact: 'You meet the baseline disclosure obligation, and visitors can see what happens to what they submit.',
  },
  'SEC-022': {
    why: 'Tracking scripts are running before any consent is given. In the UK and EU, non-essential cookies require consent first, and the obligation sits with the site owner rather than the platform.',
    action: 'Enable the Squarespace cookie banner under Settings, then Cookies and Visitor Data, and configure it to hold non-essential cookies until consent.',
    impact: 'Tracking waits for permission rather than assuming it, which is what the rules actually require.',
  },
  'SEC-031': {
    why: 'No analytics are installed, so every decision about the site is being made without evidence. You cannot tell which pages bring enquiries and which are ignored.',
    action: 'Squarespace Analytics is built in and needs no setup. Add Google Analytics or a privacy-first alternative if you need more depth.',
    impact: 'You start seeing which pages actually produce enquiries instead of guessing.',
  },
  'SOCIAL-003': {
    why: 'Without a social sharing image, links to these pages appear as bare text when posted or messaged. A link with no image is markedly less likely to be clicked in any feed.',
    action: 'Set a social image per page under Settings, then Social Image, or set a site-wide default in your logo and social settings.',
    impact: 'Shared links render as a proper preview card instead of a plain line of text.',
  },
  'SOCIAL-004': {
    why: 'Your social image is referenced over plain HTTP. Most platforms refuse to load insecure images, so the preview silently falls back to no image at all.',
    action: 'Re-upload the image or correct the reference so the URL uses HTTPS.',
    impact: 'The preview image starts displaying on platforms that currently drop it.',
  },
  'SOCIAL-010': {
    why: 'Without a card type declaration, X and several other platforms fall back to a small preview instead of a large one. It is a one-line difference in how prominent your links look.',
    action: 'Add a twitter:card meta tag set to summary_large_image through code injection.',
    impact: 'Links display as a large preview card rather than a small thumbnail.',
  },
  'A11Y-001': {
    why: 'The language declaration tells screen readers which pronunciation rules to use and helps search engines target the right region. Without it, a screen reader may read your English page with the wrong voice entirely.',
    action: 'Set the site language under Settings, then Language and Region.',
    impact: 'Assistive technology reads the page correctly, and your regional targeting becomes explicit.',
  },
  'A11Y-010': {
    why: 'Form fields without labels are unusable with a screen reader, because there is nothing to announce when the field receives focus. Placeholder text does not count, it disappears as soon as typing starts.',
    action: 'Add a visible label to every field. In Squarespace form blocks this is the field title, which should not be hidden.',
    impact: 'The form becomes completable without sight of it, and everyone else keeps the label visible while typing.',
  },
  'A11Y-020': {
    why: 'Links with no readable text, usually icon links, are announced as "link" and nothing more. Someone navigating by link list hears a list of unlabelled destinations.',
    action: 'Add descriptive text or an accessible label to each icon link.',
    impact: 'Every link announces where it goes, which makes link-by-link navigation usable.',
  },
  'A11Y-040': {
    why: 'Embedded frames without a title are announced only as "frame". Maps, videos and booking widgets all arrive this way by default.',
    action: 'Add a title attribute to each embed describing what it contains.',
    impact: 'Embedded content is announced by what it is rather than as an unlabelled region.',
  },
  'A11Y-044': {
    why: 'A button with no accessible name gives a screen reader user nothing to act on. It is most common on icon-only buttons such as menu toggles and carousel controls.',
    action: 'Give each button visible text or an accessible label describing what it does.',
    impact: 'Controls become operable without sight, including the navigation menu on mobile.',
  },
  'A11Y-050': {
    why: 'Duplicate element IDs break the links between labels and fields, and between skip links and their targets. Assistive technology follows the first match and silently ignores the rest.',
    action: 'Make each ID unique. Duplicates usually come from a block being copied or custom code being included twice.',
    impact: 'Label and anchor relationships resolve correctly instead of pointing at the wrong element.',
  },
  'MOBILE-001': {
    why: 'Without a viewport declaration, mobile browsers render the page at desktop width and shrink it. Text becomes unreadable and Google treats the page as not mobile friendly.',
    action: 'Squarespace sets this automatically, so a missing viewport means custom code has replaced the head. Check your code injection.',
    impact: 'The page renders at device width instead of being scaled down to fit.',
  },
  'MOBILE-002': {
    why: 'Disabling pinch-to-zoom removes the primary way people with low vision read a page. It is an explicit accessibility failure and it is rarely intentional.',
    action: 'Remove user-scalable=no and any maximum-scale below 5 from the viewport tag in your injected code.',
    impact: 'Visitors can zoom to read, which for some of them is the difference between using the site and leaving.',
  },
  'MOBILE-005': {
    why: 'Fixed widths wider than a phone screen force horizontal scrolling. The layout keeps working on desktop, so this is easy to ship without noticing.',
    action: 'Replace fixed pixel widths in custom code with percentages or max-width, and check the result at 375 pixels wide.',
    impact: 'The layout fits the screen rather than requiring sideways scrolling to read.',
  },
};

export const NARRATIVE: Record<string, CheckNarrative> = {
  ...TECH,
  ...ONPAGE,
  ...AEO,
  ...CONV,
  ...PERF,
  ...SCHEMA,
  ...SQS,
  ...MISC,
};

/**
 * Category-level fallback. Only reached if a new check ships without narrative,
 * which the coverage test is there to prevent.
 */
const CATEGORY_FALLBACK: Record<CategoryId, CheckNarrative> = {
  tech: {
    why: 'This affects whether search engines can find, crawl and index your pages correctly.',
    action: 'Review the evidence above and correct the underlying setting.',
    impact: 'Search engines can process the affected pages as intended.',
  },
  onpage: {
    why: 'This affects how clearly each page communicates its subject to search engines and readers.',
    action: 'Review the evidence above and correct the affected pages.',
    impact: 'The affected pages describe themselves more clearly to both readers and search engines.',
  },
  perf: {
    why: 'This affects how quickly the page becomes usable, which both visitors and Google measure.',
    action: 'Review the evidence above and reduce what the browser has to do before rendering.',
    impact: 'Pages become usable sooner, particularly on mobile connections.',
  },
  aeo: {
    why: 'This affects whether AI assistants and answer engines can read, understand and cite your site.',
    action: 'Review the evidence above and make the content easier for a machine to extract.',
    impact: 'Your content becomes easier for AI systems to quote accurately.',
  },
  conv: {
    why: 'This affects whether an interested visitor can actually contact, book or buy from you.',
    action: 'Review the evidence above and remove the friction from the path to acting.',
    impact: 'More of the visitors who decide to act are able to.',
  },
  schema: {
    why: 'This affects the machine readable description of your business that powers rich results.',
    action: 'Review the evidence above and correct the structured data.',
    impact: 'Search and AI systems gain an accurate description of your business.',
  },
  a11y: {
    why: 'This affects whether people using assistive technology can use the site.',
    action: 'Review the evidence above and correct the affected markup.',
    impact: 'The affected elements become usable without sight of the screen.',
  },
  sec: {
    why: 'This affects the trust, privacy and security posture a visitor is exposed to.',
    action: 'Review the evidence above and close the gap.',
    impact: 'Visitors are better protected and the site meets baseline expectations.',
  },
  mobile: {
    why: 'This affects how the site behaves on a phone, which is where most visits happen.',
    action: 'Review the evidence above and correct the mobile layout.',
    impact: 'The site behaves correctly at phone width.',
  },
  social: {
    why: 'This affects how your links look when somebody shares them.',
    action: 'Review the evidence above and set the missing sharing metadata.',
    impact: 'Shared links render as a proper preview instead of plain text.',
  },
  sqs: {
    why: 'This is a Squarespace configuration issue that is holding the site back.',
    action: 'Review the evidence above and correct the setting in your Squarespace account.',
    impact: 'The platform stops working against you on this point.',
  },
};

export function narrativeFor(f: Finding): CheckNarrative {
  return NARRATIVE[f.id] || CATEGORY_FALLBACK[f.category];
}

/** Attaches deterministic interpretation to every finding in the report. */
export function applyNarrative(report: AuditReport): void {
  for (const f of report.findings) {
    // A check that wrote its own narrative knows more about which variant it
    // emitted than the id-keyed map does. Never overwrite it.
    if (f.narrative) continue;
    const n = narrativeFor(f);
    f.narrative = { ...n, source: 'engine' };
  }
}
