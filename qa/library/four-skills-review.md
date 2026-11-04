# 四个设计技能的安装与应用 · 2026-11-04

用户明确要求安装并使用 interface-design、Web Design Guidelines、UI UX Pro Max、Impeccable。本轮围绕现有食品查找 → 筛选/分页 → 详情来源流程做局部完善，未更换产品视觉方向、食品事实或个人记录。

## 安装来源

使用本机 skill-installer 的 GitHub 安装脚本，固定仓库提交；安装目录为 `C:/Users/15827/.codex/skills/<技能名>`，没有覆盖已有同名技能。

| 技能 | 原作者仓库 | 固定提交 | 仓库内路径 |
|---|---|---|---|
| interface-design | https://github.com/Dammyjay93/interface-design | 2f9be3206855bcb2d1d0af262c8bae25cba6658d | .claude/skills/interface-design |
| web-design-guidelines | https://github.com/vercel-labs/agent-skills | 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 | skills/web-design-guidelines |
| ui-ux-pro-max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | dd9a1b4cf9f67ca2e326f646d93e101b2778db30 | .claude/skills/ui-ux-pro-max |
| impeccable | https://github.com/pbakaus/impeccable | f864521bbb1c9350e8f6cf7742c139a04a1020af | .agents/skills/impeccable |

四份 SKILL.md 均已读取。Impeccable skill 4.8.0，engine 0.1.18，官方启动器校验后执行；缓存放在忽略版本控制的 `tools/impeccable-cache`，未安装全局钩子或启用 live 模式。

## 实际应用

- **interface-design**：使用 incumbent 样式和原生控件。场景是用户备餐或记餐时快速查找食品；焦点是中文食品与每 100 克营养，详细证据按需展开。沿用叶绿、浅鼠尾草绿、白色餐盘般的中性底、深绿正文和暖灰辅助色；不引入大屏统计卡、炫技动画或新的字体下载。保留生熟状态、份量基准、来源追溯和实际记录这些领域特征。层级以正文/辅助信息/操作区区分，间距围绕 4/8px 节奏，单一边框层次。
- **Web Design Guidelines**：实时读取 https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md ，检查 FoodLibrary、FoodDetails、Nutrition、Shell 及食品相关样式。修复食品导航语义、装饰图标隐藏、搜索表单属性、数字对齐、焦点与跳过导航。
- **UI UX Pro Max**：运行本地 `search.py "touch target mobile pagination" --domain ux -n 3`，得到触控面积、间距和网页移动端建议；运行 `"search filter url state" --stack react -n 3`，结果首项为输入节流，未测得输入性能问题，未据此添加依赖或优化。读取 quick-reference 和 pro-rules，并区分原生 pt/dp 与网页 CSS px。
- **Impeccable**：运行 `context --target src/FoodLibrary.jsx`，确认已有视觉实现，可局部精修，不要求重建设计。使用 polish、operate、craft-floor。运行一次源码 detector，五个相关目标的结果为 `[]`，保存至本机 `tools/impeccable-food-review.json`；这是源码检查，不是完整无障碍认证。随后发现手机页码折行，进一步修正并用浏览器和构建核验，未重复扫描。

## 发现与修复（Web Guidelines 文件定位）

- `src/product.css:23` - 食品筛选辅助文字对比度不足：实测原色 rgb(114,123,110) 在 rgb(237,242,232) 上为 3.87:1；局部辅助色改为 #586452 后为 5.50:1，白底为 6.25:1。
- `src/product.css:30` - 手机分页原为 32×44 CSS px；加宽到 44×44 并使用 8px 间距。发现中间页数字挤成两行后，手机改为原生页码选择，桌面保留数字页码。
- `src/product.css:44` - 手机搜索输入原 11px，改为 16px；placeholder 同时提高对比度。
- `src/FoodLibrary.jsx:13` - 翻页滚动回顶部时，将焦点一起移到列表，避免键盘继续在屏幕外操作。
- `src/FoodLibrary.jsx:15` - 来源入口和食品行改为真实链接，保持原有 hash 路由，可用键盘 Enter 打开。
- `src/Shell.jsx:33` - 增加仅聚焦时出现的“跳至主要内容”，点击只移动焦点，不改变应用路由。
- `src/Nutrition.jsx` / `src/FoodDetails.jsx` - 删除无任务意义的英文装饰眉题；中文标题及事实内容保留。

范围之外仍存在：搜索/筛选状态尚未同步 URL，其他模块尚有小字号和按钮导航。本轮没有承诺全项目符合全部规则，也没有因此扩大成路由重构。

## 验证

- 26 项既有测试通过，无为样式变更新建镜像测试；构建通过，保留原有主包较大的提示。
- 窄屏 390×844、320×740 和桌面 1042×764 已查看。320px 下内容宽/滚动宽同为 305，390px 下同为 375；手机分页按钮均为 44×44。截图 before/after 在同次图像输入中对照；配色、字体族和外部布局保持。
- 键盘“跳至主要内容”后 activeElement 为 main-content，hash 保持 #/food/foods。
- 水果与果汁 + 0–100 千卡仍为 277 条/14 页；手机可直接跳第 14 页。翻页焦点回到食品列表。
- 以 FDC 174278 搜索，Enter 打开 tamari 详情，展开来源后官方链接与具体译名疑点仍可见。
- 仅使用 sandbox 测试档案；无真实记录更改，无推送或部署。

本地截图：skills-before.png、skills-after.png、skills-desktop.png。源码扫描和截图不等于安卓/iPhone 实机验收、完整读屏测试或全项目审计。
