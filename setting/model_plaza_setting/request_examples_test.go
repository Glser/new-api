package model_plaza_setting

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/config"
	"github.com/stretchr/testify/require"
)

func TestDefaultRequestExamplesCoverAllProtocols(t *testing.T) {
	defaults := GetDefaultRequestExamples()
	for _, endpointType := range []string{
		"openai", "openai-response", "openai-response-compact", "openai-alpha-search",
		"anthropic", "gemini", "jina-rerank", "image-generation", "embeddings", "openai-video",
	} {
		example, ok := defaults[endpointType]
		require.True(t, ok, endpointType)
		require.NotEmpty(t, example.Auth, endpointType)
		require.NotEmpty(t, example.Body, endpointType)
	}
	require.Contains(t, defaults["jina-rerank"].Body, "documents")
	require.Equal(t, AuthQuery, defaults["gemini"].Auth)

	// 每次返回独立副本，修改不会影响下次结果
	defaults["openai"].Body["model"] = "changed"
	require.Equal(t, ModelPlaceholder, GetDefaultRequestExamples()["openai"].Body["model"])
}

func TestValidateRequestExamples(t *testing.T) {
	valid := []string{
		"",
		"   ",
		`{}`,
		`{"openai":{"auth":"bearer","body":{"model":"{{model}}","messages":[]}}}`,
		`{"anthropic":{"auth":"x-api-key","headers":{"anthropic-version":"2023-06-01"},"body":{"model":"{{model}}"}}}`,
		`{"my-chat_v2":{"auth":"bearer","body":{"model":"{{model}}"}}}`,
	}
	for _, raw := range valid {
		require.NoError(t, ValidateRequestExamples(raw), raw)
	}

	invalid := map[string]string{
		"not json":        `{`,
		"array root":      `[]`,
		"uppercase name":  `{"MyChat":{"auth":"bearer","body":{}}}`,
		"name with space": `{"my chat":{"auth":"bearer","body":{}}}`,
		"name with slash": `{"a/b":{"auth":"bearer","body":{}}}`,
		"leading dash":    `{"-chat":{"auth":"bearer","body":{}}}`,
		"bad auth":        `{"openai":{"auth":"basic","body":{}}}`,
		"missing body":    `{"openai":{"auth":"bearer"}}`,
		"body not object": `{"openai":{"auth":"bearer","body":[1]}}`,
		"unknown field":   `{"openai":{"auth":"bearer","body":{},"url":"https://evil"}}`,
		"reserved header": `{"openai":{"auth":"bearer","headers":{"Authorization":"x"},"body":{}}}`,
		"header newline":  `{"openai":{"auth":"bearer","headers":{"X-A":"a\nb"},"body":{}}}`,
		"bad header name": `{"openai":{"auth":"bearer","headers":{"X A":"a"},"body":{}}}`,
		"header not text": `{"openai":{"auth":"bearer","headers":{"X-A":1},"body":{}}}`,
	}
	for name, raw := range invalid {
		require.Error(t, ValidateRequestExamples(raw), name)
	}
}

func TestEffectiveRequestExamplesMergeOverrides(t *testing.T) {
	original := modelPlazaSetting.RequestExamples
	t.Cleanup(func() { modelPlazaSetting.RequestExamples = original })

	// 通过配置管理器写入，和保存配置时走同一条路径
	config.UpdateConfigFromMap(&modelPlazaSetting, map[string]string{
		"request_examples": `{"openai":{"auth":"bearer","body":{"model":"{{model}}","messages":[],"stream":true}}}`,
	})

	effective := GetEffectiveRequestExamples()
	require.Equal(t, true, effective["openai"].Body["stream"])
	require.NotContains(t, effective, "my-chat")

	config.UpdateConfigFromMap(&modelPlazaSetting, map[string]string{
		"request_examples": `{"my-chat":{"auth":"bearer","body":{"model":"{{model}}"}}}`,
	})
	// 自定义协议和内置协议一起下发
	effective = GetEffectiveRequestExamples()
	require.Contains(t, effective, "my-chat")
	require.Contains(t, effective, "openai")
	// 未覆盖的协议仍使用默认值
	require.Equal(t, GetDefaultRequestExamples()["anthropic"], effective["anthropic"])

	// 数据库里的值被改坏时退回默认值
	modelPlazaSetting.RequestExamples = `{"openai":`
	require.Equal(t, GetDefaultRequestExamples(), GetEffectiveRequestExamples())
}
