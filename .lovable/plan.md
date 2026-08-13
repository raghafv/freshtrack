# Hugging Face vision fallback + full AI visibility in admin

## Heads-up on the token

You pasted the Hugging Face token straight into chat, so treat it as exposed: I'll store the one you sent as a project secret, but please rotate it on huggingface.co afterwards and send the replacement through the secure secret form instead of the chat box.

## 1. Hugging Face as a vision fallback

Right now photo scan, receipt OCR and label-date reading call only the Lovable gateway, which is why they die with "credits exhausted" while chat still works (chat already falls back to your Gemini and Groq keys).

New order for every image call:

```text
Google Gemini (your key)  ->  Hugging Face (your token)  ->  Lovable gateway
```

- Gemini first: it's free-tier generous and understands the JSON contract the scanner already expects.
- Hugging Face second, via a vision-language model on the Inference API, with the same JSON instructions.
- Lovable gateway last, so it only spends credits when both personal keys fail.
- If all three fail, the user sees "AI is temporarily unavailable — add the item manually" instead of a billing message.

Note on expectations: the free Hugging Face Inference tier is slower and less accurate at reading receipts and printed expiry dates than Gemini. It's a safety net, not a replacement — Gemini stays the primary.

## 2. Admin dashboard: show all providers and failures

Two gaps today:

- Image/OCR calls are never written to the usage log at all, so the dashboard only reflects the text AI.
- The provider table shows calls, average latency and failure counts, but there's no way to see *what* failed.

Changes:
- Log every vision call (scan, receipt, label dates) with the provider that actually served it, success/failure, latency and the error text.
- Add a "Recent AI calls" list under the provider table: time, feature, provider, ok/fail, duration, and the error message on failures — newest first, filterable to failures only.
- Show every configured provider in the table, including ones with zero calls, so you can see at a glance that Gemini/HF/Lovable are all wired up.
- Keep it owner/admin-only, as it is now.

## 3. Getting more Lovable AI credits

There is no separate "vision credit" — image and text calls both draw from the same workspace AI allowance, and I confirmed the daily build credits are not spendable on AI (0.00 available for AI this period). Ways to get more:

- Buy credits in Lovable under Settings -> Plans & credits (top-up applies immediately and is usable for AI).
- Upgrade the workspace plan for a larger monthly grant.
- Wait for the monthly reset on Aug 30, which restores the AI allowance.

With the Gemini + Hugging Face fallbacks in place, FreshTrack's scanning keeps working even at zero Lovable credits, so topping up becomes optional rather than required.

## Technical notes

- Store `HUGGINGFACE_API_KEY` as a project secret (server-only).
- `src/lib/vision.functions.ts`: extract the provider chain into an ordered list (Gemini `generateContent` with `inlineData`, HF Inference chat-completions with an image URL part, Lovable gateway), try in order, return the first parsed JSON object.
- `src/lib/ai.functions.ts` / a small shared helper: reuse `logUsage` for vision calls so `ai_usage_log` records provider, ok, ms and error.
- `src/lib/admin.functions.ts`: return a recent-calls array (limit ~50) alongside `byProvider`, including error text.
- `src/routes/_shell.admin.tsx`: render the recent-calls list with a failures-only toggle.
- `src/lib/errors.ts`: replace the credits-specific copy with the generic unavailable message.
