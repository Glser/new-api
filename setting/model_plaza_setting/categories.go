package model_plaza_setting

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
)

// CategoriesOptionKey 是 options 表中保存模型广场分类列表的键
const CategoriesOptionKey = "model_plaza_setting.categories"

// OtherCategoryKey 兜底分类，固定排在最后，不能删除也不能在配置里出现
const OtherCategoryKey = "other"

const (
	maxCategories        = 30
	maxCategoryLabelRune = 32
)

var (
	categoryKeyPattern  = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,31}$`)
	categoryIconPattern = regexp.MustCompile(`^[A-Za-z0-9]{0,64}$`)
)

// Category 模型广场的一个分类。Label 为空或内置英文时前端会翻译，自定义文字原样显示
type Category struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Icon  string `json:"icon,omitempty"`
}

var otherCategory = Category{Key: OtherCategoryKey, Label: "Other", Icon: "Boxes"}

// GetDefaultCategories 返回内置分类（不含“其他”），每次返回新的切片
func GetDefaultCategories() []Category {
	return []Category{
		{Key: "chat", Label: "Chat", Icon: "MessagesSquare"},
		{Key: "image", Label: "Image", Icon: "Image"},
		{Key: "video", Label: "Video", Icon: "Film"},
		{Key: "audio", Label: "Audio", Icon: "AudioLines"},
		{Key: "embedding", Label: "Embedding", Icon: "Binary"},
	}
}

// GetEffectiveCategories 返回生效的分类列表，末尾固定追加“其他”
func GetEffectiveCategories() []Category {
	categories, err := ParseCategories(modelPlazaSetting.Categories)
	if err != nil {
		// 保存时已校验，这里只防御被直接改坏的数据库值
		common.SysError("invalid model plaza categories: " + err.Error())
		categories = nil
	}
	if categories == nil {
		categories = GetDefaultCategories()
	}
	return append(categories, otherCategory)
}

// IsValidModelCategory 判断模型上的分类是否可用；空字符串表示自动推算
func IsValidModelCategory(key string) bool {
	if key == "" {
		return true
	}
	for _, category := range GetEffectiveCategories() {
		if category.Key == key {
			return true
		}
	}
	return false
}

// ValidateCategories 校验管理员保存的分类列表
func ValidateCategories(raw string) error {
	_, err := ParseCategories(raw)
	return err
}

// ParseCategories 解析分类列表；空字符串返回 nil，表示使用内置分类
func ParseCategories(raw string) ([]Category, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	var categories []Category
	if err := common.UnmarshalJsonStr(raw, &categories); err != nil || categories == nil {
		return nil, errors.New("分类列表必须是 JSON 数组")
	}
	if len(categories) > maxCategories {
		return nil, fmt.Errorf("最多配置 %d 个分类", maxCategories)
	}
	seen := make(map[string]struct{}, len(categories))
	for i := range categories {
		category := &categories[i]
		category.Key = strings.TrimSpace(category.Key)
		category.Label = strings.TrimSpace(category.Label)
		if !categoryKeyPattern.MatchString(category.Key) {
			return nil, fmt.Errorf("分类标识不合法: %q（只能使用小写字母、数字、- 和 _，最长 32 个字符）", category.Key)
		}
		if category.Key == OtherCategoryKey {
			return nil, errors.New("“其他”分类是内置兜底分类，不需要配置")
		}
		if _, exists := seen[category.Key]; exists {
			return nil, fmt.Errorf("分类标识重复: %s", category.Key)
		}
		seen[category.Key] = struct{}{}
		if category.Label == "" {
			return nil, fmt.Errorf("分类 %s 的名称不能为空", category.Key)
		}
		if utf8.RuneCountInString(category.Label) > maxCategoryLabelRune {
			return nil, fmt.Errorf("分类 %s 的名称不能超过 %d 个字符", category.Key, maxCategoryLabelRune)
		}
		if !categoryIconPattern.MatchString(category.Icon) {
			return nil, fmt.Errorf("分类 %s 的图标名不合法", category.Key)
		}
	}
	return categories, nil
}
