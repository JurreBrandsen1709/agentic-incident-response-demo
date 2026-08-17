# Agentic Incident Response — Demo

Backs the "Agentic Incident Response" talk (ISKS 2026). Everything here is
real and runnable except one thing: the Azure Application Insights anomaly
alert, which is simulated by `scripts/simulate-alert.js`. Nothing downstream
of that simulated trigger is faked — no vendor SRE platform, no live Azure
subscription required.

## Use this template

Click "Use this template" on GitHub, or:

```bash
gh repo create <you>/incident-demo-<instance> --public \
  --template JurreBrandsen1709/agentic-incident-response-demo --clone
```

Each generated instance needs its own secrets (not copied by template
generation):

```bash
gh secret set ANTHROPIC_API_KEY --repo <you>/incident-demo-<instance>
gh secret set DEMO_PAT --repo <you>/incident-demo-<instance>
```

`DEMO_PAT` is a fine-grained personal access token scoped to that repo only,
with Contents/Issues/Pull requests set to Read and write. It's required
because GitHub Actions does not start new workflow runs for events triggered
by the default `GITHUB_TOKEN` (except `workflow_dispatch` and
`repository_dispatch`) — this repo's pre-triage and seeding steps need to
trigger other workflows, so they use `DEMO_PAT` instead.

Re-apply branch protection on the new instance's `main` (see Task 10, Step 1
in the implementation plan for the exact command) — template generation does
not copy branch protection rules.

## Run it

1. Seed the bug (once per instance):
   ```bash
   gh workflow run seed.yml --repo <you>/incident-demo-<instance>
   ```
   Wait for it to open a PR and report that CI passed, then review the diff
   and merge that PR yourself. There's no formal approval step — GitHub
   blocks a PR author from approving their own PR, and branch protection is
   configured with 0 required approvals for exactly that reason.

2. Trigger the incident:
   ```bash
   gh workflow run nightly-job.yml --repo <you>/incident-demo-<instance>
   ```
   This runs the (now-buggy) reconciliation job against a batch fixture
   where every record shares one timestamp on the window's boundary,
   observes `records_processed: 0`, and fires a simulated anomaly alert.

3. Watch: a curated Issue appears, labeled `incident:triage-ready`. The
   agent (`claude-code-action`) picks it up automatically — no human clicks
   "assign" — investigates, and opens a PR with a root-cause explanation, a
   fix, a new regression test, and a filled-in post-incident review at
   `incident-log/PIR-<date>.md`.

4. Review and merge that PR yourself. Re-run `nightly-job.yml` to confirm
   the job resolves (`records_processed: 5`, not `0`) — the incident is
   closed, not just the PR merged.

## Verifying a fresh instance end-to-end

Before relying on the template for a live demo, verify it on a disposable
instance rather than on the template source repo itself. Each `claude-code-action`
run in step 5 below is a real, billed Claude API call — don't re-run it
speculatively; only trigger it once you're confident the rest of the pipeline
(seed → nightly job → pre-triage → issue) already worked.

1. Generate a disposable instance:
   ```bash
   gh repo create <you>/incident-demo-check --public \
     --template JurreBrandsen1709/agentic-incident-response-demo
   ```

2. Re-apply branch protection (not copied by template generation):
   ```bash
   gh api -X PUT repos/<you>/incident-demo-check/branches/main/protection \
     --input branch-protection.json
   ```
   where `branch-protection.json` contains:
   ```json
   {
     "required_status_checks": null,
     "enforce_admins": true,
     "required_pull_request_reviews": { "required_approving_review_count": 0 },
     "restrictions": null
   }
   ```
   Write this file without a UTF-8 BOM (e.g. via `[System.IO.File]::WriteAllText`
   on Windows) — a BOM makes GitHub's API reject the JSON with a parsing error.

3. Set both secrets on the new instance (a fine-grained `DEMO_PAT` scoped to
   *this* repo only, not reused from another instance):
   ```bash
   gh secret set ANTHROPIC_API_KEY --repo <you>/incident-demo-check
   gh secret set DEMO_PAT --repo <you>/incident-demo-check
   ```

4. Run through "Run it" above (seed → merge → trigger → wait for the issue).

5. Once the `incident:triage-ready` issue exists, confirm `incident-agent.yml`
   picked it up (`gh run list --workflow=incident-agent.yml`), then review and
   merge its PR, then re-run `nightly-job.yml` to confirm resolution.

6. Delete the disposable instance once done: `gh repo delete <you>/incident-demo-check --yes`.

**Important — never run `seed.yml` against the actual template source repo.**
Doing so leaves `RecordStore.cs` permanently in its buggy state on `main`, so
every future instance generated from the template inherits the bug already
applied and `seed-bug.js` fails with "Expected line not found" (there's no
longer an inclusive-bound line left to replace). If this happens, merge the
agent's fix PR on the source repo to restore it to a clean state before
generating any more instances.

**Also note:** template generation squashes history into a single "Initial
commit" — if an instance's bug came from generation rather than a real
`seed.yml` run, the pre-triage issue's "Deploy diff" section shows that
generic initial commit instead of the disguised refactor commit message,
which weakens the demo's "boring commit hid the bug" narrative. Always run
`seed.yml` for a genuinely fresh instance rather than starting from an
already-seeded template.

## Repository layout

- `app/` — the staged .NET reconciliation job and its tests.
- `docs/adr/` — architecture decision records the pre-triage step can match against.
- `incident-log/` — past incidents (flat keyword-searchable) and the PIR template.
- `.github/agents/incident-responder.md` — the agent's system prompt.
- `.github/workflows/` — `nightly-job.yml`, `pretriage.yml`, `incident-agent.yml`, `seed.yml`, `ci.yml`.
- `scripts/` — `simulate-alert.js`, `pretriage.js`, `seed-bug.js`. No npm dependencies; Node.js built-ins only.
