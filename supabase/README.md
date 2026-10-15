# Supabase (optional cloud backup)

Nat Tarot works fully offline. Cloud backup of the journal is only compiled in when
`ENABLE_CLOUD_SYNC=true`, `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`.

1. Create a Supabase project (choose a region close to your users, e.g. Singapore).
2. Apply the schema: `supabase link --project-ref <ref>` then `supabase db push`, or paste
   `migrations/*.sql` into the SQL editor.
3. Auth → Providers → Email: enable it, turn **off** "Confirm email" links and use the **OTP code**
   template (the app asks for the 6-digit code; no deep links needed). Customise the email text
   in English and Burmese if you like.
4. Deploy the account-deletion function: `supabase functions deploy delete-account`.
5. Copy the project URL and the `anon` public key into `.env`, set `ENABLE_CLOUD_SYNC=true`,
   and rebuild.

What is synced: journal readings (question, notes, cards, dates) and deletions. Not synced:
settings, the Card of the Day history and the private device seed.
