/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package controller

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"gorm.io/gorm"
)

const untaggedTagFilter = "__untagged__"

type channelListFacets struct {
	TypeCounts    map[int64]int64
	StatusCounts  map[int64]int64
	TagCounts     map[string]int64
	UntaggedCount int64
}

func parseStatusFilter(statusParam string) int {
	switch strings.ToLower(strings.TrimSpace(statusParam)) {
	case "enabled", "1":
		return common.ChannelStatusEnabled
	case "disabled", "0":
		return 0
	case "manually_disabled", "manual", "2":
		return common.ChannelStatusManuallyDisabled
	case "auto_disabled", "auto", "3":
		return common.ChannelStatusAutoDisabled
	default:
		return -1
	}
}

func parseTypeFilter(typeStr string) int {
	if typeStr == "" {
		return -1
	}
	parsed, err := strconv.Atoi(typeStr)
	if err != nil {
		return -1
	}
	return parsed
}

func parseTagFilter(tagParam string) (tag string, untaggedOnly bool) {
	trimmed := strings.TrimSpace(tagParam)
	if trimmed == untaggedTagFilter {
		return "", true
	}
	return trimmed, false
}

func applyChannelStatusFilter(query *gorm.DB, statusFilter int) *gorm.DB {
	if statusFilter == common.ChannelStatusEnabled ||
		statusFilter == common.ChannelStatusManuallyDisabled ||
		statusFilter == common.ChannelStatusAutoDisabled {
		return query.Where("status = ?", statusFilter)
	}
	if statusFilter == 0 {
		return query.Where("status != ?", common.ChannelStatusEnabled)
	}
	return query
}

func applyChannelTagFilter(query *gorm.DB, tag string, untaggedOnly bool) *gorm.DB {
	if untaggedOnly {
		return query.Where("tag IS NULL OR tag = ''")
	}
	if tag != "" {
		return query.Where("tag = ?", tag)
	}
	return query
}

func buildChannelListQuery(group string, statusFilter int, typeFilter int, tag string, untaggedOnly bool) *gorm.DB {
	query := model.DB.Model(&model.Channel{})
	query = model.ApplyChannelGroupFilter(query, group)
	query = applyChannelStatusFilter(query, statusFilter)
	if typeFilter >= 0 {
		query = query.Where("type = ?", typeFilter)
	}
	return applyChannelTagFilter(query, tag, untaggedOnly)
}

func collectIntColumnCounts(query *gorm.DB, column string) (map[int64]int64, error) {
	var rows []struct {
		Key   int64 `gorm:"column:k"`
		Count int64 `gorm:"column:count"`
	}
	err := query.Select(column + " as k, count(*) as count").Group(column).Find(&rows).Error
	counts := make(map[int64]int64, len(rows))
	if err != nil {
		return counts, err
	}
	for _, row := range rows {
		counts[row.Key] = row.Count
	}
	return counts, nil
}

func collectTagCounts(query *gorm.DB) (map[string]int64, int64, error) {
	var rows []struct {
		Tag   *string `gorm:"column:tag"`
		Count int64   `gorm:"column:count"`
	}
	err := query.Select("tag, count(*) as count").Group("tag").Find(&rows).Error
	counts := make(map[string]int64, len(rows))
	var untagged int64
	if err != nil {
		return counts, 0, err
	}
	for _, row := range rows {
		if row.Tag == nil || *row.Tag == "" {
			untagged += row.Count
			continue
		}
		counts[*row.Tag] = row.Count
	}
	return counts, untagged, nil
}

func collectChannelListFacets(group string, statusFilter int, typeFilter int, tag string, untaggedOnly bool) (channelListFacets, error) {
	facets := channelListFacets{
		TypeCounts:   make(map[int64]int64),
		StatusCounts: make(map[int64]int64),
		TagCounts:    make(map[string]int64),
	}
	typeCounts, err := collectIntColumnCounts(
		buildChannelListQuery(group, statusFilter, -1, tag, untaggedOnly),
		"type",
	)
	if err != nil {
		return facets, err
	}
	statusCounts, err := collectIntColumnCounts(
		buildChannelListQuery(group, -1, typeFilter, tag, untaggedOnly),
		"status",
	)
	if err != nil {
		return facets, err
	}
	tagCounts, untaggedCount, err := collectTagCounts(
		buildChannelListQuery(group, statusFilter, typeFilter, "", false),
	)
	if err != nil {
		return facets, err
	}
	facets.TypeCounts = typeCounts
	facets.StatusCounts = statusCounts
	facets.TagCounts = tagCounts
	facets.UntaggedCount = untaggedCount
	return facets, nil
}

func channelMatchesStatusFilter(status int, statusFilter int) bool {
	if statusFilter < 0 {
		return true
	}
	if statusFilter == 0 {
		return status != common.ChannelStatusEnabled
	}
	return status == statusFilter
}

func channelMatchesTypeFilter(channelType int, typeFilter int) bool {
	if typeFilter < 0 {
		return true
	}
	return channelType == typeFilter
}

func channelMatchesTagFilter(tag *string, tagFilter string, untaggedOnly bool) bool {
	if untaggedOnly {
		return tag == nil || *tag == ""
	}
	if tagFilter == "" {
		return true
	}
	return tag != nil && *tag == tagFilter
}

func filterSearchedChannels(
	channels []*model.Channel,
	statusFilter int,
	typeFilter int,
	tag string,
	untaggedOnly bool,
) []*model.Channel {
	filtered := make([]*model.Channel, 0, len(channels))
	for _, channel := range channels {
		if channel == nil {
			continue
		}
		if !channelMatchesStatusFilter(channel.Status, statusFilter) {
			continue
		}
		if !channelMatchesTypeFilter(channel.Type, typeFilter) {
			continue
		}
		if !channelMatchesTagFilter(channel.Tag, tag, untaggedOnly) {
			continue
		}
		filtered = append(filtered, channel)
	}
	return filtered
}

func countSearchFacets(
	channels []*model.Channel,
	statusFilter int,
	typeFilter int,
	tag string,
	untaggedOnly bool,
) channelListFacets {
	facets := channelListFacets{
		TypeCounts:   make(map[int64]int64),
		StatusCounts: make(map[int64]int64),
		TagCounts:    make(map[string]int64),
	}
	for _, channel := range channels {
		if channel == nil {
			continue
		}
		matchesStatus := channelMatchesStatusFilter(channel.Status, statusFilter)
		matchesType := channelMatchesTypeFilter(channel.Type, typeFilter)
		matchesTag := channelMatchesTagFilter(channel.Tag, tag, untaggedOnly)
		if matchesStatus && matchesTag {
			facets.TypeCounts[int64(channel.Type)]++
		}
		if matchesType && matchesTag {
			facets.StatusCounts[int64(channel.Status)]++
		}
		if matchesStatus && matchesType {
			if channel.Tag == nil || *channel.Tag == "" {
				facets.UntaggedCount++
			} else {
				facets.TagCounts[*channel.Tag]++
			}
		}
	}
	return facets
}
