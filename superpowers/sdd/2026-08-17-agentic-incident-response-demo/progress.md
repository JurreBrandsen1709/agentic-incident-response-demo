# SDD ledger — plan: docs/superpowers/plans/2026-08-17-agentic-incident-response-demo.md

## Setup

- Branch strategy: working directly on `main` (user's explicit choice — Task 1 establishes `main` itself; no existing history to protect since the GitHub repo doesn't exist yet).
- Ruling: work directly on `main`, no worktree isolation — Ruling recorded per human partner's explicit choice, not a controller decision. Cost if wrong: low (recoverable via git reflog / repo deletion before any real audience sees it).

## Pre-flight conflict scan

| Pair / Task | Produces | Consumes | Finding |
|---|---|---|---|
| Task 2 → Task 3 | `Record`, `IRecordStore`, `RecordStore(IReadOnlyList<Record>)`, `RecordStore.FromFixtureFile(string): RecordStore` | Task 3's `Program.cs` calls `RecordStore.FromFixtureFile(fixturePath)` and `store.GetRecordsForWindow(fromUtc, toUtc)` | Match, clean |
| Task 2 → Task 9 | `RecordStore.cs` contains literal line `r.TimestampUtc >= fromUtc && r.TimestampUtc <= toUtc` | Task 9's `seed-bug.js` `OLD_LINE` constant is that exact string | Match, clean |
| Task 2 → Task 5 | `app/ReconciliationJob.sln` | Task 5's `ci.yml` runs `dotnet test app/ReconciliationJob.sln` | Match, clean |
| Task 3 → Task 6 | `Program.cs` CLI contract (`fixturePath fromUtcIso toUtcIso` → `records_processed: N` on stdout), `fixtures/boundary-batch.json` | Task 6's `nightly-job.yml` invokes exactly that CLI shape against that fixture | Match, clean |
| Task 4 → Task 7 | `incident-log/incidents.json` shape `{date, symptom, symptomKeywords, rootCause, resolution}`; ADR files with first-line `keywords: [...]` | Task 7's `pretriage.js` `findPastIncident`/`findAdrMatch` read exactly those shapes | Match, clean |
| Task 6 → Task 7 | `simulate-alert.js` alert object `{metric, observed, expectedRange, timestampUtc, source}` | Task 7's `pretriage.js` `renderIssueBody` reads exactly those fields from `ALERT_PAYLOAD` | Match, clean |
| Task 7 → Task 8 | Issue labeled `incident:triage-ready` | Task 8's `incident-agent.yml` `label_trigger: "incident:triage-ready"` | Match, clean (identical string) |
| Task 5 → Task 9 | `ci.yml` job id `test`, produces check-runs on any PR | Task 9's `seed-bug.js` `waitForChecks` polls the check-runs API generically (no hardcoded job name) | Match, clean — ordering also correct (Task 9 runs after Task 5) |
| Tasks 6/7/8/9 → Task 10 | Exact filenames `nightly-job.yml`, `pretriage.yml`, `incident-agent.yml`, `seed.yml`, `ci.yml`, `simulate-alert.js`, `pretriage.js`, `seed-bug.js` | Task 10's `README.md` references all of these by name | Match, clean |
| Task 6 self-check | Task 6 Step 4 explicitly states full verification is deferred until Task 7 exists | N/A | Not a defect — the plan itself flags this; carry this note to Task 6's reviewer so partial verification isn't flagged as a spec gap |
| Task 8 write-scope claim | Spec/plan describe `src/**`, `docs/adr/**`, `incident-log/PIR-*.md` as an "allowlist" | Enforcement is prompt-only (`incident-responder.md` rule 7) — `claude_args`/`allowedTools` restricts *tools* (Read/Grep/Glob/Edit), not *paths* within Edit | Not a contradiction — spec never claims hard technical path enforcement, only an explicit, named scope vs. open-ended. Noted, not ruled on; carry as context to Task 8's reviewer so it isn't mistaken for a missed requirement. |

Scan result: clean. No rulings required before execution begins.

## Task log

Task 1: complete (controller-executed, not subagent-dispatched — Task 1 has no code interfaces and includes a credential-handling step that must stay with the human; ruling: controller runs the non-secret gh/git commands directly, human runs `gh secret set` themselves). Repo created and pushed: https://github.com/JurreBrandsen1709/agentic-incident-response-demo. Both secrets (`ANTHROPIC_API_KEY`, `DEMO_PAT`) confirmed present via `gh secret list`.

Task 2: review found 2 Critical — (1) target framework `net10.0` instead of mandated `net8.0` in both csproj files; (2) ~145 files of committed build output (bin/obj, no .gitignore) bloating the repo. ⚠️ "push actually ran" item resolved by controller directly: confirmed `origin/main` == local HEAD (952b0f3) — not a gap. Minor: stray `.slnx` file, missing EOF newline, FromFixtureFile untested (acceptable, deferred to Task 3 per brief) — logged as deferred minors, not entering the fix loop. Entering fix round 1 on the two Criticals (resume task2-impl).
