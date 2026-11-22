export const meta = {
  apiVersion: 1,
  key: "tmlab",
  name: "TMLab Video & Image",
  icon: "text:TM",
  version: "1.0.9",
  author: {name: "QuantumNous"},
  description: {
    en: "TMLab video generation with request-time reference asset import",
    zh: "TMLab 视频生成，支持请求期导入参考素材",
  },
  models: ["tmlab-video","flashvsr-v2","google-omni","grok-imagine-1.5","happy-horse-1.1-official-a","kling-4.0-official-a","ltx-2.3-lipsync","minimax-h3-2k-channel-l","minimax-h3-channel-n","minimax-h3-max-official-a","seedance-2.0-activity-official-a","seedance-2.0-channel-t","seedance-2.0-channel-w","seedance-2.0-fast-channel-l2","seedance-2.0-fast-channel-w","seedance-2.0-fast-official-a","seedance-2.0-fast-official-b","seedance-2.0-mini-channel-p1","seedance-2.0-mini-channel-p2","seedance-2.0-mini-official-a","seedance-2.0-official-a","seedance-2.5-channel-v2","seedance-2.5-official-a","seedance-2.5-official-b","seedvr2-3b-fp16","seedvr2-video","sora-2","video-depth-conversion","vidu-q3","wan-3.0-channel-l","wan-3.0-official-a","wan-3.0-prime-official-a","gpt-image-2-channel-d","gpt-image-2-channel-x","gpt-image-2-official-a","gpt-image-2-pro-official-a","gpt-image-2.5-channel-x","gpt-image-2.5-flare-official-a","gpt-image-2.5-sunburst-channel-x","gpt-image-2.5-sunburst-official-a","gpt-image-2.5-sunburst-official-b","grok-imagine","midjourney-niji-7","midjourney-v7","midjourney-v8.2","nano-banana-2-channel-a","nano-banana-2-official-a","nano-banana-2.1-channel-a","nano-banana-pro-channel-c","nano-banana-pro-official-a","seedream-5.0-pro-official-a","seedvr2-image","kling-4.0-flash-official-a","tmlab-minimax-h3","seedance-2.0-channel-hm","seedance-2.0-channel-mc","seedance-2.5-channel-968","seedance-2.5-channel-hm","seedance-2.5-channel-mc","seedance-2.5-flash-channel-hm","seedance-2.5-flash-official-a"],
  fetchMode: "batch",
  requiredCapabilities: ["asset-import@1", "submit-status@1"],
  routes: [
    {method: "POST", path: "/tmlab/v1/videos/generations", type: "submit", decode: "createVideo", render: "taskCreated"},
    {method: "POST", path: "/tmlab/v1/images/generations", type: "submit", decode: "createImage", render: "taskCreated"},
    {method: "POST", path: "/tmlab/v1/tasks/query", type: "dynamic", decode: "queryTasks", render: "tasksStatus"},
  ],
  protocols: [{name: "openai_responses", supports: ["stream", "sync", "background"]}, {name: "openai_video", models: ["flashvsr-v2","google-omni","grok-imagine-1.5","happy-horse-1.1-official-a","kling-4.0-official-a","ltx-2.3-lipsync","minimax-h3-2k-channel-l","minimax-h3-channel-n","minimax-h3-max-official-a","seedance-2.0-activity-official-a","seedance-2.0-channel-t","seedance-2.0-channel-w","seedance-2.0-fast-channel-l2","seedance-2.0-fast-channel-w","seedance-2.0-fast-official-a","seedance-2.0-fast-official-b","seedance-2.0-mini-channel-p1","seedance-2.0-mini-channel-p2","seedance-2.0-mini-official-a","seedance-2.0-official-a","seedance-2.5-channel-v2","seedance-2.5-official-a","seedance-2.5-official-b","seedvr2-3b-fp16","seedvr2-video","sora-2","video-depth-conversion","vidu-q3","wan-3.0-channel-l","wan-3.0-official-a","wan-3.0-prime-official-a","kling-4.0-flash-official-a","tmlab-minimax-h3","seedance-2.0-channel-hm","seedance-2.0-channel-mc","seedance-2.5-channel-968","seedance-2.5-channel-hm","seedance-2.5-channel-mc","seedance-2.5-flash-channel-hm","seedance-2.5-flash-official-a"]}],
  usageSchema: {
    seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}},
    calls: {type: "number", unit: "count", unitLabel: {en: "video", zh: "个视频"}, description: {en: "Generated video count", zh: "生成视频数量"}},
    resolution: {enum: ["480p", "720p", "1080p"], description: {en: "Output resolution", zh: "输出分辨率"}},
  },
  usageExamples: [{label: "720p / 5s", facts: {seconds: 5, calls: 1, resolution: "720p"}}],
  usageProfiles: [
  {models: ["seedvr2-video"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["1080P","2K","4K"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["seedance-2.0-channel-t"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["1080p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["google-omni"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["1280x720","720x1280"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["tmlab-minimax-h3","minimax-h3-2k-channel-l"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["2K"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["seedance-2.5-channel-v2","seedance-2.5-flash-channel-hm","seedance-2.0-fast-channel-w","seedance-2.0-mini-channel-p1","seedance-2.0-mini-channel-p2"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["480p","720p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["seedance-2.5-channel-hm","seedance-2.0-channel-hm"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["480p","720p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["seedance-2.5-channel-mc","seedance-2.5-channel-968","seedance-2.0-channel-mc","wan-3.0-official-a","wan-3.0-prime-official-a"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["480p","720p","1080p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["seedance-2.5-official-a","seedance-2.5-flash-official-a","seedance-2.0-official-a","seedance-2.0-fast-official-a","seedance-2.0-fast-official-b","seedance-2.0-mini-official-a"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["480p","720p_upscaled","720p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["minimax-h3-max-official-a"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["480p","768p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["seedance-2.5-official-b","kling-4.0-flash-official-a","minimax-h3-channel-n"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["720p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},
  {models: ["kling-4.0-official-a","wan-3.0-channel-l","happy-horse-1.1-official-a"], schema: {seconds: {type: "number", unit: "second", description: {en: "Requested video duration", zh: "请求视频时长"}}, calls: {type: "number", unit: "count", description: {en: "Requested video duration", zh: "请求视频时长"}}, resolution: {enum: ["720p","1080p"], description: {en: "Output resolution", zh: "输出分辨率"}}}},  ],
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

const VIDEO_MODEL_META = {
  "flashvsr-v2": {resField: "target_resolution", resolutions: ["1080P","2K","4K"], defaultResolution: "1080P", duration: false, defaultDuration: null},
  "google-omni": {resField: "resolution", resolutions: ["1280x720","720x1280"], defaultResolution: "1280x720", duration: true, defaultDuration: 4},
  "grok-imagine-1.5": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "480p", duration: true, defaultDuration: 6},
  "happy-horse-1.1-official-a": {resField: "resolution", resolutions: ["720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 5},
  "kling-4.0-official-a": {resField: "resolution", resolutions: ["720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 5},
  "kling-4.0-flash-official-a": {resField: "resolution", resolutions: ["720p"], defaultResolution: "720p", duration: true, defaultDuration: 5},
  "ltx-2.3-lipsync": {resField: null, resolutions: null, defaultResolution: null, duration: true, defaultDuration: 8},
  "minimax-h3-2k-channel-l": {resField: "resolution", resolutions: ["2K"], defaultResolution: "2K", duration: true, defaultDuration: 15},
  "minimax-h3-channel-n": {resField: "resolution", resolutions: ["720p"], defaultResolution: "720p", duration: true, defaultDuration: 5},
  "minimax-h3-max-official-a": {resField: "resolution", resolutions: ["480p","768p"], defaultResolution: "480p", duration: true, defaultDuration: 5},
  "tmlab-minimax-h3": {resField: "resolution", resolutions: ["2K"], defaultResolution: "2K", duration: true, defaultDuration: 15},
  "seedance-2.0-activity-official-a": {resField: "resolution", resolutions: ["720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.0-channel-t": {resField: "resolution", resolutions: ["1080p"], defaultResolution: "1080p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.0-channel-hm": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.0-channel-mc": {resField: "resolution", resolutions: ["480p","720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.0-channel-w": {resField: "resolution", resolutions: ["720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.0-fast-channel-l2": {resField: "resolution", resolutions: ["720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.0-fast-channel-w": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.0-fast-official-a": {resField: "resolution", resolutions: ["480p","720p_upscaled","720p"], defaultResolution: "480p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.0-fast-official-b": {resField: "resolution", resolutions: ["480p","720p_upscaled","720p"], defaultResolution: "480p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.0-mini-channel-p1": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "480p", duration: true, defaultDuration: 15, audioField: "generate_audio"},
  "seedance-2.0-mini-channel-p2": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "480p", duration: true, defaultDuration: 15, audioField: "generate_audio"},
  "seedance-2.0-mini-official-a": {resField: "resolution", resolutions: ["480p","720p_upscaled","720p"], defaultResolution: "480p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.0-official-a": {resField: "resolution", resolutions: ["480p","720p_upscaled","720p"], defaultResolution: "480p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.5-channel-v2": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "720p", duration: true, defaultDuration: 30},
  "seedance-2.5-channel-968": {resField: "resolution", resolutions: ["480p","720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.5-channel-hm": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.5-channel-mc": {resField: "resolution", resolutions: ["480p","720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.5-flash-channel-hm": {resField: "resolution", resolutions: ["480p","720p"], defaultResolution: "720p", duration: true, defaultDuration: 15},
  "seedance-2.5-flash-official-a": {resField: "resolution", resolutions: ["480p","720p_upscaled","720p"], defaultResolution: "480p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.5-official-a": {resField: "resolution", resolutions: ["480p","720p_upscaled","720p"], defaultResolution: "480p", duration: true, defaultDuration: 5, audioField: "enable_audio"},
  "seedance-2.5-official-b": {resField: "resolution", resolutions: ["720p"], defaultResolution: "720p", duration: true, defaultDuration: 10},
  "seedvr2-3b-fp16": {resField: "target_resolution", resolutions: ["1080P","2K","4K"], defaultResolution: "1080P", duration: false, defaultDuration: null},
  "seedvr2-video": {resField: "target_resolution", resolutions: ["1080P","2K","4K"], defaultResolution: "1080P", duration: false, defaultDuration: null},
  "sora-2": {resField: null, resolutions: null, defaultResolution: null, duration: true, defaultDuration: 4},
  "video-depth-conversion": {resField: null, resolutions: null, defaultResolution: null, duration: false, defaultDuration: null},
  "vidu-q3": {resField: "resolution", resolutions: ["540p","720p","1080p"], defaultResolution: "540p", duration: true, defaultDuration: 5},
  "wan-3.0-channel-l": {resField: "resolution", resolutions: ["720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 5},
  "wan-3.0-official-a": {resField: "resolution", resolutions: ["480p","720p","1080p"], defaultResolution: "480p", duration: true, defaultDuration: 5},
  "wan-3.0-prime-official-a": {resField: "resolution", resolutions: ["480p","720p","1080p"], defaultResolution: "720p", duration: true, defaultDuration: 5}
};
const DEFAULT_VIDEO_MODEL_META = {resField: "resolution", resolutions: ["480p", "720p", "1080p"], defaultResolution: "720p", duration: true, defaultDuration: 5};
const REQUEST_RESERVED_FIELDS = ["model", "prompt", "seconds", "duration", "metadata", "references", "params"];

// 上游对未知字段零容忍：请求体带 schema 之外的字段会被 202 受理后静默丢弃任务（查询返回 not_found）。
// 只转发上游声明的字段；画布侧的 mode/size/resolution_name/watermark 等展示层参数在此丢弃。
const UPSTREAM_VIDEO_FIELDS = ["prompt", "duration_sec", "resolution", "target_resolution", "aspect_ratio", "enable_audio", "generate_audio", "input_images", "input_audios", "input_videos", "title"];
const UPSTREAM_IMAGE_FIELDS = ["prompt", "resolution", "aspect_ratio", "quality", "effort", "thinking_level", "input_images", "input_image", "count", "chaos", "personalisation", "stylize", "weird"];

const IMAGE_MODEL_META = {
  "gpt-image-2-channel-d": {resolutions: null, defaultResolution: null, quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2-channel-x": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2-official-a": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2-pro-official-a": {resolutions: ["2K","4K"], defaultResolution: "2K", quality: ["medium","ultra"], defaultQuality: "medium", effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2.5-channel-x": {resolutions: ["1K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2.5-flare-official-a": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2.5-sunburst-channel-x": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2.5-sunburst-official-a": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "gpt-image-2.5-sunburst-official-b": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: ["low","medium","high","xhigh","max"], defaultEffort: "low", thinking: null, defaultThinking: null, singleInput: false},
  "grok-imagine": {resolutions: null, defaultResolution: null, quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "midjourney-niji-7": {resolutions: null, defaultResolution: null, quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "midjourney-v7": {resolutions: null, defaultResolution: null, quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "midjourney-v8.2": {resolutions: null, defaultResolution: null, quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "nano-banana-2-channel-a": {resolutions: ["1K","2K","4K"], defaultResolution: "2K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "nano-banana-2-official-a": {resolutions: ["1K","2K","4K"], defaultResolution: "2K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: ["minimal","default","high"], defaultThinking: "default", singleInput: false},
  "nano-banana-2.1-channel-a": {resolutions: ["1K","2K","4K"], defaultResolution: "2K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "nano-banana-pro-channel-c": {resolutions: ["1K","2K","4K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "nano-banana-pro-official-a": {resolutions: ["1K","2K","4K"], defaultResolution: "2K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "seedream-5.0-pro-official-a": {resolutions: ["1K","2K"], defaultResolution: "1K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: false},
  "seedvr2-image": {resolutions: ["2K","4K"], defaultResolution: "2K", quality: null, defaultQuality: null, effort: null, defaultEffort: null, thinking: null, defaultThinking: null, singleInput: true}
};

function requestEnumValue(req, metadata, params, field, allowed, fallback) {
  if (!Array.isArray(allowed) || !allowed.length) return null;
  const raw = text(req[field]) || text(params[field]) || text(metadata[field]) || "";
  if (!raw) return fallback || allowed[0];
  const folded = raw.toLowerCase();
  for (const value of allowed) if (value.toLowerCase() === folded) return value;
  throw new Error("unsupported " + field + ": " + raw);
}

function requestResolution(req, metadata, params, meta) {
  if (!meta || !meta.resField || !Array.isArray(meta.resolutions) || !meta.resolutions.length) return null;
  const field = meta.resField;
  const raw = text(req[field]) || text(params[field]) || text(metadata[field]) || "";
  if (!raw) return meta.defaultResolution || meta.resolutions[meta.resolutions.length - 1];
  const folded = raw.toLowerCase();
  for (const value of meta.resolutions) if (value.toLowerCase() === folded) return value;
  throw new Error("unsupported " + field + ": " + raw);
}

function normalizedRequest(req, model) {
  if (!object(req)) throw new Error("request must be an object");
  const meta = VIDEO_MODEL_META[model] || DEFAULT_VIDEO_MODEL_META;
  const prompt = text(req.prompt);
  const metadata = object(req.metadata) ? req.metadata : {};
  const params = object(req.params) ? req.params : object(metadata.params) ? metadata.params : {};
  const references = Array.isArray(req.references) ? req.references : Array.isArray(metadata.references) ? metadata.references : [];
  const merged = Object.assign({}, params);
  for (const name of Object.keys(req)) {
    if (REQUEST_RESERVED_FIELDS.indexOf(name) >= 0) continue;
    merged[name] = req[name];
  }
  const resolution = requestResolution(req, metadata, params, meta);
  if (resolution !== null) merged[meta.resField] = resolution;
  let seconds = null;
  if (meta.duration) {
    const raw = req.seconds !== undefined ? req.seconds : req.duration !== undefined ? req.duration : req.duration_sec !== undefined ? req.duration_sec : merged.duration_sec;
    seconds = Number(raw === undefined ? meta.defaultDuration : raw);
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error("seconds must be between 1 and 3600");
    merged.duration_sec = seconds;
  } else if (merged.duration_sec !== undefined) {
    delete merged.duration_sec;
  }
  // 音频开关按模型声明翻译：声明 enable_audio/generate_audio 的模型才发送对应布尔字段，
  // 且 fast-official-b 类只接受 true 的模型由枚举约束；未声明音频能力的模型一律不发。
  const rawAudio = merged[meta.audioField] !== undefined ? merged[meta.audioField] : merged.enable_audio !== undefined ? merged.enable_audio : merged.generate_audio !== undefined ? merged.generate_audio : req.generate_audio;
  delete merged.enable_audio;
  delete merged.generate_audio;
  if (meta.audioField && rawAudio !== undefined) merged[meta.audioField] = rawAudio === true || rawAudio === "true";
  delete merged.watermark;
  delete merged.mode;
  delete merged.size;
  delete merged.resolution_name;
  // 白名单：丢弃上游 schema 未声明的其余字段，避免任务被静默丢弃。
  for (const name of Object.keys(merged)) {
    if (UPSTREAM_VIDEO_FIELDS.indexOf(name) >= 0 || name === meta.resField) continue;
    delete merged[name];
  }
  return {
    model: model,
    prompt: prompt,
    params: merged,
    references: references,
    seconds: seconds,
    metadata: {references: references},
  };
}

function normalizedImageRequest(req, model) {
  if (!object(req)) throw new Error("request must be an object");
  const meta = IMAGE_MODEL_META[model] || {};
  const prompt = text(req.prompt);
  if (!prompt && !meta.singleInput) throw new Error("prompt is required");
  const metadata = object(req.metadata) ? req.metadata : {};
  const params = object(req.params) ? req.params : object(metadata.params) ? metadata.params : {};
  const references = Array.isArray(req.references) ? req.references : Array.isArray(metadata.references) ? metadata.references : [];
  const merged = Object.assign({}, params);
  for (const name of Object.keys(req)) {
    if (REQUEST_RESERVED_FIELDS.indexOf(name) >= 0) continue;
    merged[name] = req[name];
  }
  const resolution = requestEnumValue(req, metadata, merged, "resolution", meta.resolutions, meta.defaultResolution);
  if (resolution !== null) merged.resolution = resolution;
  const quality = requestEnumValue(req, metadata, merged, "quality", meta.quality, meta.defaultQuality);
  if (quality !== null) merged.quality = quality;
  const effort = requestEnumValue(req, metadata, merged, "effort", meta.effort, meta.defaultEffort);
  if (effort !== null) merged.effort = effort;
  const thinking = requestEnumValue(req, metadata, merged, "thinking_level", meta.thinking, meta.defaultThinking);
  if (thinking !== null) merged.thinking_level = thinking;
  if (merged.duration_sec !== undefined) delete merged.duration_sec;
  delete merged.generate_audio;
  delete merged.watermark;
  delete merged.mode;
  delete merged.size;
  delete merged.resolution_name;
  delete merged.seconds;
  // 白名单：图片上游同样只接收 schema 声明的字段。
  for (const name of Object.keys(merged)) {
    if (UPSTREAM_IMAGE_FIELDS.indexOf(name) >= 0) continue;
    delete merged[name];
  }
  return {model: model, prompt: prompt, params: merged, references: references, seconds: null, metadata: {references: references}};
}

function inputName(kind) {
  if (kind === "image") return "input_images";
  if (kind === "audio") return "input_audios";
  if (kind === "video") return "input_videos";
  throw new Error("unsupported reference kind: " + kind);
}

function generationBody(ctx) {
  const req = object(ctx.requestBody) ? ctx.requestBody : {};
  const model = text(ctx.upstreamModel) || text(ctx.model);
  const imageMeta = IMAGE_MODEL_META[model];
  const normalized = imageMeta ? normalizedImageRequest(req, model) : normalizedRequest(req, model);
  const body = Object.assign({model: normalized.model, prompt: normalized.prompt}, normalized.params);
  if (!imageMeta && normalized.seconds !== null && normalized.seconds !== undefined) body.duration_sec = normalized.seconds;
  for (const reference of Array.isArray(ctx.resolvedReferences) ? ctx.resolvedReferences : []) {
    if (!object(reference) || !text(reference.providerAssetId)) throw new Error("reference asset was not imported");
    if (imageMeta && imageMeta.singleInput) {
      body.input_image = reference.providerAssetId;
      continue;
    }
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
  const model = text(ctx.upstreamModel) || text(ctx.model);
  const isImage = !!IMAGE_MODEL_META[model];
  const hasReferences = (ctx.resolvedReferences || []).length > 0 || text(body.input_image) !== "" || (Array.isArray(body.input_images) && body.input_images.length > 0);
  return {
    url: baseUrl(ctx) + (isImage ? "/v1/images/generations" : "/v1/videos/generations"),
    method: "POST",
    headers: resultHeaders,
    body: body,
    action: isImage ? (hasReferences ? "image_to_image" : "text_to_image") : (hasReferences ? "image_to_video" : "text_to_video"),
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
  const model = text(ctx.upstreamModel) || text(ctx.model);
  const params = object(req.params) ? req.params : {};
  const metadata = object(req.metadata) ? req.metadata : {};
  const imageMeta = IMAGE_MODEL_META[model];
  if (imageMeta) {
    const facts = {calls: 1};
    const resolution = requestEnumValue(req, metadata, params, "resolution", imageMeta.resolutions, imageMeta.defaultResolution);
    if (resolution !== null) facts.resolution = resolution;
    const quality = requestEnumValue(req, metadata, params, "quality", imageMeta.quality, imageMeta.defaultQuality);
    if (quality !== null) facts.quality = quality;
    const effort = requestEnumValue(req, metadata, params, "effort", imageMeta.effort, imageMeta.defaultEffort);
    if (effort !== null) facts.effort = effort;
    const thinking = requestEnumValue(req, metadata, params, "thinking_level", imageMeta.thinking, imageMeta.defaultThinking);
    if (thinking !== null) facts.thinking_level = thinking;
    return facts;
  }
  if (IMAGE_MODEL_META[model]) return {calls: 1};
  const meta = VIDEO_MODEL_META[model] || DEFAULT_VIDEO_MODEL_META;
  const facts = {calls: 1};
  if (meta.duration) {
    const seconds = Number(req.seconds);
    facts.seconds = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) : (meta.defaultDuration || 5);
  }
  const resolution = requestResolution(req, metadata, params, meta);
  if (resolution !== null) facts.resolution = resolution;
  return facts;
}

export function extractUsageOnComplete(task, _result, body) {
  const source = object(body) ? body : {};
  const props = object(task && task.properties) ? task.properties : {};
  const model = text(props.upstream_model_name) || text(props.origin_model_name);
  const meta = VIDEO_MODEL_META[model] || DEFAULT_VIDEO_MODEL_META;
  const facts = {calls: 1};
  if (meta.duration) {
    const seconds = Number(source.duration_sec || source.duration);
    if (Number.isFinite(seconds) && seconds > 0) facts.seconds = seconds;
  }
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
  const props = object(task.properties) ? task.properties : {};
  const model = text(props.upstream_model_name) || text(props.origin_model_name);
  const kind = IMAGE_MODEL_META[model] ? "image" : "video";
  return files.slice(0, 64).map(function (_id, index) {
    return {key: index === 0 ? kind : kind + "_" + index, type: kind};
  });
}

export function buildContentRequest(ctx) {
  const data = object(ctx.data) ? ctx.data : {};
  const files = object(data.output) && Array.isArray(data.output.file_ids) ? data.output.file_ids : [];
  const props = object(data.properties) ? data.properties : {};
  const model = text(ctx.upstreamModel) || text(ctx.model) || text(props.upstream_model_name) || text(props.origin_model_name);
  const kind = IMAGE_MODEL_META[model] ? "image" : "video";
  const suffix = ctx.artifactKey.slice(kind.length + 1);
  const index = ctx.artifactKey === kind ? 0 : ctx.artifactKey.startsWith(kind + "_") && /^d+$/.test(suffix) && Number(suffix) > 0 ? Number(suffix) : -1;
  const fileId = files[index];
  if (!text(fileId)) throw new Error("artifact_not_found");
  return {url: baseUrl(ctx) + "/v1/files/" + encodeURIComponent(fileId), method: ctx.clientRequest.method, headers: {Authorization: headers(ctx).Authorization}, crossOriginRedirect: "strip"};
}

function taskView(task) {
  const data = object(task.data) ? task.data : {};
  const normalized = normalizeStatus(data.status);
  return {
    id: task.task_id,
    object: IMAGE_MODEL_META[task.properties && (task.properties.upstream_model_name || task.properties.origin_model_name)] ? "image" : "video",
    model: task.properties ? task.properties.origin_model_name || "" : "",
    status: normalized.status === "SUCCESS" ? "completed" : normalized.status === "FAILURE" ? "failed" : normalized.status === "IN_PROGRESS" ? "in_progress" : "queued",
    created_at: task.created_at || 0,
    output: data.output || undefined,
  };
}

export const native = {
  createImage: function (ctx) {
    if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
    const req = object(ctx.body.value) ? ctx.body.value : {};
    const model = ctx.model || text(req.model);
    const metadata = object(req.metadata) ? req.metadata : {};
    const references = Array.isArray(metadata.references) ? metadata.references : [];
    return {kind: "submit", model: model, action: references.length ? "image_to_image" : "text_to_image", requestBody: normalizedImageRequest(req, model)};
  },
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

function imageText(ctx) {
  const artifact = ctx.artifacts && ctx.artifacts.image;
  const url = text(artifact && artifact.url);
  if (!url) throw new Error("image artifact is unavailable");
  return "![image](" + url.replace(/\(/g, "%28").replace(/\)/g, "%29") + ")";
}

function mediaText(ctx) {
  return IMAGE_MODEL_META[text(ctx.upstreamModel) || text(ctx.model)] ? imageText(ctx) : videoText(ctx);
}

export const protocols = {
  openai_responses: {
    decodeRequest: function (ctx) {
      if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
      const req = object(ctx.body.value) ? ctx.body.value : {};
      const isImage = !!IMAGE_MODEL_META[ctx.model];
      const hasImages = (Array.isArray(req.input_images) && req.input_images.length > 0) || text(req.input_image) !== "";
      return {kind: "submit", model: ctx.model, action: isImage ? (hasImages ? "image_to_image" : "text_to_image") : "text_to_video", requestBody: isImage ? normalizedImageRequest(req, ctx.model) : normalizedRequest(req, ctx.model)};
    },
    renderEvents: function (_ctx, task, previousState) {
      const status = String(task.status || "UNKNOWN").toUpperCase();
      const state = {status: status};
      if (status === "SUCCESS") return {events: previousState && previousState.status === status ? [] : [{type: "output", data: mediaText(_ctx)}], state: state, done: true};
      if (status === "FAILURE") return {events: [{type: "error", code: "task_failed", message: task.fail_reason || "task failed"}], state: state, done: true};
      return {events: [], state: state, done: false};
    },
    renderFinal: function (ctx) {
      return {output: [{type: "message", status: "completed", role: "assistant", content: [{type: "output_text", text: mediaText(ctx)}]}], metadata: {vendor: "tmlab"}};
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
