// Canvas OpenAPI 1.0.0: quote -> idempotent generation -> polling.
// This is an uploaded task plugin, not a replacement for the Ark driver.
export const meta = {
  apiVersion: 1,
  key: "canvas",
  name: "Canvas Seedance",
  icon: "text:CV",
  version: "1.0.1",
  author: { name: "oioi" },
  description: {
    en: "Canvas Seedance video generation with quote and idempotent submission",
    zh: "Canvas Seedance 视频生成，支持先报价、幂等提交和结果下载",
  },
  baseUrl: "https://canvas.yydsapi.uno/api/v1/prot",
  models: ["sd2.5-qd", "seedance-2.5"],
  fetchMode: "per_task",
  auth: "api_key",
  routes: [
    { method: "POST", path: "/canvas/api/v1/prot/generate", type: "submit", decode: "createVideo", render: "taskStatus" },
    { method: "GET", path: "/canvas/api/v1/prot/query/:task_id", type: "query", render: "taskStatus" },
  ],
  protocols: ["openai_video"],
  usageSchema: {
    seconds: { type: "number", unit: "second", description: { en: "Requested video duration", zh: "请求视频时长" } },
    calls: { type: "number", unit: "count", unitLabel: { en: "video", zh: "个视频" }, description: { en: "Generated video count", zh: "生成视频数量" } },
    resolution: { enum: ["480p", "720p", "1080p"], description: { en: "Requested resolution", zh: "请求分辨率" } },
    reference_video: { type: "boolean", description: { en: "Reference video included", zh: "包含参考视频" } },
  },
  usageExamples: [
    { label: "720p / 4s", facts: { seconds: 4, calls: 1, resolution: "720p", reference_video: false } },
    { label: "1080p / 8s", facts: { seconds: 8, calls: 1, resolution: "1080p", reference_video: false } },
  ],
};

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredText(value, name, max) {
  const result = text(value);
  if (!result || result.length > max) throw new Error(name + " must be a non-empty string of at most " + max + " characters");
  return result;
}

function assetIds(value, name) {
  if (!Array.isArray(value)) throw new Error(name + " must be an array of uploaded Canvas asset IDs");
  return value.map(function (id) {
    const result = requiredText(id, name, 128);
    if (/^(https?:|data:|\/)/i.test(result)) throw new Error(name + " requires Canvas asset IDs, not URLs");
    return result;
  });
}

function references(value, named) {
  if (value === undefined) return {};
  if (!object(value)) throw new Error("references must be an object");
  const result = {};
  for (const name of Object.keys(value)) {
    if (!named && !["image", "video", "audio"].includes(name)) throw new Error("unsupported reference kind: " + name);
    result[name] = assetIds(value[name], "references." + name);
  }
  return result;
}

function normalizeInput(req, model) {
  if (!object(req)) throw new Error("request must be an object");
  const metadata = req.metadata === undefined ? {} : req.metadata;
  if (!object(metadata)) throw new Error("metadata must be an object");
  const suppliedParams = req.params === undefined ? metadata.params : req.params;
  if (suppliedParams !== undefined && !object(suppliedParams)) throw new Error("params must be an object");
  const params = Object.assign({}, suppliedParams || {});
  for (const name of Object.keys(params)) {
    const value = params[name];
    if (!["string", "number", "boolean"].includes(typeof value) && !(Array.isArray(value) && value.every(function (item) { return typeof item === "string"; })))
      throw new Error("unsupported params value: " + name);
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("invalid number in params: " + name);
  }
  for (const name of ["aspectRatio", "duration", "resolution"]) {
    if (req[name] !== undefined) params[name] = req[name];
    else if (metadata[name] !== undefined) params[name] = metadata[name];
  }
  if (req.seconds !== undefined) params.duration = Number(req.seconds);
  if (params.duration === undefined) params.duration = 4;
  params.duration = Number(params.duration);
  if (!Number.isFinite(params.duration) || params.duration <= 0 || params.duration > 3600) throw new Error("duration must be between 1 and 3600 seconds");
  if (params.resolution === undefined) params.resolution = "720p";
  params.resolution = requiredText(params.resolution, "resolution", 32).toLowerCase();
  if (!["480p", "720p", "1080p"].includes(params.resolution)) throw new Error("unsupported resolution; configured Seedance 2.5 prices cover 480p, 720p and 1080p");
  if (params.aspectRatio === undefined) params.aspectRatio = "16:9";
  params.aspectRatio = requiredText(params.aspectRatio, "aspectRatio", 32);
  const input = {
    modelId: requiredText(model || req.model || req.modelId, "model", 128),
    prompt: requiredText(req.prompt, "prompt", 20000),
    params: params,
    references: references(req.references === undefined ? metadata.references : req.references, false),
  };
  const fields = req.referenceFields === undefined ? metadata.referenceFields : req.referenceFields;
  if (fields !== undefined) input.referenceFields = references(fields, true);
  // The upload lifecycle is separate; never silently drop a client's reference.
  if (req.image || req.images || req.input_reference || metadata.content)
    throw new Error("use references or referenceFields with pre-uploaded Canvas asset IDs");
  return input;
}

function hasReference(input) {
  return [input.references, input.referenceFields || {}].some(function (group) {
    return Object.keys(group).some(function (name) { return group[name].length > 0; });
  });
}

function intent(req, model) {
  const input = normalizeInput(req, model);
  return { kind: "submit", model: input.modelId, action: hasReference(input) ? "image_to_video" : "text_to_video", requestBody: input };
}

function baseUrl(ctx) {
  return requiredText(ctx.baseUrl, "baseUrl", 2048).replace(/\/+$/, "");
}

function headers(ctx) {
  const token = requiredText(ctx.apiKey || ctx.authHeader, "apiKey", 4096);
  const auth = /^Bearer\s+/i.test(token) ? token : "Bearer " + token;
  return { "Content-Type": "application/json", Accept: "application/json", Authorization: auth };
}

function dataOf(body) {
  return object(body) && body.code === "OK" && object(body.data) ? body.data : null;
}

function upstreamError(body) {
  const code = object(body) ? text(body.code) : "";
  const message = object(body) ? text(body.message) : "";
  return "Canvas " + (code || "invalid_response") + (message ? ": " + message : "");
}

function stateOf(ctx) {
  const state = ctx.state;
  if (!object(state) || state.version !== 1 || !["submit", "poll"].includes(state.phase)) throw new Error("invalid Canvas workflow state");
  if (!object(state.input) || !text(state.quoteId) || !text(state.requestId)) throw new Error("incomplete Canvas submission state");
  if (state.phase === "poll" && !text(state.upstreamTaskId)) throw new Error("missing Canvas task ID");
  return state;
}

export function buildSubmitRequest(ctx) {
  const input = normalizeInput(ctx.requestBody, ctx.upstreamModel || ctx.model);
  return { url: baseUrl(ctx) + "/quotes", method: "POST", headers: headers(ctx), body: input,
    action: hasReference(input) ? "image_to_video" : "text_to_video", rewriteModel: input.modelId };
}

export function parseSubmitResponse(ctx, response) {
  const quote = dataOf(response.body);
  if (!quote || !text(quote.id)) throw new Error(upstreamError(response.body));
  const input = normalizeInput(ctx.requestBody, ctx.upstreamModel || ctx.model);
  if (quote.modelId !== input.modelId) throw new Error("Canvas quote model does not match the requested model");
  const expires = Date.parse(quote.expiresAt);
  if (!Number.isFinite(expires) || expires <= utils.unixNow() * 1000) throw new Error("Canvas quote has expired");
  const publicId = requiredText(ctx.publicTaskId, "publicTaskId", 128);
  // No generation has run at this point. The public workflow ID stays stable;
  // the provider's real generation ID is saved in private state after /generate.
  return {
    taskId: publicId,
    taskData: { status: "queued", processingStage: "quoted", amount: quote.amount, unit: quote.unit },
    state: { version: 1, phase: "submit", input: input, quoteId: quote.id, requestId: publicId, expiresAt: quote.expiresAt },
  };
}

export function buildQueryRequest(ctx) {
  const state = stateOf(ctx);
  if (state.phase === "submit") {
    // Persisted input, quote and request ID MUST remain unchanged on replay,
    // including after a timeout. Never re-quote an uncertain submission.
    return { url: baseUrl(ctx) + "/generate", method: "POST", headers: headers(ctx),
      body: { input: state.input, quoteId: state.quoteId, requestId: state.requestId } };
  }
  return { url: baseUrl(ctx) + "/query/" + encodeURIComponent(state.upstreamTaskId), method: "GET", headers: headers(ctx) };
}

function readyVideos(task) {
  return (Array.isArray(task.outputs) ? task.outputs : []).filter(function (output) {
    return object(output) && output.kind === "video" && output.ingestStatus === "ready" && text(output.assetId);
  });
}

export function parseTaskResult(ctx, body, response) {
  const state = stateOf(ctx);
  const task = dataOf(body);
  if (!task || !text(task.id) || !text(task.status)) {
    const status = response && Number(response.status);
    if (status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status))
      return { status: "FAILURE", progress: "100%", reason: upstreamError(body) };
    throw new Error(upstreamError(body));
  }
  if (task.modelId && task.modelId !== state.input.modelId) throw new Error("Canvas task model does not match workflow");
  if (state.phase === "poll" && task.id !== state.upstreamTaskId) throw new Error("Canvas returned a different task ID");
  const next = Object.assign({}, state, { phase: "poll", upstreamTaskId: task.id });
  const result = { status: "IN_PROGRESS", progress: "50%", state: next };
  if (["queued", "submitting"].includes(task.status)) {
    result.status = "QUEUED";
    result.progress = "15%";
  } else if (["submission_unknown", "processing", "resubmitting"].includes(task.status)) {
    result.progress = "50%";
  } else if (task.status === "success") {
    // Successful generation, captured funds and a saved, downloadable video
    // are independent conditions in Canvas. Wait until all are available.
    if (task.billingStatus === "captured" && ["ready", "partial"].includes(task.ingestStatus) && readyVideos(task).length) {
      result.status = "SUCCESS";
      result.progress = "100%";
    } else result.progress = "90%";
  } else if (["failed", "refunded"].includes(task.status)) {
    if (["not_started", "released", "refunded"].includes(task.billingStatus)) {
      result.status = "FAILURE";
      result.progress = "100%";
      result.reason = text(task.error) || "Canvas generation " + task.status;
    }
    // A reserved/captured/reconcile_required charge needs reconciliation;
    // don't declare a refund while the provider's charge is uncertain.
  } else return { status: "UNKNOWN", reason: "unrecognized Canvas status: " + task.status };
  return result;
}

export function extractUsage(ctx) {
  if (ctx.usagePurpose === "billing_ratios") return null;
  const input = normalizeInput(ctx.requestBody, ctx.upstreamModel || ctx.model);
  return { seconds: input.params.duration, calls: 1, resolution: input.params.resolution,
    reference_video: (input.references.video || []).length > 0 || Object.keys(input.referenceFields || {}).some(function (key) { return key.toLowerCase().includes("video") && input.referenceFields[key].length > 0; }) };
}

export function extractUsageOnComplete(_ctx, _result, body) {
  const task = dataOf(body);
  if (!task || task.status !== "success") return {};
  const facts = {};
  const seconds = Number(task.params && task.params.duration);
  if (Number.isFinite(seconds) && seconds > 0 && seconds <= 3600) facts.seconds = seconds;
  // Do not treat Canvas's decimal amount or unit as USD or as Ark tokens.
  return facts;
}

function taskData(task) {
  let data = task.data;
  if (object(data) && object(data.data) && data.data.task_id && Object.prototype.hasOwnProperty.call(data.data, "data")) data = data.data.data;
  return dataOf(data) || (object(data) ? data : {});
}

export function listArtifacts(task) {
  if (task.status !== "SUCCESS") return [];
  return readyVideos(taskData(task)).map(function (_output, index) {
    return { key: index === 0 ? "video" : "video_" + index, type: "video" };
  });
}

export function buildContentRequest(ctx) {
  const key = ctx.artifactKey;
  if (key !== "video" && !/^video_[1-9][0-9]*$/.test(key)) throw new Error("artifact_not_found");
  const index = key === "video" ? 0 : Number(key.slice(6));
  const output = readyVideos(taskData(ctx))[index];
  if (!output) throw new Error("artifact_not_found");
  return { url: baseUrl(ctx) + "/assets/" + encodeURIComponent(output.assetId) + "/content",
    method: ctx.clientRequest.method, headers: { Authorization: headers(ctx).Authorization } };
}

function renderTask(task) {
  const data = taskData(task);
  const statuses = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "in_progress", SUCCESS: "completed", FAILURE: "failed" };
  const result = { id: task.task_id, object: "video", model: task.properties ? task.properties.origin_model_name || "" : "",
    status: statuses[task.status] || "unknown", progress: Number(String(task.progress || "0").replace("%", "")),
    created_at: task.created_at || 0, completed_at: task.status === "SUCCESS" || task.status === "FAILURE" ? task.updated_at || 0 : null };
  for (const key of ["billingStatus", "ingestStatus", "processingStage", "amount", "unit"]) {
    if (data[key] !== undefined) result[key] = data[key];
  }
  if (task.status === "FAILURE") result.error = { message: task.fail_reason || text(data.error) || "Canvas task failed" };
  return result;
}

export const native = {
  createVideo: function (ctx) {
    if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
    return intent(ctx.body.value);
  },
  taskStatus: function (_ctx, task) { return renderTask(task); },
  error: function (_ctx, error) { return { error: { code: error.code, message: error.message } }; },
};

export const protocols = {
  openai_video: {
    decodeRequest: function (ctx) {
      if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required; use pre-uploaded Canvas asset IDs for references");
      return intent(ctx.body.value, ctx.model);
    },
    render: function (_ctx, task) { return renderTask(task); },
  },
};
