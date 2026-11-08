package model_plaza_setting

import (
	"testing"

	"github.com/QuantumNous/new-api/setting/config"
	"github.com/stretchr/testify/require"
)

func categoryKeys(categories []Category) []string {
	keys := make([]string, 0, len(categories))
	for _, category := range categories {
		keys = append(keys, category.Key)
	}
	return keys
}

func TestEffectiveCategoriesDefaultsAndOther(t *testing.T) {
	original := modelPlazaSetting.Categories
	t.Cleanup(func() { modelPlazaSetting.Categories = original })

	modelPlazaSetting.Categories = ""
	require.Equal(t, []string{"chat", "image", "video", "audio", "embedding", "other"}, categoryKeys(GetEffectiveCategories()))

	// 配置的顺序就是展示顺序，“其他”固定在最后
	config.UpdateConfigFromMap(&modelPlazaSetting, map[string]string{
		"categories": `[{"key":"video","label":"视频"},{"key":"tts","label":"语音合成","icon":"AudioLines"}]`,
	})
	require.Equal(t, []string{"video", "tts", "other"}, categoryKeys(GetEffectiveCategories()))
	require.True(t, IsValidModelCategory("tts"))
	require.True(t, IsValidModelCategory("other"))
	require.True(t, IsValidModelCategory(""))
	require.False(t, IsValidModelCategory("chat"))

	// 数据库里的值被改坏时退回内置分类
	modelPlazaSetting.Categories = `[{"key":`
	require.Equal(t, []string{"chat", "image", "video", "audio", "embedding", "other"}, categoryKeys(GetEffectiveCategories()))

	// 默认值每次返回新切片，追加“其他”不会污染下一次结果
	require.Len(t, GetDefaultCategories(), 5)
}

func TestValidateCategories(t *testing.T) {
	valid := []string{
		"",
		`[]`,
		`[{"key":"chat","label":"聊天"}]`,
		`[{"key":"my-audio_2","label":"Audio","icon":"AudioLines"}]`,
	}
	for _, raw := range valid {
		require.NoError(t, ValidateCategories(raw), raw)
	}

	invalid := map[string]string{
		"not json":       `{`,
		"object root":    `{"key":"chat"}`,
		"other reserved": `[{"key":"other","label":"其他"}]`,
		"duplicate key":  `[{"key":"chat","label":"a"},{"key":"chat","label":"b"}]`,
		"uppercase key":  `[{"key":"Chat","label":"a"}]`,
		"empty key":      `[{"key":"","label":"a"}]`,
		"empty label":    `[{"key":"chat","label":"  "}]`,
		"long label":     `[{"key":"chat","label":"一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三"}]`,
		"bad icon":       `[{"key":"chat","label":"a","icon":"<svg>"}]`,
	}
	for name, raw := range invalid {
		require.Error(t, ValidateCategories(raw), name)
	}
}
