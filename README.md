# AquaAI Static Frontend (Vercel)

The frontend is a dependency-free responsive dashboard, so Vercel can host it as a static site. It shows the latest moisture, temperature, humidity, rain signal, previous water, recommendation, pump state, and recent readings. It can also simulate an ESP32 submission.

## Connect it to the backend

Before deployment, edit `config.js`:

```js
window.AQUAAI_API_BASE_URL = "https://your-render-service.onrender.com";
```

Do not add a trailing `/`. For local testing use `http://127.0.0.1:8000` while the FastAPI backend is running.

## Deploy to Vercel

1. Place the contents of this `frontend` folder in a GitHub repository and import that repository in Vercel.
2. Select framework preset **Other**. No build command or output directory is required.
3. Deploy. `vercel.json` supplies lightweight security headers and clean URLs.
4. Copy the Vercel URL and add it to the backend’s Render environment variable `ALLOWED_ORIGINS`.
5. Redeploy the Render service, then open the dashboard and choose **Refresh dashboard**.

You may also deploy through the Vercel CLI from this folder with `vercel --prod`.

## Local preview

Because this is static, serve the folder with any simple local static server. For example, VS Code Live Server or Python’s HTTP server both work. Do not open `index.html` directly from disk because browsers can block API requests from that origin.

Example:

```powershell
cd frontend
python -m http.server 5500
```

Then browse `http://127.0.0.1:5500`. Include this origin in `ALLOWED_ORIGINS` on the backend.

## Notes

- The dashboard uses only the AquaAI backend API; it does not control a pump directly.
- API base URL is kept in one short file so a beginner can replace it after creating the Render service. Do not place secrets in this frontend.
- Recent readings are temporary because the provided backend intentionally uses in-memory prototype storage.
