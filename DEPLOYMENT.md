# Deployment Notes

This site is deployed with GitHub Pages from the `docs/` folder.
The OTP auth server is a separate service and must be deployed and configured independently.

## Important

- `dist/` is only the local Vite build output.
- GitHub Pages does **not** serve `dist/` in this repo setup.
- GitHub Pages serves `docs/`.
- If `dist/` is rebuilt but `docs/` is not updated, the site can go blank.

## OTP Auth Service

The signup and password-reset flows depend on `server/otp-auth-server.mjs` running as a separate service from GitHub Pages.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAILERSEND_API_TOKEN`
- `MAILERSEND_FROM_EMAIL`
- `OTP_HASH_SECRET`

Optional but expected:

- `MAILERSEND_FROM_NAME`
- `OTP_ALLOWED_ORIGINS`
- `OTP_SERVER_PORT`

The Pages build must point `VITE_OTP_API_BASE_URL` at the live OTP service URL.

## OTP Auth Verification Checklist

After changing OTP service configuration:

1. Restart or redeploy the OTP service.
2. Confirm `GET /healthz` returns `200`.
3. Confirm `GET /auth/status` returns `200` with `"signupReady": true` and `"resetReady": true`.
4. Confirm the GitHub Pages build still injects the correct `VITE_OTP_API_BASE_URL`.
5. Verify signup and forgot-password flows end to end in the deployed site.

## Why The Blank Site Happens

Vite creates hashed asset filenames such as:

- `assets/index-ABC123.js`
- `assets/index-XYZ456.css`

When a new build is created, those filenames change.

If `docs/index.html` still points to the old filenames, the browser cannot load the main JS/CSS bundle from `docs/assets/`, and the site renders as a blank page.

## Correct Deploy Process

From the project root, run:

```bash
npm run deploy:docs
```

That command:

1. builds the app into `dist/`
2. copies the fresh build from `dist/` into `docs/`
3. preserves the existing `CNAME`

## After Running The Deploy Command

Commit and push the updated `docs/` files:

```bash
git add docs
git commit -m "Update GitHub Pages build"
git push
```

## GitHub Pages Setting

Keep GitHub Pages pointed at:

- Branch: your publishing branch
- Folder: `/docs`

Do **not** point GitHub Pages at `dist/`.

## Quick Fix If The Site Is Blank

Run:

```bash
npm run deploy:docs
git add docs
git commit -m "Fix stale Pages build"
git push
```
