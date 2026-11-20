package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

const modelFeaturesMaxBytes = 8 * 1024

var (
	aspectRatioPattern = regexp.MustCompile(`^[1-9]\d*:[1-9]\d*$`)
	sizePattern        = regexp.MustCompile(`^[1-9]\d*x[1-9]\d*$`)
)

type featureMediaLimit struct {
	Min   *int     `json:"min"`
	Max   *int     `json:"max"`
	Roles []string `json:"roles"`
}

type featureVideoInput struct {
	Modes     []string                      `json:"modes"`
	Frames    *map[string]featureMediaLimit `json:"frames"`
	Reference *map[string]featureMediaLimit `json:"reference"`
}

type featureOutputDefaults struct {
	Resolution     *string `json:"resolution"`
	AspectRatio    *string `json:"aspect_ratio"`
	DurationSecond *int    `json:"duration_seconds"`
}

type featureResolutionConstraint struct {
	AspectRatios    []string `json:"aspect_ratios"`
	DurationSeconds []int    `json:"duration_seconds"`
}

type featureVideoOutput struct {
	Resolutions           []string                               `json:"resolutions"`
	AspectRatios          []string                               `json:"aspect_ratios"`
	DurationSeconds       []int                                  `json:"duration_seconds"`
	Defaults              *featureOutputDefaults                 `json:"defaults"`
	ResolutionConstraints map[string]featureResolutionConstraint `json:"resolution_constraints"`
	SizeOverrides         map[string]string                      `json:"size_overrides"`
}

type featureSwitch struct {
	Supported *bool `json:"supported"`
	Default   *bool `json:"default"`
}

type featureVideo struct {
	Input         *featureVideoInput  `json:"input"`
	Output        *featureVideoOutput `json:"output"`
	GenerateAudio *featureSwitch      `json:"generate_audio"`
	Watermark     *featureSwitch      `json:"watermark"`
}

type featureDocument struct {
	Version *int          `json:"version"`
	Video   *featureVideo `json:"video"`
}

// ValidateModelFeatures validates the model capability catalog document stored
// in Model.Features. The document is intentionally small: it advertises public
// request-shape capabilities, not routing secrets or plugin implementation data.
func ValidateModelFeatures(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	if len(raw) > modelFeaturesMaxBytes {
		return fmt.Errorf("features must not exceed %d bytes", modelFeaturesMaxBytes)
	}

	var document featureDocument
	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&document); err != nil {
		return fmt.Errorf("invalid features: %w", err)
	}
	if err := requireJSONEOF(decoder); err != nil {
		return fmt.Errorf("invalid features: %w", err)
	}
	if document.Version == nil {
		return errors.New("features.version is required")
	}
	if *document.Version != 1 {
		return fmt.Errorf("unsupported features version: %d", *document.Version)
	}
	if document.Video == nil {
		return nil
	}
	if err := validateFeatureVideo(document.Video); err != nil {
		return fmt.Errorf("features.video: %w", err)
	}
	return nil
}

func requireJSONEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err == nil {
		return errors.New("multiple JSON values are not allowed")
	}
	return nil
}

func validateFeatureVideo(video *featureVideo) error {
	if video.Input != nil {
		if err := validateFeatureInput(video.Input); err != nil {
			return fmt.Errorf("input: %w", err)
		}
	}
	if video.Output != nil {
		if err := validateFeatureOutput(video.Output); err != nil {
			return fmt.Errorf("output: %w", err)
		}
	}
	if err := validateFeatureSwitch(video.GenerateAudio, "generate_audio"); err != nil {
		return err
	}
	return validateFeatureSwitch(video.Watermark, "watermark")
}

func validateFeatureInput(input *featureVideoInput) error {
	if len(input.Modes) == 0 {
		return errors.New("modes must not be empty")
	}
	if err := validateUniqueStrings(input.Modes, "modes"); err != nil {
		return err
	}
	for _, mode := range input.Modes {
		switch mode {
		case "text":
		case "frames":
			if input.Frames == nil {
				return errors.New("frames configuration is required when the frames mode is enabled")
			}
		case "reference":
			if input.Reference == nil {
				return errors.New("reference configuration is required when the reference mode is enabled")
			}
		default:
			return fmt.Errorf("unsupported input mode: %s", mode)
		}
	}
	if input.Frames != nil && !containsString(input.Modes, "frames") {
		return errors.New("frames configuration is set but the frames mode is not enabled")
	}
	if input.Reference != nil && !containsString(input.Modes, "reference") {
		return errors.New("reference configuration is set but the reference mode is not enabled")
	}
	if input.Frames != nil {
		if err := validateFeatureMediaMap(*input.Frames, "frames", true); err != nil {
			return err
		}
	}
	if input.Reference != nil {
		if err := validateFeatureMediaMap(*input.Reference, "reference", false); err != nil {
			return err
		}
	}
	return nil
}

func validateFeatureMediaMap(values map[string]featureMediaLimit, name string, requireImage bool) error {
	if len(values) == 0 {
		return fmt.Errorf("%s media limits must not be empty", name)
	}
	for media, limit := range values {
		switch media {
		case "image", "video", "audio":
		default:
			return fmt.Errorf("unsupported %s media type: %s", name, media)
		}
		if requireImage && media != "image" {
			return fmt.Errorf("%s mode only supports image limits", name)
		}
		if err := validateFeatureMediaLimit(limit); err != nil {
			return fmt.Errorf("%s.%s: %w", name, media, err)
		}
	}
	if requireImage {
		if _, ok := values["image"]; !ok {
			return fmt.Errorf("%s.image is required", name)
		}
	}
	return nil
}

func validateFeatureMediaLimit(limit featureMediaLimit) error {
	min := 0
	if limit.Min != nil {
		min = *limit.Min
		if min < 0 {
			return errors.New("min must be greater than or equal to 0")
		}
	}
	if limit.Max == nil {
		return errors.New("max is required")
	}
	if *limit.Max < min {
		return errors.New("max must be greater than or equal to min")
	}
	if *limit.Max > 1000 {
		return errors.New("max must not exceed 1000")
	}
	if *limit.Max == 0 && min > 0 {
		return errors.New("min must be 0 when max is 0")
	}
	for _, role := range limit.Roles {
		switch role {
		case "first_frame", "last_frame":
		default:
			return fmt.Errorf("unsupported role: %s", role)
		}
	}
	return validateUniqueStrings(limit.Roles, "roles")
}

func validateFeatureOutput(output *featureVideoOutput) error {
	if len(output.Resolutions) == 0 && len(output.AspectRatios) == 0 && len(output.DurationSeconds) == 0 {
		return errors.New("at least one resolution, aspect ratio, or duration is required")
	}
	if err := validateUniqueStrings(output.Resolutions, "resolutions"); err != nil {
		return err
	}
	for _, resolution := range output.Resolutions {
		if strings.TrimSpace(resolution) == "" {
			return errors.New("resolutions must not contain empty values")
		}
	}
	if err := validateUniqueStrings(output.AspectRatios, "aspect_ratios"); err != nil {
		return err
	}
	for _, ratio := range output.AspectRatios {
		if !aspectRatioPattern.MatchString(ratio) {
			return fmt.Errorf("invalid aspect ratio: %s", ratio)
		}
	}
	if err := validateUniqueIntegers(output.DurationSeconds, "duration_seconds"); err != nil {
		return err
	}
	for _, duration := range output.DurationSeconds {
		if duration <= 0 || duration > 3600 {
			return errors.New("duration_seconds values must be between 1 and 3600")
		}
	}
	if err := validateFeatureOutputDefaults(output); err != nil {
		return fmt.Errorf("defaults: %w", err)
	}
	if err := validateResolutionConstraints(output); err != nil {
		return fmt.Errorf("resolution_constraints: %w", err)
	}
	return validateSizeOverrides(output)
}

func validateFeatureOutputDefaults(output *featureVideoOutput) error {
	if output.Defaults == nil {
		return nil
	}
	defaults := output.Defaults
	if defaults.Resolution != nil && !containsString(output.Resolutions, *defaults.Resolution) {
		return fmt.Errorf("default resolution is not supported: %s", *defaults.Resolution)
	}
	if defaults.AspectRatio != nil && !containsString(output.AspectRatios, *defaults.AspectRatio) {
		return fmt.Errorf("default aspect ratio is not supported: %s", *defaults.AspectRatio)
	}
	if defaults.DurationSecond != nil {
		if !containsInteger(output.DurationSeconds, *defaults.DurationSecond) {
			return fmt.Errorf("default duration is not supported: %d", *defaults.DurationSecond)
		}
		if *defaults.DurationSecond <= 0 || *defaults.DurationSecond > 3600 {
			return errors.New("default duration must be between 1 and 3600")
		}
	}
	return nil
}

func validateResolutionConstraints(output *featureVideoOutput) error {
	for resolution, constraint := range output.ResolutionConstraints {
		if !containsString(output.Resolutions, resolution) {
			return fmt.Errorf("constraint references an unsupported resolution: %s", resolution)
		}
		if len(constraint.AspectRatios) == 0 && len(constraint.DurationSeconds) == 0 {
			return fmt.Errorf("constraint for %s must not be empty", resolution)
		}
		if err := validateSubset(constraint.AspectRatios, output.AspectRatios, "aspect ratio"); err != nil {
			return fmt.Errorf("%s: %w", resolution, err)
		}
		if err := validateUniqueStrings(constraint.AspectRatios, "aspect_ratios"); err != nil {
			return fmt.Errorf("%s: %w", resolution, err)
		}
		for _, duration := range constraint.DurationSeconds {
			if !containsInteger(output.DurationSeconds, duration) {
				return fmt.Errorf("%s: constrained duration is not supported: %d", resolution, duration)
			}
			if duration <= 0 || duration > 3600 {
				return fmt.Errorf("%s: constrained duration must be between 1 and 3600", resolution)
			}
		}
		if err := validateUniqueIntegers(constraint.DurationSeconds, "duration_seconds"); err != nil {
			return fmt.Errorf("%s: %w", resolution, err)
		}
	}
	return nil
}

func validateSizeOverrides(output *featureVideoOutput) error {
	for key, size := range output.SizeOverrides {
		parts := strings.Split(key, "|")
		if len(parts) != 2 {
			return fmt.Errorf("invalid size override key: %s", key)
		}
		resolution, ratio := parts[0], parts[1]
		if !containsString(output.Resolutions, resolution) {
			return fmt.Errorf("size override references an unsupported resolution: %s", resolution)
		}
		if !containsString(output.AspectRatios, ratio) {
			return fmt.Errorf("size override references an unsupported aspect ratio: %s", ratio)
		}
		if constraint, ok := output.ResolutionConstraints[resolution]; ok && len(constraint.AspectRatios) > 0 && !containsString(constraint.AspectRatios, ratio) {
			return fmt.Errorf("size override references a disallowed aspect ratio: %s", key)
		}
		if !sizePattern.MatchString(size) {
			return fmt.Errorf("invalid size override value: %s", size)
		}
		if err := validatePositiveDimensions(size); err != nil {
			return err
		}
	}
	return nil
}

func validatePositiveDimensions(size string) error {
	parts := strings.Split(size, "x")
	width, err := strconv.Atoi(parts[0])
	if err != nil {
		return fmt.Errorf("invalid size override value: %s", size)
	}
	height, err := strconv.Atoi(parts[1])
	if err != nil {
		return fmt.Errorf("invalid size override value: %s", size)
	}
	if width <= 0 || height <= 0 {
		return fmt.Errorf("size override dimensions must be positive: %s", size)
	}
	return nil
}

func validateFeatureSwitch(value *featureSwitch, name string) error {
	if value == nil {
		return nil
	}
	if value.Supported == nil {
		return fmt.Errorf("%s.supported is required", name)
	}
	if value.Default == nil {
		return fmt.Errorf("%s.default is required", name)
	}
	if !*value.Supported && *value.Default {
		return fmt.Errorf("%s.default cannot be enabled when supported is false", name)
	}
	return nil
}

func validateUniqueStrings(values []string, name string) error {
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		if _, exists := seen[value]; exists {
			return fmt.Errorf("%s contains a duplicate value: %s", name, value)
		}
		seen[value] = struct{}{}
	}
	return nil
}

func validateUniqueIntegers(values []int, name string) error {
	seen := make(map[int]struct{}, len(values))
	for _, value := range values {
		if _, exists := seen[value]; exists {
			return fmt.Errorf("%s contains a duplicate value: %d", name, value)
		}
		seen[value] = struct{}{}
	}
	return nil
}

func validateSubset(values, allowed []string, name string) error {
	for _, value := range values {
		if !containsString(allowed, value) {
			return fmt.Errorf("%s is not supported: %s", name, value)
		}
	}
	return nil
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func containsInteger(values []int, target int) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

// ParseModelFeatures parses a validated feature document for public catalog
// responses. Invalid or legacy data is ignored rather than breaking /api/pricing.
func ParseModelFeatures(raw string) (map[string]any, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	var features map[string]any
	decoder := json.NewDecoder(strings.NewReader(raw))
	if err := decoder.Decode(&features); err != nil {
		return nil, err
	}
	if len(features) == 0 {
		return nil, errors.New("features must be a JSON object")
	}
	return features, nil
}
