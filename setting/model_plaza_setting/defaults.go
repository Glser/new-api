package model_plaza_setting

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
)

// 鉴权方式：决定 API Key 放在哪里
const (
	AuthBearer  = "bearer"    // Authorization: Bearer <key>
	AuthXAPIKey = "x-api-key" // x-api-key: <key>
	AuthQuery   = "query"     // URL 参数 ?key=<key>
)

// ModelPlaceholder 在请求体中会被替换成当前模型名
const ModelPlaceholder = "{{model}}"

// RequestExample 单个端点协议的调用示例
type RequestExample struct {
	Path    string            `json:"path,omitempty"`
	Method  string            `json:"method,omitempty"`
	Auth    string            `json:"auth"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    map[string]any    `json:"body"`
}

const sampleQuestion = "Explain quantum entanglement in one paragraph."

func userMessages() []any {
	return []any{map[string]any{"role": "user", "content": sampleQuestion}}
}

// GetDefaultRequestExamples 返回内置示例，每次返回新的副本，调用方可以随意修改
func GetDefaultRequestExamples() map[string]RequestExample {
	examples := map[string]RequestExample{
		string(constant.EndpointTypeOpenAI): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model":    ModelPlaceholder,
				"messages": userMessages(),
			},
		},
		string(constant.EndpointTypeOpenAIResponse): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model": ModelPlaceholder,
				"input": sampleQuestion,
			},
		},
		string(constant.EndpointTypeOpenAIResponseCompact): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model": ModelPlaceholder,
				"input": []any{map[string]any{"role": "user", "content": sampleQuestion}},
			},
		},
		string(constant.EndpointTypeOpenAIAlphaSearch): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model": ModelPlaceholder,
				"commands": map[string]any{
					"search_query": []any{map[string]any{"q": "latest AI news"}},
				},
			},
		},
		string(constant.EndpointTypeAnthropic): {
			Auth:    AuthXAPIKey,
			Headers: map[string]string{"anthropic-version": "2023-06-01"},
			Body: map[string]any{
				"model":      ModelPlaceholder,
				"max_tokens": 1024,
				"messages":   userMessages(),
			},
		},
		string(constant.EndpointTypeGemini): {
			Auth: AuthQuery,
			Body: map[string]any{
				"contents": []any{
					map[string]any{"parts": []any{map[string]any{"text": sampleQuestion}}},
				},
			},
		},
		string(constant.EndpointTypeJinaRerank): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model": ModelPlaceholder,
				"query": "What is a panda?",
				"documents": []any{
					"The giant panda is a bear species endemic to China.",
					"Paris is the capital of France.",
				},
				"top_n": 2,
			},
		},
		string(constant.EndpointTypeImageGeneration): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model":  ModelPlaceholder,
				"prompt": "A serene koi pond at sunset, ukiyo-e style.",
				"size":   "1024x1024",
				"n":      1,
			},
		},
		string(constant.EndpointTypeEmbeddings): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model": ModelPlaceholder,
				"input": "The food was delicious and the waiter was friendly.",
			},
		},
		string(constant.EndpointTypeOpenAIVideo): {
			Auth: AuthBearer,
			Body: map[string]any{
				"model":   ModelPlaceholder,
				"prompt":  "A paper boat drifting down a rainy street.",
				"seconds": "4",
				"size":    "720x1280",
			},
		},
	}
	for protocol, example := range examples {
		if endpoint, ok := common.GetDefaultEndpointInfo(constant.EndpointType(protocol)); ok {
			example.Path = endpoint.Path
			example.Method = endpoint.Method
			examples[protocol] = example
		}
	}
	return examples
}

// IsKnownEndpointType 判断协议是否在支持列表中
func IsKnownEndpointType(endpointType string) bool {
	_, ok := GetDefaultRequestExamples()[endpointType]
	return ok
}
