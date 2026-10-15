# PlayHub

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

## Run locally
    cd backend  && npm install && npm start
    cd frontend && npm install && npm run dev

## Deploy
Backend:  root dir `backend`,  build `npm install`, start `npm start`.
          Add the 4 variables from backend/.env.example in the host's dashboard.
Frontend: root dir `frontend`, add the 3 variables from frontend/.env.example.
          Set NEXT_PUBLIC_BACKEND_API_URL to the deployed backend URL.
Never upload node_modules, .env or .vscode.
