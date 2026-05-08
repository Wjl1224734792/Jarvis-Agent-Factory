#!/usr/bin/env bash
# Jarvis Agent Factory — 完整发布流程
# 依赖: gh CLI（已登录）、npm（已登录 ~/.npmrc）
# Usage: bash scripts/release.sh <version> [--dry-run]
# Example: bash scripts/release.sh 3.23.3

set -e
VERSION=$1
DRY=$2

if [ -z "$VERSION" ]; then
  echo "Usage: bash scripts/release.sh <version> [--dry-run]"
  echo "Example: bash scripts/release.sh 3.23.3"
  exit 1
fi

echo "🚀 Releasing v$VERSION..."
echo ""

# 1. Update package.json + build
echo "  [1/4] Updating version + build..."
node -e "
const pkg=JSON.parse(require('fs').readFileSync('package.json','utf8'));
pkg.version='$VERSION';
require('fs').writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log('  Updated package.json → '+pkg.version);
"

if [ "$DRY" != "--dry-run" ]; then
  npm run build
  git add package.json dist/
  git commit -m "release: v$VERSION" || true
fi

# 2. Create and push tag
echo "  [2/4] Creating git tag..."
if [ "$DRY" != "--dry-run" ]; then
  git tag -d "v$VERSION" 2>/dev/null || true
  git tag -a "v$VERSION" -m "Jarvis Agent Factory v$VERSION"
  git push origin main
  git push origin "v$VERSION"
fi

# 3. Publish to npm
echo "  [3/4] Publishing to npm..."
if [ "$DRY" != "--dry-run" ]; then
  npm publish
else
  echo "  [DRY RUN] npm publish"
fi

# 4. Create GitHub Release
echo "  [4/4] Creating GitHub Release..."
if [ "$DRY" != "--dry-run" ]; then
  gh release create "v$VERSION" --title "v$VERSION" --generate-notes
else
  echo "  [DRY RUN] gh release create v$VERSION"
fi

echo ""
echo "✅ v$VERSION released!"
