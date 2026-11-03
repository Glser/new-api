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
