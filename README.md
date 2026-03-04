Welcome to my blindfold chess project!

If you want to join in on the project, email me at willfspot@yahoo.co.uk

## OTP email auth server (MailerSend)

This repo now includes a lightweight backend OTP server:
- `POST /auth/send-otp`
- `POST /auth/verify-otp`

### 1) Configure env

Copy values from `.env.example` into your local env file and set at least:
- `MAILERSEND_API_TOKEN`
- `MAILERSEND_FROM_EMAIL`
- `OTP_HASH_SECRET`

### 2) Run server

```bash
npm run auth:dev
```

Server runs at `http://localhost:8787` by default.

### 3) Test endpoints

```bash
curl -X POST http://localhost:8787/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

```bash
curl -X POST http://localhost:8787/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","otp":"123456"}'
```

### Production setup checklist

OTP only works in production if both frontend and backend envs are configured:

- Frontend build env:
  - `VITE_OTP_API_BASE_URL=https://your-otp-api.example.com`
  - If using GitHub Pages deploy, set this as a repository secret named `VITE_OTP_API_BASE_URL`.
- OTP server env:
  - `OTP_ALLOWED_ORIGINS=https://williampotter.github.io,http://localhost:5173` (replace with your real site origin)
  - `MAILERSEND_API_TOKEN`, `MAILERSEND_FROM_EMAIL`, and `OTP_HASH_SECRET` must be set on the deployed server.
