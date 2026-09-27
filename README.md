# Reframe

AI image generation is incredibly powerful, but there’s still one fundamental problem.

When we generate an image with AI, the result is usually one flattened image. If I want to change just one object, I often have to regenerate the whole image and that can change things I actually wanted to keep.

Reframe changes that. Reframe is an AI creative workspace that turns generated images into editable scenes.

## Features

- **Scene generation** with Hy Image 3.5 Preview through GMI Cloud.
- **Object-level editing** with natural-language instructions and a preview of the affected region.
- **Canvas tools** for image layers, text, shapes, layout, and filters.
- **Inspect and Scene map** to explore detected objects and their positions.
- **Compare and version history** to review changes, undo edits, and restore earlier versions.
- **PNG export** of the composed canvas.

## How it works

Generate an image, analyze the scene, and select an object. Describe your change, review the edit region, and apply it. Compare the result with the original or return to a saved version.

Reframe uses approximate object regions. Localized edits are composited back into the approved rectangle, preserving pixels outside it.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5 |
| Image generation and editing | Hy Image 3.5 Preview via GMI Cloud |
| Scene understanding | MiniMax M3 |
| Image processing and storage | Sharp, local files, Cloudinary |

## Getting started

Requires Node.js 22.16+ and npm.

```powershell
npm install
Copy-Item .env.example .env
```

Add your provider credentials to `.env`:

| Variable | Purpose |
| --- | --- |
| `GMI_API_KEY` | Image generation and editing |
| `ANTHROPIC_API_KEY` | MiniMax scene analysis and edit planning |
| `ANTHROPIC_BASE_URL` | Set to `https://api.minimax.io/anthropic` |
| `CLOUDINARY_CLOUD_NAME` | Public reference images for edits |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset; alternatively use `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for signed uploads |

Keep credentials server-side and do not commit `.env`.

```powershell
npm run dev
```

Open http://127.0.0.1:5173. The API runs on port 3001.

| Command | Purpose |
| --- | --- |
| `npm run check` | Check backend syntax |
| `npm run build` | Build the frontend |
| `npm start` | Serve the built frontend and API |

## Deployment

Railway configuration is included. Set the provider variables, attach a persistent volume at `/data`, and set `DATA_DIR=/data`. Run one replica: scenes and images persist on disk, while jobs run in memory. The demo does not include authentication or multi-user isolation.
