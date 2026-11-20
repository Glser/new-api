package plugins_test

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	pluginruntime "github.com/QuantumNous/new-api/pkg/jsplugin"
	"github.com/QuantumNous/new-api/plugins"
	taskjsplugin "github.com/QuantumNous/new-api/relay/channel/task/jsplugin"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func preparedPlugin(t *testing.T, key string) (*pluginruntime.LoadedPlugin, *relaycommon.RelayInfo) {
	t.Helper()
	source, err := plugins.Source(key)
	require.NoError(t, err)
	registry := pluginruntime.NewRegistry()
	plugin, err := registry.RegisterFactory(source, pluginruntime.Options{Key: key})
	require.NoError(t, err)
	info := &relaycommon.RelayInfo{
		ChannelMeta:     &relaycommon.ChannelMeta{ApiKey: "secret"},
		OriginModelName: plugin.Meta.Models[0],
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{PublicTaskID: "task_public"},
	}
	info.UpstreamModelName = plugin.Meta.Models[0]
	return plugin, info
}

func multipartPluginContext(t *testing.T, plugin *pluginruntime.LoadedPlugin, field string) *gin.Context {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("model", plugin.Meta.Models[0]))
	require.NoError(t, writer.WriteField("prompt", "a cat walking"))
	require.NoError(t, writer.WriteField("seconds", "4"))
	part, err := writer.CreateFormFile(field, "reference.png")
	require.NoError(t, err)
	_, _ = part.Write([]byte("image-bytes"))
	require.NoError(t, writer.Close())

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", bytes.NewReader(body.Bytes()))
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	value, err := plugin.Engine.CallPath(t.Context(), "protocols", []string{"openai_video", "decodeRequest"}, map[string]any{
		"model": plugin.Meta.Models[0],
		"body": map[string]any{
			"kind":   "multipart",
			"fields": map[string][]string{"model": {plugin.Meta.Models[0]}, "prompt": {"a cat walking"}, "seconds": {"4"}},
			"files":  []map[string]any{{"ref": "request_file:" + field, "field": field, "filename": "reference.png", "mimeType": "image/png", "size": 11}},
		},
	})
	require.NoError(t, err)
	encoded, err := common.Marshal(value)
	require.NoError(t, err)
	var decoded map[string]any
	require.NoError(t, common.Unmarshal(encoded, &decoded))
	c.Set("task_request", decoded["requestBody"])
	return c
}

func TestTMLabPluginPreparesReferenceBeforeGenerationDescriptor(t *testing.T) {
	plugin, info := preparedPlugin(t, "tmlab")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/uploads/images", r.URL.Path)
		file, header, err := r.FormFile("file")
		require.NoError(t, err)
		defer file.Close()
		assert.Equal(t, "reference.png", header.Filename)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"file_id":"im_fixture"}`))
	}))
	defer server.Close()
	info.ChannelBaseUrl = server.URL
	c := multipartPluginContext(t, plugin, "input_reference")
	adaptor := taskjsplugin.New(plugin)
	adaptor.Init(info)
	require.Nil(t, adaptor.PrepareSubmission(c, info))
	body, buildErr := adaptor.BuildRequestBody(c, info)
	require.NoError(t, buildErr)
	require.NotNil(t, body)
	raw, _ := io.ReadAll(body)
	assert.Contains(t, string(raw), "im_fixture")
}

func TestVeraPluginPreparesAssetAndQuote(t *testing.T) {
	plugin, info := preparedPlugin(t, "vera")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/assets":
			_, _, err := r.FormFile("file")
			require.NoError(t, err)
			_, _ = w.Write([]byte(`{"code":"OK","data":{"id":"ast_fixture","kind":"image"}}`))
		case "/quotes":
			raw, _ := io.ReadAll(r.Body)
			assert.Contains(t, string(raw), "ast_fixture")
			_, _ = w.Write([]byte(`{"code":"OK","data":{"id":"quote_fixture"}}`))
		default:
			t.Errorf("unexpected path %s", r.URL.Path)
		}
	}))
	defer server.Close()
	info.ChannelBaseUrl = server.URL
	c := multipartPluginContext(t, plugin, "first_frame")
	adaptor := taskjsplugin.New(plugin)
	adaptor.Init(info)
	require.Nil(t, adaptor.PrepareSubmission(c, info))
	body, buildErr := adaptor.BuildRequestBody(c, info)
	require.NoError(t, buildErr)
	require.NotNil(t, body)
	raw, _ := io.ReadAll(body)
	assert.Contains(t, string(raw), "quote_fixture")
	assert.Contains(t, string(raw), "ast_fixture")
}
