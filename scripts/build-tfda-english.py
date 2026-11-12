"""Build a versioned English overlay; never rewrite TFDA evidence or nutrients."""
import collections
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/data/tfda'
VERSION = 'tfda-en-2026-11-13-v2'


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def table(path):
    out = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'):
            continue
        key, text, *notes = line.split('|')
        if key in out and out[key] != (text, notes):
            raise ValueError(f'Conflicting translation: {key}')
        out[key] = (text, notes)
    return out


manifest = load(BASE / 'manifest.json')
if manifest['sha256'] != '755d2f0e4a7c1fe80ac0636863117e376773c9342cfd68e7b05e67d81e3c6064':
    raise ValueError('Source snapshot changed; recheck the English supplement mappings')
if digest(BASE / 'index.json') != manifest['indexSha256']:
    raise ValueError('Source index hash mismatch')
index = load(BASE / 'index.json')
raw = {}
for shard, sha in manifest['shards'].items():
    if digest(BASE / (shard + '.json')) != sha:
        raise ValueError('Evidence hash mismatch: ' + shard)
    raw.update(load(BASE / (shard + '.json')))
supplements = table(ROOT / 'scripts/tfda-english-supplements.tsv')
terms = table(ROOT / 'scripts/tfda-english-qualifiers.tsv')
missing = {code for code, rows in raw.items() if not (rows[0]['data']['樣品英文名稱'] or '').strip()}
if missing != supplements.keys():
    raise ValueError(f'Supplement coverage mismatch: {missing ^ supplements.keys()}')
source_names = collections.Counter((rs[0]['data']['樣品英文名稱'] or '').strip() for rs in raw.values())
review_file = 'tfda-english-review-2026-11-13.json'
review = load(ROOT / 'scripts' / review_file)
if review['sourceIndexSha256'] != manifest['indexSha256'] or len(review['entries']) != 93:
    raise ValueError('Qualifier review does not match the pinned source scope')
for code, item in review['entries'].items():
    r = raw[code][0]['data']
    if (item['originalName'], item['originalEnglishName'], item['originalDescription']) != (r['樣品名稱'], r['樣品英文名稱'], r['內容物描述'] or ''):
        raise ValueError('Qualifier review source binding mismatch: ' + code)


def qualifier(text):
    if text in terms:
        return terms[text][0]
    if re.fullmatch(r'\d+(?:\.\d+)?[%％]', text):
        return text.replace('％', '%')
    if m := re.fullmatch(r'(\d{4})年?(取樣)?', text):
        return f'sampled in {m[1]}' if m[2] else f'source year {m[1]}'
    if m := re.fullmatch(r'(\d{1,2})月(取樣)?', text):
        if 1 <= int(m[1]) <= 12:
            return f'sampling month {int(m[1])}'
    if m := re.fullmatch(r'(\d{4})年之前取樣', text):
        return f'sampled before {m[1]}'
    if m := re.fullmatch(r'(室溫存放)?(\d+)天', text):
        return (f'stored at room temperature for {m[2]} days' if m[1] else f'day {m[2]}')
    if m := re.fullmatch(r'(\d+)[度℃]', text):
        return f'{m[1]} degrees C' if text.endswith('℃') else f'{m[1]} degrees (unit not specified in name)'
    if m := re.fullmatch(r'(\d+)分(?:鐘)?', text):
        return f'{m[1]} minutes'
    if m := re.fullmatch(r'(\d+)[%％]瘦肉率', text):
        return f'{m[1]}% lean meat'
    return None


references = {
    'D4800101': ['https://kmweb.moa.gov.tw/knowledgebase.php?func=2&id=372053&type=12778'],
    'E3600101': ['https://kmweb.moa.gov.tw/redirect_files.php?id=232202&theme=knowledgebase'],
    'E9700101': ['https://tai2.ntu.edu.tw/species/344%20001%2001%200'],
    'C1800101': ['https://www.nricm.edu.tw/htcm/catalog/tcm_herbal_detailsb6e4.html?id=1434'],
    'G0500101': ['https://www.moa.gov.tw/theme_list.php?page=7&sub_theme=common_agri&theme=dictionary'],
    'G1800101': ['https://taft.moa.gov.tw/dl-246-154aeca3d01649a187ac213fefdf098c.html'],
    'R7500501': ['https://kmweb.moa.gov.tw/theme_data.php?id=317&theme=fisheasy'],
}
names = {}
for entry in index:
    code = entry['sourceCode']
    source = raw[code][0]['data']
    original, original_en, description = source['樣品名稱'], source['樣品英文名稱'], source['內容物描述'] or ''
    if original != entry['originalName']:
        raise ValueError('Food identity mismatch: ' + code)
    notes = list(supplements[code][1]) if code in supplements else []
    checked = review['entries'].get(code)
    checked_terms = {q['zh']: q['en'] for q in checked['mappings']} if checked else {}
    if checked:
        notes.extend(checked['notes'])
    base = supplements[code][0] if code in supplements else original_en
    translated, unresolved = [], []

    def add(zh, en, origin):
        item = {'zh': zh, 'en': en, 'origin': origin}
        if item not in translated:
            translated.append(item)

    for part in re.findall(r'[（(]([^()（）]*)[)）]', original):
        full = checked_terms.get(part) or qualifier(part)
        if full:
            add(part, full, 'originalName')
        else:
            for token in re.split('[,，]', part):
                en = checked_terms.get(token) or qualifier(token)
                if en:
                    add(token, en, 'originalName')
                elif token:
                    unresolved.append(token)
    # Name parts outside parentheses also distinguish food identities.
    for zh, en in [('腹肉', 'belly meat'), ('胸肉', 'breast meat'), ('腿肉', 'leg meat'),
                   ('去皮', 'skin removed'), ('含皮', 'skin on'), ('帶皮', 'skin on'),
                   ('無骨', 'boneless'), ('去骨', 'bones removed'), ('切片', 'sliced'),
                   ('平均值', 'average'), ('無糖', 'unsweetened')]:
        if zh in original:
            add(zh, en, 'originalName')
    for zh, en in [('冷凍', 'frozen'), ('冷藏', 'refrigerated'), ('脫水', 'dehydrated')]:
        if original.startswith(zh):
            add(zh, en, 'originalName')
    if original.startswith('乾') and not original.startswith('乾酪'):
        add('乾', 'dried', 'originalName')

    state = re.search(r'樣品狀態:([^;]+)', description)
    state_text = state[1] if state else ''
    # Only explicit state boundaries; 生 does not match 生產, 熟 does not imply frozen is cooked.
    for zh, en in [('生', 'raw'), ('熟', 'cooked'), ('乾貨', 'dried product'),
                   ('未烹調', 'uncooked'), ('烘烤過', 'roasted'), ('水煮', 'boiled'),
                   ('冷凍包裝', 'frozen packaged product'), ('冷凍產品', 'frozen product'),
                   ('乾麵條', 'dry noodles'), ('濕麵條', 'wet noodles'), ('已泡發', 'rehydrated')]:
        if re.search(r'(^|[,，])' + re.escape(zh) + r'($|[,，(（])', state_text):
            add(zh, en, 'sampleState')
    prep = description.split('前處理描述:', 1)[-1] if '前處理描述:' in description else ''
    for zh, en in [('去皮', 'skin/peel removed'), ('含皮', 'skin retained'), ('去骨', 'bones removed'),
                   ('去皮及骨刺', 'skin and bones removed'), ('去殼', 'shell removed'),
                   ('去籽', 'seeds removed'), ('去皮及籽', 'peel and seeds removed'),
                   ('瀝除水分', 'drained'), ('取上層澄清液分析', 'only the upper clarified liquid analysed')]:
        if zh in prep:
            add(zh, en, 'samplePreparation')
    if '生' in state_text.split(',') and any('cooked' == q['en'] for q in translated):
        notes.append('名称与样品状态可能存在生熟冲突，不能自动认定')
    if original_en and source_names[original_en.strip()] > 1:
        notes.append('来源英文被多个中文食品条目共用；保留中文样品、限定条件和独立编号，不合并')
    if unresolved:
        notes.append('以下原文限定词没有确定英文对应，继续保留：' + '；'.join(dict.fromkeys(unresolved)))
    if re.search(r'\d{5,}年', original):
        notes.append('来源年份位数异常，保留原文，未擅自修正')
    if checked and list(dict.fromkeys(unresolved)) != checked['retained']:
        raise ValueError('Qualifier review outcome mismatch: ' + code)
    qualifiers = list(dict.fromkeys(q['en'] for q in translated if q['origin'] != 'samplePreparation'
                                   and not re.search(r'(?<![a-z])' + re.escape(q['en']) + r'(?![a-z])', base, re.I)))
    name = base + (' — ' + '; '.join(qualifiers) if qualifiers else '')
    if unresolved:
        name += ' [untranslated qualifiers: ' + '; '.join(dict.fromkeys(unresolved)) + ']'
    names[code] = {
        'originalName': original, 'originalEnglishName': original_en, 'originalDescription': description,
        'name': name, 'origin': 'project-supplement' if code in supplements else 'source-with-project-qualifiers',
        'status': 'needs-review' if notes else 'draft', 'notes': notes,
        'qualifiers': translated, 'unresolved': list(dict.fromkeys(unresolved)),
        'references': list(dict.fromkeys(references.get(code, []) + (checked['references'] if checked else []))),
        **({'qualifierReview': review['version'], 'identityWarning': checked['identityWarning']} if checked else {}),
    }
result = {'version': VERSION, 'sourceId': manifest['sourceId'], 'sourceIndexSha256': manifest['indexSha256'],
          'count': len(names), 'method': '项目描述性补译及限定条件对照，非官方英文译名，未经过逐条专业审校；不改写官方中英文或营养版本。',
          'inputHashes': {f: digest(ROOT / 'scripts' / f) for f in ['tfda-english-supplements.tsv', 'tfda-english-qualifiers.tsv', review_file]},
          'counts': {'sourceEnglish': len(names) - len(missing), 'projectSupplements': len(missing),
                     'needsReview': sum(n['status'] == 'needs-review' for n in names.values()),
                     'unresolvedQualifierEntries': sum(bool(n['unresolved']) for n in names.values())}, 'entries': names}
(BASE / 'names-en.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(json.dumps(result['counts']))
