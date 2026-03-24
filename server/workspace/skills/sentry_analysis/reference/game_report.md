# game_report 查询方案参考

## 方案 1

**查询需求：**

查询项目名称为创世之歌的2025年的总流水是多少
游戏自定义科目：总流水
项目名称：创世之歌

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "年度"
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
      "dim": "游戏自定义科目",
      "selects": [{"enums": ["总流水"], "is_exclude": false}]
    },
    {
      "dim": "项目名称",
      "selects": [{"enums": ["创世之歌"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：将取到的总流水数据保留四位小数。

---

## 方案 2

**查询需求：**

查看各个游戏工作室总流水占比
游戏自定义科目：总流水

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "年度"
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
      "dim": "工作室",
      "selects": [{"root": "null", "end": 1, "include_root": true}]
    },
    {
      "dim": "游戏自定义科目",
      "selects": [{"enums": ["总流水"], "is_exclude": false}]
    }
  ],
  "filter_axis_arr": [

  ]
}
2. 数据加工：计算每个工作室的总流水占比，根据占比进行从高到底排序，保留两位小数。

---

## 方案 3

**查询需求：**

查看各个项目总流水占比
游戏自定义科目：总流水

**解决步骤：**

1. 取数
{
  "time_params": {
    "time": ["2025"],
    "aggregation_type": "年度"
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
      "dim": "项目名称",
      "selects": [{"root": "null", "end": 1, "include_root": true}]
    },
    {
      "dim": "游戏自定义科目",
      "selects": [{"enums": ["总流水"], "is_exclude": false}]
    },          
  ],
  "filter_axis_arr": [
  ]
}
2. 数据加工：计算每个项目的总流水占比，根据占比进行从高到底排序，保留两位小数。

---
