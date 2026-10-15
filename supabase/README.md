# Supabase (optional cloud backup)

Mingalar Tarot works fully offline. Cloud backup of the journal is only compiled in when
`ENABLE_CLOUD_SYNC=true`, `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`.

1. Create a Supabase project (choose a region close to your users, e.g. Singapore).
2. Apply the schema: `supabase link --project-ref <ref>` then `supabase db push`, or paste
   `migrations/*.sql` into the SQL editor.
3. Sign-in. The app uses provider sign-in (no email sending needed):
   - Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → **Web
     application**. Authorized redirect URI: `https://<ref>.supabase.co/auth/v1/callback`.
   - Supabase → Authentication → Providers → Google: paste the client ID and secret, enable it.
   - Supabase → Authentication → URL Configuration → Redirect URLs: add `mingalartarot://**` (the app
     scheme) and, for Expo Go / dev builds, `exp://**`.
   - Sign in with Apple works the same way (Apple provider + `SYNC_PROVIDERS=google,apple`). It
     needs a paid Apple Developer account, and App Store rule 4.8 means iOS shows Google only once
     Apple is also on, so until then iOS builds have no cloud backup.
   - Email one-time codes still exist behind `SYNC_EMAIL=true`: enable the Email provider, use the
     OTP template with `{{ .Token }}`, and set up your own SMTP (Supabase's built-in sender is
     limited to a few emails an hour, to team members only).
4. Deploy the account-deletion function: `supabase functions deploy delete-account`.
5. Copy the project URL and the `anon` public key into `.env`, set `ENABLE_CLOUD_SYNC=true` (and `SYNC_PROVIDERS`),
   and rebuild.

What is synced: journal readings (question, notes, cards, dates) and deletions; portable settings
(language, theme, text size, Burmese font and numerals, reversed cards, haptics, sound, reminder
time, weekday sign, finished lessons); and the Card of the Day history. Not synced: the name, the
private device seed, the reminder on/off switch, the onboarding flag and the free share count.
All of it is a few KB per user, well inside the free tier (500 MB database). No Storage bucket is
used. Apply both migrations; the second one adds `user_settings` and `daily_draws`.
