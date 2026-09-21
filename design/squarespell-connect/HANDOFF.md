# Squarespell Quiz: One-Button Website Connection Design Handoff

## Status

This is an interactive product design prototype. It is not production code and must not be deployed as-is.

- Prototype: `design/squarespell-connect/index.html`
- Product source: `docs/relaunch/SQUARESPELL_ONE_BUTTON_CONNECT_SPEC.md`
- Design branch: `design/one-button-connect`
- Product promise: **Connect your website once. Publish, update or remove every quiz with one button.**

## Product decision

The existing copy-code workflow becomes a fallback. The primary workflow is:

1. Open **Sites**.
2. Connect a website once.
3. Verify the connection.
4. Choose any quiz.
5. Choose inline, popup, or floating tab.
6. Choose pages and rules.
7. Publish.
8. Update, pause, move, or remove the installation from Squarespell.

For Squarespace, the product must say exactly what is supported:

- Squarespace does not expose an official API for inserting a page block or Code Injection entry.
- The customer installs the Squarespell site loader once through a guided setup.
- Popup and floating-tab installations then publish and update from Squarespell without another paste.
- Every new inline location needs a one-time named slot. Later quiz swaps and updates in that slot are controlled from Squarespell.
- Do not request Squarespace passwords or automate the editor.

## Navigation changes

Add a new **Publish** group to the dashboard sidebar:

- Sites
- Manual embed
- Integrations

The current embed page remains available at **Manual embed**. It is not the primary call to action.

On quiz cards and in the quiz editor, replace the primary **Embed** action with **Publish to website**. Keep **Copy embed code** in a secondary menu.

## Prototype screens

The prototype contains:

1. Sites dashboard
2. Connection summary and health
3. Connected website card
4. Connect Website wizard
5. Platform selector using recognizable platform branding
6. Honest Squarespace explanation
7. Domain entry and public website preview
8. One-time site-loader instructions
9. Automatic page-source and heartbeat verification
10. Verified connection success
11. Publish placement selection
12. Page rules and live preview
13. Publish and verification progress
14. Publish success
15. Website detail drawer
16. Installation list
17. Connection health
18. Manual embed fallback

## Interaction map

- **Connect website** opens the four-step wizard.
- Available prototype choices are Squarespace and Other / HTML.
- Planned platform buttons explain that their connector is not yet available.
- **Copy loader** provides clear feedback.
- **Verify connection** animates the page-source and heartbeat checks.
- **Publish a quiz** opens the publishing flow.
- Placement cards select inline, popup, or floating tab.
- Page-rule controls and switches demonstrate the expected behavior.
- Publishing shows prepare, manifest, and verification progress.
- **Manage** opens the website detail drawer.
- **Manual embed** stays discoverable as the fallback.

## Visual direction

The design extends the existing dashboard language instead of introducing a second product style:

- DM Sans and Manrope
- Squarespell teal `#0f7377`
- Off-white application background
- White cards with soft gray-green borders
- Dark green sidebar
- 10 to 18px corner radii
- Lightweight outlined interface icons
- Official platform marks loaded from Simple Icons
- Real photography in the website and quiz previews
- Motion used for step changes, connection scanning, publishing, and success
- Reduced-motion preference respected
- Responsive behavior for desktop, tablet, and mobile

## Core product language

Use these phrases consistently:

- **Sites**
- **Connect website**
- **Publish to website**
- **Site loader**
- **Install once**
- **Guided setup**
- **Verified**
- **Needs attention**
- **Publish a quiz**
- **Inline**
- **Popup**
- **Floating tab**
- **Manual embed**

Do not say:

- one click when the customer still has a manual step
- automatic Squarespace insertion
- connected before verification succeeds
- all integrations
- any platform before its connector is proven

Avoid em dashes in visible product copy.

## Required states

### Website connection

- Draft
- Verifying
- Verified
- Needs attention
- Paused
- Disconnected

### Quiz installation

- Publishing
- Live
- Updating
- Paused
- Moving
- Removing
- Removed
- Failed

Every loading state needs a timeout and a recovery action. A failed publish must keep the previous live manifest active.

## Implementation mapping

The implementation should add these product surfaces after the shared connector engine exists:

- `/dashboard/sites`
- `/dashboard/sites/connect` or modal route
- `/dashboard/sites/[siteId]`
- Publish-to-website flow launched from quiz actions
- Manual embed route preserved
- Site connection API
- Manifest API
- Heartbeat endpoint
- Verification API
- Installation management API
- Installation and verification event history

Use the data model and security rules in `SQUARESPELL_ONE_BUTTON_CONNECT_SPEC.md`. The prototype deliberately does not invent API contracts.

## Responsive requirements

- Support 320px and above.
- Mobile sidebar becomes a drawer.
- Metrics become a horizontal scroller.
- Site cards stack.
- Wizard dialogs fit the viewport and keep actions reachable.
- Platform selector uses two columns on small screens.
- Placement cards stack.
- Connection detail becomes a full-width drawer.

## Accessibility requirements

- Full keyboard operation.
- Visible focus states.
- Escape closes dialogs.
- Modal focus trapping in implementation.
- Screen-reader announcements for copy, verification, publish, success, and errors.
- Platform logos need names or accessible surrounding labels.
- Status must never rely on color alone.
- Respect `prefers-reduced-motion`.

## Implementation boundaries

Before Claude implements this design:

1. Hussnain reviews and approves the interaction and visual direction.
2. The connector engine, tables, tenant isolation, manifest security, heartbeat rate limits, and SSRF-safe verification are implemented from the approved spec.
3. Squarespace is implemented first on the universal loader.
4. Manual embed behavior remains unchanged as a rollback path.
5. Password protection, launch gate, and noindex remain on.
6. No changes are made to squarespell.com, WordPress, WooCommerce, marketplace customers, marketplace Stripe configuration, or the lifetime plugin.

## Review checklist

- Can a first-time user understand why Squarespace needs one guided step?
- Is the one-time action clearly separated from future one-button actions?
- Is manual embed available without competing with the primary flow?
- Can the user see which quiz is live, where it is shown, and when it was verified?
- Can the user recover when the loader or slot is missing?
- Does the publishing flow explain what changes on the live website?
- Can the user pause and remove an installation safely?
- Does the interface avoid claims that the current platform APIs do not support?
