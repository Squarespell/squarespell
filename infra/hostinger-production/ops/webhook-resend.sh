#!/usr/bin/env bash
# Create the PRODUCTION Resend webhook (the events the deployed handler processes) and store its signing secret in the protected
# production env file WITHOUT printing it. Run as the deployment user (squarespell).
set -euo pipefail
ROOT=/opt/squarespell-quiz/production; ENVF=$ROOT/.env
DC=(docker compose --env-file $ENVF -f $ROOT/repo/infra/hostinger-production/docker-compose.production.yml)
URL="https://$(grep -m1 '^PROD_API_HOST=' $ENVF | cut -d= -f2-)/api/webhooks/resend"
SECRET=$("${DC[@]}" exec -T -e HOOK_URL="$URL" backend node -e "
const H={Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'};
(async()=>{
  const l=await fetch('https://api.resend.com/webhooks',{headers:H});
  if(l.status===200){const j=await l.json();const ex=(j.data||[]).find(w=>w.endpoint===process.env.HOOK_URL);if(ex){console.error('a webhook for this URL already exists: '+String(ex.id).slice(0,8)+'.. - not creating a second one');process.exit(5)}}
  else{console.error('list webhooks status',l.status)}
  const c=await fetch('https://api.resend.com/webhooks',{method:'POST',headers:H,body:JSON.stringify({endpoint:process.env.HOOK_URL,events:['email.delivered','email.opened','email.clicked','email.bounced','email.complained']})});
  const j=await c.json().catch(()=>({}));
  if(c.status>=300){console.error('create failed',c.status,String(j.message||j.name||'').slice(0,120));process.exit(3)}
  console.error('webhook created: '+String(j.id).slice(0,8)+'..');
  if(!j.signing_secret||j.signing_secret.indexOf('whsec_')!==0){console.error('no signing secret returned');process.exit(4)}
  process.stdout.write(j.signing_secret);
})().catch(e=>{console.error('ERROR',e.message);process.exit(1)});
")
case "$SECRET" in whsec_*) ;; *) echo "FAIL: no valid signing secret"; exit 1;; esac
sed -i "s|^RESEND_WEBHOOK_SECRET=.*|RESEND_WEBHOOK_SECRET=$SECRET|" $ENVF
chmod 600 $ENVF
echo "RESEND_WEBHOOK_SECRET stored (length ${#SECRET}); url $URL"
