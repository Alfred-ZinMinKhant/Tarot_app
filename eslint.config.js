// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions runs on Deno (deployed separately), not in the app.
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'android/*', 'ios/*', 'supabase/functions/*'],
  },
]);
