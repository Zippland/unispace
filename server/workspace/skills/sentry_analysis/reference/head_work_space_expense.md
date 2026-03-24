# head_work_space_expense 查询方案参考

## 方案 1

**查询需求：**

查询抖音和TikTok的2025年的分摊后工位费是多少
分摊指标：分摊后工位费
产品线：抖音,TikTok

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
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
      "selects": [{"enums": ["抖音", "TikTok"], "is_exclude": false}]
    },
    {
      "dim": "分摊指标",
      "selects": [{"enums": ["分摊后工位费"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：将取到的分摊后工位费数据保留四位小数。

---

## 方案 2

**查询需求：**

查询抖音的2025年的中国大陆各个职场的分摊后工位数有多少
分摊指标：分摊后工位数
产品线：抖音
区域：中国大陆

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
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
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "职场",
      "selects": [{"root": "null", "end": -1, "include_root": true}]
    },
    {
      "dim": "分摊指标",
      "selects": [{"enums": ["分摊后工位数"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["中国大陆"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的分摊后工位数数据保留四位小数，根据工位数从高到低排序。

---

## 方案 3

**查询需求：**

查询抖音的2025年的中国大陆各个职场的分摊后工位数占比
分摊指标：分摊后工位数
产品线：抖音
区域：中国大陆

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
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
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "职场",
      "selects": [{"root": "null", "end": -1, "include_root": true}]
    },
    {
      "dim": "分摊指标",
      "selects": [{"enums": ["分摊后工位数"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["中国大陆"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的分摊后工位数数据保留四位小数，同时计算每个职场的分摊后工位数占比，根据占比从高到低排序。

---

## 方案 4

**查询需求：**

抖音的2025年Q2的中国大陆工位费为什么上涨了
分摊指标：分摊后工位费
产品线：抖音
区域：中国大陆

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025-Q2", "2024-Q2"],
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
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "职场",
      "selects": [{"root": "null", "end": -1, "include_root": true}]
    },
    {
      "dim": "分摊指标",
      "selects": [{"enums": ["分摊后工位费"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["中国大陆"], "is_exclude": false}]
    }
  ]
}
2. 数据加工: 计算抖音每个职场工位费差异对2025年Q2和2024年Q2的整体工位费变化的贡献度，并根据贡献度从大到小排序，保留四位小数，根据贡献度从高到低排序。 
3. 取数
{
  "time_params": {
    "time": ["2025-Q2", "2024-Q2"],
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
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "城市",
      "selects": [{"root": "所有城市", "end": -1, "include_root": true}]
    },
    {
      "dim": "分摊指标",
      "selects": [{"enums": ["分摊后工位费"], "is_exclude": false}]
    },          
  ],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["中国大陆"], "is_exclude": false}]
    }
  ]
}
4. 数据加工: 计算抖音每个城市工位费差异对2025年Q2和2024年Q2的整体工位费变化的贡献度，并根据贡献度从大到小排序，保留四位小数，根据贡献度从高到低排序。

---

## 方案 5

**查询需求：**

查询抖音的2025年的中国大陆各个城市的分摊后工位数有多少
分摊指标：分摊后工位数
产品线：抖音
区域：中国大陆

**解决步骤：**

1. {
  "time_params": {
    "time": ["2025"],
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
      "selects": [{"enums": ["抖音"], "is_exclude": false}]
    },
    {
      "dim": "城市",
      "selects": [{"root": "所有城市", "end": -1, "include_root": true}]
    },
    {
      "dim": "分摊指标",
      "selects": [{"enums": ["分摊后工位数"], "is_exclude": false}]
    },
  ],
  "filter_axis_arr": [
    {
      "dim": "区域",
      "selects": [{"enums": ["中国大陆"], "is_exclude": false}]
    }
  ]
}
2. 数据加工：将取到的分摊后工位数数据保留四位小数, 根据工位数从高到低排序。

---
