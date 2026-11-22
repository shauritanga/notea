<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ship every change

When a change should be kept, finish it in this order:

1. Commit with a plain message. Do not add an assistant signature or Co-Authored-By trailer.
2. Push `main` to origin.
3. Redeploy by following `docs/DEPLOY.md`.
4. Summarize what changed, the commit, and whether the server is online.
