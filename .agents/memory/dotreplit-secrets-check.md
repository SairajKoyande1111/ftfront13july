---
name: .replit userenv secrets exposure
description: Why to check .replit for plaintext credentials during import setup, and how to fix it.
---

Imported projects sometimes carry live plaintext credentials in `.replit`'s `[userenv.shared]` block (committed to git). During "set up imported project" work, check this section, not just whether the app boots.

**Why:** `.replit` is git-tracked; plaintext keys there (DB passwords, payment keys, messaging tokens) are exposed in repo/version history even after removal, and can silently duplicate/conflict with proper Replit Secrets.

**How to apply:** Read `.replit` for a `[userenv.shared]` block. Move sensitive values to Replit Secrets (via `requestSecrets`, cannot be set directly with a pre-known value) or to plain env vars via `setEnvVars` (for values that are inherently client-exposed, e.g. `VITE_`-prefixed publishable keys). Then rewrite `.replit` without the block using `verifyAndReplaceDotReplit` (direct edits to `.replit` are blocked). Recommend the user rotate any credential that was exposed this way.
