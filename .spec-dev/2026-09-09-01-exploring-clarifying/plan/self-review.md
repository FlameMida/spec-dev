# 计划主线程自检

2026-09-09，按 writing-plans 的五查完成；未派发计划审查子代理，也未执行生成任务。

- **覆盖**：14条Requirement、S01—S32均有实现票、具体输入和观察点，全部进入T06当前候选验收；51个具名输入包括P00后台能力预检、S26宿主迁移检查及入口/多轮/失败变体。已存在行为保留前后保护，环境错误不作行为红。
- **步骤与代码**：T01—T05显式五步；T00和T06/T07按隔离/验收/交付性质使用完整步骤。状态、记录、夹具、模型命令和最终收尾代码完整内嵌，只有实施时才物化执行工具。
- **接口与导航**：八个任务文件和导航一致；初检发现T00接口表述不一致，已统一。T06初次匹配到“文件”节的消费行是检查器范围问题，现只解析接口块；原件保留在self-review-initial.json。
- **依赖**：七条串行边分别承载实际前序产物、共享文件顺序或验收/交付安全门。没有独立链的并发声明，不为凑并发删边；无前置重构阻碍或多票集成组。
- **路径/替换/语法**：49个替换锚点顺序唯一，另一个产品新文件使用不存在检查；在内存按T01—T05重放，未修改产品。生成片段的Markdown链接按目标产品文件位置解析，计划正文链接按计划目录解析，避免把两者混淆。Python/JavaScript/shell只做语法解析，不执行任务。
- **真实证据边界**：子代理读取范围允许候选规则，仍禁止其他用例/oracle；无宿主预加载专用agent。单题续接使用实际上一轮回复、同候选同夹具，并明确为续接回放。最终judge不能由模型自报代替；进程存在时先核对身份，不按陈旧PID终止进程。
- **收尾**：T07消费T00实际来源及所有权；取代仅回写指定Requirement；仅在真实合并和产品树核实后清理已归档的自有fixture/空目录/worktree/分支，状态提交在存活来源工作区完成。原隔离复用不取得删除权，未收到真实交付回执不写完成。

实际验证命令：

```bash
rtk proxy python3 .spec-dev/2026-09-09-01-exploring-clarifying/plan/check-authoring.py
rtk proxy node scripts/validate-output.mjs plan-index .spec-dev/2026-09-09-01-exploring-clarifying/plan
rtk git diff --check
```

均 exit 0。具体语法数量、操作数及错误清单见 [self-review.json](self-review.json)，来源锚点见 [authoring-audit.json](authoring-audit.json)。尚未进行worktree基线、模型调用、后台能力实测、TDD或产品验收；progress八票均pending，运行SHA/模型/owner保持未初始化。
