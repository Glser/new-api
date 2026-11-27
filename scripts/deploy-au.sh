#!/usr/bin/env bash
# deploy-au.sh — 澳洲云服务器拉取最新镜像并滚动替换 new-api 容器。
#
# 用法（在澳洲服务器上执行）:
#   ./deploy-au.sh v2.0.0            # 部署指定版本
#   ./deploy-au.sh v2.0.0 --dry-run  # 只打印将执行的步骤
#
# 前置条件:
#   - 服务器已安装 docker 并可访问阿里云北京 ACR（个人版需在澳洲机器上
#     执行过一次 docker login，凭证已存入 ~/.docker/config.json）
#   - 首次部署需先创建 .env（见下方 CONFIG 段说明）
#   - 数据目录与端口等运行参数从脚本同目录的 .env 读取，避免把密码写进命令行
set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIG — 按服务器实际情况修改；也可全部放进同目录 .env 覆盖
# ---------------------------------------------------------------------------
ACR_REGISTRY="${ACR_REGISTRY:-crpi-pd9pvjyewqjvbrn0.cn-beijing.personal.cr.aliyuncs.com}"
ACR_REPOSITORY="${ACR_REPOSITORY:-glser/new-api}"
CONTAINER_NAME="${CONTAINER_NAME:-new-api}"
HOST_PORT="${HOST_PORT:-3000}"
DATA_DIR="${DATA_DIR:-./data}"
LOG_DIR="${LOG_DIR:-./logs}"
# SQL_DSN / REDIS_CONN_STRING / 其他环境变量在 .env 中按 KEY=VALUE 配置，
# 会以 --env-file 方式传给容器。

TAG="${1:-}"
DRY_RUN=false
[ "${2:-}" = "--dry-run" ] && DRY_RUN=true

if [ -z "$TAG" ]; then
  echo "用法: $0 <镜像版本> [--dry-run]  例如: $0 v2.0.0" >&2
  exit 1
fi

IMAGE="${ACR_REGISTRY}/${ACR_REPOSITORY}:${TAG}"

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    echo "+ $*"
    "$@"
  fi
}

http_ok() {
  # 容器健康检查：/api/status 应返回 200
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${HOST_PORT}/api/status" || true)
  [ "$code" = "200" ]
}

echo "==> 目标镜像: $IMAGE"
echo "==> 容器名:   $CONTAINER_NAME (端口 ${HOST_PORT})"
echo

# ---------------------------------------------------------------------------
# 1. 拉取镜像（先拉后停，失败不影响在跑的服务）
# ---------------------------------------------------------------------------
echo "==> 拉取镜像"
run docker pull "$IMAGE"

if ! $DRY_RUN; then
  # 镜像不存在则中止（pull 失败时 set -e 已退出，此处双重确认）
  docker image inspect "$IMAGE" > /dev/null
fi

# ---------------------------------------------------------------------------
# 2. 记录旧容器信息，便于回滚
# ---------------------------------------------------------------------------
OLD_IMAGE="(none)"
if docker container inspect "$CONTAINER_NAME" > /dev/null 2>&1; then
  OLD_IMAGE=$(docker container inspect "$CONTAINER_NAME" \
    --format '{{.Config.Image}}' 2>/dev/null || echo "(unknown)")
fi
echo "==> 当前运行: $OLD_IMAGE"
echo "    回滚命令: docker rm -f $CONTAINER_NAME && docker run -d --name $CONTAINER_NAME ... $OLD_IMAGE（参数同下方 run）"
echo

# ---------------------------------------------------------------------------
# 3. 停止并移除旧容器，起新容器
# ---------------------------------------------------------------------------
ENV_FILE_ARGS=()
[ -f .env ] && ENV_FILE_ARGS=(--env-file .env)

echo "==> 替换容器"
run docker rm -f "$CONTAINER_NAME"
run docker run -d \
  --name "$CONTAINER_NAME" \
  --restart always \
  -p "${HOST_PORT}:3000" \
  -v "$(realpath "$DATA_DIR"):/data" \
  -v "$(realpath "$LOG_DIR"):/logs" \
  "${ENV_FILE_ARGS[@]}" \
  "$IMAGE"

if $DRY_RUN; then
  echo
  echo "[dry-run] 到此为止；实际执行时会做健康检查并清理悬空镜像。"
  exit 0
fi

# ---------------------------------------------------------------------------
# 4. 健康检查（最多等 60 秒）
# ---------------------------------------------------------------------------
echo -n "==> 等待服务就绪"
ok=false
for _ in $(seq 1 30); do
  if http_ok; then ok=true; break; fi
  echo -n "."
  sleep 2
done
echo

if ! $ok; then
  echo "!! 健康检查失败（/api/status 非 200）" >&2
  echo "   查看日志: docker logs --tail 100 $CONTAINER_NAME" >&2
  echo "   回滚:     docker rm -f $CONTAINER_NAME && docker run -d --name $CONTAINER_NAME --restart always -p ${HOST_PORT}:3000 -v $(realpath "$DATA_DIR"):/data -v $(realpath "$LOG_DIR"):/logs ${ENV_FILE_ARGS[*]} $OLD_IMAGE" >&2
  exit 1
fi

echo "==> 部署成功: $CONTAINER_NAME 运行 $IMAGE"
docker ps --filter "name=$CONTAINER_NAME" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

# ---------------------------------------------------------------------------
# 5. 清理悬空镜像（被替换的旧层）
# ---------------------------------------------------------------------------
PRUNED=$(docker image prune -f | tail -1)
echo "==> $PRUNED"
