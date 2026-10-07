# Demo video scripts

Records the landing page demo by driving the real app with Playwright.

## Prerequisites

- Production build of the web app and the API running locally
- `ffmpeg` on PATH
- A throwaway email/password account with no conversations. Saved recipes may
  exist.

## Usage

```bash
node scripts/demo-video/save-auth.mjs     # once: log in manually, saves session
node scripts/demo-video/record-demo.mjs   # records the flow
node scripts/demo-video/finalize-demo.mjs # fast-forwards the AI wait, writes MP4
```

Environment variables: `DEMO_URL` (default `http://localhost:3000`),
`DEMO_PROMPT` (the recipe prompt typed on camera).

Output goes to `output/`, which is gitignored. Compress the result for the
landing page and copy it into `apps/web/public/videos/`:

```bash
ffmpeg -i output/cookloom-demo.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 \
  -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an \
  ../../apps/web/public/videos/cookloom-demo.mp4
```

`.auth/state.json` is a live login session. Never commit it.