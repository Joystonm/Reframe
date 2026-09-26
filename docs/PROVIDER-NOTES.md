# Provider research — September 26, 2026

## Hy Image 3.5 Preview

Primary requested console URL:
https://console.gmicloud.ai/user-console/ie/model-hub/image/hy-image-v3.5-preview

The HTTP response contained a sign-in title and 404 content. The documentation index at https://docs.gmicloud.ai/llms.txt did not contain Hy Image 3.5 Preview. Both likely model quickstart spellings returned 404.

https://www.gmicloud.ai/hy-week still advertises the model and links the same console route. It displays September 25–October 1, 2026 and currently says up to 2K; challenge.md says 4K. The challenge remains the project requirement; supported output sizes must be verified rather than guessed.

A GMI key in the existing process environment successfully authenticated to the documented GET https://api.gmi-serving.com/v1/models. No secret was printed or written. That is an LLM model list and does not establish availability or unavailability of an image model.

The related official document:
https://docs.gmicloud.ai/model-quickstarts/image/hunyuan-image-to-image.md

documents Bearer authentication and POST https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests, a payload with image/prompt/negative_prompt, GET status by request_id, and outcome.media_urls[].url. **These details are for hunyuan-image-to-image, not Hy 3.5, and were not transplanted into the Hy implementation.**

The general rate-limits document:
https://docs.gmicloud.ai/inference-engine/api-reference/rate-limit.md
describes organization tiers and TPM/RPH. It does not establish Hy 3.5's image rate limit.

GMI MCP documentation:
https://docs.gmicloud.ai/mcp/gmi-mcp-server.md
identifies a get_model tool that exposes model-specific schemas, but requires separate OAuth authorization. The inference key is not that authorization. No alternate OAuth credentials were accessed.

### Required before implementing adapter

- Confirm exact Hy 3.5 model ID and endpoint.
- Obtain actual generation and editing examples.
- Confirm authentication and request payload, reference URLs/base64 support.
- Confirm resolution enums, aspect ratios, reference limits and any mask support.
- Confirm synchronous/asynchronous response and image URL/byte format.
- Confirm failure/status values, polling behavior, rate limits and cancellation.
- Generate one real image, retain request ID, then validate one reference crop edit.
- Do not use an unrelated Hunyuan model or SDK generation fallback.

## MiniMax M3

Read:
https://platform.minimax.io/docs/api-reference/text-anthropic-api.md
https://platform.minimax.io/docs/guides/models-intro.md

Verified documentation:
- Official Anthropic SDK, base URL https://api.minimax.io/anthropic.
- MiniMax-M3 model ID.
- Messages API supports image content blocks with URL/base64 source for M3.
- JPEG/PNG/GIF/WEBP image support, 10 MB image limit, 64 MB request limit.
- Text content blocks in response; thinking is separate.
- M2 models do not support the same image-input capability.

The implementation resizes analysis images to at most 1600 pixels per axis and sends PNG base64. It validates parsed JSON with Zod. No real M3 request has been made because its credential is missing.

Existing ANTHROPIC_* process values point to a separate GMI-hosted model. They were not reused as MiniMax credentials. Set the base URL explicitly when launching this application.

## Cloudinary

The official cloudinary Node SDK is installed. upload_stream stores PNGs under unique reframe/ IDs and returns secure_url. The implementation keeps local originals and metadata so edits and history do not depend on downloading transformed remote assets.

No Cloudinary credentials were available; uploads remain unverified.
