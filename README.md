# 易境 · 雨后通途

Three.js 山水机关游戏。本节说明在任意电脑或云端如何运行。下方「原 v7 说明」为原作者文字，保持原样，其中的 `E:/...` 路径是原作者本机的历史路径。

## 运行

需要 Node.js 18 及以上版本。

```bash
npm install          # 安装 esbuild / playwright / three（均为开发依赖，版本锁定于 package-lock.json）
npm start            # node server.cjs → http://127.0.0.1:8433
npm run build        # 打包为单文件离线版 → dist/易境-雨后通途.html
```

- Three.js：`vendor/` 中是 r179（npm `three@0.179.1`）的 `three.module.js` 与配套的 `three.core.js`，并附 MIT `LICENSE`。可用 `npm run vendor:three` 从锁定的依赖重新生成。
- Windows：先 `npm run build`，再双击「启动游戏.cmd」。它会打开脚本所在目录下 `dist/` 里的 html。这个脚本只供本机使用，不是云端入口。

## 测试状态（2026-10-01，云端容器实测）

测试环境为 Linux 容器内的 Playwright 1.56.1 与 Chromium，没有 GPU。WebGL 由软件渲染器 SwiftShader 提供。原始输出见 `docs/verification/logs/`。

| 命令 | 结果 | 说明 |
|---|---|---|
| `npm run build` | ✅ 通过 | 生成 `dist/易境-雨后通途.html`，约 634 KB |
| `npm run verify:cloud` | ✅ 通过 8/8 | 用 `npm start` 的页面和 dist 离线页都能加载，无报错、无失败请求；按 W 能行走；点击水槽走近后按 E，水槽转动（1→2）。截图见 `docs/verification/` |
| `npm run test:gait` | ✅ v7 通过 18/18；⚪ v6 对照**未运行** | v6 基线 `../source-adventure-v6` 不在仓库里，脚本输出 `NOT RUN` |
| `npm run test:gait-visual` | ✅ 通过 | 步态接触表 `docs/verification/gait-contact-sheet.png` |
| `npm run test:controls` | ❌ 失败（8 项通过后，第 9 项失败） | 见下方「失败分析 1」。断言之后的检查没有执行 |
| `npm run test:inputs` | ❌ 失败（2 项通过后超时） | 见下方「失败分析 2」 |
| `npm run test:adventure` | ❌ 失败（3 项通过后超时） | 见下方「失败分析 2」 |

以下历史脚本**未运行**。它们依赖不在仓库内的旧版本构建、备份或哈希清单，并保留原作者本机的 `C:`/`E:` 路径，均未修改：
`qa.cjs`、`qa-travel.cjs`（针对旧版右侧面板答题界面 `#submit`/`#lower-lines`，当前页面已没有这些元素）、`qa-p1.cjs`、`qa-v4.cjs`、`qa-v5.cjs`、`compare-v4.cjs`、`verify-preservation.cjs`、`verify-v7.cjs`、`qa-character.cjs`（原 README 已说明其"抬脚 > 0.09"断言与 v7 降低抬脚的要求冲突，不作验收）。

### 失败分析 1：controls「actual WASD input moves and stops immediately on keyup」

- 失败步骤：按住 W 450 ms 后松开，断言移动距离 > 0.3，且松键后 250 ms 内漂移 < 0.01。
- 原始报错：`AssertionError [ERR_ASSERTION]: actual WASD input moves and stops immediately on keyup`（`logs/controls.log`）
- 复现（`node tools/diagnose-keyboard-step.cjs`，`logs/diagnose-keyboard-step.log`）：
  - 渲染器是 `ANGLE (Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`。
  - 1440×1000 时每帧约 1250–1283 ms，320×240 时每帧约 650 ms。
  - 按住期间实际移动 0.057；松键后漂移为 0，"松键即停"这一半是满足的。
- 判断依据：
  1. `game.js` 帧循环为 `dt=Math.min(t-last,.05)`，每帧最多推进 0.05 s；移动速度 1.15。因此每帧最多移动 0.0575，与实测的 0.057 一致。
  2. 要在 450 ms 内走过 0.3，至少需要约 6 帧，即每帧不超过约 75 ms。本环境每帧 650 ms 以上，450 ms 里只能前进 1 帧。
  3. 同一测试中，用固定 dt 直接调用 `travel.update` 的检查（W/A/S/D、斜向速度归一化）全部通过；`verify:cloud` 中同样的键盘状态走了 0.862。说明移动逻辑本身正确，失败来自帧率。
- 结论：本次失败由云端无 GPU、软件渲染帧率约 1 fps 引起，**不是游戏代码的缺陷**。断言和测试代码都没有修改。该项需要在有 GPU 的机器上复测，才能算通过。

### 失败分析 2：inputs / adventure 等待走到机关时超时

- 原始报错：`page.waitForFunction: Timeout 20000ms exceeded.`（inputs，点按第三段水槽后），以及 `Timeout 30000ms exceeded.`（adventure，点击第一段水槽后）。
- 复现（`node tools/diagnose-walk-time.cjs`，不设上限，`logs/diagnose-walk-time.log`）：
  - adventure（1280×900）：最终到达 pipe0，用时 101.5 s / 94 帧，约 1079 ms/帧，测试上限为 30 s。
  - inputs（390×844 触屏）：最终到达 pipe2，用时 35.4 s / 52 帧，约 681 ms/帧，测试上限为 20 s。
- 判断依据：
  - 寻路和到达本身都成功了，只是在低帧率下耗时超过测试设定的时限。原因与分析 1 相同：每帧移动量被 `dt≤0.05` 限制。
  - `verify:cloud` 中"走到水槽并按 E 转动"在放宽等待时间后通过。
- 结论：同样受云端环境帧率限制。超时和断言都未修改，两组后续检查（敲鼓、水位、过桥等）在云端**未执行到**，需要在有 GPU 的机器上复测。

---

## 原 v7 说明（原文保留）

### 易境 · 雨后通途 — 步态修复 v7

仅修复用户已确认的三项：固定腿长、转向重新落脚、降低抬脚。未改变场景、地图、玩法、碰撞、移动速度、键位或右侧手记。

离线入口：`E:/video-outputs/yijing-rain-garden/gait-v7/易境-雨后通途.html`。双击或使用本目录「启动游戏.cmd」。旧版 `E:/video-outputs/yijing-rain-garden/adventure-v6/易境-雨后通途.html` 保留。完整修改前备份见 `../backups/20260926-v6-before-gait-fix`。

## 改动

- character.js：大小腿各固定 0.25 个局部单位，先约束脚的可达范围，再计算两节腿的关节位置。
- 脚步分成支撑和迈步状态；起步先迈短步，转向重算落点，双脚沿各自窄轨道移动，不交叉到另一侧。
- 抬脚峰值由约 0.10 降到 0.034 个世界单位；小幅脚踝翻转，摆臂跟随实际腿位。
- 脚掌对齐地面、台阶；身体高度配合支撑脚调整，避免通过拉长腿或拖脚来勉强着地。
- 停止移动后依次收回双脚；人物模型、服装、0.78 比例不变。

## 玩法不变

WASD / 点地面走路，点机关走近，E 操作；水闸 E 增、Q 减。接水槽 → 找木销修水车 → 长短短敲鼓 → 稳水三秒 → 走过山门。鼓的长按约 0.5 秒。触屏使用场景底部操作键。

## 检查

- `node build.cjs`：只输出 gait-v7。
- `node qa-gait.cjs`：相同输入对比 v6 / v7，20/30/60 fps，各测试直走、90° 转弯、掉头、停走、台阶、原地转向；检查两节骨长、脚交叉、轨道宽度、低抬脚、地面穿透与逐帧位移。
- `node qa-gait-visual.cjs`：起步、迈步、掉头与收步的连续近景接触表。
- `node qa-v7.cjs --controls`：32 项原键盘、碰撞断言。
- `node qa-v7.cjs --inputs`：11 项原触屏和输入边界断言。
- `node qa-v7.cjs`：17 项原场景玩法全流程，右侧点击数须为零。
- `node verify-v7.cjs`：旧版及备份哈希、修改范围和报告状态核对。

原测试源文件没有修改；包装器只改测试产物路径。旧 `qa-character.cjs` 的“抬脚 > 0.09”与此次明确要求降低抬脚相冲突，故保留为历史文件，不作为 v7 验收；新版以抬脚 < 0.047、固定骨长、不交叉、不穿地和实际步态图为标准，不拿旧高抬脚断言的失败冒充通过。

报告与图在 `E:/video-outputs/yijing-rain-garden/gait-v7`。移动端是 Chromium 触屏模拟；并非实体手机性能验收。测试覆盖规定动作，不宣称任意输入、全部帧率下绝对无缺陷。细节见 `../docs/gait-v7-audit.md`。
