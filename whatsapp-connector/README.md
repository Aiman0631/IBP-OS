# LeadFlow WhatsApp Web Connector

This is the persistent server component for the dashboard's real WhatsApp Web connection. It uses `whatsapp-web.js` and `LocalAuth` so the browser session can persist on a server with persistent storage.

## Endpoints

- `GET /health` — connection status
- `GET /qr` — current QR code as a data URL while pairing
- `POST /send` — `{ "phone": "60123456789", "body": "Hello" }`
- `POST /logout` — log out the paired WhatsApp account

## Required environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT` (optional, defaults to 3001)
- `WA_SESSION_PATH` (optional, defaults to `./.wwebjs_auth`)

The service must have persistent disk/volume mounted at the session path. Without persistent storage, the WhatsApp Web session may require scanning the QR again after a restart.

## Deployment

Deploy the `whatsapp-connector` directory as a long-running Node/Docker service on a host that supports persistent storage. Netlify should remain the frontend host; this service should not be deployed as a Netlify Function.

## Security

Put this connector behind authentication or a private network before exposing `/send`, `/qr`, and `/logout` publicly. Never put the Supabase service-role key in frontend or GitHub source code.
