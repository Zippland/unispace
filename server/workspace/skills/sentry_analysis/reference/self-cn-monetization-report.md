# self-cn-monetization-report 查询方案参考

## 方案 1

**查询需求：**

中国商业化2025年 全年总收入、模拟利润是多少， 和预算对比怎么样, 数据类型为结账原始
数据类型：结账原始
科目：总收入、商业化广告模拟经营利润

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    },
    {
      "version": "年度预算-最新",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "中国商业化定制管报自定义科目",
      "selects": [{"enums": ["总收入", "商业化广告模拟经营利润"], "is_exclude": false}]
    },
    {
      "dim": "数据类型",
      "selects": [{"enums": ["结账原始"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：计算预算对比（预实差、预实差比例），保留四位小数。

---

## 方案 2

**查询需求：**

2025年 广告补贴的结账原始按月的趋势，数据类型是结账原始
数据类型：结账原始
科目：广告补贴（含税）

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "中国商业化定制管报自定义科目",
      "selects": [{"enums": ["广告补贴"], "is_exclude": false}]
    },
    {
      "dim": "数据类型",
      "selects": [{"enums": ["结账原始"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：按月输出趋势，保留四位小数。

---

## 方案 3

**查询需求：**

中国商业化2025全年总收入各个前台产品线上的分布，各月的占比变化，数据类型是结账原始
数据类型：结账原始
科目：总收入
产品线：前台产品线

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "中国商业化定制管报自定义科目",
      "selects": [{"enums": ["总收入"], "is_exclude": false}]
    },
    {
      "dim": "产品线",
      "selects": [{"root": "全部产品", "end": 1, "include_root": false}]
    },
    {
      "dim": "数据类型",
      "selects": [{"enums": ["结账原始"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：按月计算各产品线总收入占比并输出占比趋势，保留四位小数，单位为%。

---
