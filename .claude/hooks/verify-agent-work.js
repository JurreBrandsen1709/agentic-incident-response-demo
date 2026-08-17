#!/usr/bin/env node
// Stop hook: before the incident-responder agent finishes, checks that a
// committed code fix is backed by a regression test and a filled-in PIR.
// Blocks with a reason (Claude keeps working) rather than failing the job.
// An explicit "OVERRIDE: <reason>" line in the final message bypasses this,
// for cases where a test or PIR genuinely isn't warranted.

const { execSync } = require("child_process");

function readStdin() {
  const chunks = [];
  process.stdin.on("data", (c) => chunks.push(c));
  return new Promise((resolve) => {
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function changedFiles() {
  try {
    execSync("git fetch origin main --depth=50", { stdio: "ignore" });
  } catch {
    // best effort; the diff below still works if origin/main is already known
  }
  try {
    const out = execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const raw = await readStdin();
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {
    // malformed input -- fail open, don't block on our own parsing error
  }

  const lastMessage = input.last_assistant_message || "";
  if (/OVERRIDE:/i.test(lastMessage)) {
    process.exit(0);
  }

  const files = changedFiles();
  const codeChanged = files.some((f) => /^app\/src\/.*\.cs$/.test(f));
  if (!codeChanged) {
    // No fix committed yet -- investigation may still be in progress.
    process.exit(0);
  }

  const testsChanged = files.some((f) => /^app\/tests\/.*\.cs$/.test(f));
  const pirAdded = files.some((f) => /^incident-log\/PIR-.*\.md$/.test(f));

  const missing = [];
  if (!testsChanged) missing.push("a regression test under app/tests/");
  if (!pirAdded) missing.push("a filled-in PIR at incident-log/PIR-<date>.md");

  if (missing.length === 0) {
    process.exit(0);
  }

  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        `Your branch changes app/src/ but is missing ${missing.join(" and ")}. ` +
        `Add ${missing.length > 1 ? "these" : "this"} before finishing. If it genuinely ` +
        `isn't needed, explain why and include the literal line "OVERRIDE: <reason>" ` +
        `in your final message.`,
    })
  );
}

main();
