# Verification record — September 26, 2026

This is a record of observed checks, not a claim that the full application passed end-to-end testing.

## Observed passing checks

- Read all of challenge.md before project changes.
- Ran npx getdesign@latest add claude; DESIGN.md was installed and read.
- Installed dependencies and generated package-lock.json.
- npm run check: backend syntax passed.
- npm run build: Vite production build passed.
- Upgraded Sharp from 0.34 to 0.35.4 after audit findings; npm reports zero vulnerabilities.
- GET http://127.0.0.1:5173/: HTTP 200 and Reframe title.
- GET /api/health: ok=true.
- GET /api/config: Hy ready=false, MiniMax=false, Cloudinary=false (honest setup state).
- POST /api/scenes with too-short prompt: HTTP 400.
- Valid generation request: job explicitly fails with unverified Hy contract error; no generated image or fake result.
- Existing GMI key authenticated on the documented model-list endpoint; no Hy request made.
- Synthetic pixel-level compositor measurement: source 128×96 RGB; target x=25,y=24,width=46,height=39; all 1,794 target pixels changed; zero of the 10,494 outside pixels changed. Sharp runtime 0.35.4. No synthetic image is stored or displayed as demo artwork.

## User checkpoints

| # | Checkpoint | Status |
| --- | --- | --- |
| 1 | Design system installed/understood | Passed |
| 2 | Hy generates real image | Blocked: exact contract unavailable |
| 3 | Generated image stored/displayed | Pending real image |
| 4 | Entities derived from image | Adapter implemented; live request pending credentials/image |
| 5 | Selection matches real region | UI wired; unverified on real scene |
| 6 | Natural language resolves target | Adapter/schema wired; live request pending |
| 7 | Hy localized edit | Blocked: exact contract unavailable |
| 8 | Edited region recomposited | Synthetic compositor check passed; real Hy result pending |
| 9 | Unaffected areas preserved | Outside-rectangle copy measured; real visual quality pending |
| 10 | Sequential edits | Pending |
| 11 | Undo/revert | Code present; end-to-end verification pending |
| 12 | Production build | Passed |
| 13 | Environment documented | Passed |
| 14 | Challenge requirements satisfied | Not complete |

## Browser and deployment

Installed kane-cli reported expired OAuth credentials and refresh failure. Its setup instructions require local login. Browser tests were not run; no screenshots, visual validation, or successful real interaction evidence is claimed. No alternative browser driver was used.

Docker/Railway configuration is supplied; no cloud deployment was executed.

## Next verification sequence

Once the real Hy contract and credentials are available, connect the adapter, generate the README scene, inspect actual M3 regions, perform the four documented edits, compare original/final, restore a version, restart to check persistence, and check the desktop/mobile browser UI. Record real provider provenance and retain submitted artifacts.
