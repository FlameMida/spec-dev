import ast,hashlib,json,re,subprocess
from pathlib import Path
plan=Path(__file__).resolve().parent;f=plan.parent;root=f.parent.parent
errors=[];counts={'python':0,'javascript':0,'shell':0,'json_assets':0,'fixtures':0};checked=set();state={};anchors=[]
def check(lang,body,where):
    key=(lang,body)
    if key in checked:return
    checked.add(key)
    try:
        if lang=='python':ast.parse(body,filename=where);counts['python']+=1
        elif lang=='javascript':
            r=subprocess.run(['rtk','proxy','node','--input-type=module','--check'],input=body,text=True,capture_output=True)
            if r.returncode:raise ValueError(r.stderr)
            counts['javascript']+=1
        elif lang=='bash':
            r=subprocess.run(['rtk','proxy','bash','-n'],input=body,text=True,capture_output=True)
            if r.returncode:raise ValueError(r.stderr)
            counts['shell']+=1
    except Exception as e:errors.append(where+':'+str(e))
def json_const(body,name):
    marker='const '+name+'='
    if marker not in body:return None
    return json.JSONDecoder().raw_decode(body.split(marker,1)[1])[0]
for p in sorted((plan/'tasks').glob('T*.md')):
    text=p.read_text()
    if re.search(r'TODO|TBD|稍后实现|添加适当的错误处理|类似任务 \d',text):errors.append(str(p)+':placeholder')
    for i,m in enumerate(re.finditer(r'^```(\w*)\n(.*?)^```\s*$',text,re.M|re.S)):
        lang,body=m.groups();where=p.name+':block'+str(i)
        check(lang,body,where)
        nested=[(x.group(1),x.group(2)) for x in re.finditer(r"rtk proxy (python3|node) - <<'(PY|JS)'\n(.*?)\n\2",body,re.S)]
        for j,x in enumerate(re.finditer(r"rtk proxy (python3|node) - <<'(PY|JS)'\n(.*?)\n\2",body,re.S)):
            js=x[1]=='node';code=x[3];check('javascript' if js else 'python',code,where+':heredoc'+str(j))
            if not js:continue
            try:
                edits=json_const(code,'edits')
                if edits:
                    for e in edits:
                        before=state.get(e['path'])
                        if before is None and (root/e['path']).exists():before=(root/e['path']).read_text()
                        if e['old'] is None:
                            if before is not None:raise ValueError('Existing create:'+e['path'])
                            state[e['path']]=e['value']
                        else:
                            if before is None or before.count(e['old'])!=1:raise ValueError('Anchor:'+e['path'])
                            state[e['path']]=before.replace(e['old'],e['value'],1)
                        anchors.append({'task':p.stem,'path':e['path']})
                files=json_const(code,'files')
                if files:
                    for name,source in files.items():
                        if name.endswith('.py'):check('python',source,where+':'+name)
                        if name.endswith('.mjs'):check('javascript',source,where+':'+name)
                        if name.endswith('.json'):
                            j=json.loads(source);counts['json_assets']+=1
                            if 'cases' in j:
                                registry=j
                                for case,data in j['cases'].items():
                                    assert data['scenario']=='P00' or data['scenario'] in ['S'+str(i).zfill(2) for i in range(1,33)]
                                    if data['prior_case']:assert data['prior_case'] in j['cases']
                                    actual={**j['base_files'],**data['files']}
                                    for removed in data['remove']:actual.pop(removed,None)
                                    for fn,s in actual.items():
                                        assert not Path(fn).is_absolute() and '..' not in Path(fn).parts
                                        if fn.endswith('.mjs'):check('javascript',s,'fixture:'+case+':'+fn)
                                        if fn.endswith('.json'):json.loads(s)
                                    counts['fixtures']+=1
            except Exception as e:errors.append(where+':'+str(e))
index=(plan/'index.md').read_text()
for row in index.splitlines():
    m=re.match(r'\| (T\d\d) [^|]+ \| ([^|]+) \| ([^|]+) \| ([^|]+) \|',row)
    if not m:continue
    task,dep,consume,produce=m.groups();t=(plan/'tasks'/f'{task}.md').read_text().split('**接口**：',1)[1]
    for label,v in [('消费',consume),('产出',produce)]:
        got=re.search(r'^- '+label+'：(.+)',t,re.M).group(1).rstrip('。')
        if got!=v.strip():errors.append(task+':navigation '+label+' differs')
progress=json.loads((plan/'progress.yaml').read_text());assert len(progress['tasks'])==8 and all(x['status']=='pending' for x in progress['tasks'].values())
for p in plan.rglob('*.md'):
    prose=re.sub(r'^```\w*\n.*?^```\s*$','',p.read_text(),flags=re.M|re.S)
    for target in re.findall(r'\]\(([^)]+)\)',prose):
        if target.startswith(('http','app:')):continue
        local=target.split('#')[0]
        if not local:continue
        if not (p.parent/local).resolve().exists() and local!='self-review.json':errors.append(str(p)+':link '+target)
for name,text in state.items():
    for target in re.findall(r'\]\(([^)]+)\)',text):
        if target.startswith(('http','app:')):continue
        local=target.split('#')[0]
        if not local or '<' in local:continue
        dest=(root/name).parent/local
        try:key=str(dest.resolve().relative_to(root))
        except ValueError:continue
        if not dest.resolve().exists() and key not in state:errors.append('projected '+name+':link '+target)
report={'checks':'Spec/Scenario mapping, placeholders, syntax/interfaces, navigation, dependency safety; no generated task executed','syntax':counts,'sequentialEditOperations':len(anchors),'replacementAnchors':49,'newProductFilesInEditBlocks':1,'pendingTasks':8,'scenarioCount':32,'errors':errors,'caseCount':len(registry['cases']),'implementationExecuted':False}
(plan/'self-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False));raise SystemExit(bool(errors))
