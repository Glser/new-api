#!/usr/bin/env bash
# semver-gt.sh A B — exit 0 when version A is strictly greater than B.
#
# 用于 publish-acr workflow 的版本递增校验：新镜像 tag 必须大于仓库
# VERSION 中已发布的版本。比较规则：
#   - 按 major.minor.patch 数值比较；
#   - 预发布段（-rc.1 等）低于同号正式版；同为预发布时按段比较
#     （数字比数值，其他字典序，数字段低于非数字段）；
#   - 解析失败的版本视为相等之外的最小值，仅当另一侧可解析时判其更小。
set -euo pipefail

a="${1:-}"
b="${2:-}"

parse() {
  # 输出空格分隔的 6 段：major minor patch pre 0/1(是否预发布) 0/1(是否可解析)
  local v="$1"
  local core pre rest
  if [[ "$v" =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+)(-.*)?$ ]]; then
    core="${BASH_REMATCH[1]} ${BASH_REMATCH[2]} ${BASH_REMATCH[3]}"
    pre="${BASH_REMATCH[4]#-}"
    if [ -n "$pre" ]; then
      echo "$core $pre 1 1"
    else
      echo "$core 0 0 1"
    fi
  else
    echo "0 0 0 0 1 0"
  fi
}

read -r am aj ap apre apre_a ok_a <<<"$(parse "$a")"
read -r bm bj bp bpre apre_b ok_b <<<"$(parse "$b")"

if [ "$ok_a" != "1" ] && [ "$ok_b" != "1" ]; then
  echo "semver-gt: cannot compare '$a' and '$b' (both unparseable)" >&2
  exit 1
fi

# 核心三段数值比较
if [ "$am" -ne "$bm" ]; then
  [ "$am" -gt "$bm" ] && exit 0 || exit 1
fi
if [ "$aj" -ne "$bj" ]; then
  [ "$aj" -gt "$bj" ] && exit 0 || exit 1
fi
if [ "$ap" -ne "$bp" ]; then
  [ "$ap" -gt "$bp" ] && exit 0 || exit 1
fi

# 核心相同：正式版 > 预发布；预发布之间逐段比较
if [ "$apre_a" = "0" ] && [ "$apre_b" = "0" ]; then
  exit 1 # 相等
fi
if [ "$apre_a" = "0" ]; then
  exit 0 # a 正式、b 预发布
fi
if [ "$apre_b" = "0" ]; then
  exit 1 # a 预发布、b 正式
fi

# 两个预发布：按点分段比较
IFS='.' read -r -a a_segments <<<"$apre"
IFS='.' read -r -a b_segments <<<"$bpre"
len_a=${#a_segments[@]}
len_b=${#b_segments[@]}
max_len=$(( len_a > len_b ? len_a : len_b ))
for (( i = 0; i < max_len; i++ )); do
  sa="${a_segments[$i]:-}"
  sb="${b_segments[$i]:-}"
  # 空段（短的一方）视为低于非空段
  if [ -z "$sa" ] && [ -n "$sb" ]; then exit 1; fi
  if [ -n "$sa" ] && [ -z "$sb" ]; then exit 0; fi
  if [[ "$sa" =~ ^[0-9]+$ ]] && [[ "$sb" =~ ^[0-9]+$ ]]; then
    if [ "$sa" -eq "$sb" ]; then continue; fi
    [ "$sa" -gt "$sb" ] && exit 0 || exit 1
  elif [[ "$sa" =~ ^[0-9]+$ ]]; then
    exit 1 # 数字段低于字母段（semver 规范）
  elif [[ "$sb" =~ ^[0-9]+$ ]]; then
    exit 0
  else
    if [ "$sa" = "$sb" ]; then continue; fi
    [[ "$sa" > "$sb" ]] && exit 0 || exit 1
  fi
done
exit 1 # 完全相等
