# 澳洲云上线流程（new-api）

版本从 **v2.0.0** 开始，此后每次发布依次递增（v2.0.1、v2.0.2 …）。

链路：GitHub Actions 构建镜像 → 推送阿里云 ACR（北京个人版）→ 澳洲云服务器拉取并替换容器。

## 一、构建镜像（GitHub Actions）

1. 打开 GitHub 仓库 → **Actions** → **Publish image to Aliyun ACR** → **Run workflow**
2. 参数：
   - **git_ref**：默认 `dev`（最新代码所在分支，保持默认即可）
   - **image_tag**：留空 = `v2.0.0`；**之后每次发布必须填比上次大的版本号**（如 `v2.0.1`），填旧号或同号会被 workflow 直接拒绝
3. workflow 行为：
   - 用 tag 覆写 `VERSION` 文件并打进二进制
   - 同时推 `<tag>` 与 `<12位短SHA>` 两个镜像 tag
   - 构建成功后自动把 `VERSION` 提交回 `dev` 分支（下次的递增校验基准）
   - 版本比较逻辑见 `scripts/semver-gt.sh`

## 二、澳洲服务器部署

首次准备（每台服务器一次）：

```bash
docker login crpi-pd9pvjyewqjvbrn0.cn-beijing.personal.cr.aliyuncs.com
# 用户名/密码 = GitHub Secrets 里 ACR_USERNAME / ACR_PASSWORD 对应的阿里云凭证

mkdir -p data logs
cat > .env <<'EOF'
# SQL_DSN=...（如用外部 MySQL/PostgreSQL；留空则用容器内 SQLite /data/one-api.db）
# REDIS_CONN_STRING=...（可选）
EOF
```

日常发布：

```bash
./scripts/deploy-au.sh v2.0.0          # 实际部署
./scripts/deploy-au.sh v2.0.0 --dry-run # 只打印步骤
```

脚本内置：

- **先拉镜像再停旧容器**（拉取失败不影响线上）
- 替换前打印**旧镜像名 + 回滚命令**
- 健康检查 `/api/status`（60 秒超时），失败打印日志与回滚命令并退出非 0
- 成功后清理悬空镜像

## 三、回滚

```bash
docker rm -f new-api
docker run -d --name new-api --restart always -p 3000:3000 \
  -v "$(realpath data):/data" -v "$(realpath logs):/logs" \
  --env-file .env \
  crpi-pd9pvjyewqjvbrn0.cn-beijing.personal.cr.aliyuncs.com/glser/new-api:<旧版本>
```

## 版本号约定

- 正常迭代递增 patch：v2.0.1 → v2.0.2 …
- 功能发布可递增 minor（v2.1.0）
- 语义与 `common.Version`（构建时写入）一致，页脚/系统信息可见
