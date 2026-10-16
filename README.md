# PlayHub

PlayHub is a video streaming site built for Tanzanian content. Viewers pay a small access fee with mobile money (M-Pesa, Tigo Pesa, Airtel Money, Halo Pesa) or card, then browse and watch videos. Some videos are free and some are pay-per-view. An admin panel lets you upload videos, set prices, and manage the feed.

---

## Screenshots

### Home page
The main feed with the hero banner, search, filter chips and video grid.

![Home page](home.png)

### Access gate
The pop-up shown when someone first opens the site. It takes the entry fee by mobile money or card.

![Access gate](access-gate.png)

### Video player
Watch in theater mode, or shrink the player and keep browsing.

![Video player](player.png)

### Admin control panel
Upload videos, set prices, add thumbnails and manage the feed.

![Admin panel](admin.png)

<!-- Put your images in docs/screenshots/ and keep the file names above, or change the paths to match yours. -->

---

## What it does

- Home feed with a cinematic hero banner and a grid of videos
- Search by video title or channel
- Filter chips: All, Premium, Free, Movies, Series, Live
- Entry paywall (TSh 20,000) with mobile money and card options
- Pay-per-view for individual premium videos
- Video player with a mini mode, so people can keep watching while they browse
- Admin panel with a passcode login to publish and delete videos
- Videos can be uploaded from your computer or linked from YouTube, Vimeo or Bunny Stream

---

## Built with

| Part | Tools |
| --- | --- |
| Frontend | Next.js, React, Tailwind CSS, Lucide icons |
| Backend | Node.js and Express |
| Storage | Supabase Storage |
| Payments | Mobile money push requests through the backend |

---

## Project structure

```
playhub/
├── backend/     Express API  -> deploy to Render / Railway / VPS
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env              (PORT, Supabase keys, secret key)
└── frontend/    UI (playhub-ui) -> deploy to Vercel / Netlify
    ├── public/
    ├── package.json
    └── .env.local        (backend URL + public Supabase keys only)
```

---

## Getting started

You need [Node.js](https://nodejs.org) installed.

### 1. Download the project

```bash
git clone <your-repo-url>
cd playhub
```

### 2. Start the backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` (see the Environment variables section below), then run:

```bash
npm start
```

The API runs on `http://localhost:5001` by default.

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file inside `frontend/`, then run:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

The admin panel is at `http://localhost:3000/admin`.

---

## Environment variables

Never commit your `.env` or `.env.local` files. Keep them out of git.

### backend/.env

```
PORT=5001
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
SECRET_KEY=your-secret-key
```

### frontend/.env.local

```
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:5001/api
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_PLAYHUB_SECRET_KEY=your-admin-passcode
```

The variable names above are examples. Use the names your own code reads.

---

## Deploying

| Part | Where | What to remember |
| --- | --- | --- |
| Backend | Render, Railway or a VPS | Add the backend environment variables in the dashboard |
| Frontend | Vercel or Netlify | Set `NEXT_PUBLIC_BACKEND_API_URL` to your live backend address |

Deploy the backend first so you have its address for the frontend.

---

## Good to know

- The arrow button on the access gate lets anyone in for free. It is there for testing, so remove it before you go live.
- The video files live in a Supabase Storage bucket, so make sure the bucket exists and is set to public if you want people to stream from it.
- Anything starting with `NEXT_PUBLIC_` is visible in the browser. Don't put real secrets in those variables.

---

## License

Add your license here.
