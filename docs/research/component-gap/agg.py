import json,glob,collections,re
ref=[];ours=[]
for f in glob.glob(__import__('os').path.dirname(__file__)+'/*.json'):
    d=json.load(open(f)); (ours if f.endswith('ours.json') else ref).extend(d)
def app(x): return re.split(r'-\d',x['file'].split('/')[-1])[0]
apps=collections.defaultdict(list)
for x in ref: apps[app(x)].append(x)
keys=collections.Counter(); appcov=collections.defaultdict(set)
for a,xs in apps.items():
    for x in xs:
        for k in set(x['components']): keys[k]+=1; appcov[k].add(a)
ok=collections.Counter(k for x in ours for k in set(x['components']))
R,O=len(ref),len(ours)
print(f"ref screens {R} apps {len(apps)} | ours {O}")
print(f"avg kinds/screen ref {sum(len(set(x['components'])) for x in ref)/R:.1f} ours {sum(len(set(x['components'])) for x in ours)/O:.1f}")
print("key | ref% | apps | ours%")
for k in sorted(set(keys)|set(ok),key=lambda k:-keys[k]):
    print(f"{k:16} {100*keys[k]/R:4.0f}% {len(appcov[k])}/{len(apps)} {100*ok[k]/O:4.0f}%  {','.join(sorted(appcov[k]))}")
oth=collections.Counter(o for x in ref for o in x.get('other',[]))
print("other(ref):",oth.most_common(40))
print("other(ours):",collections.Counter(o for x in ours for o in x.get('other',[])).most_common(20))
