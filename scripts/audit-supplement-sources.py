"""Read-only source snapshot audit; no application data is written.

Usage: python scripts/audit-supplement-sources.py tools/source-audit-2026-11-12
Requires the downloaded files and their .meta.json SHA256 manifests.
Output is JSON on stdout. Python standard library only.
"""
import collections
import hashlib
import json
import math
import pathlib
import sys
import zipfile


root = pathlib.Path(sys.argv[1])
evidence = {}


def read(name):
    raw = (root / name).read_bytes()
    meta = json.loads((root / (name + '.meta.json')).read_text(encoding='utf-8'))
    actual = hashlib.sha256(raw).hexdigest()
    if actual != meta['sha256']:
        raise ValueError(f'Snapshot hash mismatch: {name}')
    evidence[name] = meta
    return raw


def data(name):
    return json.loads(read(name).decode('utf-8-sig'))


def number_state(value):
    if value is None or not str(value).strip():
        return 'missing'
    try:
        n = float(value)
    except (ValueError, TypeError):
        return 'non_numeric'
    if not math.isfinite(n):
        return 'non_finite'
    return 'negative' if n < 0 else 'zero' if n == 0 else 'positive'


read('tfda.zip')
with zipfile.ZipFile(root / 'tfda.zip') as archive:
    rows = json.loads(archive.read('20_5.json').decode('utf-8-sig'))
foods = collections.defaultdict(list)
keys = collections.Counter()
for row in rows:
    foods[row['整合編號']].append(row)
    keys[(row['整合編號'], row['分析項'], row['含量單位'])] += 1
core = ['熱量', '粗蛋白', '粗脂肪', '總碳水化合物', '膳食纖維', '鈉']
core_rows = [r for r in rows if r['分析項'] in core]
tfda = {
    'nutrient_rows': len(rows), 'foods': len(foods),
    'duplicate_food_nutrient_unit_keys': sum(v - 1 for v in keys.values() if v > 1),
    'inconsistent_identity_ids': [k for k, rs in foods.items() if len({
        (r['樣品名稱'], r['樣品英文名稱'], r['內容物描述'], r['食品分類']) for r in rs
    }) != 1],
    'core': {name: {
        'units': dict(collections.Counter(r['含量單位'] for r in core_rows if r['分析項'] == name)),
        'values': dict(collections.Counter(number_state(r['每100克含量']) for r in core_rows if r['分析項'] == name)),
        'no_sample_count': sum(number_state(r['樣本數']) in ('missing', 'zero') for r in core_rows if r['分析項'] == name),
    } for name in core},
    'categories': dict(collections.Counter(rs[0]['食品分類'] for rs in foods.values())),
    'food_state_unspecified_count': sum('樣品狀態:' not in (rs[0]['內容物描述'] or '') for rs in foods.values()),
    'zero_unit_weight_foods': sum(rs[0]['每單位重'] == '0.0克' for rs in foods.values()),
    'examples': [],
}
for term in ['豆腐', '豆漿', '米飯', '麵條', '香菇', '醬油']:
    matches = [rs for rs in foods.values() if term in rs[0]['樣品名稱']]
    tfda['examples'].append({'term': term, 'matches': len(matches), 'samples': [
        {'id': rs[0]['整合編號'], 'name': rs[0]['樣品名稱'], 'description': rs[0]['內容物描述'],
         'nutrients': {r['分析項']: {'value': r['每100克含量'], 'unit': r['含量單位']} for r in rs if r['分析項'] in core}}
        for rs in matches[:2]
    ]})

w = data('wger-sample.json')
exercises = w['results']
images = [m for e in exercises for m in e['images']]
videos = [m for e in exercises for m in e['videos']]
licenses = {x['id']: x for x in data('wger-license.json')['results']}
languages = {x['short_name']: x['id'] for x in data('wger-language.json')['results']}
wger = {
    'api_total': w['count'], 'first_page_sample': len(exercises),
    'unique_ids': len({e['id'] for e in exercises}),
    'with_english_description': sum(any(t['language'] == languages['en'] and t['description'].strip() for t in e['translations']) for e in exercises),
    'with_chinese_description': sum(any(t['language'] == languages['zh'] and t['description'].strip() for t in e['translations']) for e in exercises),
    'exercises_with_images': sum(bool(e['images']) for e in exercises),
    'exercises_with_videos': sum(bool(e['videos']) for e in exercises),
    'images': len(images), 'videos': len(videos),
    'media_missing_author': {'images': sum(not m['license_author'].strip() for m in images), 'videos': sum(not m['license_author'].strip() for m in videos)},
    'video_codecs': dict(collections.Counter(m['codec'] for m in videos)),
    'media_licenses': dict(collections.Counter(licenses[m['license']]['short_name'] for m in images + videos)),
    'examples': [{'id': e['id'], 'name': next((t['name'] for t in e['translations'] if t['language'] == languages['en']), None),
                  'images': len(e['images']), 'videos': len(e['videos']), 'license': e['license']['short_name']}
                 for e in exercises[:10]],
}

free = data('free-exercises.json')
free_summary = {
    'records': len(free), 'unique_ids': len({e['id'] for e in free}),
    'missing': {key: sum(not e.get(key) for e in free) for key in ['name', 'instructions', 'primaryMuscles', 'equipment', 'force', 'mechanic', 'images', 'license', 'source']},
    'image_references': sum(len(e['images']) for e in free),
    'image_extensions': dict(collections.Counter(pathlib.Path(i).suffix for e in free for i in e['images'])),
    'categories': dict(collections.Counter(e['category'] for e in free)),
}

off = data('off-china-retry.json')
products = off['products']
off_summary = {
    'query_total': off.get('count'), 'sample': len(products),
    'unique_codes': len({p['code'] for p in products}),
    'with_explicit_chinese_name': sum(bool(p.get('product_name_zh')) for p in products),
    'with_nutrition_image': sum(bool(p.get('image_nutrition_url')) for p in products),
    'with_quality_errors': sum(bool(p.get('data_quality_errors_tags')) for p in products),
    'with_quality_warnings': sum(bool(p.get('data_quality_warnings_tags')) for p in products),
    'nutrition_data_per': dict(collections.Counter(p.get('nutrition_data_per') or 'missing' for p in products)),
    'nutrients': {key: dict(collections.Counter(number_state(p.get('nutriments', {}).get(key)) for p in products))
                  for key in ['energy-kcal_100g', 'proteins_100g', 'fat_100g', 'carbohydrates_100g', 'fiber_100g', 'sodium_100g']},
    'sample_names': [p.get('product_name_zh') or p.get('product_name') for p in products[:10]],
}
print(json.dumps({'tfda': tfda, 'wger': wger, 'free_exercise_db': free_summary, 'open_food_facts': off_summary,
                  'evidence': evidence}, ensure_ascii=False, indent=2))
