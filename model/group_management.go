package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"gorm.io/gorm"
)

var groupMutationMu sync.Mutex

type GroupDeleteError struct {
	Code string
}

func (err *GroupDeleteError) Error() string { return err.Code }

type GroupDeleteResult struct {
	UpdatedChannels int `json:"updated_channels"`
}

// DeleteManagedGroup removes configuration and routing references atomically.
// Account, token and subscription assignments must be moved explicitly first.
func DeleteManagedGroup(name, replacement string) (GroupDeleteResult, error) {
	result := GroupDeleteResult{}
	if name == "" || name == "default" || name == "auto" || name == "all" {
		return result, &GroupDeleteError{Code: "GROUP_PROTECTED"}
	}
	groupMutationMu.Lock()
	defer groupMutationMu.Unlock()

	values := map[string]string{
		"GroupRatio":       ratio_setting.GroupRatio2JSONString(),
		"TopupGroupRatio":  common.TopupGroupRatio2JSONString(),
		"UserUsableGroups": setting.UserUsableGroups2JSONString(),
		"GroupGroupRatio":  ratio_setting.GroupGroupRatio2JSONString(),
		"AutoGroups":       setting.AutoGroups2JsonString(),
		"group_ratio_setting.group_special_usable_group": ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.MarshalJSONString(),
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		keys := make([]string, 0, len(values))
		for key := range values {
			keys = append(keys, key)
		}
		slices.Sort(keys)
		var options []Option
		if err := lockForUpdate(tx).Where("key IN ?", keys).Order("key").Find(&options).Error; err != nil {
			return err
		}
		for _, option := range options {
			values[option.Key] = option.Value
		}

		var ratios, topup map[string]float64
		var usable map[string]string
		var overrides map[string]map[string]float64
		var special map[string]map[string]string
		var auto []string
		for key, target := range map[string]any{
			"GroupRatio": &ratios, "TopupGroupRatio": &topup,
			"UserUsableGroups": &usable, "GroupGroupRatio": &overrides,
			"AutoGroups": &auto, "group_ratio_setting.group_special_usable_group": &special,
		} {
			if err := json.Unmarshal([]byte(values[key]), target); err != nil {
				return fmt.Errorf("invalid group configuration: %s", key)
			}
		}
		if replacement != "" {
			if _, ok := ratios[replacement]; !ok || replacement == name || replacement == "auto" || replacement == "all" {
				return &GroupDeleteError{Code: "GROUP_REPLACEMENT_INVALID"}
			}
		}
		if err := checkManagedGroupReferences(tx, name); err != nil {
			return err
		}
		var channels []Channel
		if err := lockForUpdate(tx).Select("id", "group", "models", "status", "priority", "weight", "tag").Order("id").Find(&channels).Error; err != nil {
			return err
		}
		for _, channel := range channels {
			groups := strings.Split(channel.Group, ",")
			remaining := make([]string, 0, len(groups))
			found := false
			for _, group := range groups {
				group = strings.TrimSpace(group)
				if group == name {
					found = true
				} else if group != "" {
					remaining = append(remaining, group)
				}
			}
			if !found {
				continue
			}
			if len(remaining) == 0 {
				if replacement == "" {
					return &GroupDeleteError{Code: "GROUP_LAST_CHANNEL"}
				}
				remaining = append(remaining, replacement)
			}
			channel.Group = strings.Join(remaining, ",")
			if err := tx.Model(&Channel{}).Where("id = ?", channel.Id).Update("group", channel.Group).Error; err != nil {
				return err
			}
			if err := channel.UpdateAbilities(tx); err != nil {
				return err
			}
			result.UpdatedChannels++
		}
		delete(ratios, name)
		delete(topup, name)
		delete(usable, name)
		delete(overrides, name)
		for _, entries := range overrides {
			delete(entries, name)
		}
		delete(special, name)
		for _, entries := range special {
			delete(entries, name)
			delete(entries, "+:"+name)
			delete(entries, "-:"+name)
		}
		auto = slices.DeleteFunc(auto, func(group string) bool { return group == name })
		for key, value := range map[string]any{
			"GroupRatio": ratios, "TopupGroupRatio": topup, "UserUsableGroups": usable,
			"GroupGroupRatio": overrides, "AutoGroups": auto,
			"group_ratio_setting.group_special_usable_group": special,
		} {
			encoded, err := json.Marshal(value)
			if err != nil {
				return err
			}
			values[key] = string(encoded)
			option := Option{Key: key}
			if err := tx.Where("key = ?", key).Assign(Option{Value: string(encoded)}).FirstOrCreate(&option).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return GroupDeleteResult{}, err
	}
	for key, value := range values {
		if err := updateOptionMap(key, value); err != nil {
			return result, err
		}
	}
	InitChannelCache()
	RefreshPricing()
	return result, nil
}

// RenameManagedGroup rewrites every configuration and assignment reference of
// a group atomically. Historical logs and metrics intentionally keep the old name.
func RenameManagedGroup(oldName, newName string) error {
	oldName, newName = strings.TrimSpace(oldName), strings.TrimSpace(newName)
	for _, name := range []string{oldName, newName} {
		if name == "" || name == "default" || name == "auto" || name == "all" {
			return errors.New("默认分组、auto、all 不能参与重命名")
		}
	}
	if oldName == newName {
		return errors.New("新分组名不能与原分组名相同")
	}
	if len(newName) > 64 || strings.ContainsAny(newName, ", ") || strings.HasPrefix(newName, "+:") || strings.HasPrefix(newName, "-:") {
		return errors.New("分组名不能超过 64 个字符，且不能包含逗号、空格或 +:、-: 前缀")
	}
	groupMutationMu.Lock()
	defer groupMutationMu.Unlock()

	values := map[string]string{
		"GroupRatio":                 ratio_setting.GroupRatio2JSONString(),
		"TopupGroupRatio":            common.TopupGroupRatio2JSONString(),
		"UserUsableGroups":           setting.UserUsableGroups2JSONString(),
		"GroupGroupRatio":            ratio_setting.GroupGroupRatio2JSONString(),
		"AutoGroups":                 setting.AutoGroups2JsonString(),
		"ModelRequestRateLimitGroup": setting.ModelRequestRateLimitGroup2JSONString(),
		"group_ratio_setting.group_special_usable_group": ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.MarshalJSONString(),
	}
	var userIds []int
	var tokens []Token
	err := DB.Transaction(func(tx *gorm.DB) error {
		keys := make([]string, 0, len(values))
		for key := range values {
			keys = append(keys, key)
		}
		slices.Sort(keys)
		var options []Option
		if err := lockForUpdate(tx).Where("key IN ?", keys).Order("key").Find(&options).Error; err != nil {
			return err
		}
		for _, option := range options {
			values[option.Key] = option.Value
		}
		var ratios map[string]float64
		if err := json.Unmarshal([]byte(values["GroupRatio"]), &ratios); err != nil {
			return errors.New("invalid group configuration: GroupRatio")
		}
		if _, ok := ratios[oldName]; !ok {
			return errors.New("原分组不存在")
		}
		if _, ok := ratios[newName]; ok {
			return errors.New("新分组名已存在")
		}
		for _, key := range keys {
			var value any
			if err := json.Unmarshal([]byte(values[key]), &value); err != nil {
				return fmt.Errorf("invalid group configuration: %s", key)
			}
			encoded, err := json.Marshal(renameGroupInJSON(value, oldName, newName, key == "group_ratio_setting.group_special_usable_group"))
			if err != nil {
				return err
			}
			values[key] = string(encoded)
			option := Option{Key: key}
			if err := tx.Where("key = ?", key).Assign(Option{Value: values[key]}).FirstOrCreate(&option).Error; err != nil {
				return err
			}
		}

		var channels []Channel
		if err := lockForUpdate(tx).Select("id", "group", "models", "status", "priority", "weight", "tag").Order("id").Find(&channels).Error; err != nil {
			return err
		}
		for _, channel := range channels {
			groups := strings.Split(channel.Group, ",")
			found := false
			for i, group := range groups {
				if strings.TrimSpace(group) == oldName {
					groups[i] = newName
					found = true
				}
			}
			if !found {
				continue
			}
			channel.Group = strings.Join(groups, ",")
			if err := tx.Model(&Channel{}).Where("id = ?", channel.Id).Update("group", channel.Group).Error; err != nil {
				return err
			}
			if err := channel.UpdateAbilities(tx); err != nil {
				return err
			}
		}

		if err := tx.Model(&User{}).Where(commonGroupCol+" = ?", oldName).Pluck("id", &userIds).Error; err != nil {
			return err
		}
		if err := tx.Model(&User{}).Where(commonGroupCol+" = ?", oldName).Update("group", newName).Error; err != nil {
			return err
		}

		if err := tx.Select("id", commonKeyCol, "group", "auto_groups").Where(commonGroupCol+" = ? OR auto_groups <> ''", oldName).Find(&tokens).Error; err != nil {
			return err
		}
		changed := tokens[:0]
		for _, token := range tokens {
			groups, err := token.GetAutoGroups()
			if err != nil {
				return fmt.Errorf("令牌 %d 的自动分组配置无效，请先修正", token.Id)
			}
			if token.Group != oldName && !slices.Contains(groups, oldName) {
				continue
			}
			if token.Group == oldName {
				token.Group = newName
			}
			for i, group := range groups {
				if group == oldName {
					groups[i] = newName
				}
			}
			if err := token.SetAutoGroups(groups); err != nil {
				return err
			}
			if err := tx.Model(&Token{}).Where("id = ?", token.Id).Updates(map[string]any{"group": token.Group, "auto_groups": token.AutoGroups}).Error; err != nil {
				return err
			}
			changed = append(changed, token)
		}
		tokens = changed

		for _, column := range []string{"upgrade_group", "downgrade_group"} {
			if err := tx.Model(&SubscriptionPlan{}).Where(column+" = ?", oldName).Update(column, newName).Error; err != nil {
				return err
			}
		}
		for _, column := range []string{"upgrade_group", "downgrade_group", "prev_user_group"} {
			if err := tx.Model(&UserSubscription{}).Where(column+" = ?", oldName).Update(column, newName).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	for key, value := range values {
		if err := updateOptionMap(key, value); err != nil {
			return err
		}
	}
	InitChannelCache()
	RefreshPricing()
	for _, id := range userIds {
		_ = invalidateUserCache(id)
	}
	return invalidateTokensCache(tokens)
}

// renameGroupInJSON renames map keys and string array items equal to the group.
// Special usable group entries also carry "+:" and "-:" prefixed keys.
func renameGroupInJSON(value any, oldName, newName string, prefixed bool) any {
	switch typed := value.(type) {
	case map[string]any:
		renamed := make(map[string]any, len(typed))
		for key, item := range typed {
			for _, prefix := range []string{"", "+:", "-:"} {
				if key == prefix+oldName && (prefix == "" || prefixed) {
					key = prefix + newName
					break
				}
			}
			renamed[key] = renameGroupInJSON(item, oldName, newName, prefixed)
		}
		return renamed
	case []any:
		for i, item := range typed {
			if item == oldName {
				typed[i] = newName
			} else {
				typed[i] = renameGroupInJSON(item, oldName, newName, prefixed)
			}
		}
		return typed
	}
	return value
}

func checkManagedGroupReferences(tx *gorm.DB, name string) error {
	var count int64
	if err := tx.Model(&User{}).Where(commonGroupCol+" = ?", name).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return &GroupDeleteError{Code: "GROUP_REFERENCED"}
	}
	var tokens []Token
	if err := tx.Select("group", "auto_groups").Where(commonGroupCol+" = ? OR auto_groups <> ''", name).Find(&tokens).Error; err != nil {
		return err
	}
	for _, token := range tokens {
		if token.Group == name {
			return &GroupDeleteError{Code: "GROUP_REFERENCED"}
		}
		groups, err := token.GetAutoGroups()
		if err != nil {
			return errors.New("invalid token auto groups; update the token before deleting this group")
		}
		if slices.Contains(groups, name) {
			return &GroupDeleteError{Code: "GROUP_REFERENCED"}
		}
	}
	for _, query := range []*gorm.DB{
		tx.Model(&SubscriptionPlan{}).Where("upgrade_group = ? OR downgrade_group = ?", name, name),
		tx.Model(&UserSubscription{}).Where("upgrade_group = ? OR downgrade_group = ? OR prev_user_group = ?", name, name, name),
	} {
		if err := query.Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return &GroupDeleteError{Code: "GROUP_REFERENCED"}
		}
	}
	return nil
}
