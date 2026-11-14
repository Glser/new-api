# 通用视频上游接入：插件驱动的中转方案

日期：2026-11-14。状态：设计修订，未实施生产代码。

## 目标、非目标与已定约束

目标是用同一套任务插件机制接入不同视频供应商。创境 AI（TMLab）与 VÉRA/Canvas 只作为两类协议样本，不成为 Go 核心中的供应商分支：

- 用户始终只调用本站协议（首期为 `POST /v1/videos`），不感知上游是否需要预上传、报价或特殊状态码。
- 插件解释供应商协议；Go 宿主执行 HTTP、持久化、计费、恢复和对外响应。
- 无需预上传的渠道继续走当前“插件构造生成请求、宿主发送”的主路径。
- 需要预上传的渠道由插件声明策略，宿主在当前请求内代插件执行上传并解析素材 ID。

已定约束：

- 不持久化原始图片、音频、视频，不建设通用素材库。
- 不向用户或插件暴露新的 New API 上传 HTTP 接口。
- 不要求多节点共享媒体存储。
- 首期不新增数据库表；复用 `tasks`、Task Plugin、轮询和计费体系。
- 允许在现有 `tasks` 上补充精确的执行阶段、幂等键、版本、租约和恢复字段。
- 原始媒体只允许存在于请求期临时存储或转发流中，请求结束或恢复失败后清理。
- 新能力名、字段名和返回类型均为拟定契约，实现前须同步 schema、d.ts、加载校验和 fixtures。

非目标：

- 不做跨请求附件管理、素材去重、素材分享或通用对象存储。
- 不让插件获得 `fetch`、文件系统、异步执行或数据库能力。
- 不把任何供应商的状态码、素材 ID 或错误信封直接变成本站公开协议。
- 不承诺自动支持分片上传、回调、二进制同步结果等新协议形态；这些需要后续独立能力扩展。

## 1. 三层协议必须分离

| 层次 | 决定者 | 职责 |
|---|---|---|
| 上游 HTTP 响应 | 上游协议，由供应商插件解释 | 200、201、202、4xx、5xx 与响应体在该协议中的含义 |
| 内部执行结果 | 插件归一化，Go 校验后执行 | 素材已导入、准备完成、生成已受理、已完成、明确拒绝、结果未知 |
| 本站 HTTP 响应 | 本站 host protocol/presenter 决定 | 对外状态码、任务结构、错误结构和兼容行为 |

不能把“上游返回 202”“内部任务已受理”“本站创建接口必须返回 202”当成同一件事。

当前代码事实：

- `relay/relay_task.go` 在调用插件解析前要求提交响应必须是 200；这是需要在新能力下解开的宿主前置限制。
- `controller/relay.go` 当前统一视频创建 presenter 返回 200；首期保持该对外兼容行为，不因供应商返回 202 而改变。
- `docs/plugin-api/v1.d.ts` 已把 `statusCode`、`headers`、`body` 提供给 `parseSubmitResponse`，可以增量扩展结果契约。
- 当前插件已经支持 JSON URL、multipart 直传和 `__fileRef` Base64/dataURL 内联；缺口是通用的请求期预上传编排，不是文件入口本身。

## 2. 插件与宿主的职责边界

插件负责描述协议事实：

- 该模型对图片、音频、视频参考分别采用什么策略。
- 上传接口如何构造，上传响应中哪个字段是供应商素材 ID。
- 报价/准备接口如何构造，报价状态如何解析。
- 生成提交响应何时能确认受理、完成、拒绝或未知。
- 供应商状态枚举如何映射为内部任务状态。
- 产物如何枚举和下载。

宿主负责执行和闭环：

- 用户认证、权限、限流和请求解析。
- 模型、渠道、账号和插件选择。
- 目标 URL、重定向、响应大小、超时和并发控制。
- 请求期文件读取、URL 安全下载和临时文件清理。
- 执行插件描述的上传、准备和生成请求。
- 校验插件返回的结构化结果。
- 保存执行阶段、素材 ID、任务跟踪信息、幂等上下文和恢复能力。
- 预留/结算/退费资金。
- 后台轮询、恢复、终态和产物代理。
- 决定本站 HTTP 响应。

插件不能直接调用 New API 内部上传服务，也不能自行请求上游。所谓“内部上传服务”是 Go 进程内的 `AssetPreparation`/`AssetImport` 编排模块，不是新的 HTTP API，也不是插件可访问的凭据入口。

## 3. 创建请求的总流程

默认创建流程只等待“上游提交结果”，不等待视频生成完成：

```text
客户端 POST /v1/videos
  ↓
本站鉴权、基础校验、解析 references
  ↓
领取本站幂等请求并持久化执行记录
  ↓
选择插件与渠道
  ↓
按最终渠道的插件策略处理素材
  ├── 无素材 / direct_url / direct_file / inline_base64：跳过预上传
  └── preupload：请求期上传并解析 providerAssetId
  ↓
可选报价/准备阶段
  ↓
生成前持久化恢复信息并预留费用
  ↓
发送生成请求，插件归一化提交结果
  ↓
保存 accepted/completed/rejected/unknown
  ↓
按本站协议响应；异步任务进入后台轮询或恢复
```

规则：

- 渠道选择必须先于预上传。供应商素材 ID 绑定渠道、账号和 Key，提前上传可能在后续路由后不可用。
- 需要文件字节的上传、直传或内联必须在当前请求文件生命周期内完成。
- 后台只能使用已持久化的供应商素材 ID、任务 ID、URL 或其他上游引用，不能读取请求级临时文件。
- 不提供“先返回本站任务、后台再处理原始文件”的模式。若未来要支持本地提前受理，必须另行扩展对外协议并证明后台不依赖临时输入。
- 创建请求和后台查询分别设置超时，不用一个 HTTP 长连接等待完整生成过程。
- 一旦生成请求已经发出，客户端断开不能导致本站停止读取或持久化上游结果。

## 4. 素材策略由最终选中插件的模型规则决定

插件可按模型和媒体类型声明或解析以下策略：

| 策略 | 请求期行为 | 是否需要预上传 |
|---|---|---|
| `none` | 忽略或拒绝素材，直接生成 | 否 |
| `direct_url` | 用户 URL 原样进入上游生成请求，由上游读取 | 否 |
| `direct_file` | 宿主用请求级 `fileRef` 构造 multipart，直接发给生成接口 | 否 |
| `inline_base64` | 宿主把请求文件临时编码为 Base64/dataURL 放入 JSON | 否 |
| `preupload` | 宿主先执行插件描述的上传接口，解析素材 ID 后再生成 | 是 |
| `unsupported` | 明确拒绝该媒体类型或用途 | 否 |

策略可以是 manifest 声明，也可以由插件在选中的模型上下文中返回；最终以执行插件对模型的判定为准。宿主不根据供应商名称写分支。

### 4.1 direct_url

上游生成接口自己接受 URL 时，插件把 URL 放入请求体。New API 不下载该 URL，也不先上传。

用户 URL 是输入内容，不能改变宿主请求目标。上游请求 URL 仍必须来自渠道 Base URL 加插件声明路径，或 `allowedHosts` 中的显式扩展。

### 4.2 direct_file

上游生成接口接受 multipart 文件时，插件返回 `bodyType: "multipart"`，并通过请求级 `request_file:<field>` 引用构造 `parts[].fileRef`。宿主在当前请求内把文件流转发给生成接口。

当前 Sora 类插件已经属于这条路径。

### 4.3 inline_base64

上游 JSON 接受 Base64/dataURL 时，插件返回当前已有的 `__fileRef` 占位符。宿主在发送前按大小限制临时编码，不把媒体内容写入恢复记录。

### 4.4 preupload

上游要求先取得素材 ID 时，执行顺序必须是：

```text
所有本地校验通过
  ↓
最终渠道/插件/账号已确定
  ↓
逐个或受控并发执行素材导入
  ↓
每个必需素材都确认 imported
  ↓
执行可选报价/准备
  ↓
构造并发送生成请求
```

硬性门槛：

> 任意必需素材为 `rejected`、`unknown` 或缺少可确认的 `providerAssetId` 时，禁止构造或发送生成请求。

素材上传失败后生成仍被提交是不允许的。可能出现的是“部分素材已上传成功，但后续素材失败或报价失败，因此生成未提交”；这些部分结果只保存在本次执行状态中，用于同一请求内重试或审计，不变成通用素材库。

## 5. 对外 references 规范

继续使用 `/v1/videos`，参数放在 `metadata.params`，素材放在 `metadata.references`。拟定结构：

```json
{
  "model": "video-model",
  "prompt": "让参考图里的猫看向镜头",
  "seconds": 5,
  "metadata": {
    "params": {
      "resolution": "720p",
      "aspect_ratio": "16:9"
    },
    "references": [
      {
        "id": "first_frame",
        "kind": "image",
        "role": "first_frame",
        "required": true,
        "source": {
          "type": "form",
          "field": "first_frame"
        }
      },
      {
        "id": "voice",
        "kind": "audio",
        "role": "audio",
        "source": {
          "type": "url",
          "url": "https://example.com/voice.mp3"
        }
      }
    ]
  }
}
```

来源类型：

- `form`：当前 multipart 文件的字段名，宿主解析为请求级 `FileReference`。
- `url`：根据插件策略决定 `direct_url` 还是请求期安全下载后转上传。
- `task_artifact`：先校验原任务属于当前用户，再按目标插件策略转换。

`kind` 只应是 `image`、`audio`、`video`。`role` 保留用途和顺序，如 `first_frame`、`last_frame`、`style`、`audio`，不得把同角色多个素材静默覆盖。参考音频、音频驱动和“生成声音”是不同概念，必须分别建模。

### URL 安全

当插件策略要求 New API 读取 URL 时，宿主必须：

- 仅允许 HTTP(S)。
- 禁止环回、私网、链路本地、唯一本地和云元数据地址。
- 对 DNS 解析出的每个地址做校验，防范 rebinding。
- 对每一跳重定向重新校验目标。
- 限制单文件与总字节数、连接和读取超时。
- 校验 Content-Type、文件魔数、大小、尺寸/时长与声明 `kind` 一致。
- 不把本站或渠道认证头发给用户 URL。
- 不在普通日志中保存完整 URL或媒体内容。

当策略是 `direct_url` 时，New API 不下载该 URL；上游如何访问它由上游负责，但该 URL 不能扩展宿主请求目的地。

### task_artifact

引用历史任务产物时：

- 宿主先验证任务归属、任务终态和产物存在。
- 同一插件、渠道和上游账号且插件明确声明可复用时，才允许直接复用供应商产物 ID。
- 否则宿主通过既有产物代理读取内容到请求期临时文件，再按目标渠道策略上传。
- 首期不跨 Key 猜测复用供应商素材 ID，不假设生成产物在账号内全局共享。

## 6. 请求期素材导入契约

预上传不是新的公开 HTTP 接口，而是插件 hook 加宿主内部服务。拟定能力名 `asset-import@1`。

插件导出：

```ts
export const assets = {
  buildImportRequest(ctx) {
    // 返回 RequestDescriptor
  },
  parseImportResponse(ctx, response) {
    // 返回 AssetImportOutcome
  }
};
```

宿主传给插件的是素材元数据和宿主管理的 opaque 文件引用，不暴露字节：

```ts
ctx.asset = {
  localId: "first_frame",
  kind: "image",
  role: "first_frame",
  filename: "cat.png",
  mimeType: "image/png",
  size: 123456,
  fileRef: "request_file:first_frame" // 或 prepared_file:<execution>/<reference>
};
```

对于 `form` 来源，`fileRef` 是现有请求级引用。对于需要下载的 URL 或历史产物，宿主生成只在本请求执行内有效的 `prepared_file` 引用。插件返回的 multipart `parts[].fileRef` 必须精确使用宿主提供的引用，宿主拒绝其读取其他文件。

### AssetImportOutcome

```ts
type AssetImportOutcome =
  | {
      outcome: "imported";
      providerAssetId: string;
      providerMetadata?: Record<string, JSONValue>;
      state?: unknown;
    }
  | {
      outcome: "rejected";
      code: string;
      message: string;
      retryableWithNewInput?: boolean;
    }
  | {
      outcome: "unknown";
      reason: string;
      state?: unknown;
      recovery?: {
        replaySameRequest?: boolean;
        lookupByRequest?: boolean;
      };
    };
```

语义：

- `imported`：插件确认供应商素材已创建，并给出可用 ID。
- `rejected`：插件确认该输入未被接受，或可确定未产生需要继续依赖的素材。
- `unknown`：请求已发出但无法确认结果。宿主不得把它当作成功，也不得在缺少恢复声明时无界重试。

状态门槛：

| 必需素材结果 | 是否继续生成 | 宿主动作 |
|---|---|---|
| `imported` | 是 | 保存 providerAssetId，进入下一素材或准备阶段 |
| `rejected` | 否 | 标记准备失败，返回输入/渠道错误，不预留或释放生成费用 |
| `unknown` | 否 | 标记素材导入未知，按恢复声明处理；禁止生成提交 |
| 缺失或超限 | 否 | 请求校验失败 |

多素材执行要限制并发。部分成功得到的 ID 写入当前执行状态；同一请求内后续重试可复用。请求结束或执行记录关闭后，不把原始文件或这些 ID 当作通用素材资产。

## 7. 可选报价 / 准备契约

Canvas/VÉRA 需要先生成报价，创境不需要。报价/准备也必须显式建模，不能塞进 `parseSubmitResponse` 的生成语义。

拟定能力名 `prepare@1`：

```ts
export const prepare = {
  buildRequest(ctx) {
    // 返回 RequestDescriptor
  },
  parseResponse(ctx, response) {
    // 返回 PrepareOutcome
  }
};
```

```ts
type PrepareOutcome =
  | {
      outcome: "prepared";
      state: unknown;
      quote?: {
        amount?: string;
        unit?: string;
        expiresAt?: string;
      };
    }
  | {
      outcome: "rejected";
      code: string;
      message: string;
    }
  | {
      outcome: "unknown";
      reason: string;
      state?: unknown;
      recovery?: {
        replaySameRequest?: boolean;
        newPrepareAllowed?: boolean;
      };
    };
```

规则：

- `prepared` 后才能提交生成。
- `rejected` 或 `unknown` 禁止生成提交。
- 报价有效期、金额、模型和完整输入变化时必须重新准备；插件在 state 中保留判断所需信息。
- Canvas 的 quote 不扣费；不能因此假定所有供应商准备阶段无副作用。若准备可能预留费用或库存，unknown 必须进入恢复策略。
- 报价金额可用于校验本站价格异常，但不能由插件直接执行资金结算。

## 8. 生成提交结果契约

新能力下，宿主不再在插件解析前按“仅 200”截断响应。Go 执行请求后，把状态码、允许的响应头和响应体交给插件，并校验插件返回结果。

拟定：

```ts
type SubmitOutcome =
  | {
      outcome: "accepted";
      tracking: ProviderTracking;
      taskData?: unknown;
      state?: unknown;
    }
  | {
      outcome: "completed";
      result: NormalizedTaskResult;
      artifacts: TaskArtifact[];
      state?: unknown;
    }
  | {
      outcome: "rejected";
      code: string;
      message: string;
      retryableWithNewInput?: boolean;
    }
  | {
      outcome: "unknown";
      reason: string;
      state?: unknown;
      recovery?: UpstreamRecoveryCapability;
    };
```

语义：

- `accepted`：上游明确记录任务，并有可验证跟踪信息，如供应商 task ID 或受控解析后的 Location。
- `completed`：上游同步返回可交付结果；宿主不强制轮询。
- `rejected`：协议能确认本次生成没有受理或没有产生费用。
- `unknown`：无法确认是否受理，常见于网络超时、连接重置、响应截断或缺少必要跟踪信息。

重要规则：

- 200 不等于业务成功；插件必须检查响应体。
- 202 不等于可跟踪。没有 task ID、Location 或其他可靠跟踪信息时不能虚构 accepted。
- 202 + Location 可以解析为 accepted，但 Location 必须按渠道 Base URL 和 `allowedHosts` 受控解析，不能变成任意请求目标。
- 某协议的 409 若返回原任务，可由该插件解析为 accepted；普通冲突仍按协议处理。
- 5xx、超时、正文损坏不能自动等同于“没有创建任务”。
- 上游已受理但后续生成失败，是任务终态失败，不是提交阶段 rejected。
- 上传、准备、生成和查询各自有独立解析器；不能共用一个“成功码列表”。
- 同步完成首期只支持插件能解析的 JSON 产物引用或内容描述；二进制同步结果需独立能力。

## 9. 本站响应与任务状态

统一 `/v1/videos` 创建成功首期继续返回当前兼容的 200，响应体用 `queued`、`in_progress`、`completed` 区分状态。供应商原生路由若未来要返回 201/202，必须另建受校验的 presenter 契约。

对外成功响应必须在持久化屏障之后：

```text
上游 accepted/completed
  ↓
任务跟踪信息、执行状态和必要费用状态已可靠保存
  ↓
本站 presenter 返回任务
```

unknown 不能伪装成成功，也不能提示客户端换幂等键重下单。应返回本站约定的可查询未决状态，或带恢复关联的错误结构。上游任务 ID 和供应商素材 ID 不直接暴露。

本地 Task 记录要区分“执行记录”与“上游已受理任务”：

| 执行阶段 | 本地任务含义 | 是否可能有生成费用 |
|---|---|---|
| `CLAIMED` / `SELECTING` | 已领取幂等请求，尚未选择渠道 | 否 |
| `PREPARING_ASSETS` | 正在导入素材，可能有部分素材成功 | 否，除非上传本身收费 |
| `ASSET_READY` | 必需素材已确认 imported | 否 |
| `PREPARING` | 正在报价/准备 | 取决于插件声明 |
| `READY_TO_SUBMIT` | 已保存生成恢复信息并预留费用 | 已预留 |
| `SUBMITTING` / `SUBMIT_UNKNOWN` | 生成请求已发出，结果未知 | 可能已发生 |
| `ACCEPTED` | 上游明确受理 | 已发生/已预留 |
| `COMPLETED` / `FAILURE` | 生成终态 | 按结果结算 |

素材失败可以留下本地失败执行记录用于幂等和审计，但它不是上游生成任务，也不得呈现为 queued。

## 10. 最小持久化与恢复

原始文件只做流式转发或请求期临时缓存，请求结束清理；磁盘残留由临时目录清理策略处理。普通日志、冻结请求和 PluginState 不保存文件字节或媒体 Base64。

复用 Task 保存：

- 用户、分组、渠道、插件 key/version、BaseURL 和凭据版本。
- 公开 task ID、上游任务 ID、必要供应商素材 ID、跟踪 URL 或跟踪状态。
- 请求指纹、模型映射、必要参数和可重放业务提交。
- 插件私有上下文；仍放在 `PrivateData.PluginState`。
- 执行阶段、尝试号、租约/版本和恢复能力。
- 资金预留、结算、退款和并发执行状态。

首期无新表。可在现有 `tasks` 上补充：

- `request_key` 与请求指纹的唯一约束。
- 执行阶段、生成前恢复信息、发送尝试号。
- CAS 版本或租约字段，避免多节点重复执行。
- 恢复调度与截止时间。
- 旧数据默认值必须兼容，未升级任务继续走现有轮询逻辑。

### 受理顺序

1. 解析公开协议、基础参数和 references，计算请求指纹。
2. 以 `user + request_key`（或最终确定的精确作用域）领取唯一执行记录，阻止并发重复生成。
3. 选择渠道并固定本次执行使用的插件、渠道和凭据。
4. 按最终插件策略执行素材导入；所有必需素材确认 `imported` 后才继续。
5. 执行可选准备/报价；确认 `prepared` 后才继续。
6. 在可能收费的生成请求前，持久化恢复信息并事务预留额度。
7. 记录发送尝试，发送请求；客户端断开后仍完成读取和结果归一化。
8. 保存 accepted/completed/rejected/unknown 及费用状态。
9. Presenter 返回本站响应。

本站幂等键只保证本站不重复受理，不自动赋予上游幂等能力。上游请求 ID 可以由公开 task ID 派生，但必须把“客户端网络重试”和“用户明确重新生成”区分开：

- 客户端携带同一本站幂等键原样重试：返回同一执行记录或任务。
- 任务已失败后用户想重新生成：必须创建新执行记录和新的上游请求 ID。
- 创境这类失败后幂等键永久占用的供应商，不能把同一次业务重试悄悄映射为同一个上游 Key 并误认为已重新执行。

### 恢复分级

| 能力 | unknown 后动作 |
|---|---|
| 支持相同请求和幂等标识重放 | 使用原凭据、原输入、原 quote/request ID 重放 |
| 支持按请求 ID 查回 | 先查询，不新建生成 |
| 仅支持查询已返回 task ID | 只有拿到跟踪 ID 后进入轮询；否则对账 |
| 无幂等/查回能力 | 进入对账、人工处理或截止策略，禁止自动重新生成 |
| 重放需要已清理文件 | 后台不自动重放；客户端重新提供文件并校验指纹后，仅在上游保证幂等时允许重发 |

素材上传 unknown 与生成提交 unknown 分开处理：

- 素材上传 unknown：没有可确认素材 ID，禁止生成；只能按插件声明的上传恢复能力重试或要求客户端重传。
- 可选准备 unknown：没有确认 quote/state，禁止生成；只有声明允许重新准备时才可安全重试。
- 生成提交 unknown：请求可能已被上游受理，不能退款、不能换渠道、不能自动新建生成。

### 渠道重试

- 素材阶段之前或明确 rejected 的渠道错误，可按现有渠道重试策略处理。
- 预上传成功后要换渠道时，不能复用原渠道素材 ID；若原始文件仍在当前请求生命周期内，必须为新渠道重新导入。
- 生成请求结果 unknown 后禁止自动换渠道重试。
- 直接 multipart/base64 生成请求响应未知后，后台通常无法完整重放，因为原始文件已清理；只能查回、对账或要求客户端在幂等保证下重发。
- direct_url 或纯 JSON 请求具备可持久化输入，插件声明上游幂等时才允许原样重放。

## 11. 计费与资金屏障

- 素材上传和免费报价原则上不收生成费用；若供应商声明上传/准备本身收费，必须纳入明确的资金状态。
- 生成请求前保存恢复信息并预留本站费用。
- 素材或准备 rejected：不预留或立即释放，无生成费用。
- 生成提交 unknown：保留费用，不退款，不换渠道。
- 生成提交 rejected 且确认无费用：释放或退款。
- accepted 后失败：走既有任务失败退款链。
- completed：按实际 usage facts 结算，允许补差或退还差额。
- 资金变更与任务终态标记必须事务化，重复恢复事件不能重复扣退。
- 查询错误不能直接退款；交付截止和晚到成功需按明确策略处理。
- 插件只报告 seconds、resolution、credits 等用量事实，不计算本站价格，不执行扣退。

Canvas 的 quote/task `amount` 可用于校验和审计，但不能直接当作本站币种或 quota。创境的积分应映射为主机计费 usage fact，再由本站价格表达式结算。

## 12. 样本协议映射

### 12.1 无需预上传的直接渠道

用户传入 URL，上游生成接口接受 URL：

```text
POST /v1/videos
  ↓
插件策略 direct_url
  ↓
buildSubmitRequest 把 URL 放入上游 JSON
  ↓
宿主发送生成请求
```

或用户传入 multipart 文件，上游生成接口接受文件：

```text
POST /v1/videos multipart
  ↓
插件策略 direct_file
  ↓
RequestDescriptor 使用 request_file:<field>
  ↓
宿主重建 multipart 并发送给上游生成接口
```

这两类渠道完全跳过预上传阶段。

### 12.2 VÉRA / Canvas

```text
POST /assets
  → AssetImportOutcome.imported.providerAssetId

POST /quotes
  → PrepareOutcome.prepared.state.quoteId

POST /generate
  → SubmitOutcome.accepted.tracking

GET /query/{id}
  → 任务状态、费用状态、产物资产
```

要点：

- `/assets` 是供应商接口，由宿主执行，不是本站公开上传 API。
- 所有必需素材未确认 `data.id` 前禁止 `/quotes` 后的生成提交。
- 报价过期后使用完整原输入重新报价，生成 request ID 保持插件声明的幂等规则。
- 生成结果需同时满足生成成功、费用 captured、产物 ready 才能标记成功。
- 同渠道、同 Key、插件明确授权时可复用产物 assetId；否则通过产物内容重新导入。

### 12.3 创境 AI / TMLab

```text
POST /v1/uploads/images|audios|videos
  → AssetImportOutcome.imported.providerAssetId = file_id

POST /v1/videos/generations
  → Idempotency-Key + 202 + job id → SubmitOutcome.accepted

POST /v1/tasks/query
  → 批量状态

GET /v1/files/{file_id}
  → 产物下载
```

要点：

- 上传接口按素材类型选择，仍由插件描述、宿主执行。
- 生成提交用稳定上游请求 ID；同一请求网络重放必须使用同一 Key 和完整原输入。
- 创境任务失败后原 Key 永久占用，用户重新生成必须获得新上游请求 ID。
- 批量查询遵守最大 50 和供应商建议间隔，由插件声明批查能力。
- 结果只返回 file ID，产物代理由宿主执行，不向用户泄露渠道 Key。

## 13. 宿主扩展范围

保留同步 JS 返回请求描述、Go 执行 HTTP 的边界。增量增加：

- Reference 策略解析或声明。
- 请求期 AssetPreparation/AssetImport 内部服务。
- `asset-import@1` hooks 与 `AssetImportOutcome`。
- `prepare@1` hooks 与 `PrepareOutcome`。
- `resolvedReferences` 注入 `buildSubmitRequest`。
- `prepared_file` 请求期文件引用和 multipart descriptor 校验。
- 新提交结果契约、ProviderTracking 校验和恢复能力声明。
- 查询批查上限、间隔、下载行为和产物策略声明。
- Task 执行阶段、幂等领取、租约、恢复和资金事务。
- d.ts、schema、加载校验、fixtures 和 CLI 测试同步。

旧插件不改 manifest 时继续使用现有 `{taskId, taskData, immediate, state}` 契议；新 outcome 契约必须通过能力协商启用，避免全局改变行为。

## 14. 实施顺序

| 阶段 | 交付 | 验收 |
|---|---|---|
| 1 | 固定 references 公开结构、素材/准备/提交 outcome、ProviderTracking 和恢复能力契约 | schema/d.ts/fixtures 明确；mock 覆盖所有 outcome |
| 2 | Task 幂等领取、执行阶段、生成前持久化屏障、租约和资金状态 | 并发重复请求只执行一次；崩溃后不重复扣退 |
| 3 | 新能力下解除提交响应 200 前置限制，接入 SubmitOutcome presenter | 旧插件回归不变；202/201/200 业务失败/同步完成可分类 |
| 4 | direct_url、direct_file、inline_base64 回归与请求期 preupload/prepare hooks | 无需上传渠道零额外请求；必须上传渠道在所有 imported/prepared 后才提交 |
| 5 | URL 下载、task_artifact 转换、临时文件清理和安全边界 | SSRF、大小、MIME、重定向、权限和清理测试通过 |
| 6 | 创境与 VÉRA 样本接入 | 两类协议端到端 mock 通过，再用受控真实环境联调 |
| 7 | 恢复、对账、批查和旧插件迁移 | unknown、失败重试、渠道切换和批查边界可验证 |

必须用 mock 覆盖真实样本之外的形态：

- 200 已受理、201 创建、202 + Location、202 无跟踪信息。
- 200 业务失败、同步完成、响应体截断。
- direct_url、direct_file、inline_base64、preupload。
- 多素材部分成功、素材 rejected、素材 unknown、报价 rejected、报价过期。
- 生成响应丢失、上游幂等重放、按请求 ID 查回、无幂等能力。
- 客户端在生成请求发出后断开。
- 上传成功但报价失败、报价成功但生成 unknown。

两个样本通过不等于通用能力完成。

## 15. 主要代码落点

- `middleware/task_plugin.go`：references 标准化、multipart/URL/task_artifact 解析和候选过滤。
- `relay/relay_task.go`：提交编排、非 200 响应转交插件、SubmitOutcome 分派。
- `relay/channel/task/jsplugin/adaptor.go`：素材/准备 hooks、resolvedReferences、请求描述校验和响应类型转换。
- `pkg/jsplugin/`：能力声明、schema、d.ts、加载校验和 fixtures。
- `controller/relay.go`：幂等执行记录、持久化屏障、资金预留和 presenter 边界。
- `model/task.go`：现有 tasks 补执行阶段、request_key、租约、恢复和资金状态。
- `service/task_polling.go`：批查策略、unknown 恢复、终态和 CAS。
- `service/task_billing.go` 与资金模型：事务化预留、结算和退款。
- `controller/task.go`、`controller/video_proxy.go`：权限、版本和产物代理。
- `integrations/`：创境与 VÉRA 的协议差异、端点、素材字段、状态枚举和幂等规则。

供应商专属判断只能放在插件/integration，不进入 Go 通用路径。

## 16. 后续演进

如果后续发现同一素材被频繁重复上传、上游垃圾素材明显增长、或用户需要跨请求管理附件，应另行设计通用素材库：

- `user_assets` 保存原始媒体和哈希。
- `channel_asset_bindings` 保存素材与渠道/账号的上游 ID 映射。
- 附件权限、配额、保留期和清理策略。
- 对象存储和多节点共享。

这不是首期方案。首期的 `asset-import@1` hooks 可以在后续被素材库复用：素材库仍然由宿主执行上传，只是增加持久化实体和跨请求缓存。

## 当前状态

本文已进入第一轮实现：

- 已增加 `asset-import@1`、`prepare@1` 与 `submit-status@1` 的能力协商和加载校验。
- 已支持在渠道选定、额度预留之后执行请求期 multipart 参考素材上传和可选报价，并把确认的 `providerAssetId` / prepare state 注入生成 hook。
- 已支持插件显式声明后解析 HTTP 202 等成功 2xx 提交响应；旧插件仍保持仅 200 的行为。
- 已加入 TMLab 与 VÉRA 样本插件及离线 mock 测试。
- URL 下载、task_artifact 转换、执行阶段/租约持久化和完整 unknown 恢复仍未实施，继续按本文后续阶段推进。

本轮未调用收费接口，也未改变现有 `/v1/videos` 对外响应结构。
