export const meta = {
  apiVersion: 1, key: "vera", name: "VÉRA Video", icon: "text:VE", version: "1.0.0",
  author: {name: "QuantumNous"},
  description: {en: "VÉRA video generation with request-time asset import and quotes", zh: "VÉRA 视频生成，支持请求期导入素材与报价"},
  models: ["sd2.5-qd", "seedance-2.5"], fetchMode: "per_task",
  requiredCapabilities: ["asset-import@1", "prepare@1", "submit-status@1"],
  routes: [
    {method: "POST", path: "/vera/api/v1/prot/generate", type: "submit", decode: "createVideo", render: "taskCreated"},
    {method: "GET", path: "/vera/api/v1/prot/query/:task_id", type: "query", render: "taskStatus"},
  ],
  protocols: [{name: "openai_responses", supports: ["stream", "sync", "background"]}, "openai_video"],
  usageSchema: {
    seconds: {type: "number", unit: "second", description: {en: "Requested duration", zh: "请求时长"}},
    calls: {type: "number", unit: "count", unitLabel: {en: "video", zh: "个视频"}, description: {en: "Generated video count", zh: "生成数量"}},
    resolution: {enum: ["480p", "720p", "1080p"], description: {en: "Output resolution", zh: "输出分辨率"}},
  },
  usageExamples: [{label: "720p / 4s", facts: {seconds: 4, calls: 1, resolution: "720p"}}],
};
function object(v) {return v !== null && typeof v === "object" && !Array.isArray(v);}
function text(v) {return typeof v === "string" ? v.trim() : "";}
function requiredText(v,n,m) {const s=text(v); if(!s||s.length>m) throw new Error(n+" must be a non-empty string of at most "+m+" characters"); return s;}
function auth(ctx) {const k=text(ctx.apiKey||ctx.authHeader); if(!k) throw new Error("apiKey is required"); return /^Bearer\s+/i.test(k)?k:"Bearer "+k;}
function base(ctx) {return requiredText(ctx.baseUrl,"baseUrl",2048).replace(/\/+$/,"");}
function jsonHeaders(ctx) {return {"Content-Type":"application/json",Accept:"application/json",Authorization:auth(ctx)};}
function normalizeInput(req,model) {
  if(!object(req)) throw new Error("request must be an object");
  const metadata=object(req.metadata)?req.metadata:{}; const supplied=req.params===undefined?metadata.params:req.params;
  if(supplied!==undefined&&!object(supplied)) throw new Error("params must be an object");
  const params=Object.assign({},supplied||{});
  for(const n of ["duration","resolution","aspectRatio"]) if(req[n]!==undefined) params[n]=req[n]; else if(metadata[n]!==undefined) params[n]=metadata[n];
  if(req.seconds!==undefined) params.duration=Number(req.seconds);
  if(params.duration===undefined) params.duration=4; params.duration=Number(params.duration);
  if(!Number.isFinite(params.duration)||params.duration<=0||params.duration>3600) throw new Error("duration must be between 1 and 3600");
  if(params.resolution===undefined) params.resolution="720p"; params.resolution=requiredText(params.resolution,"resolution",32).toLowerCase();
  if(!["480p","720p","1080p"].includes(params.resolution)) throw new Error("unsupported resolution");
  if(params.aspectRatio===undefined) params.aspectRatio="16:9"; params.aspectRatio=requiredText(params.aspectRatio,"aspectRatio",32);
  return {modelId:requiredText(model||req.model||req.modelId,"model",128),prompt:requiredText(req.prompt,"prompt",20000),params};
}
function references(ctx) {
  const result={image:[],video:[],audio:[]}, fields={};
  for(const ref of Array.isArray(ctx.resolvedReferences)?ctx.resolvedReferences:[]) {
    if(!object(ref)||!text(ref.providerAssetId)) throw new Error("reference asset was not imported");
    const id=ref.providerAssetId, role=text(ref.role), kind=ref.kind;
    if(role) {fields[role]=fields[role]||[]; fields[role].push(id);} else if(result[kind]) result[kind].push(id); else throw new Error("unsupported reference kind: "+kind);
  }
  if(Object.keys(fields).length) result.referenceFields=fields;
  return result;
}
function generationInput(ctx) {const input=normalizeInput(ctx.requestBody,ctx.upstreamModel||ctx.model); input.references=references(ctx); return input;}
function dataOf(body) {return object(body)&&body.code==="OK"&&object(body.data)?body.data:null;}
function upstreamError(body) {return "VÉRA "+(object(body)?text(body.code)||"invalid_response":"invalid_response")+(object(body)&&text(body.message)?": "+text(body.message):"");}
function readyVideos(data) {return (Array.isArray(data.outputs)?data.outputs:[]).filter(o=>object(o)&&o.kind==="video"&&o.ingestStatus==="ready"&&text(o.assetId));}
export const assets={buildImportRequest(ctx){return {url:base(ctx)+"/assets",method:"POST",headers:{Accept:"application/json",Authorization:auth(ctx)},bodyType:"multipart",parts:[{name:"file",fileRef:ctx.asset.fileRef,filename:ctx.asset.filename}]};},parseImportResponse(_c,r){const body=object(r.body)?r.body:{};const asset=dataOf(body);if(r.statusCode<200||r.statusCode>=300||!asset||!text(asset.id))return {outcome:"rejected",code:body.code||"VERA_UPLOAD_FAILED",message:body.message||"VÉRA asset upload failed"};return {outcome:"imported",providerAssetId:asset.id,providerMetadata:{kind:asset.kind,mimeType:asset.mimeType}};}};
export const prepare={buildRequest(ctx){return {url:base(ctx)+"/quotes",method:"POST",headers:jsonHeaders(ctx),body:generationInput(ctx)};},parseResponse(_c,r){const q=dataOf(object(r.body)?r.body:null);if(!q||!text(q.id))return {outcome:"rejected",code:"VERA_QUOTE_FAILED",message:upstreamError(r.body)};return {outcome:"prepared",state:{quoteId:q.id,expiresAt:q.expiresAt},quote:{amount:q.amount,unit:q.unit,expiresAt:q.expiresAt}};}};
export function buildSubmitRequest(ctx){return {url:base(ctx)+"/generate",method:"POST",headers:jsonHeaders(ctx),body:{input:generationInput(ctx),quoteId:ctx.prepareState.quoteId,requestId:ctx.publicTaskId},action:(ctx.resolvedReferences||[]).length?"image_to_video":"text_to_video",rewriteModel:generationInput(ctx).modelId};}
export function parseSubmitResponse(_c,r){const task=dataOf(object(r.body)?r.body:null);if(!task||!text(task.id))throw new Error(upstreamError(r.body));return {taskId:task.id,taskData:task};}
export function extractUsage(ctx){const input=normalizeInput(ctx.requestBody,ctx.upstreamModel||ctx.model);return {seconds:input.params.duration,calls:1,resolution:input.params.resolution};}
export function extractUsageOnComplete(_t,_r,body){const task=dataOf(body);if(!task)return {};const facts={calls:1};const s=Number(task.params&&task.params.duration);if(Number.isFinite(s)&&s>0)facts.seconds=s;return facts;}
export function buildQueryRequest(ctx){return {url:base(ctx)+"/query/"+encodeURIComponent(ctx.taskId),method:"GET",headers:jsonHeaders(ctx)};}
export function parseTaskResult(_c,body){const task=dataOf(body);if(!task||!text(task.id))return {status:"UNKNOWN",reason:upstreamError(body)};if(["queued","submitting"].includes(task.status))return {status:"QUEUED",progress:"15%"};if(["submission_unknown","processing","resubmitting"].includes(task.status))return {status:"IN_PROGRESS",progress:"50%"};if(task.status==="success"){if(task.billingStatus==="captured"&&readyVideos(task).length)return {status:"SUCCESS",progress:"100%"};return {status:"IN_PROGRESS",progress:"90%"};}if(["failed","refunded"].includes(task.status)){if(["not_started","released","refunded"].includes(task.billingStatus))return {status:"FAILURE",progress:"100%",reason:text(task.error)||"VÉRA generation failed"};}return {status:"UNKNOWN",reason:"unrecognized VÉRA status: "+task.status};}
export function listArtifacts(task){if(task.status!=="SUCCESS")return [];const d=object(task.data)?task.data:{};return readyVideos(d).slice(0,64).map((_v,i)=>({key:i===0?"video":"video_"+i,type:"video"}));}
export function buildContentRequest(ctx){const d=object(ctx.data)?ctx.data:{};const videos=readyVideos(d);const i=ctx.artifactKey==="video"?0:/^video_[1-9][0-9]*$/.test(ctx.artifactKey)?Number(ctx.artifactKey.slice(6)):-1;if(!videos[i])throw new Error("artifact_not_found");return {url:base(ctx)+"/assets/"+encodeURIComponent(videos[i].assetId)+"/content",method:ctx.clientRequest.method,headers:{Authorization:auth(ctx)}};}
function taskView(task){const d=object(task.data)?task.data:{};const map={NOT_START:"queued",SUBMITTED:"queued",QUEUED:"queued",IN_PROGRESS:"in_progress",SUCCESS:"completed",FAILURE:"failed"};return {id:task.task_id,object:"video",model:task.properties?task.properties.origin_model_name||"":"",status:map[task.status]||"unknown",progress:Number(String(task.progress||"0").replace("%","")),created_at:task.created_at||0,billingStatus:d.billingStatus,amount:d.amount,unit:d.unit};}
export const native={createVideo(ctx){if(!ctx.body||ctx.body.kind!=="json")throw new Error("JSON body required");const req=object(ctx.body.value)?ctx.body.value:{};return {kind:"submit",model:ctx.model||text(req.model),action:"text_to_video",requestBody:normalizeInput(req,ctx.model||text(req.model))};},taskCreated(_c,t){return taskView(t)},taskStatus(_c,t){return taskView(t)},error(_c,e){return {error:{code:e.code,message:e.message}}}};
function videoText(ctx){const a=ctx.artifacts&&ctx.artifacts.video,u=text(a&&a.url);if(!u)throw new Error("video artifact is unavailable");return '<video controls src="'+u.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+'"></video>';}
export const protocols={openai_responses:{decodeRequest(ctx){if(!ctx.body||ctx.body.kind!=="json")throw new Error("JSON body required");const req=object(ctx.body.value)?ctx.body.value:{};if(!text(req.prompt)&&text(req.input))req.prompt=text(req.input);return {kind:"submit",model:ctx.model,action:"text_to_video",requestBody:normalizeInput(req,ctx.model)};},renderEvents(ctx,t,p){const s=String(t.status||"UNKNOWN").toUpperCase(),state={status:s};if(s==="SUCCESS")return {events:p&&p.status===s?[]:[{type:"output",data:videoText(ctx)}],state,done:true};if(s==="FAILURE")return {events:[{type:"error",code:"task_failed",message:t.fail_reason||"task failed"}],state,done:true};return {events:[],state,done:false};},renderFinal(ctx){return {output:[{type:"message",status:"completed",role:"assistant",content:[{type:"output_text",text:videoText(ctx)}]}],metadata:{vendor:"vera"}};}}};
function publicRequest(ctx){let req;if(ctx.body.kind==="json")req=object(ctx.body.value)?ctx.body.value:{};else{const f=ctx.body.fields||{};req={};for(const n of Object.keys(f))req[n]=f[n][0];if(text(req.metadata)){try{req.metadata=JSON.parse(req.metadata)}catch(e){throw new Error("metadata must be a JSON object string")}}}const metadata=object(req.metadata)?req.metadata:{};const refs=Array.isArray(metadata.references)?metadata.references:[];for(const file of ctx.body.files||[])refs.push({id:file.field,kind:file.field.startsWith("audio")?"audio":file.field.startsWith("video")?"video":"image",source:{type:"form",field:file.field}});metadata.references=refs;req.metadata=metadata;return req;}
protocols.openai_video={decodeRequest(ctx){if(!ctx.body||(ctx.body.kind!=="json"&&ctx.body.kind!=="multipart"))throw new Error("JSON or multipart body required");const req=publicRequest(ctx),refs=(object(req.metadata)?req.metadata.references:[])||[];const normalized=normalizeInput(req,ctx.model);normalized.metadata={references:refs};return {kind:"submit",model:ctx.model,action:refs.length?"image_to_video":"text_to_video",requestBody:normalized};},render(_c,t){return taskView(t)}};
