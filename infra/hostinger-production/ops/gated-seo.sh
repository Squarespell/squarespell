#!/usr/bin/env bash
# Gated production checks (run from the allowlisted server): status, robots header/meta, canonical, Open Graph, old-domain references, sitemap, robots.txt, embed loader.
H=$(grep -m1 '^PROD_APP_HOST=' /opt/squarespell-quiz/production/.env | cut -d= -f2-)
echo "== pages on https://$H =="
for p in / /pricing /templates /integrations /support /terms /privacy /sign-in /sign-up; do
  f=$(mktemp); hdr=$(curl -s -D - -o $f "https://$H$p")
  code=$(echo "$hdr" | head -1 | cut -d' ' -f2)
  xr=$(echo "$hdr" | grep -i '^x-robots-tag' | tr -d '\r' | cut -d: -f2- | xargs)
  canon=$(grep -o '<link[^>]*rel="canonical"[^>]*>' $f | grep -o 'href="[^"]*"' | head -1 | cut -d'"' -f2)
  robots=$(grep -o '<meta name="robots" content="[^"]*"' $f | head -1 | cut -d'"' -f4)
  ogimg=$(grep -c 'property="og:image"' $f); ogtit=$(grep -c 'property="og:title"' $f); ogurl=$(grep -o 'property="og:url" content="[^"]*"' $f | head -1 | cut -d'"' -f4)
  old=$(grep -oE 'app\.squarespell\.com|quiz\.squarespell\.com|onrender\.com|vercel\.app|staging\.squarespellquiz|localhost:' $f | sort -u | tr '\n' ',')
  echo "$p http=$code xrobots=[$xr] meta=[$robots] canon=[$canon] og(img/title)=$ogimg/$ogtit ogurl=[$ogurl] oldrefs=[$old]"
  rm -f $f
done
echo "== sitemap =="; curl -s "https://$H/sitemap.xml" | grep -o '<loc>[^<]*' | sed 's/<loc>//' | tr '\n' ' '; echo
echo "== robots.txt =="; curl -s "https://$H/robots.txt" | head -6 | tr '\n' ' '; echo
echo "== embed loader =="; echo "embed.js http=$(curl -s -o /tmp/e.js -w '%{http_code} %{content_type}' https://$H/embed.js) acao=$(curl -sI https://$H/embed.js | grep -ci 'access-control-allow-origin: \*') dynamic_base=$(grep -c 'squarespellquiz' /tmp/e.js)"
echo "opengraph image: $(curl -s -o /dev/null -w '%{http_code} %{content_type}' https://$H/opengraph-image)"
echo "www redirect: $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://www.$H/pricing)"
echo "http->https: $(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://$H/)"
