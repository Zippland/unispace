# self-specific-mgrpt_outsource-df 查询方案参考

## 方案 1

**查询需求：**

集团信息系统部-合计2026年年度预算M1V1各序列外包HC占比是多少（分摊前数据）
成本中心：集团信息系统部-合计
外包科目：外包HC
数据来源：分摊前

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2026"],
    "aggregation_type": "不聚合"
  },
  "data_version_arr": [
    {
      "version": "年度预算M1V1",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "序列",
      "selects": [{"root": "null", "end": 1, "include_root": false}]
    },
    {
      "dim": "成本中心",
      "selects": [{"enums": ["集团信息系统部-合计"], "is_exclude": false}]
    },
    {
      "dim": "外包科目",
      "selects": [{"enums": ["外包HC"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "data_source",
      "selects": [{"enums": ["分摊前"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算各序列外包HC占比并排序，保留四位小数，单位为%。

---

## 方案 2

**查询需求：**

2026年度预算M1V1 集团信息系统部-合计 和 电商业务部-合计 外包HC有啥差别（分摊前数据）
成本中心：集团信息系统部-合计、电商业务部-合计
外包科目：外包HC
数据来源：分摊前

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2026"],
    "aggregation_type": "不聚合"
  },
  "data_version_arr": [
    {
      "version": "年度预算M1V1",
      "calc_type": "原始值"
    }
  ],
  "view_axis_arr": [
    {
      "dim": "成本中心",
      "selects": [{"enums": ["集团信息系统部-合计", "电商业务部-合计"], "is_exclude": false}]
    },
    {
      "dim": "外包科目",
      "selects": [{"enums": ["外包HC"], "is_exclude": false}]
    },
  ],
  "filter_axis_arr": [
    {
      "dim": "data_source",
      "selects": [{"enums": ["分摊前"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算两者差值与差异比例，保留四位小数。

---

## 方案 3

**查询需求：**

电商业务部-合计成本中心 2025年12月 人员外包与TPA成本 预实差 按区域维度归因（分摊后数据）
成本中心：电商业务部-合计
外包科目：人员外包与TPA成本
数据来源：分摊后

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-12"],
    "aggregation_type": "不聚合"
  },
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
      "dim": "区域",
      "selects": [{"root": "全球", "end": 1, "include_root": false}]
    },
    {
      "dim": "成本中心",
      "selects": [{"enums": ["电商业务部-合计"], "is_exclude": false}]
    },
    {
      "dim": "外包科目",
      "selects": [{"enums": ["人员外包与TPA成本"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "data_source",
      "selects": [{"enums": ["分摊后"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：计算各区域预实差对整体预实差的贡献度并排序，保留四位小数，单位为%。

---

## 方案 4

**查询需求：**

电商业务部-合计2025年外包HC是多少（分摊后数据）
成本中心：电商业务部-合计
外包科目：外包HC
数据来源：分摊后

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
      "selects": [{"enums": ["电商业务部-合计"], "is_exclude": false}]
    },
    {
      "dim": "外包科目",
      "selects": [{"enums": ["外包HC"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "data_source",
      "selects": [{"enums": ["分摊后"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的外包HC数据保留四位小数。

---
