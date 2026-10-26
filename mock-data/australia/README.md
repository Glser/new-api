# 澳洲部署测试数据

数据来源是 SSH 别名 `ec2` 对应的澳洲云服务器，直接导入当前本地 `one-api.db`，无需切换数据库或重启服务。

- `channels.json`：24 条渠道配置，渠道 key、参数覆盖和请求头覆盖已脱敏；`base_url` 指向 `mock.invalid`，原地址保存在 `source_base_url` 仅供核对。
- `models.json`：26 条模型配置。
- `vendors.json`：模型关联的供应商数据，导入时按名称匹配本地供应商并映射 ID。
- `pricing-options.json`：模型广场所需的定价与可用分组配置，合并导入并保留本地已有设置。
- `logs.json`：按 `created_at` 倒序的最近 100 条调用记录，已归属本地 `test` 用户及其 `console-debug` token；IP、请求 ID 和内容已脱敏。
- `local-import.json`：导入结果及备份路径。

导入会保留本地已有数据，按请求 ID 和用户 ID 避免重复写入调用记录。渠道启用状态与模型能力保持云端原状，保证启用的模型可以出现在模型广场；密钥和地址保持脱敏。数据库备份位于 `logs/mock-backups/`。

后端会定期重载配置并刷新定价缓存，通常在导入后 1–2 分钟内生效。页面刷新后通过 `/api/pricing` 获取当前库的模型列表。

使用现有 JSON 再次导入当前库：

```powershell
python tools/export_australia_mock.py --from-files
```

从云端重新获取并直接导入当前库：

```powershell
python tools/export_australia_mock.py
```
