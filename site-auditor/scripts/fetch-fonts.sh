#!/usr/bin/env bash
# Refetches the PDF typefaces from Google Fonts and regenerates the embedded
# base64 module. Run from the project root when the type system changes.
#
# The PDF uses the same three faces as the web app: Newsreader for the voice,
# Inter for the interface and every number, IBM Plex Mono for machine text.
# The old set (Outfit and DM Mono) is gone: DM Mono draws a slashed zero by
# default, which is how a score of 100 arrived in a customer's inbox as 1ØØ.
#
# Each family and weight is requested on its own so the returned URL maps to a
# known file rather than depending on the order Google lists them in.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p src/lib/pdf/fonts

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

fetch() { # family-query  output-name
  local query="$1" out="$2"
  local url
  url=$(curl -s -H "user-agent: $UA" "https://fonts.googleapis.com/css2?family=${query}" \
    | grep -oE "https://fonts.gstatic.com/[^)]+" | head -1)
  if [ -z "$url" ]; then
    echo "no font URL returned for $query" >&2
    exit 1
  fi
  curl -s -o "src/lib/pdf/fonts/$out" "$url"
  echo "  $out  $(du -h "src/lib/pdf/fonts/$out" | cut -f1)"
}

fetch "Newsreader:opsz,wght@6..72,400" Newsreader-Regular.ttf
fetch "Newsreader:opsz,wght@6..72,600" Newsreader-SemiBold.ttf
fetch "Inter:wght@400"                 Inter-Regular.ttf
fetch "Inter:wght@600"                 Inter-SemiBold.ttf

# Plex Mono comes from IBM rather than Google. The file Google serves for this
# family has a loca table fontkit cannot read: every glyph is fine on its own
# and laying out a string containing a space throws "Offset is outside the
# bounds of the DataView", which kills the PDF render. IBM's own build parses.
curl -sL -o src/lib/pdf/fonts/IBMPlexMono-Regular.ttf \
  "https://raw.githubusercontent.com/IBM/plex/master/packages/plex-mono/fonts/complete/ttf/IBMPlexMono-Regular.ttf"
echo "  IBMPlexMono-Regular.ttf  $(du -h src/lib/pdf/fonts/IBMPlexMono-Regular.ttf | cut -f1)"

# Prove every file lays out before embedding it, because a font that parses
# glyph by glyph can still fail on a real line of text.
node -e "
const fk = require('fontkit');
const fs = require('fs');
for (const f of fs.readdirSync('src/lib/pdf/fonts').filter((n) => n.endsWith('.ttf'))) {
  const t = fk.openSync('src/lib/pdf/fonts/' + f);
  t.layout('Score 100 of 100, /guides/book').glyphs.forEach((g) => g.advanceWidth);
  console.log('  parsed ' + f);
}
"

node -e "require('./scripts/embed-fonts.cjs')"
