# Reframe

**A structured creative workspace for targeted image editing.**

Reframe turns a generated image into an editable scene. It identifies visible entities, accepts natural-language changes, previews the exact region that may change, and stores every result as a recoverable version.

## What you can do

- Generate scenes with Hy Image 3.5 Preview through GMI Cloud.
- Add PNG, JPEG, or WebP images as editable Canvas layers.
- Inspect objects with names, descriptions, depth, relationships, and approximate regions.
- Review localized edits before rendering and protect pixels outside the approved rectangle.
- Edit one image layer while leaving other Canvas layers untouched.
- Compare original and current versions with a slider.
- Explore a spatial Scene map for crowded compositions.
- Use text, shape, component, move, scale, arrange, opacity, rotation, and filter tools.
- Restore versions, undo changes, and export the composed Canvas as PNG.

## Product flow

1. **Create** — Start with a prompt or upload an image.
2. **Understand** — Analyze the scene and assign persistent entity IDs.
3. **Select** — Choose an object from the layer column, artwork, or Scene map.
4. **Reframe** — Describe the change, review its region, and apply it.
5. **Verify** — Use Inspect and Compare to check the result.
6. **Store** — Keep the original, edit history, entity snapshot, and versions together.

## Architecture

| Area | Implementation |
| --- | --- |
| Client | React 19 + Vite canvas editor |
| API | Express 5 with validated inputs, provider orchestration, jobs, and scene routes |
| Understanding | MiniMax M3 through the Anthropic SDK interface |
| Generation/editing | Hy Image 3.5 Preview adapter through GMI Cloud |
| Processing | Sharp for normalization, crops, and rectangular recomposition |
| Storage | Atomic JSON metadata and immutable local PNG versions; optional Cloudinary copies |

The localized edit pipeline sends a crop with reference context to the image provider, then copies only the approved rectangle back into the stored original. Entity regions are approximate rectangles, not segmentation masks.

## Run locally

Requires Node.js 22.16+ and npm.

```powershell
npm install
Copy-Item .env.example .env
# Add server-side provider values to .env
npm run dev
```

Open http://127.0.0.1:5173. The Vite client runs on port 5173 and the API on port 3001.

```powershell
npm run check   # server syntax checks
npm run build   # production client build
npm start       # built client and API together
```

## Configuration

Keep credentials on the server. Never prefix secrets with `VITE_` or commit `.env`.

| Variable | Purpose |
| --- | --- |
| `GMI_API_KEY` | Hy Image credential |
| `ANTHROPIC_BASE_URL` | `https://api.minimax.io/anthropic` for MiniMax |
| `ANTHROPIC_API_KEY` | MiniMax M3 credential |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for reference crops |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset, commonly `reframe` |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Signed upload credentials when needed |
| `DATA_DIR` | Persistent scene and PNG storage; defaults to `./data` |
| `PORT` | Server port; defaults to `3001` |

Generation requires Hy configuration. Analysis and edit planning require MiniMax. Cloudinary is required when edit orchestration needs a public reference crop URL.

## Data and versioning

Each entity receives a persistent UUID. Versions record the rendered image, entity snapshot, instruction, region, parent version, and provider provenance. Removing an entity marks it removed so its history remains available. Restoring an older version preserves the other saved versions; a later edit creates a new branch.

## Reliability boundaries

Reframe validates model output, edit boxes, instructions, provider responses, and stale plans. It preserves the previous scene when an edit or upload fails and reports safe user-facing errors.

This is an open hackathon demo without authentication or multi-tenant isolation. Job records are in memory; saved scenes and PNG files are durable on disk. Use one Railway replica. The Hy adapter is strict about its external contract and does not simulate unavailable generation results.

## Deployment

The repository includes `Dockerfile` and `railway.json` for Railway.

1. Push without `.env` or private `data/` files.
2. Create a Railway service and attach a persistent volume at `/data`.
3. Set `DATA_DIR=/data` and provider variables.
4. Keep one replica and expose the HTTPS domain.
5. Verify `/api/health`, generation, analysis, localized edits, Compare, restore, and export with real credentials.

## Documentation

- [Demo presentation script](presentation.md)
- [Design foundation](DESIGN.md)
- [Challenge brief](challenge.md)
- [API contract](docs/HY-API-CONTRACT.md)
- [Verification notes](docs/VERIFICATION.md)
- [Credential checks](docs/CREDENTIAL-CHECK.md)
- [Compliance notes](docs/COMPLIANCE.md)
