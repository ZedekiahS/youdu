# 食品英文补译与限定条件核对 · 2026-11-12

## 范围与结果

本轮复用食品索引、英文别名搜索、来源折叠区和记录快照，不新增界面语言切换或外部翻译依赖。

- 食药署 2,213 条：1,772 条保留来源英文，441 条来源英文为空，另附项目描述性补译。
- `public/data/tfda/names-en.json` 版本 `tfda-en-2026-11-12-v1`，保留来源中文、英文（包括 null 与空字符串）、样品描述及译名绑定。
- 生熟、含皮/去皮、部位、取样年份等按原文补充；检测前处理单列，不能当成食品销售状态。
- 890 条有具体待核对说明（包括来源英文对应多个中文样品），其中 93 条含未确定英文对应的限定词。其余也是未经过专业审校的草稿，不标为“已核准”。
- 无法确定的品种、专名继续保留原文，例如「龍延草」不猜成 tarragon；原文「20205年取樣」保留并提示年份异常。
- 鸡排依样品描述译为生鸡腿肉切块；黑豆干依配料为黄豆，不翻成黑大豆豆腐。
- USDA 原始英文及既有中文表未改；原有中文待核对项仍保留。食品名称补译覆盖不等于整个应用已中英双语，也不等于全部条目完成专业审校。

## 来源与可复现性

脚本核对固定源包身份、索引及全部分片 SHA256，然后从两个 TSV 生成独立英文表。补译 ID 必须精确等于来源缺失英文的 ID 集合。原始数据、营养值与营养版本不改；旧记录不补写新译名。

命令：`python scripts/build-tfda-english.py`。名称参考链接随具体条目保存，限于名称对应，不能据此声称营养或健康功效被审定：

- 余甘子：[农业部资料](https://kmweb.moa.gov.tw/knowledgebase.php?func=2&id=372053&type=12778)
- 明日叶：[农业部栽培资料](https://kmweb.moa.gov.tw/redirect_files.php?id=232202&theme=knowledgebase)
- 蕺菜：[台湾大学植物资料](https://tai2.ntu.edu.tw/species/344%20001%2001%200)
- 芡实：[国家中医药研究所](https://www.nricm.edu.tw/htcm/catalog/tcm_herbal_detailsb6e4.html?id=1434)
- 松茸：[农业部双语词汇](https://www.moa.gov.tw/theme_list.php?page=7&sub_theme=common_agri&theme=dictionary)
- 舞菇：[农业部资料](https://taft.moa.gov.tw/dl-246-154aeca3d01649a187ac213fefdf098c.html)
- 毛鳞鱼：[农业部鱼类资料](https://kmweb.moa.gov.tw/theme_data.php?id=317&theme=fisheasy)

## 实际验证

- `node --test tests/tfda.test.mjs`：4 项通过。英文测试遍历 2,213 条绑定及前后营养等值，并检查错绑拒绝、补译/原文区分、关键歧义、英文搜索和快照复制。
- 首次新增测试失败：误以为来源缺失英文全部为 null，实际包含空字符串。修正测试分类，保留原始数据，未统一改写空值。
- `npm test`：41 项通过；`npm run build` 通过，仍有大于 500 kB 的既有主包体积提示；`git diff --check` 通过。
- 本机浏览器沙盒：输入 `soy milk, unsweetened` 找到 H1150201；打开详情明确显示“来源未提供”及单列项目补译，100 克热量仍为 35 千卡。
- 390×844 浏览器视口：译名、版本和中文/英文限定词正常换行，来源默认折叠；截图 `qa/library/bilingual-mobile.png`（本机留存）。这不是手机真机验收。

未对 10,006 条来源记录做逐条人工专业双语审校；本轮不声称无翻译错漏，也未修改动作资料。
