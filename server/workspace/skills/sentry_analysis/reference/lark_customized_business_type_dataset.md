# lark_customized_business_type_dataset 查询方案参考

## 方案 1

**查询需求：**

2025各个季度各个汇报业务线上 SAAS交付 外部收入的季度趋势和预实对比
业务类型：SaaS交付
科目：外部收入

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-01", "2025-02", "2025-03", "2025-04"],
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
      "dim": "汇报业务线",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    },
    {
      "dim": "lark子业务线科目",
      "selects": [{"enums": ["外部收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "业务类型",
      "selects": [{"enums": ["SaaS交付"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：按季度输出各业务线的预实对比趋势，保留四位小数。

---

## 方案 2

**查询需求：**

25年中国 销售费用占收比 的 按月趋势变化
区域：中国大陆
科目：销售费用占收比

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
    },
    {
      "dim": "lark子业务线科目",
      "selects": [{"enums": ["销售费用占收比"], "is_exclude": false}]
    }
  ],
  "view_axis_arr": [],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["中国大陆"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：按月输出趋势变化，保留四位小数。

---

## 方案 3

**查询需求：**

Lark Business Platform 各个业务类型25年全年的外部收入、外部毛利、外部毛利率情况对比
业务线：Lark Business Platform
科目：外部收入、外部毛利、外部毛利率

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
      "dim": "业务类型",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    },
    {
      "dim": "lark子业务线科目",
      "selects": [{"enums": ["外部收入", "外部毛利", "外部毛利率"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "lark自定义业务线",
      "selects": [{"enums": ["Lark Business Platform"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：对比各业务类型全年收入、毛利、毛利率，保留四位小数。

---
