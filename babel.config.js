const fs = require('fs');
const path = require('path');

// Robust, self-contained environment injection.
// Since Gradle builds run inside worker processes or background daemons
// that don't inherit shell exports, we read the .env file directly
// in the Babel process to ensure EXPO_PUBLIC_* variables are inlined.
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key.startsWith('EXPO_PUBLIC_')) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  console.warn('[Babel Config] Failed to load .env variables', error);
}

module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
