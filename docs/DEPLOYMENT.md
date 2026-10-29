# 逆命录服务器部署与维护

访问地址：**http://139.196.175.138/niminglu/**。

部署环境：Ubuntu 24.04、Node.js 22.22.2、Nginx、systemd。2026-10-29 首次部署的游戏代码为 `150f621`，发布目录为 `20261029T023856Z-150f621`。

子目录和 OpenAI 接入已更新到 `9d0ea24`，发布目录为 `20261029T030041Z-9d0ea24`。实际运行版本以 `/opt/niminglu/current/release.json` 为准。

服务器从新局开始，未上传或覆盖开发机的两份游戏存档。当前游戏是**单实例、共享一份进度**，没有账号和独立玩家存档；访问这个地址的人会操作同一角色，包括「重开此局」。适合单人试玩或轮流演示，多人各自游玩需要后续实现存档隔离。

## 运行结构

公网 `/niminglu/` → Nginx 去掉路径前缀 → `127.0.0.1:4177` → Node.js 游戏服务。

游戏只占用 `/niminglu/`，访问 `/niminglu` 自动跳转到带尾斜杠的地址。根路径继续提供 `/var/www/html` 原有静态站点，已有默认站点及 `lizengqiang.xyz` 配置文件保持不变。游戏进程以专用 `niminglu` 用户运行，异常退出后自动重启，开机自动启动；应用端口只监听回环地址。

| 用途 | 服务器路径 / 名称 |
| --- | --- |
| 发布版本 | `/opt/niminglu/releases/` |
| 当前程序软链接 | `/opt/niminglu/current` |
| 发布信息 | `/opt/niminglu/current/release.json` |
| 模型密钥 | `/etc/niminglu/game.env`，仅 root 可读写 |
| 游戏存档 | `/var/lib/niminglu/save.json` |
| 存档备份 | `/var/backups/niminglu/` |
| 游戏服务 | `niminglu.service` |
| 每日备份 | `niminglu-backup.timer`，服务器时间 04:00 后五分钟内执行，保留 30 天 |
| Nginx 配置 | `/etc/nginx/conf.d/niminglu.conf` |
| HTTP 日志 | `/var/log/nginx/niminglu-access.log`、`niminglu-error.log` |
| npm 离线缓存 | `/opt/niminglu/npm-cache/` |

部署模板位于仓库 `deploy/`。模型配置通过 SSH 单独传输，不放进发布包、Git 或浏览器静态资源。当前入口使用 HTTP，尚未配置域名及 HTTPS。

## 常用操作

通过 `ssh root@139.196.175.138` 登录，在服务器执行：

```sh
systemctl status niminglu --no-pager
journalctl -u niminglu -n 80 --no-pager
systemctl restart niminglu
systemctl list-timers niminglu-backup.timer --no-pager
systemctl start niminglu-backup.service
```

模型使用 ChatGPT `gpt-5.6-sol`，通过 Responses 接口调用。服务器的 `/etc/niminglu/game.env` 必须同步本机实际生效的 `.env.local` 配置：`OPENAI_BASE_URL` 为服务基址（当前为 `https://codex.icecream.xin/backend-api/codex`，不含末尾 `/responses`），`LLM_API_KEY` 为密钥，`LLM_TIMEOUT_MS` 默认为 `30000`。修改后重启游戏服务。不要把密钥写进文档、发布包或终端日志中。根目录 `.env.local` 优先于旧的 `mvp/.env.local`。

首次部署时旧 DeepSeek 接口曾返回 **HTTP 402 / insufficient_balance_error**，属于旧账户余额不足的历史故障。子目录迁移时已同步 OpenAI 地址和密钥、发布 Responses 接入代码，并完成服务器直连和公网游戏问答验证，回复来源为 `model`、模型为 `gpt-5.6-sol`。

## 更新发布

从本机仓库根目录打包**已提交**的版本。`git archive` 不包含未提交修改、密钥、存档、Unity 项目或开发机依赖：

```sh
release="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
git archive --format=tar.gz -o "/tmp/$release.tar.gz" HEAD \
  game index.html server.js package.json package-lock.json \
  README.md .env.example deploy docs/GAME_GUIDE.md docs/DEPLOYMENT.md
scp "/tmp/$release.tar.gz" root@139.196.175.138:/opt/niminglu/releases/
printf '上传的版本：%s\n' "$release"
```

在服务器上将 `release` 填为上一步输出的版本名：

```sh
set -eu
release='填入已上传的版本名'
release_dir="/opt/niminglu/releases/$release"
mkdir "$release_dir"
tar -xzf "$release_dir.tar.gz" -C "$release_dir"
cd "$release_dir"
npm ci --omit=dev --offline --cache /opt/niminglu/npm-cache --no-audit --no-fund
node --check server.js
systemctl start niminglu-backup.service
readlink -f /opt/niminglu/current > /opt/niminglu/previous-release
ln -sfn "$release_dir" /opt/niminglu/current.next
mv -Tf /opt/niminglu/current.next /opt/niminglu/current
systemctl restart niminglu
curl --fail http://127.0.0.1:4177/api/state > /dev/null
curl --fail -H 'Host: 139.196.175.138' http://127.0.0.1/niminglu/api/state > /dev/null
```

首次部署已缓存 `three@0.186.1`，并由 `npm ci` 按锁文件校验完整性。服务器直连 npm 注册表曾失败，因此使用离线安装。若新版本改变依赖，应先补全缓存，不能忽略 `npm ci` 的安装错误后切换版本。可在联网机器创建独立缓存，再上传 `_cacache`：

```sh
# 本机：在临时目录安装当前锁文件，不修改工作区 node_modules。
package_stage="$(mktemp -d)"
cp package.json package-lock.json "$package_stage/"
npm ci --prefix "$package_stage" --omit=dev --cache "$package_stage/cache" --no-audit --no-fund
rsync -a "$package_stage/cache/_cacache/" \
  root@139.196.175.138:/opt/niminglu/npm-cache/_cacache/
```

如本次发布修改了部署模板，再将对应文件安装到 `/etc/systemd/system/` 和 `/etc/nginx/conf.d/niminglu.conf`，执行 `systemctl daemon-reload`、`nginx -t`。只有 Nginx 配置检查通过才执行 `systemctl reload nginx`。新增域名或 HTTPS 时，同时更新 `server_name` 和 Origin 白名单映射；不要直接删除同源检查。

## 回滚和恢复存档

回滚不覆盖存档。涉及模型协议或访问路径变化时，必须一起恢复对应版本的模型环境配置和 Nginx 配置，不能让旧协议使用新服务的密钥。本次迁移前的配置保存在 `/etc/niminglu/before-subpath-20261029T030041Z/`。下面示例会完整回到迁移前的根路径部署；未来发布应选择各自对应的配置备份：

```sh
set -eu
previous_release="$(cat /opt/niminglu/previous-release)"
rollback_config=/etc/niminglu/before-subpath-20261029T030041Z
test -f "$previous_release/server.js"
test -f "$rollback_config/game.env"
test -f "$rollback_config/nginx.conf"
systemctl stop niminglu
systemctl start niminglu-backup.service
install -m 600 "$rollback_config/game.env" /etc/niminglu/game.env
install -m 644 "$rollback_config/nginx.conf" /etc/nginx/conf.d/niminglu.conf
nginx -t
ln -sfn "$previous_release" /opt/niminglu/current.next
mv -Tf /opt/niminglu/current.next /opt/niminglu/current
systemctl start niminglu
systemctl reload nginx
```

若确需恢复历史进度，先选择 `/var/backups/niminglu/` 中的具体文件，然后：

```sh
set -eu
restore_file='/var/backups/niminglu/填入备份文件名.json'
test -f "$restore_file"
systemctl stop niminglu
systemctl start niminglu-backup.service
install -m 600 -o niminglu -g niminglu "$restore_file" /var/lib/niminglu/save.json
systemctl start niminglu
```

恢复会用所选时间点替换服务器当前进度；操作前的进度也会进入备份目录。本机存档不会受影响。

## 验证与故障排查

- 页面或接口返回 502：检查 `systemctl status niminglu`、应用日志及 `ss -ltnp`，确认回环端口 4177 正常监听。
- 页面可读但操作返回 403：检查浏览器地址是否匹配 Nginx 中的 Origin 白名单；应用上游 Host 必须为 `127.0.0.1:4177`。
- 本机能访问、外网超时：确认云安全组允许 TCP 80。本次部署沿用已经可用的 80 端口，无需暴露 4177。
- AI 失败但地图能动：优先检查模型余额、密钥和 API 状态，不要清空存档。
- 更新后立绘缺失：确认 `/niminglu/assets/cultivator/portrait.png`、`/niminglu/assets/cultivator/spirit-bottle.png` 返回 200，且发布包包含 `game/assets/`。
- 新安装尚未操作时可能还没有 `save.json`；首次写入行动后自动生成。此时备份任务正常跳过。

公网验收应包含首页、完整 JS/CSS 依赖、立绘、同源 POST、跨源拒绝、服务重启后存档保留，以及浏览器中的实际地图。`/niminglu/.env.local`、`/niminglu/game/server.js` 和存档路径应返回 404。根路径的 `/api/state`、`/game/app.js` 不再提供游戏服务。

2026-10-29 首次发布检查：本地 163 项测试通过；公网首页、41 个前端模块、两张新版立绘和同源 POST 正常，跨源请求返回 403，过期版本操作返回 409，私有文件返回 404。服务器实测存档写入、重启前后 SHA-256 一致、手动备份成功，游戏服务与每日备份均已开机启用。现有站点配置文件的 SHA-256 保持不变。本机 Chrome 自动化打开公网 IP 时返回 `ERR_BLOCKED_BY_CLIENT`，因此本次未完成浏览器画面验收。

子目录部署使用相对资源地址与 `game/api-client.js`，所有游戏请求留在 `/niminglu/` 下。本机依然从 `http://127.0.0.1:4177/` 启动，无需更改存档或模型配置。Nginx 的 `proxy_redirect` 会把旧入口的跳转保留在游戏子目录内。更新配置时必须保留 `proxy_pass` 末尾的 `/`。

子目录迁移最终验收：166 项测试通过；42 个前端模块与两张立绘均从 `/niminglu/` 加载，根路径原网页内容的 SHA-256 恢复一致，迁移前后存档 SHA-256 一致；`/niminglu` 自动跳转，旧入口跳转仍保留前缀。Chrome 已实际显示三维地图，并在心念传音中收到 `AI · gpt-5.6-sol` 回答，未发现浏览器控制台错误。Nginx reload 为异步切换，部署健康检查需短暂轮询，避免旧 worker 的瞬时 404 被误判为失败。

## 故事深化发布 · 2026-10-29

已发布 `39e9032`，目录为 `/opt/niminglu/releases/20261029T035757Z-39e9032`，访问路径仍为 `/niminglu/`。本次新增二十段故事经历、明确选择与修炼耗时、跨章节人物取舍记忆，以及旧档衔接；实际结算必须带有效 `approach`，模型解析不能替玩家默认确认。

173 项测试全部通过；浏览器实际验证了药庐场景、先向人物问询、真实 `gpt-5.6-sol` 回答、确认后旬数与气血结算。服务器隔离预检通过真实模型请求；部署重新同步根目录 `.env.local` 的 OpenAI 配置，保留 root 600 权限。公网 45 个前端资源、同源校验和私有文件隔离均通过，根站点保持不变。

发布前停止服务并备份；切换后存档逐字段与备份一致，版本仍为 revision 89，原有金光上人第 5 回合对阵继续保留，未代替玩家战斗或重开。新程序只在读档内存中补充衔接标记，下次正常行动才随存档写入。

本次配套回滚环境位于 `/etc/niminglu/before-story-20261029T035757Z-39e9032/`；发布前存档位于 `/var/backups/niminglu/before-story-20261029T035757Z-39e9032.json`。上一发布目录与配置目录分别记录于 `/opt/niminglu/previous-release`、`/opt/niminglu/previous-config`。此次未变更 Nginx；如回滚，应配对恢复上述环境配置与上一程序软链接，保留当前游戏存档。

### Standards

未发现确定的文档规范违反项；结算、旧档衔接和斗法取袋符合领域约定。独立相关测试 14 项通过。

### Spec

复核发现的默认选择和异地人物记忆两项问题已在 `39e9032` 修复，定向复核 6 项测试通过，无遗留阻塞项。

最终未解决项：Standards 0 项，Spec 0 项。
