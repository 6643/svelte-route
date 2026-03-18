# Svelte Route 面向 Svelte 5 的轻量路由设计

## 背景

当前已有一版基于 Solid 路由的设计与实施文档, 其核心价值不在于框架 API 本身, 而在于以下可迁移资产:

- 轻量单文件路由器定位
- 声明式 `<Route>` 外部使用方式
- query 参数解码合同
- 浏览器 history 与 anchor 拦截边界
- 可测试、可迁移、可回滚的实现约束

本次目标不是将 Solid 的内部实现逐句翻译到 Svelte, 而是将其行为合同与边界条件迁移为一份适用于 `svelte-route` 的 Svelte 5 版本设计。执行环境统一使用 `Bun`, 框架边界统一收敛到 `Svelte 5 only`, 并要求后续实现仅使用 Svelte 5 新 API 与新范式, 不保留旧版兼容层。

---

## 目标

### 核心目标

1. 将现有 Solid 路由设计迁移为 `svelte-route` 的 Svelte 5 版本设计文档。
2. 保留单文件、轻量、声明式、可测试的路由器定位。
3. 保留 `<Route>` + 程序式导航 + `$xxx` query decoder 的公共能力合同。
4. 用 Svelte 5 新 API 与新范式重写内部状态、生命周期与浏览器集成设计。
5. 将安装、运行、测试环境统一到 `Bun`。

### 优先级

1. 正确性
2. 可验证性
3. 稳定性
4. 简单性
5. 性能

---

## 非目标

本次明确不做:

- 不兼容 Svelte 4 或更早版本
- 不保留 Solid 专属实现语义
- 不在本轮扩展动态路径参数, 例如 `/user/:id`
- 不在本轮扩展嵌套路由
- 不新增独立 `Link` 组件
- 不把文档膨胀为通用路由框架设计
- 不在本轮直接实现业务代码

---

## 输入 / 输出 / 约束 / 非目标

### 输入

- `solid` 侧既有设计文档与实施计划
- 新目标框架为 `Svelte 5`
- 包管理、测试、执行环境统一为 `Bun`

### 输出

- 一份适用于 `svelte-route` 的 Svelte 5 路由设计文档
- 后续基于该设计再生成实施计划文档

### 约束

- 先只迁移文档, 不直接产出实现代码
- 不照搬 Solid 2 专属 API
- 保留轻量路由器定位
- 保留清晰的错误合同、测试合同、迁移影响与风险说明

### 非目标

- 当前不初始化完整项目实现
- 当前不扩展旧文档未承诺的能力范围
- 当前不混入与路由无关的工程脚手架设计

---

## 推荐方案

采用语义等价迁移:

- 保留旧设计中的能力边界、错误语义、测试矩阵、迁移约束
- 外部 API 尽量延续 `<Route>`、`routePush`、`routeReplace` 等使用习惯
- 内部架构完全改写为 Svelte 5 语义, 不保留 Solid 2 的 owner、flush、derived signal 等术语和实现依赖
- 执行环境、测试命令、依赖安装统一改为 `Bun`

### 选择原因

- 旧设计的真正资产是行为合同, 不是 Solid API 本身
- 当前 `svelte-route2` 仓库仍为空, 适合先锁行为边界, 再写实现计划
- 直接逐句翻译 Solid 设计会把不适合 Svelte 的内部语义带进新文档

### 备选方案与不选原因

- 结构镜像迁移: 虽然便于对照, 但容易遗留 Solid 设计痕迹, 后续仍要二次重写
- 最小重写迁移: 虽然更快, 但会丢失测试合同与风险边界, 不利于后续实现闭环

---

## 外部 API

### 导出

推荐公共导出:

- `Route`
- `routePush`
- `routeReplace`
- `routeCurrentPath`
- `routeBackPath`
- `routeForwardPath`

### Route 组件

目标使用形态:

```svelte
<Route path="/" component={Home} />
<Route path="/user" component={User} $id={Number} $enabled={Boolean} />
<Route path="*" component={NotFound} />
```

`Route` 只允许 3 类字段:

- `path: string`
- `component: RouteComponent`
- `$xxx: RouteDecoder`

除此之外的字段全部视为非法输入, 运行时直接抛错, 不做静默兼容。

其中 `RouteComponent` 在本设计中的精确定义为:

```ts
type RouteComponent =
  | Svelte5RenderableComponent
  | (() => Promise<{ default: Svelte5RenderableComponent }>);
```

说明:

- `Svelte5RenderableComponent` 不是自定义运行时协议, 而是“可被 Svelte 5 直接渲染的组件值”这一抽象占位名
- implementation plan 与最终代码必须使用实现当时 Svelte 5 官方公开类型落地, 不得继续发明另一套组件协议

约束:

- 同步组件: 直接传入可被 Svelte 5 直接渲染的组件值
- 懒加载组件: 传入返回 `Promise<{ default: ... }>` 的 loader, 其中 `default` 仍必须是同一类可渲染组件值
- 不接受组件实例
- 不接受任意 module promise
- 不接受除上述两类以外的其他 `component` 输入形态

### 导航函数

```ts
routePush("/user?id=1");
routeReplace("/login");

routeCurrentPath();
routeBackPath();
routeForwardPath();
```

语义:

- `routePush(path)`: 向浏览器 history 追加一条 router-managed 记录
- `routeReplace(path)`: 重写当前 router-managed 记录
- `routeCurrentPath()`: 返回当前 `pathname + search`
- `routeBackPath()`: 返回 router-managed 上一项或 `null`
- `routeForwardPath()`: 返回 router-managed 下一项或 `null`

补充约束:

- 若目标路径经规范化后与 `routeCurrentPath()` 完全一致, `routePush` 和 `routeReplace` 都是 no-op
- no-op 不写入新的 history state, 不触发组件重建, 不改变 back/forward 派生结果

---

## Query 转换模型

### 设计目标

路由层负责 query 参数类型转换, 组件层只消费转换后的结果。

### 声明方式

`$xxx` 表示 query key `xxx` 的转换器:

```svelte
<Route
  path="/search"
  component={Search}
  $page={Number}
  $enabled={Boolean}
  $filter={(raw) => raw ? raw.split(",") : undefined}
/>
```

### 转换器签名

```ts
type RouteDecoder<T> =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ((raw: string | null) => T | undefined);
```

### 内建转换规则

- `String`: 原样返回字符串, 缺失时 `undefined`
- `Number`: 有限数字时返回 `number`, 非法或缺失时 `undefined`
- `Boolean`:
  - `"true"` -> `true`
  - `"false"` -> `false`
  - 其他值或缺失 -> `undefined`

### 失败语义

- query key 缺失 -> 组件拿到 `undefined`
- query 值非法 -> 组件拿到 `undefined`
- query 解码不会影响路由匹配, 路由是否命中只看 `path`
- 自定义 decoder 若抛异常, 视为程序级错误, 直接向上抛出

### 命名冲突策略

因为 query decoder 使用 `$` 前缀, 所以 query key 本身可以安全使用 `path` 和 `component`:

```svelte
<Route path="/debug" component={Debug} $path={String} $component={String} />
```

目标组件收到的 props 为:

```ts
{
  path?: string;
  component?: string;
}
```

---

## 导航输入规范化

`routePush` / `routeReplace` 与 anchor 拦截共用同一条规范化管线, 允许的输入只有:

- 根路径: `/user?id=1`
- query-only: `?page=2`
- 同源绝对 URL: `https://example.com/user?id=1`

规则:

- `?page=2` 解析为“当前 `pathname` + 新 query”
- 裸 `?` 解析为“当前 `pathname` + 空 search”, 即清空 query
- 空 search 与无 search 归一化后视为同一结果
- 连续或异常 query 分隔符不做宽松修复, 交给 `URL` / `URLSearchParams` 按浏览器标准解析
- 同源绝对 URL 归一化为 `pathname + search`
- `hash` 不参与 router 状态, 归一化时直接丢弃
- 裸相对路径如 `foo`、`./foo`、`../foo` 一律判定为非法输入
- 跨域 URL 一律判定为非法输入
- 归一化结果若与 `routeCurrentPath()` 完全一致, `routePush` 和 `routeReplace` 都视为 no-op

非法输入合同:

- `routePush` / `routeReplace` 收到非法输入时直接抛错
- anchor 点击若落入非法输入类别, 只放行浏览器默认行为, 不由 router 接管

重复 query key 规则:

- decoder 使用 `URLSearchParams.get(key)`, 只取第一个值
- 本次不支持数组 query 的多值聚合, 复杂类型由自定义 decoder 在单个原始值上自行解析

---

## 匹配与渲染语义

### 路由匹配

保持第一命中优先:

1. 从已注册 entries 中找第一个 `path === location.pathname`
2. 若没有, 找第一个 `path === "*"`
3. 若仍没有, 不渲染任何 route

### 注册顺序与优先级

为保证重复路径与 `*` fallback 行为可预测, route registry 必须具备稳定顺序。

顺序规则:

- 优先级以 `<Route>` 实际注册顺序为准
- 同一时刻, 先注册的 entry 优先于后注册的 entry
- 条件渲染导致某条 `<Route>` 卸载后, 其 entry 必须立即注销
- 若同一条 `<Route>` 后续重新挂载, 视为新 entry, 排到当前 registry 尾部
- `*` fallback 不具备特殊插队权, 仍只按 registry 顺序参与兜底匹配

因此, “第一命中优先”的精确定义是: 在当前 registry 的稳定顺序上, 先找第一个精确路径命中, 否则再找第一个 `*`。

### 渲染

只有命中的 `<Route>` 渲染其 `component`。

query props 解码发生在“已命中 route”之后, 再把转换后的对象传给目标组件。

### 导航后的组件实例语义

为避免实现期对重渲染和重挂载理解不一致, 本设计显式规定:

- 同一路径、仅 query 变化: 复用当前命中 route 的组件实例, 只更新解码后的 props
- 同一路径、same-path no-op: 不更新 props, 不重建实例
- 从路径 A 导航到路径 B: A 对应组件卸载, B 对应组件新建并挂载
- 从路径 B 再导航回路径 A: A 重新创建新实例, 不要求保留上一次实例
- `popstate` 触发的路径变化遵循与程序式导航一致的实例语义

这意味着 query decoder 的主要职责是生成新的 props 快照, 而不是驱动 route 组件的重建。

### component 不可变

`component` 被视为 route 配置的一部分, 不是运行时数据:

- 注册时读取一次初始值
- 若挂载后 `component` 引用发生变化, 直接抛错
- 不静默忽略, 避免迁移时误以为仍支持响应式替换

推荐迁移方式是条件切换不同 `<Route>` 节点, 而不是在同一个 `<Route>` 上替换 `component`。

### 懒加载

保留对懒加载组件的支持, 但由 Svelte 5 版本实现决定最终渲染落点。

本设计只锁以下合同:

- 懒加载路由组件可以正常命中渲染
- 路由层不强制制造默认 loading UI
- loader resolve 后使用模块的 `default` 组件作为最终渲染目标
- loader pending 期间不渲染默认占位 DOM
- 从已命中同步路由 A 导航到懒加载路由 B 时, A 立即卸载
- A 卸载到 B resolve 之间允许出现短暂空白 DOM, 不保留旧组件作为过渡占位
- B resolve 后创建并挂载新的组件实例
- loader reject 视为程序级错误, 直接向上抛出
- loading/fallback 的更细粒度实现由 implementation plan 在 Svelte 5 语义下继续细化, 但不得违反上述最小合同

---

## Svelte 5 内部架构

内部推荐按 4 个逻辑区块组织, 即使最终保持轻量实现, 也必须保持职责边界可追踪。

### 1. 类型与纯函数区

职责:

- 约束 `RouteDecoder`、`RouteEntry`、`RouteHistoryState`
- 提取 `$xxx` decoder map
- 解码 query
- 匹配路径
- 归一化 navigation target
- 归一化 `history.state`
- 判断是否拦截 anchor 点击

### 2. 路由状态区

职责:

- 保存 route registry
- 保存当前 location
- 保存 router-managed history 镜像
- 提供导航函数
- 提供当前路径、前后路径、当前命中项等派生值

设计要求:

- 浏览器 `location` 与 `history.state` 是事实来源
- 命中路由、解码 props、前进后退路径都属于派生值
- 禁止出现多路事实源并行写入

### 3. 浏览器集成区

职责:

- 读取浏览器 location
- 安装 `popstate` 监听
- 安装 document click 拦截
- 统一 `pushState` / `replaceState` 写入
- `history.state` 缺失时恢复单条记录

约束:

- 副作用集中安装
- 安装与清理必须对称
- 不允许在零散位置直接扩散 `window` / `document` 操作

### 4. Route 组件区

职责:

- 在生命周期内注册和注销自身
- 在命中时渲染目标组件
- 在渲染前解码 query props

约束:

- `<Route>` 只做注册、注销、条件渲染
- 匹配、history、浏览器监听都下沉到路由状态与浏览器集成层

---

## Svelte 5 新 API 约束

本设计只兼容 Svelte 5, 后续实现必须使用 Svelte 5 新 API 与新范式。

### 约束原则

- 不保留 Svelte 4 兼容层
- 不在设计中引入 Solid 2 的 owner、flush、derived signal 术语
- 状态、派生、组件生命周期必须用 Svelte 5 语义表达
- 若需要框架层状态原语, 必须优先采用 Svelte 5 推荐写法

### 设计落点

- 路由 registry、location、history state 使用 Svelte 5 状态模型管理
- 当前命中路由、解码后 props、前进后退路径定义为派生值
- Route 组件生命周期使用 Svelte 5 推荐副作用与清理边界表达
- 条件切换 route 时, 依赖组件挂载/卸载保证注册表同步

### 不允许的方向

- 不为兼容旧写法而混入双套响应式模型
- 不先写旧 API 再用适配层包装成新 API
- 不把实现责任转嫁给业务侧手工 flush 或手工同步状态

---

## 环境边界

本设计定义的是 client-side browser router, 不覆盖 SSR 首屏路由、服务端导航或非浏览器运行时。

边界规则:

- 导入类型与纯函数可以在非浏览器环境存在
- 涉及 `window`、`document`、`history` 的导航与监听能力仅在浏览器环境受支持
- 若在非浏览器环境调用 `routePush`、`routeReplace` 或读取依赖浏览器状态的导出, 实现应直接抛出清晰错误, 不做静默降级
- implementation plan 必须把浏览器环境保护作为显式步骤纳入

---

## 错误处理

### 非法 Route props

以下情况直接抛错:

- `path` 缺失或不是字符串
- `component` 缺失
- 非 `path` / `component` / `$xxx` 的其他字段出现
- `$xxx` 值不是内建转换器也不是函数

### 自定义 decoder 异常

区分两类失败:

- 数据级失败: decoder 正常返回 `undefined`, 组件收到 `undefined`
- 程序级失败: decoder 执行时抛异常, 异常直接向上抛出

### 浏览器状态恢复

若 `history.state` 不是 router-managed 格式:

- 使用当前 `pathname + search` 构造单条 history stack
- 用 `replaceState` 写回规范状态
- 若原始 `history.state` 中存在非 router 自有字段, 实现应保留这些字段, 并仅在 router 自有命名空间内写入恢复后的状态

### anchor 拦截边界

分类原则:

- anchor 是否可被 router 接管, 必须基于元素原始声明的 `href` 值或等价的未解析表示进行判断
- 不允许仅基于浏览器解析后的绝对 URL 结果做分类
- 因此, authored bare relative href 如 `foo`、`./foo`、`../foo` 即使浏览器暴露为同源绝对 URL, 仍必须视为裸相对路径并放行

只拦截以下链接:

- `event.defaultPrevented === false`
- 左键点击
- 无 modifier key
- 同源
- `target` 缺失或显式为 `_self`
- 非 `download`
- `href` 为根路径、query-only 或同源绝对 URL
- 非 `#hash` 导航
- 链接解析成功且未被更内层交互逻辑提前消费

其余情况全部放行。

明确不拦截:

- 已被其他逻辑 `preventDefault()` 的事件
- `_blank` 或任何非 `_self` 命名 target
- 外链
- 裸相对路径
- hash-only 导航
- 带 modifier key 的点击
- 非左键点击

规范示例:

- `<a href="foo">` 必须放行, 不由 router 接管
- `<a href="./foo">` 与 `<a href="../foo">` 必须放行, 不由 router 接管
- `<a href="/user?id=1">` 可以被 router 接管
- `<a href="https://same-origin.example.com/user?id=1">` 只有在与当前 origin 同源时才可被 router 接管并归一化

same-path no-op 边界:

- 若链接已被 router 识别为可接管导航, 即使最终归一化后是 same-path no-op, 仍由 router `preventDefault()` 并按 no-op 处理, 不回退给浏览器默认重复导航

---

## 测试设计

本次文档迁移显式保留测试合同, 以便后续实现计划按 TDD 展开。测试执行环境统一为 `Bun`。

### 核心行为

- 精确路径命中
- `*` fallback
- 重复路径时第一命中优先
- `routePush` 更新当前路径并写入 history
- `routeReplace` 重写当前路径且不增长栈
- `routeCurrentPath` / `routeBackPath` / `routeForwardPath`
- `routePush` / `routeReplace` 对非法输入直接抛错
- same-path `routePush` / `routeReplace` 为 no-op

### Query 转换

- `$id={Number}` 正常返回 `number`
- `$enabled={Boolean}` 正常返回 `true/false`
- 缺失 query key -> `undefined`
- 非法 query 值 -> `undefined`
- 自定义复杂类型 decoder 返回转换值
- 自定义 decoder 抛异常会向上抛出

### 生命周期

- `<Route>` 挂载时注册
- `<Route>` 卸载时注销
- 条件切换后不会残留旧路由注册
- 挂载后替换 `component` 会直接抛错
- query-only 导航更新 props 但不重建组件实例
- 跨路径切换会卸载旧组件并挂载新组件
- 从同步路由切到懒加载路由时, 旧组件立即卸载, pending 期间允许空白 DOM

### 浏览器集成

- `popstate` 同步 location
- local anchor click 会被拦截
- `event.defaultPrevented` / 非 `_self` target / `download` / 外链 / modifier key 不拦截
- `?page=2` 会复用当前 `pathname`
- 同源绝对 URL 会被归一化
- 裸相对路径 `foo` 不拦截且程序式导航会抛错
- 非浏览器环境调用导航导出会抛出清晰错误

### 懒加载

- 懒加载组件可正常命中渲染
- 路由层不产生默认 loading UI
- 从同步路由切到懒加载路由时, 不保留旧组件作为过渡内容
- loader resolve 后挂载新实例, loader reject 时向上抛错

---

## 迁移影响

### 对实现侧的直接影响

- 后续 `svelte-route` 设计不再引用 Solid 2 术语与 API
- 所有状态与生命周期表达改用 Svelte 5 新 API
- 安装、测试、运行命令统一用 `Bun`

### 对调用侧的直接影响

- 继续使用 `<Route path component $xxx>` 风格
- 继续使用 `routePush` / `routeReplace` / `routeCurrentPath` 等命名
- 条件路由切换应通过切换 `<Route>` 节点完成
- 不支持在同一个 `<Route>` 上动态替换 `component`

### 需要废弃的模式

- 直接照搬 Solid 内部实现语义
- 混用旧版 Svelte 响应式写法作为主实现模型
- 响应式替换单条 Route 的 `component`

---

## 风险与折中

### 风险 1: Svelte 5 实现细节尚未锁到文件级

影响: 当前 spec 先锁行为合同, 但具体文件结构与 API 落点仍需在 implementation plan 中细化。

缓解:

- 下一阶段单独输出 implementation plan
- 在计划中把 Svelte 5 状态原语、组件结构、测试入口落到文件级步骤

### 风险 2: 懒加载在 Svelte 5 下的渲染细节可能与 Solid 版本不同

影响: fallback 与 pending 态行为需要按 Svelte 5 真实语义验证。

缓解:

- 在计划中把懒加载行为单独列为失败测试与实现步骤
- 只保留“可渲染且无默认 loading UI”这一最小合同

### 风险 3: 当前仓库为空, 缺少现成代码约束

影响: 文档需要主动定义边界, 否则后续实现容易漂移。

缓解:

- 在 spec 中明确输入、输出、约束、非目标
- 在 implementation plan 中继续细化文件路径、测试命令、验收标准

---

## 验收与观测

- 验收标准: 后续 implementation plan 能以本 spec 为唯一行为依据展开实现
- 关键观测信号: API 名称、错误语义、query decoder 行为、history 行为、anchor 拦截边界在测试中均有对应覆盖
- 回滚方式: 若 Svelte 5 方案在实现阶段被证伪, 回滚到本 spec 并仅修改具体实现策略, 不扩大外部 API 范围

---

## 结论

本方案采用语义等价迁移, 将 Solid 路由设计中的能力合同迁移为适用于 `svelte-route` 的 Svelte 5 版本设计。外部继续保持 `<Route>`、程序式导航与 `$xxx` query decoder 的轻量使用体验, 内部则完全切换为 Svelte 5 新 API 与新范式, 并将后续实现的测试合同、错误边界、浏览器集成规则与 Bun 执行环境提前锁定, 为下一阶段 implementation plan 提供可验证、可落地的基础。
