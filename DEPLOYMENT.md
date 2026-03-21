# Deployment Notes

This site is deployed with GitHub Pages from the `docs/` folder.

## Important

- `dist/` is only the local Vite build output.
- GitHub Pages does **not** serve `dist/` in this repo setup.
- GitHub Pages serves `docs/`.
- If `dist/` is rebuilt but `docs/` is not updated, the site can go blank.

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
