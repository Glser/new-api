package jsplugin

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	pluginruntime "github.com/QuantumNous/new-api/pkg/jsplugin"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const preparationPlugin = `
export const meta = {apiVersion:1,key:"preparation",name:"Preparation",version:"1.0.0",author:{name:"Test"},models:["model"],fetchMode:"per_task",requiredCapabilities:["asset-import@1","prepare@1","submit-status@1"],protocols:["openai_video"]};
export const assets = {
  buildImportRequest(ctx) { return {url:ctx.baseUrl+"/assets",method:"POST",headers:{Authorization:"Bearer "+ctx.apiKey},bodyType:"multipart",parts:[{name:"file",fileRef:ctx.asset.fileRef,filename:ctx.asset.filename}]}; },
  parseImportResponse(ctx,response) { return {outcome:"imported",providerAssetId:response.body.file_id}; }
};
export const prepare = {
  buildRequest(ctx) { return {url:ctx.baseUrl+"/quotes",method:"POST",headers:{Authorization:"Bearer "+ctx.apiKey},body:{model:ctx.upstreamModel,references:ctx.resolvedReferences}}; },
  parseResponse(ctx,response) { return {outcome:"prepared",state:{quoteId:response.body.id}}; }
};
export function buildSubmitRequest(ctx) { return {url:ctx.baseUrl+"/submit",method:"POST",body:{quoteId:ctx.prepareState.quoteId,references:ctx.resolvedReferences}}; }
export function parseSubmitResponse(ctx,response) { return {taskId:response.body.id,taskData:response.body}; }
export function buildQueryRequest(ctx) { return {url:ctx.baseUrl+"/tasks/"+ctx.taskId}; }
export function parseTaskResult() { return {status:"SUCCESS"}; }
export function listArtifacts() { return []; }
export function buildContentRequest() { throw new Error("artifact_not_found"); }
export const protocols = {openai_video:{decodeRequest:function(ctx){return {kind:"submit",model:ctx.model,requestBody:ctx.body.value};},render:function(){return {}}}};
`

func preparationTestContext(t *testing.T, body *bytes.Buffer) (*gin.Context, *relaycommon.RelayInfo) {
	t.Helper()
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", body)
	c.Request.Header.Set("Content-Type", "multipart/form-data; boundary=boundary")
	c.Set("task_request", map[string]any{
		"model":  "model",
		"prompt": "test",
		"metadata": map[string]any{"references": []any{map[string]any{
			"id": "first", "kind": "image", "role": "first_frame",
			"source": map[string]any{"type": "form", "field": "input_reference"},
		}}},
	})
	info := &relaycommon.RelayInfo{
		ChannelMeta:     &relaycommon.ChannelMeta{ChannelBaseUrl: "https://replaced.invalid", ApiKey: "secret"},
		OriginModelName: "model",
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{PublicTaskID: "task_public"},
	}
	info.UpstreamModelName = "upstream"
	return c, info
}

func TestTaskAdaptorPreparesAssetsAndQuoteBeforeSubmit(t *testing.T) {
	var upload, quote string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer secret", r.Header.Get("Authorization"))
		switch r.URL.Path {
		case "/assets":
			file, header, err := r.FormFile("file")
			require.NoError(t, err)
			defer file.Close()
			upload = header.Filename
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"file_id":"im_test"}`))
		case "/quotes":
			raw, _ := io.ReadAll(r.Body)
			quote = string(raw)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"quote_test"}`))
		default:
			t.Errorf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("model", "model"))
	part, err := writer.CreateFormFile("input_reference", "cat.png")
	require.NoError(t, err)
	_, _ = part.Write([]byte("image-bytes"))
	require.NoError(t, writer.Close())
	body.Bytes()
	// Keep the generated boundary while replacing it in the request below.

	c, info := preparationTestContext(t, &body)
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	info.ChannelBaseUrl = server.URL

	plugin, err := pluginruntime.NewRegistry().Register(preparationPlugin, pluginruntime.Options{})
	require.NoError(t, err)
	adaptor := New(plugin)
	adaptor.Init(info)
	require.Nil(t, adaptor.PrepareSubmission(c, info))

	assert.Equal(t, "cat.png", upload)
	assert.Contains(t, quote, "im_test")
	require.NotNil(t, adaptor.submit)
	assert.Equal(t, server.URL+"/submit", adaptor.submit.URL)
	resolved, exists := c.Get("task_resolved_references")
	require.True(t, exists)
	rendered, ok := resolved.([]map[string]any)
	require.True(t, ok)
	assert.Equal(t, "im_test", rendered[0]["providerAssetId"])
}

func TestTaskAdaptorRejectedAssetImportBlocksSubmitDescriptor(t *testing.T) {
	source := strings.Replace(preparationPlugin, `return {outcome:"imported",providerAssetId:response.body.file_id};`, `return {outcome:"rejected",code:"INVALID",message:"bad image"};`, 1)
	plugin, err := pluginruntime.NewRegistry().Register(source, pluginruntime.Options{})
	require.NoError(t, err)
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("input_reference", "cat.png")
	require.NoError(t, err)
	_, _ = part.Write([]byte("image-bytes"))
	require.NoError(t, writer.Close())

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"file_id":"unused"}`))
	}))
	defer server.Close()

	c, info := preparationTestContext(t, &body)
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	info.ChannelBaseUrl = server.URL
	adaptor := New(plugin)
	adaptor.Init(info)
	taskErr := adaptor.PrepareSubmission(c, info)
	require.NotNil(t, taskErr)
	assert.Contains(t, taskErr.Error.Error(), "bad image")
	assert.Nil(t, adaptor.submit)
}

func TestTaskAdaptorParsesAccepted202Response(t *testing.T) {
	plugin, err := pluginruntime.NewRegistry().Register(preparationPlugin, pluginruntime.Options{})
	require.NoError(t, err)
	adaptor := New(plugin)
	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{}, TaskRelayInfo: &relaycommon.TaskRelayInfo{PublicTaskID: "task_public"}}
	adaptor.Init(info)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	response := &http.Response{StatusCode: http.StatusAccepted, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(`{"id":"job_202"}`))}
	parsed, taskErr := adaptor.ParseResponse(c, response, info)
	require.Nil(t, taskErr)
	require.NotNil(t, parsed)
	assert.Equal(t, "job_202", parsed.UpstreamTaskID)
}
