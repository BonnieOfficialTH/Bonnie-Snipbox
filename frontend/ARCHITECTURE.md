# Architecture decisions

## Runtime flow

`main.jsx` mounts `app/App.jsx`. The App composes page-level components and feature hooks; it does not own persistence details.

## Feature boundaries

- `features/snippets`: snippet CRUD, filtering, sorting, backup serialization, editor, card and preview UI.
- `features/collections`: collection navigation and counts.
- `features/preferences`: appearance, timezone, date format and banner configuration.
- `components`: cross-feature presentation components.
- `lib`: pure template rendering and ID/date helpers.

## Persistence boundary

`features/snippets/snippetRepository.js` is the only module that reads and writes localStorage. Feature hooks use this adapter. For IndexedDB or an HTTP API, implement the same repository interface and update the hook integration without rewriting UI components.

`google-apps-script/Code.gs` provides a separate Workspace-restricted Google Sheets API for shared snippets and collections. The React app is not wired to it yet; it continues to use localStorage until a frontend adapter is implemented. With no app login, favorites, usage history, and preferences remain local to each browser.

## Suggested future additions

1. Add unit tests for `lib/templateEngine.js` and repository migration/validation.
2. Connect `snippetRepository.js` to the Google Sheets API, including loading/error states and revision-conflict handling.
3. Move banner binary data to IndexedDB (or object storage when a backend exists); keep only an asset key in preferences.
4. Add schema validation and versioned migrations for imported/exported JSON.
5. Introduce routing only when the product grows beyond the dashboard (e.g. dedicated library, editor, and settings pages).
6. Add a query/cache layer only when remote API data is introduced; avoid adding Redux prematurely for this local-first MVP.


## Frontend conventions

- Keep page composition in `app/`; move reusable visual primitives into `components/`.
- Keep feature-specific UI, hooks, and data contracts together under `features/<feature>/`.
- Keep browser-independent utilities in `lib/` so they can be tested without mounting React.
- Keep persistence behind the repository adapter; components must not read `localStorage` directly.
- Add routing, a global state library, and a server cache only when the product requirements justify them.
