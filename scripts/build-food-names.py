"""Reproducible Chinese display names. Never alter USDA facts or silently drop unknown terms."""
import collections,hashlib,json,pathlib,re

root=pathlib.Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text(encoding='utf-8'))
rows=load('public/data/sr-legacy/index.json')
manifest=load('public/data/sr-legacy/manifest.json')
curated={f['fdcId']:f for f in load('src/foods.json')}
terms={}
for line in (root/'scripts/food-name-terms.tsv').read_text(encoding='utf-8').splitlines():
 if not line or line.startswith('#'):continue
 en,zh,*note=line.split('|');key=en.casefold()
 if key in terms:assert terms[key][0]==zh,('Conflicting term',key)
 terms[key]=(zh,note[0] if note else '')

# Keep product/manufacturer names as written. No unsupported Chinese brand aliases.
brands="""McDONALD'S|KFC|BURGER KING|POPEYES|DENNY'S|WENDY'S|WEND'YS|APPLEBEE'S|SUBWAY|TACO BELL|CRACKER BARREL|DIGIORNO|Vitasoy USA|T.G.I. FRIDAY'S|SMART SOUP|Oscar Mayer|ON THE BORDER|HORMEL ALWAYS TENDER|HORMEL|OLIVE GARDEN|CARRABBA'S ITALIAN GRILL|MORI-NU|Pillsbury|Glutino|Udi's|Nabisco|PIZZA HUT|CAMPBELL'S CHUNKY|CAMPBELL'S|DOMINO'S|LITTLE CAESARS|PAPA JOHN'S|CHICK-FIL-A|HOT POCKETS|George Weston Bakeries|Schar|Kraft Foods|Kraft|KRAFT|Tostitos|Andrea's|Crunchmaster|Rudi's|Heinz|Interstate Brands Corp|SCHIFF|Mary's Gone Crackers|Sage Valley|HUNGRY MAN|BANQUET|JIMMY DEAN|ARBY'S|LEAN POCKETS|Reddi Wip|Clif|SILK|HOUSE FOODS|Keebler|Continental Mills|Mckee Baking|RICE-A-RONI|Mission Foods|Martha White Foods|Pepperidge Farm|Archway|QUAKER|MEAD JOHNSON|MARS SNACKFOOD US|ENFAMIL|MALT-O-MEAL|ABBOTT NUTRITION|NESTLE|SIMILAC|POST|OCEAN SPRAY|CHOBANI|GERBER|BREYERS|V8 SPLASH|V8|CREAM OF WHEAT|GENERAL MILLS|KELLOGG'S|KELLOGG|KASHI|MOM'S BEST|Malt-O-Meal|MILLVILLE|BARBARA'S|CASCADE FARM|CASCADIAN FARM|Nature Valley|NATURE'S PATH|EQUAL|SPLENDA|SUNNY D|SNAPPLE|GATORADE|POWERADE|COCA-COLA|PEPSI|SPRITE|DR PEPPER|7UP|RED BULL|MONSTER|ROCKSTAR|ENSURE|BOOST|SLIMFAST|SLIM-FAST|CARNATION|NESQUIK|OVALTINE|SWANSON|HEALTHY CHOICE|MARIE CALLENDER'S|STOUFFER'S|KASHI|SOUTH BEACH|ATKINS""".split('|')
brands += """GOOD START SUPREME|GOOD START|M&M MARS|M&M's|MOTHER'S|LIPIL|ADVANCE|COCOAVIA|ISOMIL|Nasoya|Cran|PBM|Goldfish|REAL MEDLEYS|PROSOBEE|SNICKERS MARATHON|ABBOTT|NAKED|BOLTHOUSE FARMS|HERSHEY'S|HERSHEY|STARBURST|ENFAGROW|NUTRAMIGEN|GREAT GRAINS|PROTECT PLUS|KLONDIKE|WHOPPER|GRADUATES|RALSTON|Van's|TWIX|MILKY WAY Midnight|MILKY WAY|REESE'S|SKITTLES|GENTLEASE|KUDOS|QUARTER POUNDER|NEXT STEP|SMART BALANCE|DANNON OIKOS|SUN COUNTRY|KRETSCHMER|WHEATENA|V-FUSION|McGRIDDLES|McMUFFIN|CROISSAN'WICH|SENSITIVE|BUMPERS|LIFE|UNILEVER|Azumaya|FRITOLAY|SUNCHIPS|TWIZZLERS NIBS|TWIZZLERS|HEALTH VALLEY|ODWALLA|BUDWEISER|SNICKERS|NUTRI-GRAIN|PurAmino|GENTLE PLUS|CREAMSICLE|BIG DADDY'S LS|TONY'S SMARTPIZZA|BIG MAC|LIFEWAY|ENFACARE|CHEEZ WHIZ|BREAKSTONE'S|Reguline|Pregestimil|LGG|ALIMENTUM|PEDIASURE|AR|NEOSURE|COLOSSAL CRUNCH|FLAX PLUS|GOLEAN|EAS|GEROLSTEINER BRUNNEN GmbH|Co. KG|McFLURRY|McCHICKEN|VELVEETA|DANNON|PEPSICO|MATEYS|TLC|ZEVIA|Goya|Gamesa Sabrosas|La Moderna Rikis|BIT-O'-HONEY|BUTTERFINGER|GOOBERS|BABY RUTH|Grands|Weight Watcher|Wonder|Snackwell's|Bimbo Bakeries|La Ricura|TOBLERONE|CORNNUTS|SMUCKER'S MAGIC SHELL|COMBOS|TOOTSIE|CARAMELLO|SOLITAIRES|YORK|SYMPHONY|KIT KAT|KRACKEL|MARS|OH HENRY|ZESPRI SunGold|CONCORD|GO-GURT|NESCAFE|LIPTON|TROPICANA""".split('|')
brands += """Shake N Bake Original Recipe|Martha White's|Stove Top|FILET-O-FISH|FRIDAY'S|TIGER'S MILK BAR|OAT BLENDERS|HONEY BUNCHES OF OATS|MUSKETEERS|EMI-TSUNOMATA|KAMUT khorasan|SPOONERS|Frosty|SNACK WRAP|OREO|Oreo Crunchies|Ritz|Krusteaz|Little Debbie|Brownberry|Smokies|CROISSANT POCKETS|McNUGGETS|Vitasoy|Mission|Thomas|Grahams|Nutty Bars|Devil's Food|Mini-Wheats|Froot Loops|Frosted Flakes|Rice Krispies|Total|Lucky Charms|Cheerios|Cocoa Puffs|Golden Grahams|Fruit Loops|Cinnamon Toast Crunch|Honey Nut Cheerios|WHEATIES|RAISIN BRAN|Corn Flakes|The Perfect 10|Cure 81|Santa Fe|Chai|Nog|O'Brien|Super Supreme|Hot 'N Juicy|Double Stack|Big Breakfast""".split('|')
protected={s.casefold() for s in brands}|{'usda','us','usa','ara','dha','epa','omega-3','omega 3','nfs','iu','a','b','c','d','e','k','b12','b-12','b6','b-6','d2','d3'}
all_keys=set(terms)|protected
pattern=re.compile(r'(?<![A-Za-z0-9])('+ '|'.join(re.escape(k) for k in sorted(all_keys,key=lambda s:(-len(s),s)))+r')(?![A-Za-z0-9])',re.I)

def translate(original,category):
 notes=[];unknown=[];used=[];parts=[];last=0
 meat=bool(re.match(r'^(Beef|Pork|Lamb|Veal|Game meat)\b',original,re.I))
 egg=bool(re.match(r'^Eggs?,',original,re.I))
 milk=bool(re.match(r'^Milk,',original,re.I))
 # Contextual senses are never inferred from a generic word alone.
 context={}
 if original.lower().startswith('soy sauce') and 'hydrolyzed vegetable protein' in original.lower():context['soy sauce']=('植物蛋白水解调味液（原文 soy sauce）','保留美国原条目分类，不推定符合国内酿造酱油定义')
 if not meat:context.update({'round':('圆形',''),'plate':('盘装',''),'eye':('眼部',''),'roast':('烤制食品（roast）','raw/cooked状态仍以原文为准')})
 context['ground']=('绞碎','') if meat else ('磨碎','')
 if re.match(r'^Nuts,',original,re.I):context['acorn']=('橡实','')
 if re.match(r'^(Pork|Beef|Lamb|Veal|Fish|Chicken|Turkey|Game meat)',original,re.I):context['flesh']=('肉','')
 else:context['flesh']=('果肉','')
 if egg:
  context.update({'white':('蛋白',''),'whole':('全蛋',''),'duck':('鸭源',''),'goose':('鹅源',''),'quail':('鹌鹑源',''),'turkey':('火鸡源','')})
  species=next((zh for en,zh in [('duck','鸭蛋'),('goose','鹅蛋'),('quail','鹌鹑蛋'),('turkey','火鸡蛋')] if re.search(r'^Egg,\s*'+en+r'\b',original,re.I)),None)
  if species:context['egg']=(species,'')
 if milk:
  context.update({'whole':('全脂',''),'goat':('山羊乳',''),'sheep':('绵羊乳',''),'human':('人乳',''),'indian buffalo':('印度水牛乳',''),'filled':('乳脂替代型（filled milk）','具体替代脂肪以原条目配方为准')})
  if re.search(r'^Milk,\s*(goat|sheep|human|indian buffalo|imitation|filled)\b',original,re.I):context['milk']=('乳类','')
 if re.match(r'^Cheese,\s*goat',original,re.I):context['goat']=('山羊乳','')
 if re.match(r'^Rice,',original,re.I):
  context['rice']=('米饭' if re.search(r'(?<!un)\bcooked\b',original,re.I) else '大米','')
 if re.match(r'^Fish,\s*salmon,\s*pink\b',original,re.I):context['pink']=('粉鲑（pink salmon）','鱼种译名，不能仅按粉红色判断实际鱼种')
 if re.match(r'^Spices,\s*peppers?,\s*(black|white)\b',original,re.I):context['pepper']=('胡椒','')
 if re.match(r'^(Cookies|Crackers),',original,re.I):context['sandwich']=('夹心型','')
 if re.search(r'^Fish,.*rainbow',original,re.I):context['rainbow']=('虹鳟型','')
 if re.match(r'^Currants,\s*zante',original,re.I):context['currants']=('科林斯葡萄干','zante currants 指小粒葡萄干，不是穗醋栗')
 for m in pattern.finditer(original):
  gap=original[last:m.start()];parts.append(gap)
  unknown.extend(re.findall(r"[A-Za-z][A-Za-z0-9'’&/.-]*(?:\s+[A-Za-z][A-Za-z0-9'’&/.-]*)*",gap))
  key=m.group().casefold()
  if key in protected:parts.append(m.group())
  else:
   zh,note=context.get(key,terms[key]);parts.append(zh);used.append(key)
   if note:notes.append(note)
  last=m.end()
 gap=original[last:];parts.append(gap);unknown.extend(re.findall(r"[A-Za-z][A-Za-z0-9'’&/.-]*(?:\s+[A-Za-z][A-Za-z0-9'’&/.-]*)*",gap))
 name=''.join(parts).replace(',','，')
 name=re.sub(r'\s+',' ',name).strip()
 name=re.sub(r'([\u3400-\u9fff）])\s+(?=[\u3400-\u9fff（])',r'\1',name)
 name=re.sub(r'，\s*','，',name).replace('式式','式')
 unknown=list(dict.fromkeys(x.strip() for x in unknown if x.strip()))
 if not re.search(r'[\u3400-\u9fff]',name.split('，')[0]):
  name=category+'：'+name
  if unknown:notes.append('食品专名没有确定中文对应，中文类别仅帮助识别；保留专名，不做音译猜测')
 if unknown:notes.append('未确定中文对应的原词保留：'+'；'.join(unknown))
 return {'name':name,'status':'needs-review' if notes else 'translated','notes':list(dict.fromkeys(notes)),'unresolved':unknown,'terms':list(dict.fromkeys(used))}

names={};unknown_counts=collections.Counter()
for row in rows:
 id,original,category,*_=row
 if id in curated:
  f=curated[id];entry={'name':f['name'],'status':'curated','notes':[],'unresolved':[],'terms':[]}
 else:entry=translate(original,manifest['groups'][category]['name'])
 names[id]={'originalName':original,**entry}
 unknown_counts.update(entry['unresolved'])

out={'version':'zh-terms-2026-11-04-v1','method':'项目编写术语表按完整词组组合；保留未定术语。非USDA官方中文译名，新增译名未经过逐条专业审核。品牌与产品系列原名保留，不代表国内在售配方。','sourceIndexSha256':manifest['indexSha256'],'glossarySha256':hashlib.sha256((root/'scripts/food-name-terms.tsv').read_bytes()).hexdigest(),'count':len(names),'statusCounts':dict(collections.Counter(n['status'] for n in names.values())),'entries':names}
(root/'public/data/sr-legacy/names-zh.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
(root/'tools').mkdir(exist_ok=True)
(root/'tools/name-review.json').write_text(json.dumps(unknown_counts.most_common(),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'count':len(names),'status':out['statusCounts'],'unresolvedTerms':len(unknown_counts),'topUnknown':unknown_counts.most_common(70)},ensure_ascii=False))
