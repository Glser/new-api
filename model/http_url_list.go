package model

import (
	"fmt"
	"net/url"
	"strings"
)

func validateHTTPURLList(value string, label string) error {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	count := 0
	for link := range strings.FieldsFuncSeq(value, func(r rune) bool { return r == ',' || r == '，' }) {
		link = strings.TrimSpace(link)
		if link == "" {
			continue
		}
		parsed, err := url.Parse(link)
		if err != nil || parsed.Hostname() == "" ||
			(parsed.Scheme != "http" && parsed.Scheme != "https") ||
			strings.ContainsAny(link, " \t\r\n\\") {
			return fmt.Errorf("%s必须是有效的 http:// 或 https:// 地址，多个链接请用逗号分隔", label)
		}
		count++
	}
	if count == 0 {
		return fmt.Errorf("请填写有效的%s，或留空以隐藏入口", label)
	}
	return nil
}
