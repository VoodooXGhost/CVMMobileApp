const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const safeGit = (command, fallback) => {
  try {
    return execSync(command, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (_error) {
    return fallback;
  }
};

const manifest = {
  app: pkg.name,
  app_version: pkg.version,
  api_contract_version: process.env.EXPO_PUBLIC_API_CONTRACT_VERSION || 'mobile-v1',
  runtime_profile: process.env.EXPO_PUBLIC_RUNTIME_PROFILE || 'dev',
  git_sha: safeGit('git rev-parse --short HEAD', 'unknown'),
  build_time_utc: new Date().toISOString(),
};

const outputDir = path.join(repoRoot, 'artifacts');
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'release-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Release manifest written to ${outputPath}`);
