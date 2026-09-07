"""固定输入快照与运行状态。"""
import hashlib
import json
import subprocess
import uuid
import os
import tempfile
import time
import re
from contextlib import contextmanager
import fcntl
from pathlib import Path


def encode(data):
    return (json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(repo, *args):
    return subprocess.run(['rtk', 'proxy', 'git', *args], cwd=repo, capture_output=True, check=True).stdout


def snapshot(repo):
    names = git(repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard').decode().split('\0')
    files = {}
    for name in sorted(set(names) - {''}):
        p = repo / name
        if p.is_symlink():
            raise ValueError('快照不接受符号链接: ' + name)
        if p.is_file():
            files[name] = digest(p.read_bytes())
        else:
            files[name] = None
    return {'head': git(repo, 'rev-parse', 'HEAD').decode().strip(), 'files': files,
            'status': git(repo, 'status', '--porcelain=v1').decode()}


def initialize(run, config):
    repo = Path(config['repo']).resolve()
    run = run.resolve()
    if run.is_relative_to(repo):
        raise ValueError('运行记录必须位于被审仓库之外')
    if run.exists():
        raise ValueError('run已存在，不允许覆盖')
    tier = config['tier']
    roles = {'small': ['AS'], 'regular': ['A', 'B', 'C', 'S'], 'large': ['A', 'B-quality', 'B-simple', 'C', 'S']}[tier]
    if type(config['capacity']) is not int or not 1 <= config['capacity'] <= 32:
        raise ValueError('capacity必须为1到32')
    state = snapshot(repo)
    base = git(repo, 'rev-parse', '--verify', config['base'] + '^{commit}').decode().strip()
    head = git(repo, 'rev-parse', '--verify', config['head'] + '^{commit}').decode().strip()
    if state['head'] != head or state['status']:
        raise ValueError('审查快照必须是指定HEAD的干净工作区')
    diff = git(repo, 'diff', base + '...' + head).decode()
    lines = sum(1 for x in diff.splitlines() if x.startswith(('+', '-')) and not x.startswith(('+++', '---')))
    if tier == 'small' and lines >= 100:
        raise ValueError('完整diff不少于100行，不能按小档派发')
    texts = {}
    for name in state['files']:
        try: texts[name] = (repo / name).read_text()
        except (UnicodeError, OSError): pass
    for key in ['spec', 'plan']:
        if config[key] not in texts:
            raise ValueError('契约路径未纳入快照: ' + config[key])
    for item in config['tests']:
        if set(item) != {'id', 'argv'} or not item['argv'] or not all(isinstance(x, str) for x in item['argv']):
            raise ValueError('tests必须为id及固定argv')
    if not config['tests'] or len({x['id'] for x in config['tests']}) != len(config['tests']):
        raise ValueError('测试定义为空或ID重复')
    run.mkdir(parents=True)
    (run / 'objects').mkdir()
    (run / 'actors').mkdir()
    plugin = Path(__file__).resolve().parents[2]
    source_paths = ['agents/code-reviewer.md', 'skills/executing-plans/references/review-orchestration.md', 'skills/writing-plans/references/design-principles.md']
    candidate_sources = {name: (plugin / name).read_text() for name in source_paths}
    runtime_paths = ['scripts/review-runner.py', 'scripts/lib/review_store.py', 'scripts/lib/review_broker.py', 'scripts/lib/review_process.py', 'scripts/validate-output.mjs', 'scripts/lib/parallel-plan.mjs', 'scripts/schemas/review-findings.json']
    runtime_hashes = {name: digest((plugin / name).read_bytes()) for name in runtime_paths}
    data = {**config, 'runtime_hashes': runtime_hashes, 'candidate_sources': candidate_sources, 'repo': str(repo), 'base': base, 'head': head, 'id': uuid.uuid4().hex,
            'roles': roles, 'snapshot': state, 'texts': texts, 'diff': diff,
            'plugin_root': str(Path(__file__).resolve().parents[2])}
    for ref in data.get('d_request', []):
        citation(data, ref)
    (run / 'manifest.json').write_bytes(encode(data))
    (run / 'manifest.sha256').write_text(digest(encode(data)))
    for name in runtime_paths:
        saved = run / 'runtime-source' / name
        saved.parent.mkdir(parents=True, exist_ok=True)
        saved.write_bytes((plugin / name).read_bytes())
    return {'status': 'initialized', 'run': data['id'], 'roles': roles}


def manifest(run):
    raw = (run / 'manifest.json').read_bytes()
    if digest(raw) != (run / 'manifest.sha256').read_text():
        raise ValueError('manifest哈希不匹配')
    return json.loads(raw)



def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.pending-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(encode(data)); f.flush(); os.fsync(f.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name): os.unlink(name)


@contextmanager
def lock(path, blocking=True):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a') as f:
        try: fcntl.flock(f, fcntl.LOCK_EX | (0 if blocking else fcntl.LOCK_NB))
        except BlockingIOError: raise ValueError('同run已有活动运行，不可并发resume')
        try: yield
        finally: fcntl.flock(f, fcntl.LOCK_UN)


def object_put(run, kind, actor, payload):
    data = {'kind': kind, 'run': manifest(run)['id'], 'actor': actor, **payload}
    raw = encode(data); key = digest(raw)
    path = run / 'objects' / (key + '.json')
    if path.exists():
        if path.read_bytes() != raw: raise ValueError('已有对象哈希冲突')
    else:
        # Only a fully written temporary file becomes visible as a content-addressed object.
        atomic(path, data)
    return {'id': key, **data}


def object_get(run, key):
    if not isinstance(key, str) or not re.fullmatch('[0-9a-f]{64}', key):
        raise ValueError('证据ID非法')
    raw = (run / 'objects' / (key + '.json')).read_bytes()
    if digest(raw) != key: raise ValueError('对象哈希不匹配: ' + key)
    data = json.loads(raw)
    if data['run'] != manifest(run)['id']: raise ValueError('不接受跨run对象')
    return {'id': key, **data}


def verify(run):
    data = manifest(run)
    for name, expected in data['runtime_hashes'].items():
        if digest((Path(data['plugin_root']) / name).read_bytes()) != expected:
            raise ValueError('运行器或校验依赖快照发生变化: ' + name)
    for name, content in data['candidate_sources'].items():
        if (Path(data['plugin_root']) / name).read_text() != content:
            raise ValueError('候选规则快照发生变化: ' + name)
    if snapshot(Path(data['repo'])) != data['snapshot']:
        raise ValueError('被审快照发生变化，本run不能继续')
    for path in (run / 'objects').glob('*.json'):
        object_get(run, path.stem)
    return data


def actor_dir(run, actor):
    if not isinstance(actor, str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9-]*', actor):
        raise ValueError('actor非法')
    roles = manifest(run)['roles']
    if actor not in roles + ['D', 'refute-1', 'refute-2', 'critic-1', 'critic-2'] + ['supplement-' + r for r in roles + ['D']]:
        raise ValueError('actor未获派发')
    path = run / 'actors' / actor
    path.mkdir(exist_ok=True)
    return path


def report_get(run, actor):
    pointer = actor_dir(run, actor) / 'report.json'
    return object_get(run, json.loads(pointer.read_text())['id']) if pointer.exists() else None


def completion(run, actor):
    p = actor_dir(run, actor) / 'completed.json'
    if not p.exists(): return None
    record = object_get(run, json.loads(p.read_text())['id'])
    report = report_get(run, actor)
    if record['actor'] != actor or record['kind'] != 'completion' or record['exit'] != 0 or not report or record['report_id'] != report['id']:
        raise ValueError('完成回执与实际报告不匹配: ' + actor)
    segment = record.get('segment')
    if type(segment) is not int or segment < 1:
        raise ValueError('完成回执片段非法: ' + actor)
    for suffix, key in [('.jsonl', 'stdout_sha256'), ('.stderr', 'stderr_sha256')]:
        log = actor_dir(run, actor) / ('attempt-' + str(segment) + suffix)
        if not log.is_file() or digest(log.read_bytes()) != record.get(key):
            raise ValueError('CLI原始完成日志缺失或哈希不匹配: ' + actor + suffix)
    return record


def scenarios(data):
    result = []
    for block in re.split(r'^### Requirement:', data['texts'][data['spec']], flags=re.M):
        if re.search(r'^>.*\bSuperseded\b', block, flags=re.M): continue
        result += re.findall(r'^#### Scenario:\s*(.+)', block, flags=re.M)
    return result


def citation(data, ref):
    if not isinstance(ref, dict) or set(ref) - {'finding_index', 'file', 'line', 'quote'}:
        raise ValueError('引用包含未知字段')
    file, line, quote = ref.get('file'), ref.get('line'), ref.get('quote')
    if file not in data['texts'] or type(line) is not int or line < 1 or not isinstance(quote, str) or not quote.strip():
        raise ValueError('引用必须绑定固定快照路径、正行号及原文')
    lines = data['texts'][file].splitlines()
    actual = '\n'.join(lines[line - 1:line - 1 + len(quote.splitlines())])
    if actual != quote: raise ValueError('引用原文与快照不符: ' + file + ':' + str(line))



def contract_scopes(data, refs):
    """A necessary condition for conservative merging, never a proof of shared causality."""
    lines = data['texts'][data['spec']].splitlines()
    requirements = [i for i, line in enumerate(lines) if line.startswith('### Requirement:')]
    scopes = {}
    for n, start in enumerate(requirements):
        end = requirements[n + 1] if n + 1 < len(requirements) else len(lines)
        if any(re.match(r'^>.*\bSuperseded\b', line) for line in lines[start:end]): continue
        starts = [i for i in range(start, end) if lines[i].startswith('#### Scenario:')]
        for j, scenario_start in enumerate(starts):
            scenario_end = starts[j + 1] if j + 1 < len(starts) else end
            identity = (data['spec'], start + 1, scenario_start + 1)
            for i in range(scenario_start, scenario_end): scopes[i + 1] = identity
    result = set()
    for ref in refs:
        if ref['file'] != data['spec']: continue
        for line in range(ref['line'], ref['line'] + len(ref['quote'].splitlines())):
            if line in scopes: result.add(scopes[line])
    return result


def schema_check(run, actor, report):
    data = manifest(run)
    path = actor_dir(run, actor) / 'schema-input.json'
    atomic(path, report)
    result = subprocess.run(['rtk', 'proxy', 'node', str(Path(data['plugin_root']) / 'scripts/validate-output.mjs'),
                             'review-findings', str(path)], capture_output=True, text=True)
    if result.returncode:
        raise ValueError('review-findings schema失败: ' + result.stderr + result.stdout)


def candidates(run, actors):
    values = []
    for actor in actors:
        if not completion(run, actor): continue
        doc = report_get(run, actor)
        for index, finding in enumerate(doc['body']['report']['findings']):
            if finding['severity'] in ['高', '中'] and finding['confidence'] >= 80:
                values.append({'id': doc['id'] + ':' + str(index), 'proposer': actor, 'finding': finding,
                               'citations': [x for x in doc['body']['citations'] if x['finding_index'] == index]})
    return values



def finished_actors(run):
    return [p.name for p in (run / 'actors').iterdir() if p.is_dir() and completion(run, p.name)]


def selected_dimensions(run):
    data = manifest(run); roles = list(data['roles'])
    if data.get('d_request') or any(report_get(run, a)['body']['d_request'] for a in finished_actors(run)):
        roles.append('D')
    return roles


def tasks(run):
    dims = selected_dimensions(run)
    todo = [{'actor': a, 'depends': []} for a in dims]
    first = candidates(run, manifest(run)['roles'])
    # D available in the first wave joins its rebuttal; later D is handled by the late wave.
    first_refute = report_get(run, 'refute-1')
    if not first_refute:
        first += candidates(run, [a for a in dims if a not in manifest(run)['roles']])
    elif first_refute:
        ids = {x['candidate_id'] for x in first_refute['body']['decisions']}
        first = [x for x in candidates(run, dims) if x['id'] in ids]
    if first: todo.append({'actor': 'refute-1', 'depends': dims, 'candidates': first})
    todo.append({'actor': 'critic-1', 'depends': dims + (['refute-1'] if first else [])})
    if completion(run, 'critic-1'):
        c = report_get(run, 'critic-1')
        supplements = sorted(set('supplement-' + x['actor'] for x in c['body'].get('gaps', []) if x['actor'] in dims))
        todo += [{'actor': a, 'depends': ['critic-1', a.removeprefix('supplement-')]} for a in supplements]
        known = {x['id'] for x in first}
        late = [x for x in candidates(run, dims + ['refute-1', 'critic-1'] + supplements) if x['id'] not in known]
        if late: todo.append({'actor': 'refute-2', 'depends': dims + ['critic-1'] + supplements, 'candidates': late})
        stale = any(a not in c.get('basis', {}) for a in dims)
        if supplements or late or stale:
            todo.append({'actor': 'critic-2', 'depends': dims + ['critic-1'] + supplements + (['refute-2'] if late else [])})
    return todo


def submit(run, actor, body, attempt=None):
    data = verify(run)
    required = {'report', 'citations', 'coverage', 'evidence_ids', 'd_request'}
    optional = {'decisions', 'gaps', 'merge_groups'}
    if not isinstance(body, dict) or set(body) - required - optional or not required.issubset(body):
        raise ValueError('报告外层字段不完整或包含未知字段')
    for key in required - {'report'}:
        if not isinstance(body[key], list): raise ValueError(key + '必须为数组')
    records = [object_get(run, key) for key in body['evidence_ids']]
    if any(e['kind'] != 'test' for e in records): raise ValueError('测试引用必须是实际test回执')
    if actor in ['A', 'AS'] or actor in ['supplement-A', 'supplement-AS']:
        own = {e['test_id'] for e in records if e['actor'] == actor and e.get('complete') is True}
        if own != {x['id'] for x in data['tests']}: raise ValueError('A必须有本actor实际独立复跑的完整回执')
    schema_check(run, actor, body['report'])
    findings = body['report']['findings']
    if any(x['confidence'] < 80 for x in findings):
        raise ValueError('发现必须达到既有80置信度阈值')
    for ref in body['citations']:
        citation(data, ref)
        if type(ref.get('finding_index')) is not int or not 0 <= ref['finding_index'] < len(findings):
            raise ValueError('引用必须绑定存在的finding_index')
    for i, finding in enumerate(findings):
        refs = [x for x in body['citations'] if x['finding_index'] == i]
        if not any(x['file'] == finding['file'] and x['line'] == finding['line'] for x in refs):
            raise ValueError('每条finding必须有当前主锚引用')
        if finding['category'] == 'Spec符合性' and not any(x['file'] == data['spec'] for x in refs):
            raise ValueError('S发现必须引用当前契约')
    for item in body['coverage']:
        if set(item) != {'scenario', 'status', 'citations'} or item['scenario'] not in scenarios(data) or item['status'] not in ['reviewed', 'gap']:
            raise ValueError('coverage必须对应现行Scenario及reviewed/gap')
        if not item['citations']: raise ValueError('coverage须有实际引用')
        for ref in item['citations']: citation(data, ref)
    if actor in ['S', 'AS', 'critic-1', 'critic-2']:
        if sorted(x['scenario'] for x in body['coverage']) != sorted(scenarios(data)):
            raise ValueError('S/critic必须逐项记录全部现行Scenario，未核查写gap')
    for ref in body['d_request']: citation(data, ref)
    if actor.startswith('refute-'):
        task = next((t for t in tasks(run) if t['actor'] == actor), None)
        expected = {x['id']: x for x in task.get('candidates', [])} if task else {}
        decisions = body.get('decisions', [])
        if not expected or sorted(x.get('candidate_id', '') for x in decisions) != sorted(expected):
            raise ValueError('独立复核必须逐条覆盖所派候选版本')
        for item in decisions:
            if set(item) != {'candidate_id', 'verdict', 'citations', 'reason'} or item['verdict'] not in ['confirmed', 'rejected', 'insufficient'] or not item['reason'].strip() or not item['citations']:
                raise ValueError('独立复核须明确成立/否决/证据不足及依据')
            if expected[item['candidate_id']]['proposer'] == actor: raise ValueError('复核者不得为提出者')
            for ref in item['citations']: citation(data, ref)
    elif body.get('decisions') or body.get('merge_groups'): raise ValueError('非独立复核角色不能确认或合并候选')
    for group in body.get('merge_groups', []):
        if set(group) - {'candidate_ids', 'reason', 'citations', 'member_citations'} or not {'candidate_ids', 'reason', 'citations'}.issubset(group) or len(set(group['candidate_ids'])) < 2 or not group['reason'].strip() or not group['citations']:
            raise ValueError('同根因合并须保留两个以上来源、因果说明及实际引用')
        valid = {x['candidate_id'] for x in body.get('decisions', []) if x['verdict'] == 'confirmed'}
        if not set(group['candidate_ids']).issubset(valid):
            raise ValueError('合并成员必须是本次独立确认的候选')
        for ref in group['citations']: citation(data, ref)
        additions = {}
        for member in group.get('member_citations', []):
            if set(member) != {'candidate_id', 'citations'} or member['candidate_id'] not in group['candidate_ids'] or member['candidate_id'] in additions:
                raise ValueError('补充Scenario引用须唯一绑定合并成员')
            for ref in member['citations']: citation(data, ref)
            additions[member['candidate_id']] = member['citations']
        footprints = []
        for key in group['candidate_ids']:
            original = contract_scopes(data, expected[key]['citations'])
            added = contract_scopes(data, additions.get(key, []))
            if original and added and original != added:
                raise ValueError('不能补入不相关Scenario使集合相同')
            footprints.append(original or added)
        if not footprints[0] or any(footprint != footprints[0] for footprint in footprints):
            raise ValueError('不同Scenario或缺少逐成员契约依据，保留独立处置；同一行或一次编辑不证明同根因')
    if actor.startswith('critic-'):
        if not isinstance(body.get('gaps'), list): raise ValueError('critic必须显式提交gaps')
        for gap in body['gaps']:
            if set(gap) != {'actor', 'reason'} or gap['actor'] not in selected_dimensions(run) or not gap['reason'].strip():
                raise ValueError('critic缺口须绑定实际维度和原因')
    p = actor_dir(run, actor) / 'report.json'
    with lock(p.with_suffix('.lock')):
        if p.exists(): raise ValueError('此actor已提交报告，不允许覆盖；补查使用新actor')
        context_path = actor_dir(run, actor) / 'context-basis.json'
        delivered = json.loads(context_path.read_text()) if context_path.exists() else {}
        basis = delivered.get('reports', {}) if delivered.get('attempt') == attempt else {}
        if actor.startswith(('critic-', 'refute-', 'supplement-')):
            task = next((t for t in tasks(run) if t['actor'] == actor), None)
            if not task or any(not completion(run, dep) or basis.get(dep) != report_get(run, dep)['id'] for dep in task['depends']):
                raise ValueError('复核依赖未完成或context证据已过期，先重新读取context')
        stored = object_put(run, 'report', actor, {'body': body, 'basis': basis})
        atomic(p, {'id': stored['id']})
    return {'report_id': stored['id'], 'status': 'submitted', 'note': '尚需真实进程完成回执及最终gate'}


def status(run):
    try:
        data = verify(run)
        for p in (run / 'actors').glob('*/test-*.json'):
            record = json.loads(p.read_text())
            if 'id' not in record or not object_get(run, record['id']).get('complete'):
                raise ValueError('测试已开始但无完整退出回执，禁止自动重跑: ' + p.parent.name)
        all_tasks = tasks(run)
        gaps = [x['actor'] + ' 缺少完成回执' for x in all_tasks if not completion(run, x['actor'])]
        confirmed, rejected, evaluated, groups = [], [], set(), []
        for task in all_tasks:
            if not completion(run, task['actor']): continue
            doc = report_get(run, task['actor'])['body']
            if task['actor'].startswith('refute-'):
                lookup = {x['id']: x for x in task['candidates']}
                groups.extend(doc.get('merge_groups', []))
                for decision in doc['decisions']:
                    evaluated.add(decision['candidate_id'])
                    if decision['verdict'] == 'confirmed': confirmed.append(lookup[decision['candidate_id']])
                    elif decision['verdict'] == 'rejected': rejected.append(decision['candidate_id'])
                    else: gaps.append('候选证据不足: ' + decision['candidate_id'])
        all_candidates = candidates(run, finished_actors(run))
        gaps += ['未复核候选: ' + x['id'] for x in all_candidates if x['id'] not in evaluated]
        observations = []
        for actor in finished_actors(run):
            doc = report_get(run, actor)
            observations += [{'id': doc['id'] + ':' + str(i), 'proposer': actor, 'finding': x} for i, x in enumerate(doc['body']['report']['findings']) if x['severity'] == '低']
        merged, used = [], set()
        by_id = {x['id']: x for x in confirmed}
        for group in groups:
            members = set(group['candidate_ids'])
            if members & used or not members.issubset(by_id):
                gaps.append('合并成员重复或没有独立成立回执'); continue
            sources = [by_id[key] for key in group['candidate_ids']]
            merged.append({**sources[0], 'sources': sources, 'causal_reason': group['reason'], 'causal_citations': group['citations']})
            used.update(members)
        confirmed = merged + [{**x, 'sources': [x]} for x in confirmed if x['id'] not in used]
        final_critic = 'critic-2' if any(t['actor'] == 'critic-2' for t in all_tasks) else 'critic-1'
        if completion(run, final_critic):
            final_doc = report_get(run, final_critic)
            final_task = next(t for t in all_tasks if t['actor'] == final_critic)
            if any(not completion(run, dep) or final_doc.get('basis', {}).get(dep) != report_get(run, dep)['id'] for dep in final_task['depends']):
                gaps.append('最终critic覆盖依据过期，尚未核查新增或变化的依赖')
            critic = final_doc['body']
            gaps += [x['actor'] + ': ' + x['reason'] for x in critic['gaps']]
            gaps += ['Scenario未覆盖: ' + x['scenario'] for x in critic['coverage'] if x['status'] == 'gap']
        return {'status': 'incomplete' if gaps else 'completed', 'run': data['id'], 'gaps': gaps,
                'confirmed': confirmed, 'rejected': rejected, 'observations': observations,
                'review_result': 'needs_changes' if confirmed else ('observations' if observations else ('no_confirmed_findings' if not gaps else 'unknown')),
                'tasks': all_tasks, 'note': 'completed表示审查链完整，不等于测试全绿或实现无缺陷'}
    except (ValueError, OSError, KeyError, TypeError) as e:
        return {'status': 'blocked', 'gaps': [str(e)]}
