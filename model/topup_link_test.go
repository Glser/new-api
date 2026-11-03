package model

import "testing"

func TestValidateOptionValueHTTPURLLists(t *testing.T) {
	cases := []struct {
		name  string
		value string
		valid bool
	}{
		{"empty", "", true},
		{"blank", " \t ", true},
		{"single", "https://m.tb.cn/h.8IP2BiK?tk=sbDgT7Lla3k", true},
		{"multiple", "https://example.com/a,http://example.com/b", true},
		{"chinese commas and blanks", " https://example.com/a ， , https://example.com/b, ", true},
		{"encoded comma", "https://example.com/a?items=1%2C2", true},
		{"only separators", " , ， ", false},
		{"relative", "/topup", false},
		{"script", "javascript:alert(1)", false},
		{"invalid second link", "https://example.com,invalid", false},
		{"missing host", "https:///topup", false},
		{"spaces", "https://example.com/a b", false},
		{"backslash", "https://example.com\\evil", false},
	}
	for _, key := range []string{"TopUpLink", "general_setting.contact_support_image_url"} {
		t.Run(key, func(t *testing.T) {
			for _, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					err := validateOptionValue(key, tc.value)
					if (err == nil) != tc.valid {
						t.Fatalf("valid = %v, error = %v", tc.valid, err)
					}
				})
			}
		})
	}
}
