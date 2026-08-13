# Keep FreshTrack's AI running without Lovable credits

## What's actually happening

I checked the workspace balance. The daily credits you get are **build-only** — the amount spendable on AI is 0.00, while the monthly AI allowance for this period is fully used. That's a billing rule on the credit grants, not something app code can redirect: there is no setting or code change that makes daily build credits payable for AI Gateway calls.

So the reliable fix is to stop depending on Lovable credits for AI at all, and run FreshTrack's AI on your own Google Gemini key (already stored in the project, along with a Groq key).

## What I'd change

1. **Make your Gemini key the primary provider everywhere.**
   Today the text AI (assistant, recipes, shopping list) tries Gemini first and falls back to Groq and then the Lovable gateway — that part is fine. The image work (photo scan, receipt OCR, barcode label dates) currently calls only the Lovable gateway, which is why scanning dies with "credits exhausted" while chat still works.
   I'll route all image/OCR calls through your Gemini key first, and only fall back to the Lovable gateway if Gemini fails.

2. **Better error messages.**
   If both providers fail, show "AI is temporarily unavailable — add the item manually" instead of a billing message users can't act on.

3. **Optional safety valve.**
   If you want, I can add a small admin toggle so you can switch the AI provider order (Gemini / Groq / Lovable) from the admin dashboard without a code change.

## Technical notes

- `src/lib/vision.functions.ts`: add a direct Google Generative Language call (`gemini-2.0-flash`, `x-goog-api-key: GEMINI_API_KEY`, `inlineData` image part, JSON response mode) and try it before the Lovable gateway; keep the gateway as fallback.
- `src/lib/ai-service.server.ts`: no change needed to provider order — Gemini already leads — but I'll confirm the Gemini model id used there is a current one.
- `src/lib/errors.ts`: soften the "AI credits exhausted" copy since it will no longer be the common case.

## What this does not do

It won't move daily build credits onto AI usage — that isn't possible from the app side. If you'd rather stay on Lovable AI, the only route is topping up workspace credits.
