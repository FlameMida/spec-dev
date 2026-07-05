# 测试反模式

> **阅读时机**：编写或修改测试、添加 mock、或想给生产类加测试专用方法时。

## 概述

测试必须验证真实行为，不是 mock 的行为。mock 是隔离的手段，不是被测对象。

**核心原则**：测代码做什么，不测 mock 做什么。严格 TDD 天然预防这些反模式。

## 三条铁律

```
1. 永不测试 mock 的行为
2. 永不给生产类添加测试专用方法
3. 永不在不理解依赖链时 mock
```

## 反模式 1：测试 mock 的行为

```typescript
// ❌ 坏：验证的是 mock 存在
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// ✅ 好：测真实组件，或干脆不 mock 它
test('renders sidebar', () => {
  render(<Page />);  // 不 mock sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

mock 在测试就过、不在就挂——这说明不了任何真实行为。**断言任何 mock 元素前自问：我在测组件行为，还是在测 mock 存在？后者 → 删断言或去掉 mock。**

## 反模式 2：生产类里的测试专用方法

```typescript
// ❌ 坏：destroy() 只被测试调用，却长得像生产 API
class Session {
  async destroy() { await this._workspaceManager?.destroyWorkspace(this.id); }
}

// ✅ 好：清理逻辑放测试工具
// test-utils/
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) await workspaceManager.destroyWorkspace(workspace.id);
}
```

生产类被测试专用代码污染，误在生产环境调用即事故。**给生产类加方法前自问：只有测试用它吗？是 → 别加，放测试工具里。这个类拥有该资源的生命周期吗？否 → 放错类了。**

## 反模式 3：不理解依赖就 mock

```typescript
// ❌ 坏：mock 掉的方法有测试依赖的副作用（写配置）
vi.mock('ToolCatalog', () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
}));
await addServer(config);
await addServer(config);  // 应该抛"重复"——但不会抛了！

// ✅ 好：在正确层级 mock——只 mock 慢的部分，保留测试依赖的行为
vi.mock('MCPServerManager'); // 只 mock 慢的服务器启动
```

**mock 任何方法前**：先问真实方法有什么副作用、测试依赖其中哪些、我真的理解这个测试需要什么吗。依赖副作用 → 在更低层级 mock（真正慢/外部的操作）；不确定 → 先用真实实现跑一遍观察，再最小化 mock。危险信号："保险起见 mock 一下"、"这可能慢，先 mock"。

## 反模式 4：不完整的 mock

```typescript
// ❌ 坏：只 mock 你以为需要的字段
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
  // 缺了下游要用的 metadata —— 测试过了，集成挂了
};

// ✅ 好：镜像真实 API 的完整结构
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
};
```

**铁规**：mock 完整的真实数据结构，不是只 mock 眼前测试用到的字段。部分 mock 在代码依赖被省略字段时静默失败。不确定就把文档里的字段全带上。

## 反模式 5：测试当作事后工作

「✅ 实现完成 ❌ 没写测试 "可以测试了"」——测试是实现的一部分，不是可选跟进。TDD 循环走完（红→绿→重构）才能声称完成。

## mock 过于复杂时

**警示信号**：mock 搭建比测试逻辑还长、mock 一切才能让测试过、mock 缺少真实组件有的方法、mock 一变测试就碎。

**考虑**：用真实组件的集成测试往往比复杂 mock 更简单。

## 速查表

| 反模式 | 修法 |
|--------|------|
| 断言 mock 元素 | 测真实组件或去掉 mock |
| 生产类测试专用方法 | 移到测试工具 |
| 不理解就 mock | 先理解依赖，再最小化 mock |
| 不完整 mock | 完整镜像真实 API |
| 测试事后补 | TDD——测试先行 |
| mock 过于复杂 | 考虑集成测试 |

## Red Flags

- 断言检查 `*-mock` 测试 ID
- 只在测试文件里被调用的方法
- mock 搭建超过测试的 50%
- 去掉 mock 测试就挂
- 说不清为什么需要这个 mock
- "保险起见 mock 一下"

**底线：mock 是隔离工具，不是被测对象。** TDD 中发现自己在测 mock 行为，就是走偏了——回去测真实行为，或质疑为什么要 mock。
