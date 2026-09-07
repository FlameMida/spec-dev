"""内嵌stdio MCP；模型没有任意命令、身份参数或文件写入能力。"""
import base64
import json
import os
import signal
import subprocess
import sys
import time
import uuid
from pathlib import Path
from .review_store import (actor_dir, atomic, completion, digest, lock, manifest, object_get,
                           object_put, report_get, scenarios, selected_dimensions, submit, tasks, verify)

# Each broker process belongs to one live worker. A resumed CLI has no old context.
ATTEMPT = uuid.uuid4().hex


def only(args, required):
    if not isinstance(args, dict) or set(args) != set(required):
        raise ValueError('工具参数不符，拒绝未知字段: ' + ','.join(required))



def capture_result(run, actor, record, exit_code, complete):
    data = manifest(run)
    directory = actor_dir(run, actor)
    stdout = (directory / (record['call_id'] + '.stdout')).read_bytes()
    stderr = (directory / (record['call_id'] + '.stderr')).read_bytes()
    return object_put(run, 'test', actor, {'call_id': record['call_id'], 'test_id': record['test_id'],
        'snapshot_sha256': digest(json.dumps(data['snapshot'], sort_keys=True).encode()),
        'command': record['command'], 'cwd': data['repo'], 'started': record['started'], 'finished': time.time(),
        'exit': exit_code, 'complete': complete,
        'stdout': stdout.decode('utf-8', errors='replace'), 'stderr': stderr.decode('utf-8', errors='replace'),
        'stdout_base64': base64.b64encode(stdout).decode(), 'stderr_base64': base64.b64encode(stderr).decode(),
        'stdout_sha256': digest(stdout), 'stderr_sha256': digest(stderr)})


def recover_tests(run, actors):
    """After stopping this segment's workers, preserve interrupted raw spools; never re-execute."""
    for actor in actors:
        for path in actor_dir(run, actor).glob('test-*.json'):
            record = json.loads(path.read_text())
            if 'id' in record: continue
            if record.get('pid'):
                try: os.killpg(record['pid'], signal.SIGKILL)
                except ProcessLookupError: pass
            if all((path.parent / (record['call_id'] + suffix)).exists() for suffix in ['.stdout', '.stderr']):
                evidence = capture_result(run, actor, record, None, False)
                atomic(path, {'id': evidence['id']})


def run_test(run, actor, test_id):
    data = verify(run)
    definition = next((x for x in data['tests'] if x['id'] == test_id), None)
    if not definition: raise ValueError('测试ID未获批准')
    name = digest(json.dumps(definition, sort_keys=True).encode())
    directory = actor_dir(run, actor)
    state = directory / ('test-' + name + '.json')
    with lock(state.with_suffix('.lock')):
        if state.exists():
            record = json.loads(state.read_text())
            if 'id' in record: return object_get(run, record['id'])
            raise ValueError('先前测试已开始但无完整回执，不自动重跑；需另行授权')
        call = uuid.uuid4().hex
        record = {'status': 'starting', 'call_id': call, 'test_id': test_id,
                  'command': definition['argv'], 'started': time.time()}
        atomic(state, record)
        with (directory / (call + '.stdout')).open('xb') as stdout, (directory / (call + '.stderr')).open('xb') as stderr:
            proc = subprocess.Popen(definition['argv'], cwd=data['repo'], stdout=stdout, stderr=stderr, start_new_session=True)
            record.update(status='running', pid=proc.pid); atomic(state, record)
            complete = False
            try:
                # The host segment owns the deadline; no hidden shorter test budget.
                proc.wait(); complete = True
            finally:
                try: os.killpg(proc.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                proc.wait(); stdout.flush(); stderr.flush()
                result = capture_result(run, actor, record, proc.returncode, complete)
                atomic(state, {'id': result['id']})
        verify(run)
        return result


def context(run, actor):
    data = verify(run)
    all_tasks = tasks(run)
    task = next((x for x in all_tasks if x['actor'] == actor), None)
    dependencies = task['depends'] if task else []
    reports = {a: report_get(run, a) for a in dependencies if completion(run, a)}
    evidence_ids = {key for report in reports.values() for key in report['body']['evidence_ids']}
    evidence = []
    for path in (run / 'objects').glob('*.json'):
        record = object_get(run, path.stem)
        if record['kind'] == 'test' and (record['actor'] == actor or record['id'] in evidence_ids): evidence.append(record)
    triggers = []
    if actor == 'D' or actor == 'supplement-D':
        if data.get('d_request'): triggers.append({'actor': 'host', 'report_id': None, 'citations': data['d_request']})
        for item in all_tasks:
            if completion(run, item['actor']):
                report = report_get(run, item['actor'])
                if report['body']['d_request']:
                    triggers.append({'actor': item['actor'], 'report_id': report['id'], 'citations': report['body']['d_request']})
    documents = {}
    remaining = 4000
    preferred = [data['spec'], data['plan']] + [x for test in data['tests'] for x in test['argv'] if x in data['texts']]
    for name in dict.fromkeys(preferred + list(data['texts'])):
        body = data['texts'][name]
        if len(body.encode()) > remaining: continue
        documents[name] = {'content': body, 'numbered': '\n'.join(str(i) + ': ' + line for i, line in enumerate(body.splitlines(), 1))}
        remaining -= len(body.encode())
    return {'run': data['id'], 'actor': actor, 'base': data['base'], 'head': data['head'],
            'tests': data['tests'], 'task': task, 'scenarios': scenarios(data),
            'files': list(data['texts']), 'diff': data['diff'], 'spec_path': data['spec'], 'plan_path': data['plan'],
            'spec': data['texts'][data['spec']], 'plan': data['texts'][data['plan']],
            'source_documents': documents,
            'architecture_scope': [ref for trigger in triggers for ref in trigger['citations']], 'architecture_sources': triggers,
            'reports': reports, 'test_receipts': evidence, 'pending_report': report_get(run, actor),
            'note': '路径和行号取read_source实际原文；测试仅run_test。报告submitted不等于进程完成。'}


def page_parts(text):
    parts = []; current = []; size = 0
    for char in text:
        length = len(char.encode())
        if size + length > 4000:
            parts.append(''.join(current)); current = []; size = 0
        current.append(char); size += length
    if current: parts.append(''.join(current))
    return parts


def read_page(run, actor, resource, cursor):
    record = object_get(run, resource)
    if record['kind'] != 'transport' or record['actor'] != actor or record.get('attempt') != ATTEMPT:
        raise ValueError('分页资源不属于当前worker；恢复后重新读取context')
    parts = page_parts(record['text'])
    if type(cursor) is not int or not 0 <= cursor < len(parts):
        raise ValueError('分页cursor越界')
    path = actor_dir(run, actor) / ('delivered-' + resource + '.json')
    delivered = json.loads(path.read_text()) if path.exists() else []
    delivered = sorted(set(delivered + [cursor])); atomic(path, delivered)
    if len(delivered) == len(parts) and record['basis'] is not None:
        atomic(actor_dir(run, actor) / 'context-basis.json', {'attempt': ATTEMPT, 'reports': record['basis']})
    return {'paged': True, 'resource': resource, 'cursor': cursor, 'pages': len(parts),
            'next_cursor': cursor + 1 if cursor + 1 < len(parts) else None,
            'content': parts[cursor], 'sha256': digest(record['text'].encode())}


def deliver(run, actor, value, basis=None):
    text = json.dumps(value, ensure_ascii=False)
    if len(text.encode()) <= 8000:
        if basis is not None: atomic(actor_dir(run, actor) / 'context-basis.json', {'attempt': ATTEMPT, 'reports': basis})
        return value
    record = object_put(run, 'transport', actor, {'text': text, 'basis': basis, 'attempt': ATTEMPT})
    return read_page(run, actor, record['id'], 0)


def call_tool(run, actor, name, args):
    actor_dir(run, actor)
    if name == 'context':
        if args:
            only(args, ['resource', 'cursor']); return read_page(run, actor, args['resource'], args['cursor'])
        only(args, []); value = context(run, actor)
        return deliver(run, actor, value, {a: r['id'] for a, r in value['reports'].items()})
    if name == 'read_source':
        only(args, ['file']); data = manifest(run)
        if args['file'] not in data['texts']: raise ValueError('文件不属于审查快照')
        content = data['texts'][args['file']]
        return deliver(run, actor, {'file': args['file'], 'content': content,
                'numbered': '\n'.join(str(i) + ': ' + line for i, line in enumerate(content.splitlines(), 1))})
    if name == 'run_test':
        only(args, ['test_id']); return deliver(run, actor, run_test(run, actor, args['test_id']))
    if name == 'submit_report': return submit(run, actor, args, attempt=ATTEMPT)
    raise ValueError('未知受控工具')


def tool_list():
    def schema(properties):
        return {'type': 'object', 'properties': properties, 'required': list(properties), 'additionalProperties': False}
    text = {'type': 'string'}
    return [
        {'name': 'context', 'description': '先以{}读取固定范围、diff、契约、Scenario、测试ID、已完成报告及回执。任意工具返回paged=true时，content为原JSON片段；以{resource,cursor:next_cursor}读取后续页直到next_cursor=null，按序拼接。全部页读完才记录完整性审查依据。', 'inputSchema': {'type': 'object', 'properties': {'resource': text, 'cursor': {'type': 'integer', 'minimum': 0}}, 'additionalProperties': False}},
        {'name': 'read_source', 'description': '读取快照文件原文与行号；仅接受context.files中的精确路径。', 'inputSchema': schema({'file': text})},
        {'name': 'run_test', 'description': '本actor亲自请求固定测试；程序生成完整真实回执，重复请求返回同一回执，不能传命令/路径/actor。', 'inputSchema': schema({'test_id': text})},
        {'name': 'submit_report', 'description': '提交一次受控报告外层。成功后简短返回。report遵循现有review-findings：findings中file,line,severity(高/中/低),confidence,category,description,fix_suggestion必填；coverage_note必填。citations每项finding_index,file,line,quote，主锚必须实际匹配，S还要spec引用。coverage逐Scenario给scenario,status(reviewed/gap),citations(无finding_index)。evidence_ids引用context或run_test真实ID。d_request为有结构摩擦的源码引用数组，无则[]。refute角色另给decisions[{candidate_id,verdict(confirmed/rejected/insufficient),citations,reason}]；同根因成立候选由refute角色用merge_groups[{candidate_ids,reason,citations}]保留来源并说明为何一次修复会同时消除；不同原因不合并。受控入口只允许每成员真实Scenario集合非空且相同的候选合并，集合按契约文件及Requirement/Scenario位置区分；不同Scenario即使同一行也保留独立记录。原A候选缺Scenario可在merge_groups中给member_citations[{candidate_id,citations}]补充实际依据，不得添加不相关引用凑集合。相同集合仍须因果说明。critic另给gaps[{actor,reason}]无则[]。所有引用quote必须等于read_source当前整行原文（无行号前缀），允许多行。',
         'inputSchema': {'type': 'object', 'properties': {'report': {'type': 'object'}, 'citations': {'type': 'array', 'items': {'type': 'object'}},
           'coverage': {'type': 'array', 'items': {'type': 'object'}}, 'evidence_ids': {'type': 'array', 'items': text},
           'd_request': {'type': 'array', 'items': {'type': 'object'}}, 'decisions': {'type': 'array', 'items': {'type': 'object'}},
           'gaps': {'type': 'array', 'items': {'type': 'object'}}, 'merge_groups': {'type': 'array', 'items': {'type': 'object'}}},
           'required': ['report', 'citations', 'coverage', 'evidence_ids', 'd_request'], 'additionalProperties': False}}
    ]


def serve(run, actor):
    actor_dir(run, actor)
    def terminate(*_): raise SystemExit(143)
    signal.signal(signal.SIGTERM, terminate)
    for raw in sys.stdin:
        try:
            request = json.loads(raw)
            if 'id' not in request: continue
            method = request['method']
            if method == 'initialize':
                result = {'protocolVersion': '2025-06-18', 'capabilities': {'tools': {}},
                          'serverInfo': {'name': 'spec-dev-review', 'version': '1'}}
            elif method == 'tools/list': result = {'tools': tool_list()}
            elif method == 'tools/call':
                params = request['params']
                try:
                    value = call_tool(run, actor, params['name'], params.get('arguments', {}))
                    result = {'content': [{'type': 'text', 'text': json.dumps(value, ensure_ascii=False)}]}
                except (ValueError, OSError, KeyError, TypeError, subprocess.SubprocessError) as error:
                    value = deliver(run, actor, {'error': str(error)})
                    result = {'isError': True, 'content': [{'type': 'text', 'text': json.dumps(value, ensure_ascii=False)}]}
            elif method == 'ping': result = {}
            else:
                print(json.dumps({'jsonrpc': '2.0', 'id': request['id'], 'error': {'code': -32601, 'message': 'Method not found'}}), flush=True)
                continue
            print(json.dumps({'jsonrpc': '2.0', 'id': request['id'], 'result': result}, ensure_ascii=False), flush=True)
        except (ValueError, KeyError, TypeError):
            print(json.dumps({'jsonrpc': '2.0', 'id': None, 'error': {'code': -32700, 'message': 'Invalid JSON-RPC'}}), flush=True)
