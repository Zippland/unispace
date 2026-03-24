# ecom_manual_2026 查询方案参考

## 方案 1

**查询需求：**

2026年m1v1 ,m1v2 中国电商各科目有何差异
指标：年度预算M1V1，年度预算M1V2

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2026"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "年度预算M1V1",
      "calc_type": "原始值"
    },
    {
      "version": "年度预算M1V2",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "中国电商科目",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    }
  ],
  "filter_axis_arr": []
}
2. 数据加工：计算各科目 M1V2 与 M1V1 的差异值与差异比例，保留四位小数。

---

## 方案 2

**查询需求：**

2026年年度预算M1V1 ,年度预算M1V2 中国电商大盘支付GMV有何差异
指标：年度预算M1V1，年度预算M1V2
科目：大盘支付GMV

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2026"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "年度预算M1V1",
      "calc_type": "原始值"
    },
    {
      "version": "年度预算M1V2",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "中国电商科目",
      "selects": [{"enums": ["大盘支付GMV"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": []
}
2. 数据加工：计算 M1V2 与 M1V1 的差异值与差异比例，保留四位小数。

---

## 方案 3

**查询需求：**

2026年年度预算M1V1，中国电商模拟利润的趋势
指标：年度预算M1V1
科目：中国电商业务模拟经营利润

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "年度预算M1V1",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "中国电商科目",
      "selects": [{"enums": ["中国电商业务模拟经营利润"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": []
}
2. 数据加工：保留四位小数。

---
