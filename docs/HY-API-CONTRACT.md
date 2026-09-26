# Hy Image 3.5 Preview API contract

Source: model documentation supplied by the user in this conversation. This replaces the previous missing-contract blocker.

- Model: hy-image-v3.5-preview.
- Base: https://console.gmicloud.ai.
- POST /api/v1/ie/requestqueue/apikey/requests with Bearer GMI_API_KEY and JSON {model,payload}.
- payload.prompt: required text. payload.image: optional reference image URLs, up to five; each publicly reachable and under 20 MB.
- payload.size: explicit supported dimensions. Reframe generates at 1920x1080 and picks a documented <=2K aspect ratio for context edits.
- Other documented options: generate_max_pixels (1048576,2359296,4194304), seed (0=random). Reframe leaves these at provider defaults.
- Synchronous response usually completes in 10-60 seconds; allow at least 2 minutes. Reframe uses a 3-minute overall deadline.
- GET same path /{request_id} supports pending requests. Reframe polls only if POST reports queued or processing; it never resubmits automatically.
- Terminal statuses: success, failed, cancelled. Failure details: outcome.error.
- Success image: outcome.media_urls[].url. Top-level request_id and outcome.request_id are distinct trace identifiers; both are retained.
- Documented rate: $0.024 per image <=4,194,304 pixels; $0.032 above. Reference images do not affect price.
- No mask parameter is documented. Localization is enforced by Reframe's context-crop and target-rectangle compositor.

Observed initial live response: request 9bd046be-bb82-4c46-a069-a95408f83bd1, upstream 05f415a4-0616-4f66-a7f0-0bbe5cc719c5. Requested 1920x1080; decoded output 1920x1072. The app correctly uses decoded dimensions for regions and compositing.