package model_plaza_setting

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

// RequestExamplesOptionKey 是 options 表中保存请求示例配置的键
const RequestExamplesOptionKey = "model_plaza_setting.request_examples"

// ModelPlazaSetting 模型广场展示相关配置
type ModelPlazaSetting struct {
	// RequestExamples 按端点协议覆盖调用示例，JSON 对象字符串，只保存与默认值不同的协议
	RequestExamples string `json:"request_examples"`
	// Categories 分类列表，JSON 数组字符串；为空时使用内置分类
	Categories string `json:"categories"`
}

var modelPlazaSetting = ModelPlazaSetting{
	RequestExamples: "",
	Categories:      "",
}

func init() {
	config.GlobalConfig.Register("model_plaza_setting", &modelPlazaSetting)
}

// GetEffectiveRequestExamples 返回默认示例合并管理员覆盖后的结果
func GetEffectiveRequestExamples() map[string]RequestExample {
	examples := GetDefaultRequestExamples()
	overrides, err := ParseRequestExamples(modelPlazaSetting.RequestExamples)
	if err != nil {
		// 保存时已校验，这里只防御被直接改坏的数据库值
		common.SysError("invalid model plaza request examples: " + err.Error())
		return examples
	}
	for endpointType, example := range overrides {
		// Older saved examples only override auth, headers and body.
		if example.Path == "" {
			example.Path = examples[endpointType].Path
		}
		if example.Method == "" {
			example.Method = "POST"
		}
		examples[endpointType] = example
	}
	return examples
}

// ParseRequestExamples 解析并校验配置；空字符串表示没有覆盖
func ParseRequestExamples(raw string) (map[string]RequestExample, error) {
	if strings.TrimSpace(raw) == "" {
		return map[string]RequestExample{}, nil
	}
	return parseAndValidateRequestExamples(raw)
}
