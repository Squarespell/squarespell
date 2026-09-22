# Platform marks

`sprite.svg` holds the self-hosted platform marks used by the Sites screens. Nothing is loaded from a CDN at runtime.

| Symbol | Source file | Accessible name |
|---|---|---|
| squarespace | icons/squarespace.svg | Squarespace |
| wordpress | icons/wordpress.svg | WordPress |
| shopify | icons/shopify.svg | Shopify |
| wix | icons/wix.svg | Wix |
| webflow | icons/webflow.svg | Webflow |
| framer | icons/framer.svg | Framer |
| html | Squarespell generic glyph | Custom website |

## Source and version

- Source: the Simple Icons project, npm package `simple-icons`, version **16.32.0** (CC0 1.0 for the icon data).
- The path data of the six brand symbols is byte-identical to the `d` attribute in that package's `icons/<name>.svg`, all with viewBox `0 0 24 24`. It was compared on 2026-09-22.
- The `html` symbol is a generic Squarespell glyph for websites with no known platform. It is not a brand mark.
- Brand names and marks belong to their owners. They are used only to identify the platform a customer's website runs on.

## Updating

Copy the new `d` attribute from the package version you are upgrading to, keep the `<title>` in the official spelling, and update the version above.
