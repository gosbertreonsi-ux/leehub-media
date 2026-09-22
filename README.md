# PlayHub

A YouTube-style video feed clone with a payment gate: the home feed and
sidebar are locked behind a card-details modal until the (mock) checkout
form is submitted.

## Files
- `index.html` — the home feed + payment gate
- `admin.html` — admin dashboard for uploading videos
- `styles.css` — shared styling (dark theme, layout, gate modal, empty state)
- `admin.css` — dashboard-only styling
- `script.js` — renders the feed from admin-uploaded videos and runs the paywall
- `admin.js` — upload form logic (thumbnail resize, save/list/delete)

## Running it
No build step needed. Open `index.html` in a browser, or in VS Code use the
**Live Server** extension and click "Go Live" for auto-reload while you edit.

## How the admin dashboard works
- Go to `admin.html` (there's an "Admin dashboard" link in the home page's
  sidebar) and use the form to publish a video: title, channel, length,
  optional description, and a thumbnail image.
- Uploaded videos are saved to `localStorage` under the key
  `playhub_admin_videos` and only show up on the home feed **after** a
  visitor has passed the payment gate — before that, the feed is
  blurred and locked regardless of what's been uploaded.
- This works fully in one browser right now. **It does not sync between
  different people's browsers or devices** — that needs a real backend
  (e.g. a small API + database) so uploads are stored server-side and
  every visitor's paywall check happens against your server, not their
  local storage. Happy to help build that next.

## Notes
- Payment is **mocked**: the form validates the fields look plausible, then
  flips a `playhub_paid` flag in `localStorage` after a short delay. No real
  charge happens and no card, mobile money, or upload data leaves the page.
- To take real payments you'll need a backend and a processor/aggregator —
  for Tanzanian mobile money that's typically something like Selcom, DPO,
  or Flutterwave; for cards, Stripe.
- Thumbnails you upload are resized client-side before saving, to keep
  `localStorage` usage small (it has a ~5MB per-origin limit).
