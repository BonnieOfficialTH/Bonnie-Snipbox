# snippet.

A local-first personal text template library built with React + Vite.

## Run locally

```bash
npm install
npm run dev
```

## Build and test

```bash
npm run build
npm run preview
npm test
```

## Project structure

```text
src/
  app/                  # App composition and page-level orchestration
  components/           # Shared presentation components
  features/
    collections/        # Collection-specific UI
    preferences/        # Preferences state and UI
    snippets/           # Snippet state, repository, editor, cards and preview
  lib/                  # Framework-independent template engine and utilities
  styles/               # Base styles and theme overrides
```

## Independent repositories

The frontend repository is this project root. The Google Apps Script backend is a separate repository in the sibling `../backend/` folder, so each side has its own remote, access, and history.

To check out both projects together:

```bash
mkdir snippet
cd snippet
git clone FRONTEND_REPOSITORY_URL frontend
git clone BACKEND_REPOSITORY_URL backend
```

The backend's setup, spreadsheet schema, API contract, and deployment instructions are in `../backend/README.md`.

## Deploy to Vercel

Import the frontend repository as a Vercel project. Use the Vite preset, `npm run build` as the build command, and `dist` as the output directory. The requested project/domain name is `bonnie-snipbox` (`bonnie-snipbox.vercel.app`, subject to availability).

## Architecture notes

- Feature-first organization keeps domain UI and state close together.
- `snippetRepository.js` is the persistence boundary. Components and feature hooks do not access localStorage directly. Replace this adapter with IndexedDB or an API-backed implementation later.
- `templateEngine.js` contains dynamic placeholder resolution and can be tested independently from React. Smart content uses readable tokens such as `{{today}}` and `{{project_name}}`; older stored field IDs are normalized when snippets are loaded.
- The snippet preview shows the resolved copy text in one area. Edit template switches that same area to the saved template source; valid changes save when the field loses focus, and template tokens are preserved.
- Timezone-aware calendar calculations are covered by Node built-in tests in `tests/`.
- Preferences (including the optional artist banner image) are persisted locally in this browser.
- Import accepts the earlier v1 backup format (`categories` + `templates`) as well as the current format (`collections` + `templates`).

## Current storage

The React app currently stores its data in browser localStorage and is not yet connected to the Google Sheets API. Export a JSON backup before clearing browser data. Large banner images are stored as data URLs in localStorage; keep the image reasonably small. A future IndexedDB adapter is recommended for larger media assets.
