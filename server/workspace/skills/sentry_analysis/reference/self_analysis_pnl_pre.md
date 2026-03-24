# self_analysis_pnl_pre 查询方案参考

## 方案 1

**查询需求：**

查询抖音和TikTok的2025年的净收入是多少, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音,TikTok

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
      "dim": "产品线",
      "selects": [{"enums": ["抖音", "TikTok"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的净收入数据保留四位小数。

---

## 方案 2

**查询需求：**

查询抖音的2024年的净收入同比增长是多少, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音
**同比和环比数据可直接取数**

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2024"],
    "aggregation_type": "不聚合"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "同比差值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的净收入同比增长数据保留四位小数，单位为%。

---

## 方案 3

**查询需求：**

分析2025年Q2抖音净收入上涨的原因，按照科目维度分析（归因/贡献类问题）, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音

**解决步骤：**

备注：未指定周期，按照同比（前一年）进行对比。
1. 取数
{
  "time_params": {
    "time": ["2024-Q2", "2025-Q2"],
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
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"root": "净收入", "end": 1, "include_root": true}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算抖音每个净收入子科目之间差异对抖音2025年Q2相对2024年Q2的净收入整体变化的贡献度，并根据贡献度从大到小排序，保留四位小数，单位为%。
**注意**：任何涉及到归因、找原因分析的问题都需要算贡献度

---

## 方案 4

**查询需求：**

分析2025年Q2抖音净收入上涨的原因，按照区域维度拆解下钻（归因/贡献类问题）, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音
区域： 全球

**解决步骤：**

备注：未指定周期，按照同比（前一年）进行对比。
1. 取数
{
  "time_params": {
    "time": ["2024-Q2", "2025-Q2"],
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
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    },
    {
      "dim": "区域",
      "selects": [{"root": "全球", "end": 1, "include_root": true}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算抖音每个区域子项净收入差异对抖音2025年Q2相对2024年Q2的整体净收入变化的贡献度，并根据贡献度从大到小排序，保留四位小数，单位为%。
**注意**：任何涉及到归因、找原因分析的问题都需要算贡献度

---

## 方案 5

**查询需求：**

分析2025年每个月抖音经营利润率变化趋势, 币种为人民币, 使用USD/CNY报表折算汇率
科目：经营利润率
产品线：抖音

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
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["经营利润率"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的经营利润率数据保留四位小数，单位为%。

---

## 方案 6

**查询需求：**

抖音2025年收入增速最快的前5名的国家（末级区域）分别是哪些, 币种为人民币, 使用USD/CNY报表折算汇率
假设最新实际值时间：2025年08月
科目：净收入
产品线：抖音
区域： 全球

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08"],
    "aggregation_type": "年度"
  },
  "currency": "人民币",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    },
    {
      "version": "实际预估",
      "calc_type": "同比差值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    },
    {
      "dim": "区域",
      "selects": [{"root": "全球", "end": -1, "include_root": true}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工:按照抖音每个国家2025年8月YTD净收入的环比排序，取出 Top5，保留四位小数，单位为%。

---

## 方案 7

**查询需求：**

查询抖音的2024年Q2的净收入预算完成度是多少, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音
**值类型预算完成度为实际值除以预算值**

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2024-Q2"],
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
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工:计算抖音2024年Q2的净收入预算完成度百分比，预算完成度=实际值/预算值，保留四位小数，单位为%。

---

## 方案 8

**查询需求：**

2024年Q2抖音各个产品子项的净收入是多少, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2024-Q2"],
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
      "dim": "产品线",
      "selects": [{"root": "抖音", "end": 1, "include_root": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["全球"], "is_exclude": false}]
    },
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工:将取到的2024年Q2抖音各个产品子项的净收入数据保留四位小数。

---

## 方案 9

**查询需求：**

TikTok含/不含电商2025年1月经营利润率对比, 币种为美元, 使用USD/CNY报表折算汇率
科目：经营利润率
产品线：TikTok

**解决步骤：**

**含电商和不含电商必须分两次进行取数**
1. 取数
{
  "time_params": {
    "time": ["2025-01"],
    "aggregation_type": "不聚合"
  },
  "currency": "美元",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "产品线",
      "selects": [{"enums": ["TikTok"], "is_exclude": false}]
    },
    {
      "dim": "tt是否含电商",
      "selects": [{"enums": ["含电商", "不含电商"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["经营利润率"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的经营利润率数据保留四位小数，单位为%。

---

## 方案 10

**查询需求：**

2024年全部产品不含抖音净收入是多少, 币种为美元, 使用实际汇率
科目：净收入
产品线：抖音

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2024"],
    "aggregation_type": "不聚合"
  },
  "currency": "美元",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "产品线",
      "selects": [
        {"root": "全部产品", "end": 1, "include_root": true},
        {"enums": ["抖音"], "is_exclude": true}
      ]
    },
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["实际汇率"], "is_exclude": false}]
    }
  ]
}

---

## 方案 11

**查询需求：**

2025年净收入预实差（'预算'和实际值（即'实际预估'）两个取数口径的差值）是多少, 币种为美元, 使用实际汇率
科目：净收入
当前最新数据月份：2025年7月

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2024-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07"],
    "aggregation_type": "年度"
  },
  "currency": "美元",
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
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    },
    {
      "dim": "指标",
      "selects": [{"enums": ["实际预估", "年度预算-最新"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["实际汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算2025年1-7月净收入预实差，预实差 = 实际预估值 - 预算值，保留四位小数，单位为美元。

---

## 方案 12

**查询需求：**

2024年全部产品不含抖音各产品线净收入占比是多少, 币种为美元, 使用实际汇率
科目：净收入
产品线：全部产品不含抖音

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2024"],
    "aggregation_type": "不聚合"
  },
  "currency": "美元",
  "data_version_arr": [
    {
      "version": "实际预估",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "产品线",
      "selects": [
        {"root": "全部产品", "end": 1, "include_root": true},
        {"enums": ["抖音"], "is_exclude": true}
      ]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["净收入"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["实际汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算各产品线净收入占比，保留四位小数，单位为%。

---

## 方案 13

**查询需求：**

查询2025年抖音产品线分摊过来的成本及费用, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
产品线：抖音

**解决步骤：**

**产品默认从业务分摊起点进行分摊**
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
      "dim": "产品线",
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["成本及费用"], "is_exclude": false}]
    },
    {
      "dim": "业务分摊起点",
      "selects": [{"root": "全部产品", "end": -1, "include_root": true}]
    },
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：业务分摊起点维度排除抖音后，剩下的是分摊来的成本及费用数据，将取到的成本及费用数据保留四位小数。

---

## 方案 14

**查询需求：**

查询2025年电商(中国大陆) 中台分摊过来的成本及费用, 币种为人民币, 使用USD/CNY报表折算汇率
科目：净收入
中台：电商(中国大陆)

**解决步骤：**

**中台默认从中台分摊起点进行分摊**
1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "年度"
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
      "dim": "中台",
      "selects": [{"enums": ["电商(中国大陆)"], "is_exclude": false}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["成本及费用"], "is_exclude": false}]
    },
    {
      "dim": "中台分摊起点",
      "selects": [{"root": "null", "end": -1, "include_root": true}]
    },
  ],
  "filter_axis_arr": [
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：中台分摊起点维度排除电商(中国大陆)后，剩下的是分摊来的成本及费用数据，将取到的成本及费用数据保留四位小数。

---

## 方案 15

**查询需求：**

查询2025年“员工福利-内部“ 录入成本中心为”人力与管理部-企业文化与雇主品牌-活动中台“ 分摊给了哪些成本中心, 币种为人民币, 使用USD/CNY报表折算汇率
科目：员工福利-内部
录入成本中心：人力与管理部-企业文化与雇主品牌-活动中台

**解决步骤：**

**中台默认从中台分摊起点进行分摊**
1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "年度"
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
      "selects": [{"root": "集团", "end": -1, "include_root": true}]
    },
    {
      "dim": "科目",
      "selects": [{"enums": ["员工福利-内部"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "录入成本中心",
      "selects": [{"enums": ["人力与管理部-企业文化与雇主品牌-活动中台"], "is_exclude": false}]
    },
    {
      "dim": "区域",
      "selects": [{"enums": ["全球"], "is_exclude": false}]
    },
    {
      "dim": "汇率类型",
      "selects": [{"enums": ["USD/CNY报表折算汇率"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的子项成本中心数据，根据实际值从大到小排序，保留四位小数。

---
