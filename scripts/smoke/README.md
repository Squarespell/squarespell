# Smoke test (`scripts/smoke/smoke.mjs`)

A dependency-free (Node >= 18) end-to-end check of the Quiz API: health, readiness, auth, create, save, publish,
hosted link, embed, lead submit, lead visible in the owner dashboard, analytics, cleanup.

```bash
# 1. get a CURRENT Clerk session token for a TEST account (browser: window.Clerk.session.getToken())
export SMOKE_CLERK_TOKEN='<jwt>'            # read from the environment only; never passed on the command line, never printed

# 2. run against staging / a preview backend / a local server
node scripts/smoke/smoke.mjs --base-url https://<staging-api> --frontend-url https://<staging-app>

# optional
#   --keep         leave the P1-SMOKE quiz in place (default: archive it)
#   --allow-live   REQUIRED to run against a host containing squarespell.com, squarespellquiz.com or onrender.com
```

* Everything it creates is tagged **`P1-SMOKE`**: quiz title and slug, lead email `p1-smoke-<run>@example.com`, analytics session ids. (The lead *name* is "Smoke Tester": the API's name validator rejects digits, so it cannot carry the tag.)
* Cleanup archives the quiz (soft delete). Leads are not deleted; find them by the tag.
* On a real backend the lead submission triggers the real result email and owner notification. Use a test owner account.
* Exit code 0 = every step passed; 1 = a step failed; 2 = bad usage / missing token; 3 = refused (live host without `--allow-live`).
* Hermetic self-test: `backend/src/__tests__/phase1/smoke.test.ts` runs this script against the in-process app and a local database.
