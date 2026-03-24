# group_management_general 查询方案参考

## 方案 1

**查询需求：**

2025年集团职能合计职能业务线分摊来的成本费用来自哪些成本中心？
集团职能业务线：集团职能合计
分摊方式：分摊来的费用
预算科目：成本及费用

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
    }
  ],
  "view_axis_arr": [
    {
      "dim": "成本中心",
      "selects": [{"root": "集团", "end": 1, "include_root": true}]
    },
    {
      "dim": "预算科目",
      "selects": [{"enums": ["成本及费用"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "集团职能业务线",
      "selects": [{"enums": ["集团职能合计"], "is_exclude": false}]
    },
    {
      "dim": "分摊方式",
      "selects": [{"enums": ["分摊来的费用"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：按成本中心汇总并排序，保留四位小数。

---

## 方案 2

**查询需求：**

集团职能合计职能业务线 2025年10月成本费用预实达成度如何
集团职能业务线：集团职能合计
预算科目：成本及费用

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-10"],
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
      "dim": "预算科目",
      "selects": [{"enums": ["成本及费用"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "集团职能业务线",
      "selects": [{"enums": ["集团职能合计"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算预实达成度=实际值/预算值，保留四位小数，单位为%。

---

## 方案 3

**查询需求：**

集团职能合计职能业务线 2025年 各个二级成本中心 成本费用达成度如何，哪些二级cc偏差较大
集团职能业务线：集团职能合计
预算科目：成本及费用

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
      "dim": "成本中心",
      "selects": [{"root": "集团", "end": 2, "include_root": true}]
    },
    {
      "dim": "预算科目",
      "selects": [{"enums": ["成本及费用"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "集团职能业务线",
      "selects": [{"enums": ["集团职能合计"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算各二级成本中心达成度并识别偏差较大的项，保留四位小数，单位为%。

---
