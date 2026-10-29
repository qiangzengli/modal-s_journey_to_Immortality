# 逆命录服务器部署与维护

访问地址：**http://139.196.175.138/**。

部署环境：Ubuntu 24.04、Node.js 22.22.2、Nginx、systemd。2026-10-29 首次部署的游戏代码为 `150f621`，发布目录为 `20261029T023856Z-150f621`。

服务器从新局开始，未上传或覆盖开发机的两份游戏存档。当前游戏是**单实例、共享一份进度**，没有账号和独立玩家存档；访问这个地址的人会操作同一角色，包括「重开此局」。适合单人试玩或轮流演示，多人各自游玩需要后续实现存档隔离。

## 运行结构

公网 HTTP → Nginx 的 IP 虚拟主机 → `127.0.0.1:4177` → Node.js 游戏服务。

只新增 `server_name 139.196.175.138`，保留已有默认站点及 `lizengqiang.xyz` 的配置。游戏进程以专用 `niminglu` 用户运行，异常退出后自动重启，开机自动启动；应用端口只监听回环地址。

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

模型固定为 `deepseek-v4-flash`。用编辑器修改 `/etc/niminglu/game.env` 中的 `LLM_API_KEY`，保留 `LLM_TIMEOUT_MS=30000`，然后重启游戏服务。不要把密钥写进文档或粘贴到终端日志中。

首次部署检查时，DeepSeek 返回 **HTTP 402 / insufficient_balance_error**。这表示现有密钥对应账户余额不足，不是服务器连不上。地图和规则玩法可运行，AI 对话、规划及自主决策需充值或换用有效密钥。相同密钥充值后可直接重试；更换密钥需重启服务。

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
curl --fail -H 'Host: 139.196.175.138' http://127.0.0.1/api/state > /dev/null
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

程序回滚不覆盖存档。先备份，再切回先前目录：

```sh
set -eu
previous_release="$(cat /opt/niminglu/previous-release)"
test -f "$previous_release/server.js"
systemctl start niminglu-backup.service
ln -sfn "$previous_release" /opt/niminglu/current.next
mv -Tf /opt/niminglu/current.next /opt/niminglu/current
systemctl restart niminglu
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
- 更新后立绘缺失：确认 `/assets/cultivator/portrait.png`、`/assets/cultivator/spirit-bottle.png` 返回 200，且发布包包含 `game/assets/`。
- 新安装尚未操作时可能还没有 `save.json`；首次写入行动后自动生成。此时备份任务正常跳过。

公网验收应包含首页、完整 JS/CSS 依赖、立绘、同源 POST、跨源拒绝、服务重启后存档保留，以及浏览器中的实际地图。`/.env.local`、`/game/server.js` 和存档路径应返回 404。

2026-10-29 首次发布检查：本地 163 项测试通过；公网首页、41 个前端模块、两张新版立绘和同源 POST 正常，跨源请求返回 403，过期版本操作返回 409，私有文件返回 404。服务器实测存档写入、重启前后 SHA-256 一致、手动备份成功，游戏服务与每日备份均已开机启用。现有站点配置文件的 SHA-256 保持不变。本机 Chrome 自动化打开公网 IP 时返回 `ERR_BLOCKED_BY_CLIENT`，因此本次未完成浏览器画面验收。
