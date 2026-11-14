# Google Sheets backend

This folder contains the Apps Script JSON API for the team's shared snippet library. It stores shared snippets and collections in the spreadsheet selected by the `SPREADSHEET_ID` Apps Script property. Favorites, usage history, and preferences are intentionally not stored because the app has no user identity.

This backend is maintained as a separate Git repository from the React frontend. Run Git commands from this folder to commit or push backend changes.

Run its Node-based API tests from this folder with `node --test`; they use only built-in Node.js modules.

The React app is not connected to this API yet and still uses browser `localStorage`. Frontend deployment and integration are outside this backend setup.

## Spreadsheet tabs

`setup()` creates these tabs and headers without changing other tabs:

- `Collections`: `id`, `name`, `color`, `createdAt`, `updatedAt`, `revision`, `sortOrder`, `deletedAt`
- `Snippets`: `id`, `title`, `categoryId`, `icon`, `content`, `dynamicFieldsJson`, `createdAt`, `updatedAt`, `revision`, `deletedAt`

Timestamps are Unix milliseconds. `dynamicFieldsJson` contains a JSON array. `All snippets` is a virtual collection and is not stored as a row. Deletions are soft deletes.

If `Collections` has an earlier six- or seven-column schema, the API adds the missing `revision` and/or `sortOrder` columns and preserves existing rows.

## Install and deploy

1. Open the team's spreadsheet and create an Apps Script project from **Extensions → Apps Script**.
2. Replace the editor contents with `Code.gs`.
3. Run `setup()` from the bound spreadsheet's Apps Script editor once and approve the requested spreadsheet permissions. It stores that spreadsheet's ID in Script Properties and adds the two tabs and default collections if they are missing. For a standalone script, set `SPREADSHEET_ID` manually under **Project Settings → Script Properties** instead.
4. Deploy as a Web App:
   - **Execute as:** Me
   - **Who has access:** only me for initial testing; use the team's Workspace domain for team access.
5. Do not deploy with anonymous/public access. The API has no app-level login.

Script Properties keep the spreadsheet ID out of the repository, but are not an authorization boundary: restrict Apps Script editor access and spreadsheet sharing to trusted team members. The ID alone does not grant access. The `clasp` ignore rules publish only `Code.gs` and `appsscript.json`, not tests or documentation.

## API contract

The Web App URL is the base URL. Responses use `{ "ok": true, "data": ... }` or `{ "ok": false, "error": { "code": ..., "message": ... } }`. Check `ok`; Apps Script ContentService does not provide normal HTTP status handling for API errors.

### Read shared data

`GET ?action=bootstrap` returns:

```json
{
  "ok": true,
  "data": {
    "version": 1,
    "collections": [{"id": "all", "name": "All snippets", "color": "#a78bfa"}],
    "snippets": []
  }
}
```

The response includes the default collections and all active snippets. Each snippet includes a `revision` value for conflict checks.

### Save or update a snippet

`POST` JSON:

```json
{
  "action": "saveSnippet",
  "expectedRevision": 2,
  "snippet": {
    "id": "snippet-id",
    "title": "Quick thank you",
    "categoryId": "social",
    "icon": "✦",
    "content": "Thank you!",
    "dynamicFields": []
  }
}
```

Omit `expectedRevision` when creating a new snippet. For updates, send the revision returned by `bootstrap` or the previous save. A stale revision returns `REVISION_CONFLICT` instead of overwriting another teammate's edit.

### Other writes

- Save collection: `{"action":"saveCollection","collection":{"id":"social","name":"Social","color":"#f0a6c1"},"expectedRevision":1}`
- Delete snippet: `{"action":"deleteSnippet","id":"snippet-id","expectedRevision":2}`
- Delete collection: `{"action":"deleteCollection","id":"social","expectedRevision":1}`. Snippets in the collection are kept and assigned an empty `categoryId`.
- Reorder collection: `{"action":"moveCollection","id":"other","targetId":"social","expectedRevision":1}`. The dragged collection is placed at the target collection's position.
- Import backup: `{"action":"importBackup","backup":{"templates":[...],"collections":[...]}}`

Imports create new snippet IDs; collections with IDs already present are not duplicated. Imports are limited to 1000 snippets per request.

## Frontend integration note

The API uses `GET` for reads and JSON `POST` for writes. Google Apps Script ContentService does not let this script configure general CORS response headers. A frontend served from another origin may not be able to call it directly from the browser; use a same-origin/server-side proxy or host the frontend in a compatible Apps Script context. Do not work around this by making the endpoint public.

Writes are serialized with `LockService`, and snippet updates use revisions to detect concurrent edits. The API does not associate actions with individual users, so Snippet and collection changes are shared by the whole team. Existing collections also require `expectedRevision` on updates and moves; omit it when creating a collection.
