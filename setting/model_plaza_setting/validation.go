package model_plaza_setting

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

// maxRequestExamplesBytes 限制配置大小，示例只用于展示，不需要很大
const maxRequestExamplesBytes = 64 * 1024

// maxRequestExampleProtocols 限制协议数量（内置加自定义）
const maxRequestExampleProtocols = 50

// customProtocolPattern 自定义协议名需要和模型自定义端点的名称一致，只允许小写字母、数字、- 和 _
var customProtocolPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

// reservedHeaders 由示例生成器自动添加，不允许在配置里覆盖
var reservedHeaders = map[string]struct{}{
	"authorization": {},
	"x-api-key":     {},
	"content-type":  {},
}

var allowedExampleFields = map[string]struct{}{
	"path":    {},
	"method":  {},
	"auth":    {},
	"headers": {},
	"body":    {},
}

// ValidateRequestExamples 校验管理员保存的配置
func ValidateRequestExamples(raw string) error {
	_, err := ParseRequestExamples(raw)
	return err
}

func parseAndValidateRequestExamples(raw string) (map[string]RequestExample, error) {
	if len(raw) > maxRequestExamplesBytes {
		return nil, fmt.Errorf("请求示例配置不能超过 %d KB", maxRequestExamplesBytes/1024)
	}

	var entries map[string]map[string]any
	if err := common.UnmarshalJsonStr(raw, &entries); err != nil || entries == nil {
		return nil, errors.New("请求示例配置必须是 JSON 对象，键为端点协议")
	}

	if len(entries) > maxRequestExampleProtocols {
		return nil, fmt.Errorf("最多配置 %d 个协议", maxRequestExampleProtocols)
	}

	result := make(map[string]RequestExample, len(entries))
	for endpointType, entry := range entries {
		if !IsKnownEndpointType(endpointType) && !customProtocolPattern.MatchString(endpointType) {
			return nil, fmt.Errorf("协议名不合法: %s（只能使用小写字母、数字、- 和 _，最长 64 个字符）", endpointType)
		}
		example, err := parseRequestExample(entry)
		if err != nil {
			return nil, fmt.Errorf("协议 %s: %w", endpointType, err)
		}
		result[endpointType] = example
	}
	return result, nil
}

func parseRequestExample(entry map[string]any) (RequestExample, error) {
	var example RequestExample
	if entry == nil {
		return example, errors.New("配置必须是对象")
	}
	for field := range entry {
		if _, ok := allowedExampleFields[field]; !ok {
			return example, fmt.Errorf("不支持的字段: %s", field)
		}
	}

	if value, exists := entry["path"]; exists {
		path, ok := value.(string)
		if !ok {
			return example, errors.New("path 必须是字符串")
		}
		path = strings.TrimSpace(path)
		parsed, err := url.Parse(path)
		if path != "" && (!strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || strings.ContainsAny(path, "\\\r\n\t ") || err != nil || parsed.Host != "" || parsed.Fragment != "") {
			return example, errors.New("path 必须是以 / 开头的相对请求路径，不能包含域名、空白或 fragment")
		}
		example.Path = path
	}
	if value, exists := entry["method"]; exists {
		method, ok := value.(string)
		if !ok {
			return example, errors.New("method 必须是字符串")
		}
		method = strings.ToUpper(strings.TrimSpace(method))
		switch method {
		case "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS":
			example.Method = method
		default:
			return example, errors.New("method 必须是 GET、POST、PUT、PATCH、DELETE、HEAD 或 OPTIONS")
		}
	}

	auth, _ := entry["auth"].(string)
	switch auth {
	case AuthBearer, AuthXAPIKey, AuthQuery:
		example.Auth = auth
	default:
		return example, fmt.Errorf("auth 只能是 %s、%s 或 %s", AuthBearer, AuthXAPIKey, AuthQuery)
	}

	body, ok := entry["body"].(map[string]any)
	if !ok {
		return example, errors.New("body 必须是 JSON 对象")
	}
	example.Body = body

	if rawHeaders, exists := entry["headers"]; exists && rawHeaders != nil {
		headerMap, ok := rawHeaders.(map[string]any)
		if !ok {
			return example, errors.New("headers 必须是对象，值为字符串")
		}
		headers := make(map[string]string, len(headerMap))
		for name, value := range headerMap {
			text, ok := value.(string)
			if !ok {
				return example, fmt.Errorf("请求头 %s 的值必须是字符串", name)
			}
			if err := validateHeader(name, text); err != nil {
				return example, err
			}
			headers[name] = text
		}
		if len(headers) > 0 {
			example.Headers = headers
		}
	}
	return example, nil
}

func validateHeader(name string, value string) error {
	if name == "" {
		return errors.New("请求头名称不能为空")
	}
	for _, r := range name {
		if !isHeaderTokenRune(r) {
			return fmt.Errorf("请求头名称不合法: %s", name)
		}
	}
	if _, reserved := reservedHeaders[strings.ToLower(name)]; reserved {
		return fmt.Errorf("请求头 %s 会自动生成，不需要配置", name)
	}
	if strings.ContainsAny(value, "\r\n") {
		return fmt.Errorf("请求头 %s 的值不能包含换行", name)
	}
	return nil
}

func isHeaderTokenRune(r rune) bool {
	if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' {
		return true
	}
	return strings.ContainsRune("!#$%&'*+-.^_`|~", r)
}
