# toufan-customized_mgrpt 查询方案参考

## 方案 1

**查询需求：**

短剧整体 2025年收入、经营利润 如何？
科目：收入、利润

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
      "dim": "番茄自定义科目",
      "selects": [{"enums": ["收入", "利润"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：将取到的收入与利润数据保留四位小数。

---

## 方案 2

**查询需求：**

2025年Q4短剧整体的经营利润（收入）各个 产品线月度占比趋势如何
科目：收入、利润

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-10", "2025-11", "2025-12"],
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
      "dim": "番茄自定义业务线",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    },
    {
      "dim": "番茄自定义科目",
      "selects": [{"enums": ["收入", "利润"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": []
}
2. 数据加工：按月计算各产品线收入与利润占比并输出趋势，保留四位小数，单位为%。

---

## 方案 3

**查询需求：**

红果短剧 2025年Q1 各项 收入 占 总收入 的比例 月度趋势如何
业务线：红果短剧
科目：收入（各子项）

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-01", "2025-02", "2025-03"],
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
      "dim": "番茄自定义科目",
      "selects": [{"root": "收入", "end": 1, "include_root": false}]
    },
    {
      "dim": "番茄自定义业务线",
      "selects": [{"enums": ["红果短剧"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：按月计算各收入子项占总收入比例并输出趋势，保留四位小数，单位为%。

---
