#!/usr/bin/env bash
# Jarvis 开发环境一键启动脚本
# 用法: bash scripts/dev-start.sh [--port=3456]
set -euo pipefail

PORT="${PORT:-3456}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HEALTH_URL="http://127.0.0.1:${PORT}/health"
MAX_WAIT=60

# 解析 --port=N 参数
for arg in "$@"; do
  case "$arg" in
    --port=*) PORT="${arg#*=}" ;;
  esac
done

echo "=== Jarvis Dev Startup ==="
echo "  Project: $ROOT"
echo "  Port:    $PORT"

# ── 1. 构建 Web 面板 ──
if [ ! -f "$ROOT/dist/web/index.html" ]; then
  echo ""
  echo "[1/3] 构建 Web 面板..."
  cd "$ROOT"
  npm run build:web
  echo "  ✓ Web 面板构建完成"
else
  echo "[1/3] Web 面板已存在，跳过构建"
fi

# ── 2. 启动引擎 ──
echo ""
echo "[2/3] 启动 Jarvis 引擎..."
cd "$ROOT"

if [ -f "$ROOT/.jarvis/engine.pid" ]; then
  PID=$(node -e "try{process.stdout.write(String(require('$ROOT/.jarvis/engine.pid').pid))}catch(e){process.stdout.write('0')}" 2>/dev/null || echo "0")
  if [ "$PID" != "0" ] && kill -0 "$PID" 2>/dev/null; then
    echo "  ✓ 引擎已在运行 (PID $PID)"
  else
    rm -f "$ROOT/.jarvis/engine.pid"
    npx tsx src/cli/index.ts engine start --port="$PORT" "$ROOT" &
    ENGINE_PID=$!
    echo "  ✓ 引擎已启动 (PID $ENGINE_PID)"
  fi
else
  npx tsx src/cli/index.ts engine start --port="$PORT" "$ROOT" &
  ENGINE_PID=$!
  echo "  ✓ 引擎已启动 (PID $ENGINE_PID)"
fi

# ── 3. 等待健康检查 ──
echo ""
echo "[3/3] 等待引擎就绪..."

WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "  ✓ 引擎就绪！"
    echo ""
    echo "=== Jarvis 已启动 ==="
    echo "  Web:  http://localhost:${PORT}"
    echo "  API:  http://localhost:${PORT}/api/pipeline"
    echo "  健康: http://localhost:${PORT}/health"
    exit 0
  fi
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $((WAITED % 10)) -eq 0 ]; then
    echo "  等待中... (${WAITED}s/${MAX_WAIT}s)"
  fi
done

echo "  ✗ 引擎启动超时 (${MAX_WAIT}s)"
echo "  请检查: npx tsx src/cli/index.ts engine start --port=$PORT $ROOT"
exit 1
