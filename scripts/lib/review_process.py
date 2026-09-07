"""容量、依赖与有界执行；模型从不拥有状态推进或证据写入权限。"""
import json
import os
import re
import signal
import subprocess
import sys
import time
from pathlib import Path
from .review_store import (actor_dir, atomic, completion, digest, lock, object_put,
                           report_get, status, tasks, verify)

TOOLS = {'mcp__review__' + x for x in ['context', 'read_source', 'run_test', 'submit_report']}


def reviewer_rules(source, actor):
    """Keep common rules verbatim and only the assigned dimension; native UI/tool templates do not apply."""
    role = actor.removeprefix('supplement-')
    dimensions = {'A', 'B', 'C', 'S'} if role == 'AS' else {role.split('-')[0]}
    if actor.startswith(('refute-', 'critic-')): dimensions = {'A', 'B', 'C', 'S', 'D'}
    source = re.sub(r'\A---\n.*?\n---\n', '', source, count=1, flags=re.S)
    sections = []; lines = []; fenced = False
    for line in source.splitlines(keepends=True):
        if line.startswith('## ') and not fenced and lines:
            sections.append(''.join(lines)); lines = []
        lines.append(line)
        if line.startswith('```'): fenced = not fenced
    if lines: sections.append(''.join(lines))
    kept = []
    for section in sections:
        title = section.splitlines()[0] if section.splitlines() else ''
        if title in ['## 输出格式', '## 使用的工具']: continue
        if title == '## 契约输出模式（编排调用时）':
            # The coverage semantics apply to every transport, unlike the native output template.
            kept.extend(line + '\n' for line in section.splitlines() if line.startswith('- `coverage_note`'))
            continue
        if title == '## 审查维度':
            sections = re.split(r'(?=^### 维度 )', section, flags=re.M)
            section = ''.join(part for part in sections if not part.startswith('### 维度 ') or
                              re.match(r'### 维度 ([A-Z])', part).group(1) in dimensions)
        kept.append(section)
    return ''.join(kept)


def worker_prompt(data, actor):
    role = actor.removeprefix('supplement-')
    descriptions = {'A': '功能正确性，必须亲自run_test取得所有相关测试回执。',
        'AS': '功能正确性与S实现符合性，兼查B质量/C项目规范的显著问题并在coverage_note说明；必须亲自run_test，逐条核对现行Scenario。',
        'B': '代码质量，包括可维护性与简洁性；不把纯注释未列计划当授权问题。',
        'B-quality': '代码质量、可读性、可维护性。', 'B-simple': '简洁性、DRY、复杂性。',
        'C': '适用项目规范；必须引用真实规则，必要内部实现或纯注释不形成新批准门。',
        'S': '实现符合性；核对所有现行Scenario、范围及语义，排除已Superseded。',
        'D': '已有结构摩擦范围的架构深化，核实消费者和公共接口，禁止纯偏好。'}
    if actor.startswith('refute-'):
        instruction = '独立反驳context.task.candidates的每个具体版本。逐条检验来源、影响、严重性及反例；decisions明确confirmed/rejected/insufficient，不能因为提出者声称成立就确认。不要重做全局扇出。同根因合并必须逐成员对应同一现行Scenario集合；不同契约行为保留独立处置，不能以同一条件/一行/一次编辑替代因果判断。'
    elif actor.startswith('critic-'):
        instruction = '独立完整性审查，逐条核对现行Scenario、所有维度报告与真实测试回执。已审零发现不等于测试覆盖；使用回执真实actor/hash/exit，不以文件存在或模型自报告判断。gaps绑定缺口维度和原因，无缺口给[]；发现新高/中候选照常报告，控制器另派反驳。'
    else: instruction = descriptions[role]
    sources = data['candidate_sources']
    reviewer = reviewer_rules(sources['agents/code-reviewer.md'], actor)
    design = sources['skills/writing-plans/references/design-principles.md'] if role.startswith('B') or role == 'D' or actor.startswith(('refute-', 'critic-')) else ''
    return ('你是独立只读审查worker，执行者由宿主绑定为' + actor + '。任务：' + instruction +
        '\n先调用context取得固定原始base/HEAD、完整diff及契约。context.source_documents已提供固定源码原文与行号；可直接据此核对引用，不必重复读取已完整提供的文件。缺少的文件再read_source；files是全部快照，changed_files是实际变更文件；保持宿主角色，不接管其他维度。只用四个受控工具。没有任何任意Bash/Write/Agent能力。实际测试只能run_test，用提供的test_id；不得编造或填写actor/路径/命令。测试失败是有效证据，不等于运行失败。'
        '\n所有工具的大输出均在受控接口内分页：paged=true时content是完整JSON的一段，按next_cursor调用context({resource:返回的resource,cursor:next_cursor})直到null，拼接各段理解完整结果；可同一轮批量请求其余已知页码，减少往返。不能从首段推断完整输入；不存在需要任意文件读取的外部输出路径。'
        '\n分页resource只是传输句柄，不能填入evidence_ids；测试证据ID只取完整run_test结果或context.test_receipts中的id。初审各维度仅见共同事实与自身回执；D用architecture_sources核对结构触发范围。反驳、critic和补查按实际依赖读取报告。恢复后分页从当前context重新开始，旧worker的页面不能复用。'
        '\n只报告当前已成立且有实际影响的问题。条件尚未成立的未来假设不算当前缺陷；现行范围要求删除的越界代码，其缺测试/缺文档只作为该删除建议的附属说明，不能按“若未来批准保留”另增一条独立问题。测试覆盖按获批公共行为与现行Scenario判断。'
        '\n无需逐步播报。最终必须用submit_report提交外层对象（完整结构见工具schema），用精炼描述与必要引用说明实际影响，不复述整份输入。成功后仅回复“已提交”。不输出长重复报告，不另行调用CLI校验；宿主已执行真实validator。模型语义责任保留。context若带pending_report表示前片段已提交，核对后直接结束，不覆盖。'
        '\ncoverage写本角色实际审查；S/AS/critic必须逐条覆盖context.scenarios，缺口写gap。报告描述不手写测试统计或辅助文件指针，引用真实evidence_ids，测试摘要由宿主原始回执提供。每条发现引用实码整行，S另引用适用契约；不引用已取代条款。d_request只用于具体结构摩擦：如消费者依赖内部表示、边界耦合或接口使用困难，需引用生产者与受影响消费者等实际证据；d_request条目严格只有file/line/quote，摩擦说明写coverage_note。单纯Bug、新增API违反Spec、机械diff或优化设想均不自行触发D；这些仅按相应维度报告。'
        '\n以下是候选reviewer规则，工具动作按上述宿主受控接口执行；不自行派发或写文件：\n' + reviewer + '\n' + design)


def command(data, run, actor):
    cli = Path(__file__).resolve().parents[1] / 'review-runner.py'
    config = {'mcpServers': {'review': {'command': sys.executable,
                'args': [str(cli), 'broker', '--run', str(run), '--actor', actor]}}}
    client = data.get('client', ['claude'])
    if not isinstance(client, list) or not client or not all(isinstance(x, str) for x in client):
        raise ValueError('client必须为宿主指定的固定argv')
    cmd = ['rtk', 'proxy', *client, '-p', '--tools', '', '--strict-mcp-config', '--mcp-config', json.dumps(config),
           '--allowedTools', 'mcp__review__*', '--disable-slash-commands', '--no-session-persistence',
           '--verbose', '--output-format', 'stream-json']
    if data.get('model'): cmd += ['--model', data['model']]
    if data.get('effort'): cmd += ['--effort', data['effort']]
    return cmd + [worker_prompt(data, actor)]


def inspect_stream(path):
    tools = None; final = None
    for raw in path.read_text(errors='replace').splitlines():
        try: item = json.loads(raw)
        except ValueError: continue
        if item.get('type') == 'system' and item.get('subtype') == 'init': tools = set(item.get('tools', []))
        if item.get('type') == 'result': final = item
    return tools, final


def stop(proc):
    try: os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError: pass
    try: proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        try: os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        proc.wait()
    # Give the broker a short bounded opportunity to seal partial test output.
    until = time.monotonic() + 0.5
    while time.monotonic() < until:
        try: os.killpg(proc.pid, 0)
        except ProcessLookupError: break
        time.sleep(0.02)
    try: os.killpg(proc.pid, signal.SIGKILL)
    except ProcessLookupError: pass


def execute(run, budget):
    run = run.resolve()
    if not 0 < budget <= 300: raise ValueError('一次片段预算必须大于0且不超过300秒')
    with lock(run / 'run.lock', blocking=False):
        data = verify(run)
        current = status(run)
        if current['status'] in ['completed', 'blocked']: return current
        segment_path = run / 'segments.json'
        segments = json.loads(segment_path.read_text()) if segment_path.exists() else []
        if len(segments) >= 3: raise ValueError('本run已耗尽3个执行片段；禁止继续重试')
        # Crash-left workers cannot silently consume a new capacity allowance.
        for old in segments:
            if not old.get('finished'):
                raise ValueError('前片段终止尚未确认，保留blocked；先核查并清理登记进程')
        segment = {'number': len(segments) + 1, 'started': time.time(), 'budget_seconds': budget,
                   'peak_workers': 0, 'workers': [], 'finished': None}
        segments.append(segment); atomic(segment_path, segments)
        deadline = time.monotonic() + budget
        active = {}; attempted = set()
        def terminated(*_): raise KeyboardInterrupt()
        previous = signal.signal(signal.SIGTERM, terminated)
        try:
            while time.monotonic() < deadline:
                verify(run)
                for actor, work in list(active.items()):
                    proc, log = work['process'], work['log']
                    actual_tools, result = inspect_stream(log)
                    if actual_tools is not None and actual_tools != TOOLS:
                        work['error'] = '实际worker工具集合不符: ' + str(sorted(actual_tools))
                        stop(proc)
                    code = proc.poll()
                    if code is None: continue
                    stop(proc)
                    work['stdout'].close(); work['stderr'].close()
                    entry = work['entry']; entry.update(exit=code, finished=time.time())
                    report = report_get(run, actor)
                    if code == 0 and actual_tools == TOOLS and result and result.get('is_error') is False and report and not work.get('error'):
                        receipt = object_put(run, 'completion', actor, {'exit': code, 'report_id': report['id'],
                            'started': entry['started'], 'finished': entry['finished'], 'segment': segment['number'],
                            'stdout_sha256': digest(log.read_bytes()),
                            'stderr_sha256': digest(log.with_suffix('.stderr').read_bytes()), 'tools': sorted(actual_tools)})
                        atomic(actor_dir(run, actor) / 'completed.json', {'id': receipt['id']})
                    else:
                        entry['error'] = work.get('error', '缺少有效工具清单、成功CLI最终回执或已校验报告')
                    del active[actor]; atomic(segment_path, segments)
                available = [t for t in tasks(run) if t['actor'] not in attempted and not completion(run, t['actor'])
                             and all(completion(run, d) for d in t['depends'])]
                for task in available[:max(0, data['capacity'] - len(active))]:
                    if time.monotonic() >= deadline: break
                    actor = task['actor']; attempted.add(actor)
                    directory = actor_dir(run, actor)
                    prefix = directory / ('attempt-' + str(segment['number']))
                    cmd = command(data, run, actor)
                    atomic(prefix.with_suffix('.invocation.json'), {'argv': cmd, 'settings': 'inherit local',
                           'actor': actor, 'segment': segment['number']})
                    stdout = prefix.with_suffix('.jsonl').open('wb')
                    stderr = prefix.with_suffix('.stderr').open('wb')
                    proc = subprocess.Popen(cmd, cwd=data['repo'], stdin=subprocess.DEVNULL,
                                            stdout=stdout, stderr=stderr, start_new_session=True)
                    entry = {'actor': actor, 'pid': proc.pid, 'started': time.time()}
                    segment['workers'].append(entry)
                    active[actor] = {'process': proc, 'log': prefix.with_suffix('.jsonl'), 'stdout': stdout,
                                     'stderr': stderr, 'entry': entry}
                    segment['peak_workers'] = max(segment['peak_workers'], len(active))
                    atomic(segment_path, segments)
                if not active:
                    break
                time.sleep(min(0.1, max(0, deadline - time.monotonic())))
        except KeyboardInterrupt:
            segment['interrupted'] = True
        finally:
            for actor, work in active.items():
                stop(work['process'])
                work['stdout'].close(); work['stderr'].close()
                work['entry'].update(exit=work['process'].returncode, finished=time.time(), error='片段中断或超时，不能按报告存在推断完成')
            from .review_broker import recover_tests
            recover_tests(run, [w['actor'] for w in segment['workers']])
            segment['finished'] = time.time(); atomic(segment_path, segments)
            signal.signal(signal.SIGTERM, previous)
        result = status(run)
        result['segments'] = len(segments)
        result['elapsed_seconds'] = sum(x['finished'] - x['started'] for x in segments)
        atomic(run / 'result.json', result)
        return result
