#!/usr/bin/env bash
# Safe scheduled-job test on a DISPOSABLE clone. Every recipient is rewritten to the owner test address before any job runs.
set -uo pipefail
ROOT=/opt/squarespell-quiz/production; ENVF=$ROOT/.env
DC=(docker compose --env-file $ENVF -f $ROOT/repo/infra/hostinger-production/docker-compose.production.yml)
val() { grep -m1 "^$1=" $ENVF | cut -d= -f2-; }
AUTHPW=$(val AUTHENTICATOR_PASSWORD); JWT=$(val PGRST_JWT_SECRET); CRON=$(val CRON_SECRET)
NET=jt_net; DB=quiz_jobtest; PDB=squarespell-quiz-production-db-1
SCHED=$ROOT/repo/infra/hostinger-production/scheduler/scheduler.sh
pg() { "${DC[@]}" exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
cnt() { pg -d $DB -At -c "select count(*) from $1" 2>/dev/null || echo n/a; }
prodcnt() { pg -d quiz_production -At -c "select (select count(*) from email_logs)||'/'||(select count(*) from platform_email_logs)||'/'||(select count(*) from email_sequence_queue)" 2>/dev/null || echo n/a; }
cleanup() { docker rm -f jt-backend jt-gateway jt-rest >/dev/null 2>&1; docker network disconnect $NET $PDB >/dev/null 2>&1; docker network rm $NET >/dev/null 2>&1; docker volume rm jt_state_scheduler jt_state_worker >/dev/null 2>&1; pg -d postgres -c "drop database if exists $DB" >/dev/null 2>&1; echo "R: cleaned up (containers, network, volumes, clone database removed)"; }
trap cleanup EXIT
cleanup >/dev/null 2>&1
PROD_BEFORE=$(prodcnt)
pg -d postgres -c "create database $DB"
"${DC[@]}" exec -T db sh -c "pg_dump -U postgres --no-owner quiz_production | psql -q -v ON_ERROR_STOP=1 -U postgres -d $DB" >/dev/null
pg -d $DB >/dev/null <<'SQL'
do $$ declare r record; begin
  for r in select c.table_name, c.column_name from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.table_type='BASE TABLE'
           where c.table_schema='public' and c.data_type in ('text','character varying') and c.column_name in ('email','to_email','recipient_email','owner_email','lead_email','notification_email','notify_email','recipient') loop
    execute format($f$update public.%I set %I = 'info+jt' || substr(md5(%I::text),1,10) || '@squarespell.com' where %I is not null and %I <> ''$f$, r.table_name, r.column_name, r.column_name, r.column_name, r.column_name);
  end loop;
end $$;
SQL
LEFT=$(pg -d $DB -At -c "select (select count(*) from users where coalesce(email,'') not like 'info+jt%@squarespell.com') + (select count(*) from leads where coalesce(email,'') not like 'info+jt%@squarespell.com')")
echo "R: recipients in the clone that are NOT the test address: $LEFT (must be 0)"
[ "$LEFT" = 0 ] || { echo "R: ABORT - unsafe"; exit 1; }
UID_=$(pg -d $DB -At -c "select id from users order by created_at limit 1")
pg -d $DB >/dev/null <<SQL
with q as (insert into quizzes(user_id,title,slug,status,questions,outcomes,settings,mode) values ('$UID_','JT quiz','jt-'||substr(md5(random()::text),1,8),'live','[]'::jsonb,'[]'::jsonb,'{}'::jsonb,'lead_quiz') returning id),
 l as (insert into leads(quiz_id,user_id,email) select id,'$UID_','info+jtlead@squarespell.com' from q returning id,quiz_id),
 s as (insert into email_sequences(quiz_id,emails,enabled,name) select quiz_id,'[{"delay_days":0,"subject":"JT sequence","body":"disposable test"}]'::jsonb,true,'jt' from l returning id)
insert into email_sequence_queue(lead_id,sequence_id,send_at) select l.id,s.id,now()-interval '1 minute' from l,s;
SQL
echo "R: disposable rows seeded: quizzes/leads/queue = $(cnt "quizzes where title='JT quiz'")/$(cnt "leads where email='info+jtlead@squarespell.com'")/$(cnt "email_sequence_queue where status='pending'")"
docker network create --internal $NET >/dev/null
docker network connect --alias db $NET $PDB
docker run -d --name jt-rest --network $NET --network-alias rest -e PGRST_DB_URI=postgres://authenticator:$AUTHPW@db:5432/$DB -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=$JWT -e PGRST_SERVER_PORT=3000 postgrest/postgrest:v12.2.3 >/dev/null
docker run -d --name jt-gateway --network $NET --network-alias gateway -v $ROOT/repo/infra/hostinger/Caddyfile.rest:/etc/caddy/Caddyfile:ro caddy:2.8 >/dev/null
docker run -d --name jt-backend --network $NET --network-alias backend --env-file $ENVF -e NODE_ENV=production -e PORT=3001 -e SUPABASE_URL=http://gateway:3100 -e ADMIN_EMAILS=info@squarespell.com -e DISABLE_INPROCESS_EMAIL_QUEUE=true -e STRIPE_SECRET_KEY=sk_test_jobtest_placeholder -e STRIPE_WEBHOOK_SECRET= -e FRONTEND_URL=https://squarespellquiz.com squarespell-quiz-production-backend >/dev/null
docker network connect bridge jt-backend
ok=0; for i in $(seq 1 40); do docker exec jt-backend node -e "fetch('http://127.0.0.1:3001/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && { ok=1; break; }; sleep 3; done
echo "R: test backend on the clone ready=$ok"; [ $ok = 1 ] || { docker logs jt-backend 2>&1 | tail -5 | cut -c1-120; exit 1; }
tick() { docker run --rm --network $NET -v jt_state_$1:/home/curl_user -v $SCHED:/opt/scheduler.sh:ro -e API_URL=http://backend:3001 -e CRON_SECRET="$3" -e ENABLE_EMAIL_JOBS=$4 -e NOW_EPOCH=$2 -e SCHEDULER_ONE_TICK=1 -e STATE_DIR=/home/curl_user/state curlimages/curl:8.8.0 sh /opt/scheduler.sh $1 2>&1 | sed -E 's/^[0-9T:Z-]+ /   /' | cut -c1-100; }
sends() { echo "R: sent-log rows: email_logs=$(cnt email_logs) platform=$(cnt platform_email_logs) queue_pending=$(cnt "email_sequence_queue where status='pending'") queue_sent=$(cnt "email_sequence_queue where status='sent'")"; }
sends
echo "R: A scheduler 09:00 Mon 1st (trial-reminders, lead-milestones, scheduled-sends)"; tick scheduler 1780304400 "$CRON" true
echo "R: B scheduler 10:00 (scheduled-sends, weekly-digest, monthly-report)"; tick scheduler 1780308000 "$CRON" true
echo "R: C worker 10:00 (email-queue drain)"; tick worker 1780308000 "$CRON" true
echo "R: D scheduler 10:30 (cache cleanup)"; tick scheduler 1780309800 "$CRON" true
sleep 5; sends; S1="$(cnt email_logs)/$(cnt platform_email_logs)"
echo "R: E restart inside the same minutes (B and C again) - must SKIP"; tick scheduler 1780308000 "$CRON" true; tick worker 1780308000 "$CRON" true
sleep 3; sends; S2="$(cnt email_logs)/$(cnt platform_email_logs)"
[ "$S1" = "$S2" ] && echo "R: dedupe PASS (no new sends after restart)" || echo "R: dedupe FAIL ($S1 -> $S2)"
echo "R: F failure logging: wrong secret at 11:30"; tick scheduler 1780313400 "wrong-secret" false
echo "R: G deliberate retry via once (correct secret)"; docker run --rm --network $NET -v jt_state_scheduler:/home/curl_user -v $SCHED:/opt/scheduler.sh:ro -e API_URL=http://backend:3001 -e CRON_SECRET="$CRON" -e NOW_EPOCH=1780313400 -e STATE_DIR=/home/curl_user/state curlimages/curl:8.8.0 sh /opt/scheduler.sh once /api/cron/cleanup-preview-cache 2>&1 | sed -E 's/^[0-9T:Z-]+ /   /' | cut -c1-100
echo "R: production email/platform/queue rows before=$PROD_BEFORE after=$(prodcnt) (must be identical)"
