# tt-music 查询方案参考

## 方案 1

**查询需求：**

2026年预算和2025年实际 TTmusic 各科目的主要数据差异有哪些
科目：TT Music自定义科目
指标：年度预算-最新、实际预估

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025", "2026"],
    "aggregation_type": "不聚合"
  },
  "data_version_arr": [
    {
      "version": "年度预算-最新",
      "calc_type": "原始值"
    },
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "TTMUSIC自定义科目",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    }
  ],
  "filter_axis_arr": []
}
2. 数据加工：计算各科目2026年度预算-最新与2025实际预估的差异值与差异比例，保留四位小数。

---

## 方案 2

**查询需求：**

2026年 年度预算-最新 与2025年 实际预估 在TTmusic 净收入差异有哪些,从科目维度下钻分析
科目：净收入
指标：年度预算-最新、实际预估

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025", "2026"],
    "aggregation_type": "不聚合"
  },
  "data_version_arr": [
    {
      "version": "年度预算-最新",
      "calc_type": "原始值"
    },
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "TTMUSIC自定义科目",
      "selects": [{"root": "净收入", "end": 1, "include_root": true}]
    }
  ],
  "filter_axis_arr": []
}
2. 数据加工：计算净收入及其子科目差异值与差异比例并排序，保留四位小数。

---

## 方案 3

**查询需求：**

TTmusic 2025年 成本费用 各个成本中心的构成如何
科目：成本及费用
时间：2025年

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "不聚合"
  },
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "成本中心",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    },
    {
      "dim": "TTMUSIC自定义科目",
      "selects": [{"enums": ["成本及费用"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：计算各成本中心构成占比并排序，保留四位小数，单位为%。

---
