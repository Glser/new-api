package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/model_plaza_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestExamplePathsCoverRegisteredRelayRoutes(t *testing.T) {
	engine := gin.New()
	// Register the catalog before relay routes, matching application startup.
	engine.GET("/catalog", requestExamplePathsHandler(engine))
	SetRelayRouter(engine)
	SetTaskPluginProtocolRouter(engine)
	SetVideoRouter(engine)
	SetTaskRouter(engine)
	engine.POST("/v1/future-operation", func(c *gin.Context) {})

	response := httptest.NewRecorder()
	engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/catalog", nil))
	require.Equal(t, http.StatusOK, response.Code)
	var payload struct {
		Success bool                 `json:"success"`
		Data    []requestExamplePath `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	paths := make(map[string][]string)
	for _, endpoint := range payload.Data {
		require.NotContains(t, paths, endpoint.Path, "duplicate path")
		paths[endpoint.Path] = endpoint.Methods
	}
	for _, path := range []string{
		"/v1/images/edits", "/v1/edits", "/v1/images/generations",
		"/v1/audio/transcriptions", "/v1/audio/translations", "/v1/audio/speech",
		"/v1/completions", "/v1/moderations", "/v1/video/generations",
		"/v1/videos/{video_id}/remix", "/mj/submit/edits", "/{mode}/mj/submit/imagine",
		"/v1/engines/{model}/embeddings", "/v1/future-operation",
	} {
		assert.Contains(t, paths[path], http.MethodPost, path)
	}
	for _, prefix := range []string{"/v1", "/v1beta"} {
		for _, action := range []string{"generateContent", "streamGenerateContent?alt=sse", "embedContent", "batchEmbedContents"} {
			path := prefix + "/models/{model}:" + action
			assert.Contains(t, paths[path], http.MethodPost, path)
		}
	}
	for protocol, example := range model_plaza_setting.GetDefaultRequestExamples() {
		assert.Contains(t, paths[example.Path], example.Method, protocol)
	}
	assert.Equal(t, []string{"GET", "HEAD"}, paths["/v1/videos/{task_id}/content"])
	assert.Equal(t, []string{"POST", "GET"}, paths["/v1/tasks/{key}"])
	for _, path := range []string{"/v1/images/variations", "/v1/files", "/v1/fine-tunes", "/v1/realtime", "/pg/chat/completions", "/catalog", "/v1beta/models/*path"} {
		assert.NotContains(t, paths, path)
	}
}

func TestRequestExamplePathsEndpointRequiresRoot(t *testing.T) {
	engine := gin.New()
	SetApiRouter(engine)
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/option/request_examples/paths", nil))
	assert.Equal(t, http.StatusUnauthorized, response.Code)
}
