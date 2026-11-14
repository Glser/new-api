export const meta = {
  apiVersion: 1,
  key: "tmlab",
  name: "TMLab Video",
  icon: "text:TM",
  version: "1.0.0",
  author: {name: "QuantumNous"},
  description: {
    en: "TMLab video generation with request-time reference asset import",
    zh: "TMLab 视频生成，支持请求期导入参考素材",
  },
  models: ["tmlab-video"],
  fetchMode: "batch",
  requiredCapabilities: ["asset-import@1", "submit-status@1"],
  routes: [
    {method: "POST", path: "/tmlab/v1/videos/generations", type: "submit", decode: "createVideo", render: "taskCreated"},
    {method: "POST", path: "/tmlab/v1/tasks/query", type: "dynamic", decode: "queryTasks", render: "tasksStatus"},
  ],
  protocols: [{name: "openai_responses", supports: ["stream", "sync", "background"]}, "openai_video"],
  usageSchema: {
    seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}},
    calls: {type: "number", unit: "count", unitLabel: {en: "video", zh: "个视频"}, description: {en: "Generated video count", zh: "生成视频数量"}},
  },
  usageExamples: [{label: "5s", facts: {seconds: 5, calls: 1}}],
};

function text(value) { return typeof value === "string" ? value.trim() : ""; }
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function headers(ctx) {
  const key = text(ctx.apiKey || ctx.authHeader);
  if (!key) throw new Error("apiKey is required");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: /^Bearer\s+/i.test(key) ? key : "Bearer " + key,
  };
}
function baseUrl(ctx) { return text(ctx.baseUrl).replace(/\/+$/, ""); }

function normalizedRequest(req, model) {
  if (!object(req)) throw new Error("request must be an object");
  const prompt = text(req.prompt);
  const metadata = object(req.metadata) ? req.metadata : {};
  const params = object(req.params) ? req.params : object(metadata.params) ? metadata.params : {};
  const references = Array.isArray(req.references) ? req.references : Array.isArray(metadata.references) ? metadata.references : [];
  const seconds = Number(req.seconds === undefined && req.duration === undefined ? 5 : req.seconds === undefined ? req.duration : req.seconds);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error("seconds must be between 1 and 3600");
  return {
    model: model,
    prompt: prompt,
    params: params,
    references: references,
    seconds: seconds,
    metadata: {references: references},
  };
}

function inputName(kind) {
  if (kind === "image") return "input_images";
  if (kind === "audio") return "input_audios";
  if (kind === "video") return "input_videos";
  throw new Error("unsupported reference kind: " + kind);
}

function generationBody(ctx) {
  const req = object(ctx.requestBody) ? ctx.requestBody : {};
  const normalized = normalizedRequest(req, ctx.upstreamModel || ctx.model);
  const body = Object.assign({model: normalized.model, prompt: normalized.prompt}, normalized.params);
  body.duration_sec = normalized.seconds;
  for (const reference of Array.isArray(ctx.resolvedReferences) ? ctx.resolvedReferences : []) {
    if (!object(reference) || !text(reference.providerAssetId)) throw new Error("reference asset was not imported");
    const name = inputName(reference.kind);
    body[name] = Array.isArray(body[name]) ? body[name] : [];
    body[name].push(reference.providerAssetId);
  }
  return body;
}

export const assets = {
  buildImportRequest: function (ctx) {
    const kind = text(ctx.asset && ctx.asset.kind);
    const path = kind === "image" ? "/v1/uploads/images" : kind === "audio" ? "/v1/uploads/audios" : kind === "video" ? "/v1/uploads/videos" : "";
    if (!path) throw new Error("unsupported reference kind: " + kind);
    return {
      url: baseUrl(ctx) + path,
      method: "POST",
      headers: {Accept: "application/json", Authorization: headers(ctx).Authorization},
      bodyType: "multipart",
      parts: [{name: "file", fileRef: ctx.asset.fileRef, filename: ctx.asset.filename}],
    };
  },
  parseImportResponse: function (_ctx, response) {
    const body = object(response.body) ? response.body : {};
    if (response.statusCode < 200 || response.statusCode >= 300 || !text(body.file_id)) {
      return {outcome: "rejected", code: body.code || "TMLAB_UPLOAD_FAILED", message: body.message || "TMLab asset upload failed"};
    }
    return {outcome: "imported", providerAssetId: body.file_id, providerMetadata: {resourceType: body.resource_type, mimeType: body.mime_type}};
  },
};

export function buildSubmitRequest(ctx) {
  const body = generationBody(ctx);
  const resultHeaders = headers(ctx);
  resultHeaders["Idempotency-Key"] = text(ctx.publicTaskId);
  return {
    url: baseUrl(ctx) + "/v1/videos/generations",
    method: "POST",
    headers: resultHeaders,
    body: body,
    action: (ctx.resolvedReferences || []).length ? "image_to_video" : "text_to_video",
    rewriteModel: body.model,
  };
}

export function parseSubmitResponse(_ctx, response) {
  const body = object(response.body) ? response.body : {};
  if (!text(body.id)) throw new Error("TMLab submission returned no task id");
  return {taskId: body.id, taskData: body};
}

export function extractUsage(ctx) {
  const req = object(ctx.requestBody) ? ctx.requestBody : {};
  const seconds = Number(req.seconds === undefined && req.duration === undefined ? 5 : req.seconds === undefined ? req.duration : req.seconds);
  return {seconds: Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) : 5, calls: 1};
}

export function extractUsageOnComplete(_task, _result, body) {
  const source = object(body) ? body : {};
  const facts = {calls: 1};
  const seconds = Number(source.duration_sec || source.duration);
  if (Number.isFinite(seconds) && seconds > 0) facts.seconds = seconds;
  return facts;
}

export function buildBatchQueryRequest(ctx) {
  return {
    url: baseUrl(ctx) + "/v1/tasks/query",
    method: "POST",
    headers: headers(ctx),
    body: {task_ids: (ctx.tasks || []).map(function (task) { return task.taskId; })},
  };
}

function normalizeStatus(value) {
  const status = text(value);
  if (["queued", "running", "cancelling"].includes(status)) return {status: status === "running" ? "IN_PROGRESS" : "QUEUED", progress: status === "running" ? "50%" : "10%"};
  if (status === "completed") return {status: "SUCCESS", progress: "100%"};
  if (["failed", "cancelled", "expired", "not_found"].includes(status)) return {status: "FAILURE", progress: "100%"};
  return {status: "UNKNOWN", reason: "unrecognized TMLab status: " + status};
}

export function parseBatchResult(_ctx, body) {
  const rows = Array.isArray(body) ? body : [];
  return rows.map(function (row) {
    const normalized = normalizeStatus(row.status);
    const result = {taskId: text(row.id), status: normalized.status, progress: normalized.progress, data: row};
    if (normalized.reason) result.reason = normalized.reason;
    if (row.error && row.error.message) result.reason = row.error.message;
    return result;
  });
}

export function parseTaskResult(_ctx, body) {
  const row = object(body) ? body : {};
  const normalized = normalizeStatus(row.status);
  const result = {taskId: text(row.id), status: normalized.status, progress: normalized.progress};
  if (normalized.reason) result.reason = normalized.reason;
  if (row.error && row.error.message) result.reason = row.error.message;
  return result;
}

export function listArtifacts(task) {
  if (task.status !== "SUCCESS") return [];
  const data = object(task.data) ? task.data : {};
  const files = object(data.output) && Array.isArray(data.output.file_ids) ? data.output.file_ids : [];
  return files.slice(0, 64).map(function (_id, index) {
    return {key: index === 0 ? "video" : "video_" + index, type: "video"};
  });
}

export function buildContentRequest(ctx) {
  const data = object(ctx.data) ? ctx.data : {};
  const files = object(data.output) && Array.isArray(data.output.file_ids) ? data.output.file_ids : [];
  const index = ctx.artifactKey === "video" ? 0 : /^video_[1-9][0-9]*$/.test(ctx.artifactKey) ? Number(ctx.artifactKey.slice(6)) : -1;
  const fileId = files[index];
  if (!text(fileId)) throw new Error("artifact_not_found");
  return {url: baseUrl(ctx) + "/v1/files/" + encodeURIComponent(fileId), method: ctx.clientRequest.method, headers: {Authorization: headers(ctx).Authorization}, crossOriginRedirect: "strip"};
}

function taskView(task) {
  const data = object(task.data) ? task.data : {};
  const normalized = normalizeStatus(data.status);
  return {
    id: task.task_id,
    object: "video",
    model: task.properties ? task.properties.origin_model_name || "" : "",
    status: normalized.status === "SUCCESS" ? "completed" : normalized.status === "FAILURE" ? "failed" : normalized.status === "IN_PROGRESS" ? "in_progress" : "queued",
    created_at: task.created_at || 0,
    output: data.output || undefined,
  };
}

export const native = {
  createVideo: function (ctx) {
    if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
    const req = object(ctx.body.value) ? ctx.body.value : {};
    return {kind: "submit", model: ctx.model || text(req.model), action: "text_to_video", requestBody: normalizedRequest(req, ctx.model || text(req.model))};
  },
  taskCreated: function (_ctx, task) { return taskView(task); },
  queryTasks: function (ctx) {
    if (!ctx.body || ctx.body.kind !== "json" || !object(ctx.body.value)) throw new Error("JSON body required");
    const value = ctx.body.value;
    const ids = Array.isArray(value.task_ids) ? value.task_ids : text(value.task_id) ? [value.task_id] : [];
    return {kind: "query", taskIds: ids.map(String)};
  },
  tasksStatus: function (_ctx, tasks) { return tasks.map(taskView); },
  error: function (_ctx, error) { return {error: {code: error.code, message: error.message}}; },
};

function videoText(ctx) {
  const artifact = ctx.artifacts && ctx.artifacts.video;
  const url = text(artifact && artifact.url);
  if (!url) throw new Error("video artifact is unavailable");
  return '<video controls src="' + url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '"></video>';
}

export const protocols = {
  openai_responses: {
    decodeRequest: function (ctx) {
      if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
      return {kind: "submit", model: ctx.model, action: "text_to_video", requestBody: normalizedRequest(ctx.body.value, ctx.model)};
    },
    renderEvents: function (_ctx, task, previousState) {
      const status = String(task.status || "UNKNOWN").toUpperCase();
      const state = {status: status};
      if (status === "SUCCESS") return {events: previousState && previousState.status === status ? [] : [{type: "output", data: videoText(_ctx)}], state: state, done: true};
      if (status === "FAILURE") return {events: [{type: "error", code: "task_failed", message: task.fail_reason || "task failed"}], state: state, done: true};
      return {events: [], state: state, done: false};
    },
    renderFinal: function (ctx) {
      return {output: [{type: "message", status: "completed", role: "assistant", content: [{type: "output_text", text: videoText(ctx)}]}], metadata: {vendor: "tmlab"}};
    },
  },
};

protocols.openai_video = {
  decodeRequest: function (ctx) {
    if (!ctx.body || (ctx.body.kind !== "json" && ctx.body.kind !== "multipart")) throw new Error("JSON or multipart body required");
    let req;
    if (ctx.body.kind === "json") req = object(ctx.body.value) ? ctx.body.value : {};
    else {
      const fields = ctx.body.fields || {};
      req = {};
      for (const name of Object.keys(fields)) req[name] = fields[name][0];
      if (text(req.metadata)) {
        try { req.metadata = JSON.parse(req.metadata); } catch (e) { throw new Error("metadata must be a JSON object string"); }
      }
    }
    const files = ctx.body.files || [];
    if (files.length > 32) throw new Error("too many reference files");
    const metadata = object(req.metadata) ? req.metadata : {};
    const references = Array.isArray(metadata.references) ? metadata.references : [];
    for (const file of files) {
      references.push({id: file.field, kind: file.field.startsWith("audio") ? "audio" : file.field.startsWith("video") ? "video" : "image", source: {type: "form", field: file.field}});
    }
    metadata.references = references;
    req.metadata = metadata;
    return {kind: "submit", model: ctx.model, action: references.length ? "image_to_video" : "text_to_video", requestBody: normalizedRequest(req, ctx.model)};
  },
  render: function (_ctx, task) { return taskView(task); },
};
