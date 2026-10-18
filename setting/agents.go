package setting

import (
	"encoding/json"

	"github.com/QuantumNous/new-api/common"
)

type AgentShowcaseItem struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Tag         string `json:"tag"`
	Description string `json:"description"`
	GuideURL    string `json:"guide_url"`
	IconKey     string `json:"icon_key"`
	AccentColor string `json:"accent_color"`
}

var Agents = []AgentShowcaseItem{
	{
		ID:          "chatgpt",
		Name:        "ChatGPT Work(Codex)",
		Tag:         "Codex Agent",
		Description: "OpenAI 官方编程智能体，终端与云端任务一站调度",
		GuideURL:    "https://api.oioi.lat/pages/codex-guide/#codex/install",
		IconKey:     "Codex.Color",
		AccentColor: "#10a37f",
	},
	{
		ID:          "claude-code",
		Name:        "Claude Code",
		Tag:         "CLI Agent",
		Description: "Anthropic 终端编程智能体，长上下文推理与自动重构",
		GuideURL:    "https://api.oioi.lat/pages/codex-guide/#agent/workbuddy",
		IconKey:     "ClaudeCode.Color",
		AccentColor: "#d97706",
	},
	{
		ID:          "workbuddy",
		Name:        "WorkBuddy",
		Tag:         "Agent",
		Description: "企业协同研发智能体，贯通需求、编码与交付全流程",
		GuideURL:    "https://api.oioi.lat/pages/codex-guide/#agent/workbuddy",
		IconKey:     "CodeBuddy.Color",
		AccentColor: "#3b82f6",
	},
	{
		ID:          "hermes",
		Name:        "Hermes",
		Tag:         "Autonomous",
		Description: "高阶自主智能体，复杂工具调用与多步任务自动执行",
		GuideURL:    "https://api.oioi.lat/pages/codex-guide/#agent/hermes",
		IconKey:     "HermesAgent",
		AccentColor: "#ec4899",
	},
	{
		ID:          "trae",
		Name:        "Trae",
		Tag:         "AI IDE",
		Description: "AI 原生 IDE，上下文感知的编码、调试与重构体验",
		GuideURL:    "https://api.oioi.lat/pages/codex-guide/#agent/trae",
		IconKey:     "Trae.Color",
		AccentColor: "#10b981",
	},
	{
		ID:          "deepseek-harness",
		Name:        "DeepSeek Harness",
		Tag:         "Reasoning",
		Description: "DeepSeek 推理加速套件，完整释放长思考链潜能",
		GuideURL:    "https://api.oioi.lat/pages/codex-guide/#agent/workbuddy",
		IconKey:     "DeepSeek.Color",
		AccentColor: "#0284c7",
	},
}

func UpdateAgentsByJsonString(jsonString string) error {
	newAgents := make([]AgentShowcaseItem, 0)
	if err := json.Unmarshal([]byte(jsonString), &newAgents); err != nil {
		return err
	}
	Agents = newAgents
	return nil
}

func Agents2JsonString() string {
	jsonBytes, err := json.Marshal(Agents)
	if err != nil {
		common.SysLog("error marshalling agents: " + err.Error())
		return "[]"
	}
	return string(jsonBytes)
}
