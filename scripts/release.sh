#!/usr/bin/env bash
# Jarvis Agent Factory — 完整发布流程
# Usage: bash scripts/release.sh <version> [--dry-run]
# Example: bash scripts/release.sh 3.12.1

set -e
VERSION=$1
DRY=$2

if [ -z "$VERSION" ]; then
  echo "Usage: bash scripts/release.sh <version> [--dry-run]"
  echo "Example: bash scripts/release.sh 3.12.1"
  exit 1
fi

echo "🚀 Releasing v$VERSION..."
echo ""

# 1. Update package.json and commit
echo "  [1/5] Updating version..."
node -e "
const pkg=JSON.parse(require('fs').readFileSync('package.json','utf8'));
pkg.version='$VERSION';
require('fs').writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log('  Updated package.json → '+pkg.version);
"

if [ "$DRY" != "--dry-run" ]; then
  git add package.json
  git commit -m "release: v$VERSION" || true
fi

# 2. Create and push tag
echo "  [2/5] Creating git tag..."
if [ "$DRY" != "--dry-run" ]; then
  git tag -d "v$VERSION" 2>/dev/null || true
  git tag -a "v$VERSION" -m "Jarvis Agent Factory v$VERSION"
  git push origin main
  git push origin "v$VERSION"
  # Also try GitHub
  git push github main 2>/dev/null || echo "  ⚠ GitHub push failed (network)"
  git push github "v$VERSION" 2>/dev/null || echo "  ⚠ GitHub tag push failed"
fi

# 3. Publish to npm
echo "  [3/5] Publishing to npm..."
if [ -f "$HOME/.npmrc" ] || [ -n "$NPM_TOKEN" ]; then
  npm publish
else
  echo "  ⚠ No npm token found. Run: npm login"
  exit 1
fi

# 4. Create Gitee release
echo "  [4/5] Creating Gitee release..."
GITEE_API="https://gitee.com/api/v5/repos/wujl1124/JarvisAgentFactory/releases"
if [ -n "$GITEE_TOKEN" ]; then
  BODY=$(node -e "const c=require('fs').readFileSync('CHANGELOG.md','utf8');const m=c.match(/## \\[$VERSION\\][^#]*/);console.log(JSON.stringify(m?m[0].slice(0,3000):'Jarvis v$VERSION'))")
  curl -s -X POST "$GITEE_API" -H "Content-Type: application/json" -H "Authorization: bearer $GITEE_TOKEN" \
    -d "{\"tag_name\":\"v$VERSION\",\"name\":\"v$VERSION\",\"body\":$BODY,\"target_commitish\":\"main\",\"prerelease\":false}" | node -p "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));r.tag_name||r.message||'ok'" 2>/dev/null
  echo ""
else
  echo "  ⚠ Set GITEE_TOKEN env var to auto-create Gitee releases"
fi

# 5. Create GitHub release
echo "  [5/5] Creating GitHub release..."
if [ -n "$GITHUB_TOKEN" ]; then
  BODY=$(node -e "const c=require('fs').readFileSync('CHANGELOG.md','utf8');const m=c.match(/## \\[$VERSION\\][^#]*/);console.log(JSON.stringify(m?m[0].slice(0,3000):'Jarvis v$VERSION'))")
  curl -s -X POST "https://api.github.com/repos/Wjl1224734792/Jarvis-Agent-Factory/releases" -H "Content-Type: application/json" -H "Authorization: Bearer $GITHUB_TOKEN" \
    -d "{\"tag_name\":\"v$VERSION\",\"name\":\"v$VERSION\",\"body\":$BODY,\"target_commitish\":\"main\",\"prerelease\":false}" | node -p "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));r.tag_name||r.message||'ok'" 2>/dev/null
  echo ""
else
  echo "  ⚠ Set GITHUB_TOKEN env var to auto-create GitHub releases"
fi

echo ""
echo "✅ v$VERSION released!"
