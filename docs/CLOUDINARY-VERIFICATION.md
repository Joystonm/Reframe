# Unsigned Cloudinary upload verification

The user supplied the unsigned upload preset reframe.

- Set CLOUDINARY_UPLOAD_PRESET=reframe in the local .env and .env.example.
- Updated CloudinaryStorage to select the unsigned Cloudinary v2 upload stream when a preset is configured.
- Let the preset control folder and naming; Cloudinary generates the public ID.
- Retained signed uploads when no preset is configured.
- Added a 30-second upload timeout and validation of the returned secure_url.
- Corrected the v2 SDK argument order during live verification.
- Verified the application adapter uploaded a real 32x32 PNG successfully.
- Download returned HTTP 200; downloaded bytes exactly matched the source PNG.
- Signed deletion failed with HTTP 403. Two small verification images may remain: one from the initial callback-order failure, and the successful verified image with public ID f6yux5rku5jcbyl6h5tu. They can be removed through the Cloudinary dashboard.
- No real scene image was generated. MiniMax balance and the unimplemented Hy adapter remain separate blockers.

This report supersedes the unsigned-upload status in CREDENTIAL-CHECK.md. The previous signed-upload permission failure still applies.