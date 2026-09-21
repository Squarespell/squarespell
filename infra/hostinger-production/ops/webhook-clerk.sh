#!/usr/bin/env bash
# Create the PRODUCTION Clerk webhook endpoint (user.created only) through Clerk's Svix app portal API and store its signing secret in
# the protected production env file WITHOUT ever printing it. Run as the deployment user (squarespell).
set -euo pipefail
ROOT=/opt/squarespell-quiz/production; ENVF=$ROOT/.env
DC=(docker compose --env-file $ENVF -f $ROOT/repo/infra/hostinger-production/docker-compose.production.yml)
URL="https://$(grep -m1 '^PROD_API_HOST=' $ENVF | cut -d= -f2-)/api/clerk/webhook"
SECRET=$("${DC[@]}" exec -T -e HOOK_URL="$URL" backend node -e "
const h={Authorization:'Bearer '+process.env.CLERK_SECRET_KEY,'Content-Type':'application/json'};
(async()=>{
  await fetch('https://api.clerk.com/v1/webhooks/svix',{method:'POST',headers:h});
  const u=await (await fetch('https://api.clerk.com/v1/webhooks/svix_url',{method:'POST',headers:h})).json();
  const key=JSON.parse(Buffer.from(new URL(u.svix_url).hash.replace('#key=',''),'base64').toString());
  const base='https://api.'+(key.region||'eu')+'.svix.com/api/v1';
  const t=await fetch(base+'/auth/one-time-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oneTimeToken:key.oneTimeToken})});
  if(t.status!==200){console.error('token exchange failed',t.status);process.exit(2)}
  const A={Authorization:'Bearer '+(await t.json()).token,'Content-Type':'application/json'};
  const list=await (await fetch(base+'/app/'+key.appId+'/endpoint',{headers:A})).json();
  let ep=(list.data||[]).find(e=>e.url===process.env.HOOK_URL);
  if(ep){console.error('endpoint already exists: '+ep.id.slice(0,8)+'.. filter '+JSON.stringify(ep.filterTypes))}
  else{const c=await fetch(base+'/app/'+key.appId+'/endpoint',{method:'POST',headers:A,body:JSON.stringify({url:process.env.HOOK_URL,description:'Squarespell Quiz production',version:1,filterTypes:['user.created']})});
    if(c.status>=300){console.error('endpoint create failed',c.status);process.exit(3)}ep=await c.json();console.error('endpoint created: '+ep.id.slice(0,8)+'.. filter '+JSON.stringify(ep.filterTypes))}
  const s=await (await fetch(base+'/app/'+key.appId+'/endpoint/'+ep.id+'/secret',{headers:A})).json();
  if(!s.key||s.key.indexOf('whsec_')!==0){console.error('no signing secret returned');process.exit(4)}
  process.stdout.write(s.key);
})().catch(e=>{console.error('ERROR',e.message);process.exit(1)});
")
case "$SECRET" in whsec_*) ;; *) echo "FAIL: no valid signing secret"; exit 1;; esac
sed -i "s|^CLERK_WEBHOOK_SECRET=.*|CLERK_WEBHOOK_SECRET=$SECRET|" $ENVF
chmod 600 $ENVF
echo "CLERK_WEBHOOK_SECRET stored (length ${#SECRET}); url $URL"
