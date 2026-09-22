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
- Configure `hello@fresh-track.in` to receive into `raghav.goyal909@gmail.com` and send as that address once the user chooses the mailbox method.

## Technical details
- Remove contradictory multi-recipe instructions from single-recipe requests and reduce truncation risk.
- Make provider JSON handling resilient to fenced or partially wrapped JSON while preserving safe errors.
- Replace substring-based food acceptance with whole-word/catalog matching.
