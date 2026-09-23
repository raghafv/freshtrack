# Repair recipes, food validation, images, and support email

## App fixes
- Repair the large recipe-generation path used by “Write my recipe” and Tonight’s recommendation, while preserving the fast working Surprise Me path.
- Return a clear empty-state or provider error instead of an endless loading card when Tonight’s recommendation cannot be generated.
- Tighten ingredient recognition to reject partial-word matches and random/sexual fragments while retaining known groceries and Indian aliases.
- Use each recipe title to select the closest available dish photo, including saved recipes, with a reliable local fallback.

## Verification
- Test the configured text providers and verify all three recipe actions in the signed-in preview.
- Check representative valid and invalid ingredient names.
- Confirm recipe and pantry images render without broken placeholders.

## Support email
- Keep app/auth sending on the already verified FreshTrack sender domain.
- Use Cloudflare Email Routing's free plan so mail to `hello@fresh-track.in` forwards into `raghav.goyal909@gmail.com`.
- Move DNS hosting from GoDaddy to Cloudflare while keeping GoDaddy as the registrar and preserving the website plus the existing `notify.fresh-track.in` delegation.
- Add a free SMTP sender for Gmail’s “Send mail as” feature so replies can appear from `hello@fresh-track.in`; receiving remains free even if SMTP setup is deferred.
- Provide the exact setup checklist after the app repairs; DNS changes require the user to complete the provider screens.

## Technical details
- Remove contradictory multi-recipe instructions from single-recipe requests and reduce truncation risk.
- Make provider JSON handling resilient to fenced or partially wrapped JSON while preserving safe errors.
- Replace substring-based food acceptance with whole-word/catalog matching.
