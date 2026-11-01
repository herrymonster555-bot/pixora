# PIXORA — Local AI Photo Studio

A local-first recreation of the PIXORA UI: purple/black dashboard, image upload, remove.bg processing endpoint, background presets, PNG download, pricing page, and optional Supabase authentication.

## Requirements
- Windows 10/11
- Node.js 20 or newer (LTS recommended)
- VS Code

## Run locally
1. Extract this ZIP.
2. Open the extracted `pixora-local` folder in VS Code.
3. In VS Code Terminal, run:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. Add your remove.bg API key to `.env`:

   ```env
   REMOVE_BG_API_KEY=your_real_key_here
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

7. Open http://localhost:5173

The Vite UI runs on port 5173 and proxies `/api` calls to the Express API at port 8787. Do not expose the remove.bg key in frontend code or any `VITE_` variable.

## Real background removal
Create an API key at https://www.remove.bg/profile#api-key and put it in `.env` as `REMOVE_BG_API_KEY`. The server sends images to remove.bg. API usage may be limited or charged according to your remove.bg account. Preview uses remove.bg's `preview` size; Max requests `auto`, subject to your API plan.

## Optional login + persistent project records (Supabase)
The UI can be explored without Supabase, but authentication is activated only after configuration.

1. Create a project at https://supabase.com/
2. In Project Settings → API, copy the Project URL and anon/public key.
3. Add them to `.env`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

4. Open Supabase SQL Editor and run `supabase-schema.sql`.
5. Restart `npm run dev`.

Passwords are handled by Supabase Auth; this app does not store raw passwords. The current sample stores project metadata only, not the processed image binary. To persist images across devices, configure a private Supabase Storage bucket and upload/download policies before production use.

## Important limitations
- This is a local starter/recreation, not an export of Base44's original source.
- Payments are intentionally disabled. Pricing is illustrative; no user is charged.
- AI-generated scene backgrounds, manual erase/restore, team workspaces, and full billing are not implemented yet.
- Do not deploy publicly until you add authentication enforcement, storage policies, rate limiting, API usage controls, privacy/terms pages, and production security review.


## Premium UI refresh
The Home page now uses the large editorial hero and dedicated drag/drop upload panel. After successful background removal, the app opens a separate result page with an interactive before/after comparison slider, transparent checkerboard, PNG download, editor shortcut, and save-to-projects action.

The processing state now appears while the background-removal request is running, with a blurred source preview, animated progress bar, and secure upload / segmentation / transparent PNG steps. On success it transitions to the result page; on error it returns to the remover and shows the error.

Background removal now explicitly requests `format=png` and `channels=rgba` from remove.bg. The client checks the returned image for transparent pixels before showing the success screen, so an opaque image is reported as an error instead of a false successful cutout.


## Transparency fix (background-removal verification)
**Root cause:** remove.bg was returning a correct transparent PNG, but the result page's before/after slider drew the full original photo underneath the cutout across the whole stage. The cutout's transparent pixels let the original background show through, so the "PIXORA" side looked identical to the original. The original is now clipped to the left of the divider only, and the cutout sits on its own checkerboard (or chosen backdrop) on the right.

Other improvements:
- The server decodes the returned PNG (`server/png-check.js`) and only reports success when it has an alpha channel and at least 0.5% fully transparent pixels. The browser re-checks the real pixel alpha as well.
- Safe diagnostic logging for every remove.bg call: status, Content-Type, X-Type, X-Credits-Charged, X-Credits-Remaining (the API key is never logged or sent to the browser).
- remove.bg error messages (invalid key, no credits, rate limit, no foreground) are shown to the user instead of a false "Background Removed".
- "Download transparent PNG" saves the exact PNG bytes returned by remove.bg.
- The result page shows the measured transparent-pixel percentage, size and subject type.

### Verify your key against the real API
```bash
npm run check:removebg -- path/to/photo.jpg
```
This prints the status and headers, saves `removebg-check-output.png`, and reports whether it genuinely contains transparent pixels.
