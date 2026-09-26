# Reframe

**AI-generated images shouldn't be flattened.**

Reframe is a private creative workspace built around Generate → Understand → Select → Edit → Recompose. Its intended challenge submission is **Game Art**: a detailed futuristic amusement park refined through persistent entities.

## Current status — integration blocked, not submission-ready

The workspace, server orchestration, MiniMax SDK adapter, Cloudinary adapter, rectangular compositor and version-storage code are present. **No real image has been generated or edited in this project yet.**

The supplied official Hy Image 3.5 Preview console URL returned a sign-in/404 page on September 26, 2026. GMI's public documentation index had no matching Hy 3.5 entry. A related `hunyuan-image-to-image` API is documented, but it is a different model and was **not substituted**. The Hy adapter deliberately returns a clear unavailable error rather than guessing parameters or simulating output.

To unblock: provide the Hy 3.5 console's actual generation and reference-image request examples, output/status schema, and supported parameter values. Then implement `HyImageProvider` in `server/providers.js` and perform real verification before setting `ready=true`. The adapter's internal contract is documented beside it; it is not a claim about GMI's external API.

An existing process-level GMI key authenticated against GMI's documented model-list endpoint. That proves authentication only, not Hy entitlement or generation. Credentials are now configured. Live checks found MiniMax M3 returns HTTP 402 (insufficient balance), while Cloudinary uploads now pass using the unsigned reframe preset (signed uploads lack create permission). See docs/CREDENTIAL-CHECK.md.

## Run locally

Requires Node.js 22.16+ and npm.

```powershell
npm install
Copy-Item .env.example .env
# Edit .env locally; never commit it.
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on port 3001. With the current unverified Hy adapter the UI opens in an explicit setup state. There are no fallback scene images or hardcoded detected entities.

```powershell
npm run check
npm run build
npm start
```

After building, `npm start` serves the compiled application and API together at http://localhost:3001.

The host environment used during development already sets `ANTHROPIC_BASE_URL` to a GMI endpoint for another application. Dotenv does not override existing environment variables. For Reframe, set that variable explicitly to `https://api.minimax.io/anthropic` in the launching shell, or remove the conflicting inherited setting. The adapter rejects a different base URL instead of sending a MiniMax key to it.

## Environment

All credentials remain on the server; none are prefixed with `VITE_`.

| Variable | Purpose |
| --- | --- |
| `GMI_API_KEY` | Reserved for the required Hy adapter; existing key authentication was checked separately. The currently blocked adapter makes no generation request. |
| `ANTHROPIC_BASE_URL` | Must be `https://api.minimax.io/anthropic`. |
| `ANTHROPIC_API_KEY` | MiniMax API key for M3 image analysis and edit interpretation. |
| `CLOUDINARY_CLOUD_NAME` | Required for remote asset storage. |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned preset name; configured as `reframe`. When set, uploads do not require API credentials. |
| `CLOUDINARY_API_KEY` | Cloudinary server credential. |
| `CLOUDINARY_API_SECRET` | Cloudinary server secret. |
| `DATA_DIR` | Local persistent scene metadata and PNG originals/versions; defaults to `./data`. |
| `PORT` | API/production web port; defaults to 3001. |
| `WORKSPACE_PASSWORD` | Shared password for this single-user workspace. Mandatory with `NODE_ENV=production`; optional locally. |

Cloudinary is optional for retaining originals locally, but required by the implemented edit orchestration to provide publicly reachable reference-crop URLs. For unsigned uploads, configure CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET. Without a preset, configure the cloud name, API key and API secret for signed uploads. Uploaded reference images are public Cloudinary assets; local scene files remain behind workspace authentication in production.

## Architecture

- **React + Vite**: canvas-centered editor, entity panel, direct region selection, inspect mode, spatial scene map, edit review, comparison slider, history and PNG export.
- **Express**: credential boundary, validated API inputs, background operation status, cancellation requests and one-at-a-time processing.
- **HyImageProvider**: required generation/edit engine interface; blocked pending official model-specific documentation.
- **MiniMaxProvider**: official Anthropic SDK using `MiniMax-M3`. It receives the generated image, not just its prompt, for scene understanding.
- **Region processor + Sharp**: normalized image handling, context crops, rectangular selection and lossless PNG recomposition.
- **Storage**: atomic JSON scene writes and immutable local PNG assets; optional Cloudinary copies.

The app is intentionally a single private workspace, not a multi-tenant service. Use one Railway replica. Job and prepared-edit records are in memory; saved images and scene history are durable on disk. Restarting invalidates sessions and pending plans. Provider-job recovery across restarts is not implemented.

## Entity representation

MiniMax is asked to return visible names, types, descriptions, normalized bounding rectangles, depth estimates and relationships. The server validates this data, then assigns persistent UUIDs.

Each entity has `id`, `name`, `type`, `description`, `box`, `depth`, `relationships`, `source`, `regionKind`, `removed` and `editHistory`. Each version snapshots the entity representation. Sequential edits retain IDs; removing an entity marks it removed rather than erasing its history.

**These are approximate visual-model boxes, not pixel segmentation masks.** No claim of segmentation accuracy is made. Real MiniMax image analysis remains unverified until credentials and a real Hy image are available.

## Localized editing and preservation

The code path is:

1. MiniMax interprets one natural-language edit and resolves an existing entity ID, including conversational targeting without selection.
2. The UI highlights the resolved entity and asks the user to review its approved rectangle. Numeric bounds can be adjusted.
3. The server crops the target plus 4% of image dimensions as surrounding reference context.
4. Cloudinary stores that crop for the Hy reference-image request.
5. The Hy adapter must regenerate the crop with identical framing.
6. Sharp extracts only the approved target rectangle from that result.
7. The compositor copies those RGB pixels into the stored original's decoded pixel buffer and saves a PNG.
8. The server appends a version with the same entity ID, operation history, region and provider provenance.

Pixels outside the approved rectangle are copied unchanged. This property was measured with synthetic RGB data: **0 changed pixels outside**, 1,794 changed inside, 10,494 protected.

That is a guarantee about decoded pixels outside a rectangle, **not about preserving every unrelated object**. Unrelated objects inside the rectangle may change. Hard rectangular boundaries can create visible seams. Transparent cutouts, accurate segmentation, automatic relighting, depth-aware occlusion, and reliable automatic relocation are not implemented.

Move/resize requests use the same regeneration path and require the user to expand the approved rectangle to include old and new positions. There are no pretend drag-to-move interactions. Resize/move quality is unverified.

## Versions and comparison

The UI compares original/current images with a slider. History restores a stored version and its entity snapshot; undo follows the current version's parent. Editing after restoring an older version creates a new branch while retaining all saved versions. An entity's own instructions appear in its inspector.

The version/UI paths are implemented but have not been exercised with real sequential Hy edits. Reanalysis is allowed only when the original analysis produced no entities; it does not replace established IDs.

## Failures

The API validates instructions, boxes and model JSON. Missing MiniMax keys, malformed model responses, ambiguous targets, unavailable Hy configuration, Cloudinary failures and stale edit plans produce safe messages. Provider stack traces and credentials are not returned to the browser.

Generation stores the original before analysis. If analysis fails after that point, the job retains the scene ID so it can be opened and analysis retried. Cloud upload failure may leave an unreferenced local asset, but does not replace the previous saved scene. There is no automatic generation retry that could create duplicate charges.

Cancellation requests abort SDK/provider calls where supported; already submitted provider jobs may still run and be billed. This cannot be claimed fully operational for Hy until its documented cancellation behavior is known.

## Railway deployment

Deployment files are provided, but no Railway deployment has been performed.

1. Push the project to a private repository with `.env` and `data/` excluded.
2. Create a Railway service from that repository. `railway.json` selects the Dockerfile.
3. Attach a persistent volume at `/data` and set `DATA_DIR=/data`.
4. Add provider variables and a strong `WORKSPACE_PASSWORD`. Ensure `ANTHROPIC_BASE_URL` targets MiniMax.
5. Keep **one replica**. Railway supplies `PORT`; the server binds to `0.0.0.0`.
6. Generate a Railway HTTPS domain. The health check is `/api/health`.
7. Sign in and verify real generation, image display, analysis, four sequential edits, comparison and undo before using it for the challenge.

The Docker build runs `npm ci`, builds Vite, prunes development dependencies and starts the Express server. Production refuses to start without a workspace password. Authentication uses an HttpOnly, SameSite cookie; production adds Secure. Restarting the server requires signing in again.

## Planned challenge demonstration — not yet executed

Exact initial prompt:

> A futuristic amusement park at night with a huge Ferris wheel, roller coaster, entrance plaza, gardens, families, glowing signs and detailed game concept art.

Planned operations:

1. Generate through Hy Image 3.5 Preview served by GMI.
2. Analyze the actual image with MiniMax M3 and review entity regions.
3. Select Ferris Wheel: **Make the Ferris wheel deep blue with subtle blue lighting.**
4. Select Entrance Sign: **Change the sign text to "HY LAND".**
5. Select a detected Person: **Remove this person.**
6. Select Garden: **Add more colorful flowers.**
7. Compare original/final, inspect entity histories and restore a prior version.

Provider prompts and request IDs should be recorded in version provenance by the completed Hy adapter. Once the real workflow runs, export the actual scene JSON or document the actual prompts/results for submission. Do not describe the planned workflow above as executed evidence.

## Challenge

See [challenge.md](challenge.md), the primary source of truth, and [docs/COMPLIANCE.md](docs/COMPLIANCE.md). One Game Art entry; Hy 3.5 generation on GMI; supporting MiniMax model disclosed; prompt/workflow included; X post tagging **@gmi_cloud** and **@TencentHunyuan**; submission through the campaign form.

Deadline: **October 1, 2026, 11:59 PM PT** (October 2, 2026, 12:29 PM IST). Public campaign dates: September 25–October 1. Winners: October 8.

The application is not the final generated Game Art entry. No eligible artwork, X post or form submission has been produced. The current documentation discrepancy (challenge says up to 4K; live campaign says up to 2K) must be resolved against the actual model contract.

## Verification

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for passed checks and explicitly pending checkpoints. Browser verification is blocked by the installed kane-cli's expired authentication; run `kane-cli login` locally. No browser test result is claimed.

Design foundation: [DESIGN.md](DESIGN.md), installed via the requested `npx getdesign@latest add claude`. Reframe adapts its cream/coral palette, serif display typography, spacing and restrained components into an original creative workspace. It uses its own frame mark rather than another product's logo.
