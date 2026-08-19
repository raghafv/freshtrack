# FreshTrack reliability and polish fixes

## Scope

- **Vision reliability:** test the configured Gemini `gemini-3.1-flash-lite` and Hugging Face `google/gemma-3-4b-it` paths with a real image, add bounded provider timeouts/backoff, downscale phone photos before upload, and record provider + model + latency + failure reason in admin analytics.
- **Scanner correctness:** keep strict food-only rejection, filter non-food receipt lines in code, make unknown/uncertain detections return “I do not recognize this product,” remove malformed-object rendering, and preserve manual entry as the no-AI fallback.
- **Recipe safety and quality:** enforce the strict ingredient guard inside the server function (not only the UI), reject non-food ingredients such as ID cards, require usable ingredients/steps in normalized recipes, prevent `[object Object]`, and correct blanket freezer shelf-life multiplication for foods that do not freeze well.
- **Manual add UI:** replace the thin horizontal category strip with a visible wrapped category grid and enlarge/re-proportion product cards and thumbnails without redesigning the rest of the app.
- **Phone notifications:** request permission directly from the user gesture, improve iPhone compatibility messaging, log delivery failures, and verify test-push behavior. Keep the secured daily digest endpoint; expose the remaining scheduler requirement clearly if no project scheduler is available.
- **SEO:** preserve the current canonical/indexed homepage, verify metadata/robots/sitemap against public routes, fix only genuine current issues, and leave authenticated app routes out of the sitemap. Google currently reports the homepage as submitted and indexed.
- **Repository branding cleanup:** remove nonessential user-facing/comment/documentation references to the builder platform while retaining required runtime packages, protected email routes, generated integrations, and infrastructure identifiers that would break the app if renamed.

## Technical details

- Refactor vision runtime helpers out of the `createServerFn` module so the server-function file remains a thin wrapper.
- Resize captured JPEGs to a bounded longest edge before base64 conversion; use abort controllers and bounded retry only for `429`/`5xx`.
- Extend AI usage aggregation to show model-level health while keeping keys and tokens server-only.
- Use primitive-only text normalization for model JSON; objects/arrays are discarded instead of stringified.
- Apply receipt and recipe guards before database writes or model prompting.
- Validate with targeted tests/type checks plus live desktop/mobile browser flows and real provider calls; surface exact terminal provider errors rather than silently retrying them.
