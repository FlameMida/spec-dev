# 集成组执行协议

> 字段和格式唯一定义在 [writing-plans 集成组声明](../../writing-plans/references/integration-declaration.md)；这里定义执行时序。适用于已批准且机器预检支持的组，不适用于无组 v1 或旧单文件。普通 implementer 协议与模型声明仍遵循 executing-plans-parallel。

## 执行入口

先解析 index/progress/spec；含组必须识别 format_version=2 与 protocol_version=1。每个状态边界运行插件根的 `scripts/validate-output.mjs plan-state <plan-dir>`：exit 0 且协议号匹配才消费 ready_tasks。ok=true 且 ready_tasks=[] 可表示合法业务阻塞，不强行找下一票。未知能力/非Git/无法隔离的组停止，不用旧普通流程猜执行。

先读取 [executing-plans-parallel 的特性锁协议](../../executing-plans-parallel/references/feature-lock.md)，按同一 common-dir/feature_key 规则取得特性锁，核实 owner 后才写 progress。取得、释放、接管都必须经过同一特性级原子维护门，在门内重新核对 owner 与锁实体；仅原子 mkdir 特性锁不能代替维护门。平台无法证明旧 owner 停止时保持阻塞，不按超时抢锁。普通模式、原始审查基线、授权请求、模型声明、资源与 claim 保留。并发进入组前停止新派发，收拢并核验全部在途票到已验证基线；未知执行者或未接收实现阻止进组。

主动暂停顺序：持锁完成本次进度保存与提交 → 运行 plan-state，所有修正及其提交也须在锁内完成 → 核对工作区干净 → 经过维护门释放自己持有的锁实体 → 停止写入。释放后保留已提交的 integration.owner 作为历史归属，不写 null；它不是实时持锁证明。释放后发现需要更正，即使只是 amend 进度，也必须先重新取得锁并核对最新检查点。

组进入、组内操作、失败修复、恢复和完成按以下规则进行。current 仅指主线程当前票；组员不创建 implementer claim，不写 ready 的 implementation-result。


1. 活动组为空：普通票按 completed 依赖；整组只能在其全部外部前置 completed、资源可用、组基线实际通过且没有在途执行者/未接收实现时进入。保存组启动检查点后才开始业务写入。
2. 活动组存在：仅返回此组下一个可执行成员，成员的组内依赖必须 awaiting_verification 或 completed；未完成前序成员阻止越序。全部成员待验后仅 verify 可执行。blocked 时 ready 为空，由主线程明确修复/恢复后再算。
3. 普通票和其他组不消费成员中间状态。验证票通过和进度持久化前，不清 active_group、不推进验证基线、不切模式或从当前失败 HEAD 派票。
4. 每票先记录批准检查命令、期望允许的暂时失败及归因；命令、cwd、exit、实际实现 SHA/业务树标识、stdout/stderr 路径及 SHA-256 归档到特性 `execution/groups/GNN/TNN/<attempt>/`。原日志和失败尝试不可覆盖。组验证覆盖批准的全部组 Scenario、相关回归及旧形/调用者清理，没有必需测试记 skip/未运行而宣称通过的出口。
5. 状态转移只能在工作区已解释且实现提交存在时持久化；未提交业务改动在崩溃恢复时先核对本票归属，不 reset/stash/覆盖。日志存在与哈希只证明可恢复/未变更，不自证命令曾真实执行；主线程与独立审查核对实际工具回执、失败原因和语义。

计划必须为每个组给出组验证命令、公共 seam/Scenario、保护基线、局部必通过检查以及延期检查原因，不能仅把 `reason` 当免测许可。序列中有行为变化时在写该变化前保留有效红；纯机械迁移保护测试先于组首改动。没有足够保护/有效红则处理缺口后才写代码，不把组协议当 TDD 例外授权。

### 修复、恢复与资源

- 组验证失败后，组与 verify blocked；原待验票不因失败被误标 completed 或全部清空。只读诊断可继续。验证票若需改业务代码，先回到承担该写集合的成员；若涉及新接口/范围，沿契约偏差门修订计划后再继续。
- 回到成员时保存旧尝试，成员 in_progress、受影响依赖闭包 blocked；主线程记录修复归属和动作，组恢复 in_progress、verify 回 pending 后持久化这个修复检查点，才允许写入。依赖闭包仍 blocked 的成员只在其前置重新待验后由主线程显式置 in_progress 进行有效性复核，普通 ready 不能自动跳过它。按声明接口/提交/检查逐票重新确认，仍有效的工作复用，缺证据补验，不重复应用已有补丁。再次进入待验后全部组验证重跑；不能仅重跑上次失败一条就接受改变后的代码树。
- 恢复从实际集成工作区的已提交 progress 起步，磁盘中未提交的状态只视作待核验准备；原 owner 停止、锁实体归属、工作区与分支绑定、SHA ancestry、角色记录与证据都核对。不能核实的冻结，仍活跃的执行者不按超时替换。组中不存在 implementer claim，普通历史认领不清空。
- 未知差异必须原样保留并阻塞，不能把它猜成模式切换准备后撤销。只有逐项核实属于本次且尚未提交的模式准备差异，才适用并发激活失败的撤销规则；这不是集成组恢复的通用回滚操作。
- 完成证据已齐而状态没提交，核对代码树没有改变后补完成检查点；发现原接受实现已经存在，不重复 merge。组成功后清 active_group、保留组档案，恢复原模式；原审查基线、交付通道、模型声明历史保持。
- 上述免重跑只适用于证据完整且业务树仍等于 V。证据缺失或已解释且获准的业务树改变时，先恢复证据/处理归属并重新运行所需组验证，再保存完成检查点；无法解释的差异先保留并阻塞，不能用旧通过结果解锁，也不能把“不重复测试”理解为禁止补验。
- 工作区和持久证据目录均沿 progress.resources 登记；组不新建额外 worktree。未通过或证据未归档的现场不清理；最终仍只遍历台账并完成全量、实际合并、取代、sync_commit 与 roadmap 回写。


## 一次普通成员操作

1. 从已提交检查点读取本票、依赖接口与既有获批 seam；标 in_progress/current，并先单独提交进度。
2. 沿任务写集合实施，运行所有能运行的检查。普通行为改变先观察有效行为红；纯迁移使用组首保护，不能拿编译失败充当红。只有计划明确的组间暂时失败可以记待验；意外局部失败时成员与整组均 blocked，保留失败原因和旧证据，不扩大允许失败的范围。修复/复核按本协议恢复待验，不能将成员改走普通完成流程来解锁后继。
3. 核对 over/under-building 和接口；保存实际实现提交 C，归档每条检查的命令、cwd、exit、C/业务树与日志，不覆盖旧尝试。
4. 核实证据后，成员 awaiting_verification/tests=pending_group、implementation_commit=C、commit=null；更新组 checkpoint_commit=C、current=null，原子保存再单独提交进度。组外依赖仍等待 verify。
5. 运行 plan-state 检查已提交状态，再按 ready_tasks 进入本组下一票。

## 组验证与完成

所有成员待验后执行独立 verify 任务，覆盖计划规定的全部组 Scenario、相关回归、旧形和调用者清理。失败则组/verify blocked、保留组员待验和旧验证基线；只读诊断可继续。修复先回到有写集合的成员并保存修复检查点，接口/范围偏差仍交用户。

成功后以实际通过的业务树对应提交 V 同次原子完成所有成员、verify、组，填写各自 commit=V、保留各成员 implementation_commit，更新 integration.validated_commit（parallel 也同步 execution 投影），清 active_group/current；进度提交与 V 分开。之后重新预检才恢复普通调度，项目最终全量与审查/验收/交付仍执行。

## 证据记录形状

每条 evidence_paths 指向特性内 `execution/groups/GNN/TNN/<attempt>/record.json`；每次尝试独立目录。记录包含 command（实际 argv 字符串数组）、cwd、exit_code、commit、tree、stdout/stderr 相对特性路径和两个 sha256。tree 是 `git ls-tree -r -z C` 中排除本特性 plan/progress.yaml 与 execution/ 后的记录用 NUL 连接再 SHA-256；其余文件（包括 spec/index/任务接口）改变都会使树不同。日志可恢复/哈希吻合只证明字节没变，主线程和审查者仍核对工具回执、命令与失败类别；不手写“pass”冒充测试。

completed 组必须有 verify 自己目录中的通过证据，记录的业务树等于 V；成员历史非零记录仍保留，不改成零。CLI 不会运行测试、取得锁或执行恢复写入。未提交进度返回 checkpoint_uncommitted；恢复者核对磁盘、已提交档案、真实提交和日志后补检查点，不用未提交 completed 解锁。


## 可执行参考步骤

以下 Python 3 标准库片段演示上面的既有协议，不是新的锁 CLI、状态格式或自动恢复服务。计划作者按实际特性路径、会话 owner、任务角色和批准命令内嵌适用代码；执行者仍须先核对授权与 plan-state。每个取锁→操作→检查点→释放阶段在同一脚本内保留锁凭据，并在首次保护写入前向实际工具回执 flush 原始凭据，不把短命进程 PID 当编排 owner。默认入口不接管已有锁；仅下述已核验同会话续接可继续原锁。未知锁、维护门、身份不符或异常均停止并保留现场。

脚本通过已有许可通道执行，例如 `rtk proxy python3 -` 的标准输入；仅需计算哈希时可直接用该通道，不必先写临时脚本。文件写入限于批准的特性目录及该特性在真实 common-dir 下的锁/维护门元数据。工具拒绝后报告该具体命令和许可缺口；不得转去范围外临时仓实施任务，也不得以禁用权限限制代替授权。只编写计划时，只生成和校验计划；实际执行仍等待对应授权。

<!-- integration-group-reference:start -->
```python
import hashlib, json, os, stat, subprocess, uuid
from contextlib import contextmanager
from pathlib import Path, PurePosixPath

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def git(worktree, *args):
    return subprocess.check_output(
        ["rtk", "proxy", "git", *args], cwd=worktree)

def identity(directory):
    info = directory.lstat()
    require(stat.S_ISDIR(info.st_mode), "lock entity is not a directory")
    return [info.st_dev, info.st_ino]

def owned(directory, payload, entity):
    require(identity(directory) == entity, "lock entity changed")
    owner_file = directory / "owner.json"
    require(not owner_file.is_symlink(), "owner file is a symlink")
    require(json.loads(owner_file.read_text()) == payload, "lock owner changed")

def create_owner(directory, owner):
    entity = identity(directory)
    payload = {"owner": owner, "token": str(uuid.uuid4())}
    with (directory / "owner.json").open("x") as stream:
        json.dump(payload, stream)
    return payload, entity

@contextmanager
def maintenance(lock, owner):
    gate = Path(str(lock) + ".maintenance")
    gate.mkdir()  # FileExistsError: stop before touching another owner's data.
    payload, entity = create_owner(gate, owner)
    try:
        yield
    finally:
        owned(gate, payload, entity)
        (gate / "owner.json").unlink()
        gate.rmdir()

@contextmanager
def held_lock(worktree, feature_key, owner, *, resume_receipt=None,
              prior_call_stopped=False):
    worktree = Path(worktree).resolve()
    key = PurePosixPath(feature_key)
    require(bool(owner) and isinstance(owner, str), "session owner required")
    require(not key.is_absolute() and ".." not in key.parts
            and str(key) == feature_key and feature_key not in ("", "."),
            "canonical repository-relative feature_key required")
    require(Path(git(worktree, "rev-parse", "--show-toplevel").decode().strip()).resolve()
            == worktree, "wrong worktree root")
    feature = (worktree / feature_key).resolve()
    require(feature.relative_to(worktree).as_posix() == feature_key,
            "canonical feature path required")
    common = Path(git(worktree, "rev-parse", "--path-format=absolute",
                      "--git-common-dir").decode().strip()).resolve()
    parent = common / "spec-dev-locks"
    parent.mkdir(exist_ok=True)
    require(not parent.is_symlink(), "lock parent is a symlink")
    lock = parent / hashlib.sha256(feature_key.encode("utf-8")).hexdigest()
    if resume_receipt is not None:
        # Host must verify the previous call terminated and serialize this session's writes.
        require(prior_call_stopped is True, "previous call must be confirmed stopped")
        require(resume_receipt["payload"]["owner"] == owner, "different session receipt")
        require(all(resume_receipt[name] == value for name, value in
                    (("worktree", str(worktree)), ("feature_key", feature_key),
                     ("lock", str(lock)))), "receipt path does not match authorized feature")
        payload, entity = resume_receipt["payload"], resume_receipt["entity"]
        with maintenance(lock, owner):
            owned(lock, payload, entity)  # Never reconstruct the expected identity from L.
    else:
        with maintenance(lock, owner):
            lock.mkdir()  # If occupied, no owner overwrite and no protected writes.
            payload, entity = create_owner(lock, owner)
    original = {"worktree": str(worktree), "feature_key": feature_key,
                "lock": str(lock), "payload": payload, "entity": entity}
    print("LOCK_RECEIPT " + json.dumps(original), flush=True)  # Before any protected write.
    receipt = {"worktree": worktree, "feature_key": feature_key,
               "feature": feature, "lock": lock,
               "payload": payload, "entity": entity}
    try:
        yield receipt
    except BaseException:
        # Preserve the lock and interrupted state for explicit recovery.
        raise
    else:
        require(not git(worktree, "status", "--porcelain"),
                "uncommitted work: retain lock for recovery")
        with maintenance(lock, owner):
            owned(lock, payload, entity)
            (lock / "owner.json").unlink()
            lock.rmdir()

def check_owner(receipt):
    owned(receipt["lock"], receipt["payload"], receipt["entity"])

def commit_only(receipt, relative_paths, message):
    check_owner(receipt)
    worktree = receipt["worktree"]
    require(not git(worktree, "diff", "--cached", "--name-only", "-z"),
            "existing staged changes require ownership review")
    git(worktree, "add", "--", *relative_paths)
    git(worktree, "commit", "-m", message)
    return git(worktree, "rev-parse", "HEAD").decode().strip()

def checkpoint(receipt, state, message):
    check_owner(receipt)
    require(Path(receipt.get("validator", "")).is_file(),
            "actual validate-output.mjs path required before checkpoint")
    if state["integration"].get("worktree") is not None:
        state["integration"]["owner"] = receipt["payload"]["owner"]
        if "execution" in state:
            state["execution"]["owner"] = receipt["payload"]["owner"]
    relative = receipt["feature_key"] + "/plan/progress.yaml"
    target = receipt["worktree"] / relative
    require(target.resolve() == target, "canonical checkpoint path required")
    temporary = target.with_name(target.name + "." + str(uuid.uuid4()) + ".tmp")
    with temporary.open("x") as stream:
        stream.write(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, target)
    commit = commit_only(receipt, [relative], message)
    preflight(receipt, schemas=("plan-state",))
    return commit

def preflight(receipt, schemas=("plan-index", "plan-state")):
    validator = Path(receipt["validator"]).resolve(strict=True)
    for schema in schemas:
        result = subprocess.run(["rtk", "proxy", "node", str(validator), schema,
                                 str(receipt["feature"] / "plan")],
                                cwd=receipt["worktree"], capture_output=True)
        print(result.stdout.decode(), end="", flush=True)
        print(result.stderr.decode(), end="", flush=True)
        require(result.returncode == 0,
                schema + " rejected checkpoint; preserve state and stop")
        data = json.loads(result.stdout)
        require(data.get("ok") is True, schema + " did not accept checkpoint")
        if schema == "plan-state":
            require(data.get("protocol_version") == 1, "unsupported protocol")
    return data  # A valid blocked state may have ready_tasks=[].

def register_evidence(receipt, state, directory, policy):
    check_owner(receipt)
    saved = json.loads(git(receipt["worktree"], "show",
                           "HEAD:" + receipt["feature_key"] + "/plan/progress.yaml"))
    require(state == saved, "stale resource state; reload the committed checkpoint")
    require(not git(receipt["worktree"], "status", "--porcelain"),
            "save pending changes before registering a resource")
    path = PurePosixPath(directory)
    require(str(path) == directory and not path.is_absolute()
            and ".." not in path.parts and directory.startswith("execution/groups/"),
            "canonical evidence resource path required")
    require(isinstance(policy, str) and policy.strip(), "resource retention policy required")
    entry = ("evidence: " + receipt["feature_key"] + "/" + directory
             + " —— rtk proxy echo 'retain registered evidence; no cleanup in this phase'")
    if entry not in state["resources"]:
        state["resources"].append(entry)
        state["notes"].append("evidence " + directory + ": " + policy)
        checkpoint(receipt, state, "chore: register " + directory)
    receipt["evidence_resource"] = (directory, entry)

def fail_task(receipt, state, group, task, reason, evidence):
    # Call only for an explained check failure, after preserving its real record.
    require(state["integration"]["active_group"] == group, "wrong active group")
    require(reason and evidence, "failure reason and actual evidence required")
    item = state["tasks"][task]
    item.update(status="blocked", tests="fail")
    item.setdefault("evidence_paths", []).extend(
        path for path in evidence if path not in item.get("evidence_paths", []))
    state["integration"]["groups"][group]["status"] = "blocked"
    state["current"] = None
    state["notes"].append(task + ": " + reason)
    return checkpoint(receipt, state, "fix: preserve blocked " + task)

def resume_member(receipt, state, group, member, affected, verify, reason):
    # affected is the approved dependency closure, read from the navigation table.
    require(state["integration"]["active_group"] == group, "wrong active group")
    require(state["integration"]["groups"][group]["status"] == "blocked",
            "repair starts from a reconciled blocked checkpoint")
    require(reason and member not in affected and verify not in affected,
            "explicit member repair and dependency closure required")
    state["tasks"][member]["status"] = "in_progress"
    for task in affected:
        state["tasks"][task]["status"] = "blocked"
    state["tasks"][verify]["status"] = "pending"
    state["integration"]["groups"][group]["status"] = "in_progress"
    state["current"] = member
    state["notes"].append(member + ": " + reason)
    return checkpoint(receipt, state, "fix: begin member repair " + member)

def business_tree(worktree, feature_key, commit):
    raw = git(worktree, "ls-tree", "-r", "-z", commit)
    progress = (feature_key + "/plan/progress.yaml").encode()
    execution = (feature_key + "/execution/").encode()
    kept = []
    for entry in raw.split(b"\0"):
        if not entry:
            continue
        name = entry.split(b"\t", 1)[1]
        if name != progress and not name.startswith(execution):
            kept.append(entry)
    return hashlib.sha256(b"\0".join(kept)).hexdigest()

def record_check(receipt, argv, attempt, commit):
    check_owner(receipt)
    worktree, feature_key = receipt["worktree"], receipt["feature_key"]
    tree = business_tree(worktree, feature_key, commit)
    require(tree == business_tree(worktree, feature_key, "HEAD"),
            "record commit does not match current business tree")
    require(not git(worktree, "status", "--porcelain"),
            "commit and review pending changes before running checks")
    require(isinstance(argv, list) and argv and
            all(isinstance(arg, str) for arg in argv), "argv array required")
    feature = receipt["feature"]
    relative = PurePosixPath(attempt)
    require(not relative.is_absolute() and ".." not in relative.parts
            and str(relative) == attempt
            and attempt.startswith("execution/groups/"), "evidence path required")
    resource_root, resource_entry = receipt.get("evidence_resource", ("", ""))
    saved = json.loads(git(worktree, "show", "HEAD:" + feature_key + "/plan/progress.yaml"))
    require(resource_entry in saved.get("resources", []) and resource_root
            and relative.is_relative_to(PurePosixPath(resource_root)),
            "evidence resource must be registered and committed before running checks")
    directory = feature / attempt
    require(directory.resolve() == directory, "canonical evidence path required")
    directory.mkdir(parents=True)  # Existing attempts are never overwritten.
    result = subprocess.run(argv, cwd=receipt["worktree"], capture_output=True)
    record = {"command": argv, "cwd": str(receipt["worktree"]),
              "exit_code": result.returncode, "commit": commit,
              "tree": tree}
    for label, content in (("stdout", result.stdout), ("stderr", result.stderr)):
        relative_log = attempt + "/" + label + ".log"
        (feature / relative_log).write_bytes(content)
        record[label] = relative_log
        record[label + "_sha256"] = hashlib.sha256(content).hexdigest()
    # Keep raw streams even if a check unexpectedly changes the tested tree.
    check_owner(receipt)
    require(tree == business_tree(worktree, feature_key, "HEAD"),
            "check changed the committed business tree")
    require(not git(worktree, "status", "--porcelain", "--", ".",
                    ":(exclude)" + feature_key + "/" + attempt),
            "check changed files outside its evidence directory")
    relative_record = attempt + "/record.json"
    (feature / relative_record).write_text(json.dumps(record, indent=2) + "\n")
    commit_only(receipt, [receipt["feature_key"] + "/" + attempt],
                "test: preserve " + attempt)
    return relative_record, result.returncode
```
<!-- integration-group-reference:end -->

参考实现拒绝特性路径别名及状态/证据父目录软链接；检查执行前要求工作区干净、传入提交与当前业务树相同，允许仅进度或证据不同的后续提交。检查后再次核对业务树和额外改动；异常时保留原始输出与锁，不能为不匹配的实现生成通过记录。

执行环境已有当前插件时，可只读加载已验证的参考代码，避免在超长 Bash 参数中手工重写全部函数：

```python
from pathlib import Path

reference = Path(plugin_root) / "skills/executing-plans/references/integration-groups.md"
source = reference.read_text().split("<!-- integration-group-reference:start -->\n```python\n", 1)[1].split("\n```", 1)[0]
exec(compile(source, str(reference), "exec"))
```

随后按本节调用顺序设置实际会话 owner、validator 与当前状态。加载参考代码本身不取锁、不读任务、不执行任务；这些仍由当前阶段显式操作。遇到工具拒绝不禁用限制、不另写范围外 helper。需要脱离插件交付的计划须内嵌相同完整参考代码，不能留下运行时不存在的插件路径。

已提交状态按 Git blob 读取，保留 `HEAD:`，不能用 `git show <路径>` 的提交过滤输出代替文件：

```python
state = json.loads(git(worktree, "show", "HEAD:" + feature_key + "/plan/progress.yaml"))
```

异常后若需要在下一段辅助调用继续，主线程先核对上一段真实工具回执已结束、同一编排会话没有其他写者，并保留首次 `LOCK_RECEIPT` 行及其工具回执来源。将该行 JSON 原样作为 `resume_receipt`，沿当前真实会话 owner 调用 `held_lock(..., resume_receipt=original, prior_call_stopped=True)`。这个 True 只记录宿主已核验的前置，不检测进程或提供并发互斥；主线程必须串行调用，未核验不能设 True。参考函数只在维护门内校验原路径、原 payload/token、原设备号/inode，既不新建丢失锁，也不改变 owner 或 token。

**禁止从当前 `owner.json` 或 `lstat` 重建原凭据**；缺少最初回执、跨会话、原调用状态未知、同会话另有写者均保留现场并停止。这是同一 owner 延续同一实体，不是失联 owner 接管；跨会话恢复仍按原独立核验/接管规则。锁通过后仍需核对已提交状态、真实业务差异与证据，不能跳过 S14/S15 的恢复步骤。

调用顺序也属于可执行步骤，不能只复制锁/写文件函数：

1. 正常执行入口先实际读取 spec、index、已提交 progress，再用真实插件根的 `scripts/validate-output.mjs` 执行 `plan-index` 和 `plan-state`。只从返回的 ready 选择本票；读取本票正文与导航表依赖接口，不提前读取验证票正文来寻找组规则。批准的公共保护/组验证命令由 index 接口提供。
2. `held_lock(worktree, feature_key, session_owner)` 的 owner 由真实编排会话提供，原会话回执可追溯；token 才随机生成。取锁后令 `receipt["validator"] = 实际插件根 / "scripts/validate-output.mjs"`，再次 `preflight(receipt)` 核对持锁时状态。不要用每张票自行生成的 UUID 替代会话 owner。
3. 每次状态更新使用 `checkpoint`：独立提交后立即 `plan-state`；失败停止并保留锁和状态，成功才继续。无效状态已经提交时也不能返回成功。合法 `blocked` 的 `ready_tasks=[]` 允许保存，但不允许普通调度硬选下一票。
4. 首次证据目录创建前调用 `register_evidence(receipt, state, "execution/groups/G01/T01", "本次特性拥有；原始输出持久保留，归档确认后仅回收登记的重复现场")`；它先提交资源台账并预检，随后 `record_check` 才允许在该目录下创建唯一 attempt。恢复时重新读取 state，按原登记行设置当前阶段的 receipt；保留全部旧目录，attempt 不复用。
5. 预期组间暂时失败仍走成员待验；实际检查出现**意外失败**，先保存实现 C/原始 record，核实归属并更新对应 `implementation_commit` 和组 `checkpoint_commit=C`，再 `fail_task(...)` 保存本票/组 blocked。验证失败只 block verify/组、保留其他成员待验。已经解释的失败正常保存后可按暂停顺序释放；未解释异常仍保留锁，不能用一个通用 catch 把所有异常猜成业务失败。
6. 修复从实际已提交状态和核验后的锁归属开始；例如批准 G01 的成员 T01→T02、verify=T03，调用 `resume_member(receipt, state, "G01", "T01", ["T02"], "T03", 实际已批准修复原因)`，该检查点提交/预检后才修改 T01 写集合。T01 重新待验后，明确把 T02 从 blocked 改成 in_progress 并 `checkpoint`，核对原改名仍有效、补检查后恢复待验，不重复应用补丁；再按 T03 原全部验证重跑。旧 evidence、implementation SHA 和验证基线不清空，成功共同 V 单独完成。

`held_lock` 本身不强制入口 `plan-state` 成功：S14/S15 的已核验恢复窗口可能暂时报 checkpoint_uncommitted 或已解释实现提交未登记。恢复者先核对原 owner 已停、磁盘/提交差异归属和原始证据，在锁内补检查点并通过预检；未知差异仍冻结，不提供跳过校验的普通执行开关。

这些是示例函数及调用约定，resources 仍是既有字符串数组，未给公共 CLI 增加字段或服务。资源行沿既有格式给出仓库根相对标识和可执行的保留回执命令，具体所有权/保存策略记入 notes；证据原件不因收尾自动删除。计划作者内嵌时给出实际 validator、会话来源、失败原因和依赖闭包。只编计划时用内存 `ast.parse`/`compile(source, name, "exec")` 检查语法，不执行任务，也不调用会创建临时源文件/字节码的 py_compile；汇报只列本轮实际运行的静态校验，未来 T02/T03 的命令写“待执行”。

调用这些原语时，任务正文仍要完整列出自己的状态变更，不能省略成“同上”。参考顺序：

| 边界 | 先决事实和状态写入 | 提交顺序 |
|---|---|---|
| T00 完成 | 复用或创建隔离后都绑定实际 worktree/branch/owner；基线真实通过；T00.commit 与 integration.base_commit/validated_commit 使用已存在的实际提交 | 先确定已有提交 B，再 `checkpoint` 保存状态；不能要求状态提交引用它自己的 SHA |
| 组激活 | 全部外部前置 completed；保存组首行为保护；读取原 `integration.validated_commit` 为 B（不能改用最新 HEAD）；组 status=in_progress、base_commit=B、checkpoint_commit=实际已保存点、active_group=GNN；保留原 integration.base_commit/validated_commit | 在首次成员业务改动之前单独 `checkpoint` |
| 成员实施 | 本票 in_progress/current 先提交；批准的写集合实际改动后，用 `commit_only` 保存实现 C；`record_check` 在该实际业务树上执行检查并保存原件 | 实现 C → 独立证据提交 → 成员 awaiting_verification、implementation_commit=C、commit=null、tests=pending_group、evidence_paths 和组 checkpoint_commit=C → 独立 `checkpoint` |
| 组验证 | 全员待验；每条批准检查都真实执行并 `record_check`；任一必需项失败按修复协议处理 | 全部通过后取得实际通过业务树的 V；保留组 base/checkpoint 和所有历史 evidence；成员/verify/组一次完成，verify 自己也有 evidence_paths，所有 commit=V → 独立 `checkpoint` |
| 暂停 | 所有修正及提交都在 `held_lock` 内；运行 plan-state 并核对干净 | 离开正常上下文才经过维护门释放；异常保留锁/现场，不能继续执行下一阶段 |

普通 v1 计划同样把状态写入和独立提交写全，但不能因此套用 v2 的强制持锁边界。临时 helper 如确需持久保存，创建、归属与清理均写进获批计划，不临时写到未授权目录。

旧符号清零要按本次语法和源码精确匹配。例如只有命名 import/export 与 `export const/function trim` 的 ESM 夹具，可以匹配 `\b(?:import|export)\s*\{[^}]*\btrim\b` 或 `\bexport\s+(?:const|function)\s+trim\b`；`s.trim()` 是保留的运行行为，不应命中。复杂语法优先使用项目已有解析/静态检查器。测试命令的诊断可能在 stdout（例如 node:test 的 TAP），证据同时保存两个流；预期暂时失败依据实际回执与归因判断，不能只 grep stderr。


## 最终收尾与终端归档

组完成仍先回普通调度；下面只适用于全部实施/组验证/验收已完成的最终票，不是恢复业务施工的捷径。v2（含 parallel 投影）保留原 integration/execution 工作区、分支及全部历史 evidence.cwd，不把它们改成合并目标；终端校验还从每个原成员 implementation_commit 的 progress 核对历史 worktree/branch/base_commit，不能只让当前字段互相作证。终端只读校验以全部任务/组 completed 且 current/active_group=null 为条件，实际 SHA ancestry、业务树、证据归属/哈希与干净检查不变，ready_tasks=[]；没有实际验证与交付回执不能据此标完成。无 ancestry 的 squash 不能自动通过。已有 execution.delivery 时还必须为 merged/completed，拒绝仍 implementing/awaiting_merge 的矛盾档案；无该项不新增字段。

生成最终票时内嵌下列实际操作与失败分支，变量从本票读取的已提交 notes/resources 中恢复，不依赖前票 shell：

1. 在原绑定区持锁核对全部前置 ID、完成全量/审查/验收和必要 Spec 回写，保存最终票 in_progress。notes 追加实际来源绝对路径、来源分支、同一 common-dir、原工作区/分支和归属、通过验证的既存提交、待合并原 tip；原 tip 取已存在的提交，随后保存它的检查点单独提交，不做 SHA 自引用。登记的是可恢复事实，不新增 progress 字段。
2. 原辅助调用干净结束并释放自己的锁后，只读核验来源检出与分支、干净状态及 common-dir。此锁空窗不能 merge、提交或写 notes。复用隔离交原机制完成实际交付义务，未取得回执前保持最终票 in_progress，不能提前锚定。
3. 在已核验的来源用 `held_lock(source_worktree, feature_key, session_owner)` **重新取得同一特性锁的新 receipt**，给 receipt 绑定实际 validator。不得改旧 receipt.worktree，不用原区 resume_receipt 跨路径续接。取锁后重新核对来源/原分支 tip/台账，按授权实际合并；核验原保存 tip 与实际原分支 tip 都是目标 HEAD 的祖先、已验收树与目标树一致，新增合并差异须重新验证。将真实 merge HEAD 追加本次 state.notes，成功随最终检查点落盘，失败随 blocked 检查点落盘；中途进程丢失时从实际 Git ancestry/原 tip 与原始工具回执恢复，不把未保存的 notes 当事实。全部来源 merge、提交、notes 写入都在此新锁内；此时来源仍是非终端档案，普通 plan-state 拒绝原区绑定是预期恢复窗口，不能把它当可派业务票的入口或跳过其他核验。
4. 按台账在来源执行已授权清理，先核对原工作区干净且已接受的实际 tip 已包含于目标；逐条保存实际结果，只销掉成功/已不存在的精确条目，保留证据原件与移交条目。全部清理成功后完成适用 sync_commit（缺字段则新增）及独立提交，再核验最终目标。Spec/锚定也是业务树的一部分，不能继续用变更前的全局验证 SHA 声称当前树已验证。
5. 取得实际核验过的目标提交 V（已存在），在原 state 对象上更新 integration.validated_commit=V、最终票 commit=V/status=completed、current=null；parallel 同步 execution.validated_commit。保留组的 base/checkpoint/validated SHA、成员 implementation_commit 和全部历史记录。调用现有 `checkpoint` 原子写入并独立提交，真实 plan-state 终端分支应 exit0/ready=[]；干净退出来源 held_lock 后再结束收尾。

清理或归档中断：原绑定区仍完整时可按原锁规则保存合法 blocked；原区已移除时，在来源保存最终票 blocked、current=最终票、原绑定/旧证据与已发生的清理/合并事实，使用 `checkpoint` 保存并提交后，其预检仍应 exit1/ready=[]，异常留下**来源 receipt** 和原始错误。这不是 PASS，也不是可调度状态。恢复只允许已批准的最终收尾：先证实上次调用结束、核对同一来源/合并祖先/剩余台账/锁实体，按既有同会话 receipt 续接或跨会话排他恢复纪律取得写权，再补未完成的清理/锚定/验证，最后保存终端检查点。不能为让中间状态通过而改原绑定、改日志 cwd、伪填 completed 或重派业务票。
