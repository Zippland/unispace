---
name: pyecharts
description: "用 pyecharts 生成交互式图表并导出 HTML 文件。当用户要做数据可视化/图表/报表展示时调用。"
---

# Pyecharts（HTML 图表输出）

## 目标

- 把结构化数据（CSV 文件中的列表/表格/时序/分组聚合结果）用 pyecharts 画成交互式图表。
- 输出为 HTML 文件（可在浏览器打开）。

## 什么时候用

- 用户要求"画图/可视化/仪表盘/趋势图/柱状图/饼图/TopN"等。
- 用户要求"导出一个 HTML 图表文件""给我一个可打开的网页图"。
- 用户说"图片形式"，但可接受交互图：直接给 HTML。

## 数据来源

- **所有画图数据必须从 CSV 文件读取**，不要在代码中硬编码数据。
- 使用 `pandas.read_csv()` 读取数据文件，再提取所需列作为图表的 x/y 轴数据。
- 如果用户没有指定 CSV 文件路径，先确认文件位置再画图。

## CSV 文件格式要求

- 编码：UTF-8（带或不带 BOM 均可）
- 分隔符：逗号 `,`
- 第一行必须是表头（列名），后续行为数据
- 列名使用英文或中文均可，代码中按实际列名引用

各图表类型对应的 CSV 格式示例：

### 折线图 / 柱状图（时序趋势）

```csv
month,net_revenue
2025-01,12.3
2025-02,15.8
2025-03,14.2
```

### 饼图（分类构成）

```csv
category,amount
抖音,42
TikTok,35
其他,23
```

### 柱状图（TopN 排名）

```csv
product,amount
A,120
B,90
C,60
```

### 双轴图（多指标）

```csv
month,amount,ratio
2025-01,120,0.18
2025-02,150,0.22
2025-03,130,0.20
```

### 热力图（三列长格式）

```csv
region,quarter,value
北美,Q1,12
北美,Q2,18
欧洲,Q1,7
欧洲,Q2,11
东南亚,Q1,16
东南亚,Q2,8
```

### 多系列折线图 / 柱状图（宽格式）

```csv
month,系列A,系列B,系列C
2025-01,12,8,15
2025-02,18,11,14
2025-03,9,13,16
```

## 输出建议

- 默认输出路径放在会话工作目录下的 `artifacts/` 或 `output/`（确保可被工具写入/读取）。
- HTML 文件命名要能体现内容：`chart_revenue_2025q1.html`、`chart_top_products.html`。
- 多图场景：输出多个 HTML 文件，不需要合并到同一个页面。

## 基本用法（Python）

### 1）折线图（趋势）

```python
import pandas as pd
from pyecharts.charts import Line
from pyecharts import options as opts

df = pd.read_csv("data/revenue.csv")
x = df["month"].tolist()
y = df["net_revenue"].tolist()

chart = (
    Line(init_opts=opts.InitOpts(width="980px", height="520px"))
    .add_xaxis(x)
    .add_yaxis("净收入", y, is_smooth=True)
    .set_global_opts(
        title_opts=opts.TitleOpts(title="净收入趋势"),
        tooltip_opts=opts.TooltipOpts(trigger="axis"),
        datazoom_opts=[opts.DataZoomOpts(type_="inside"), opts.DataZoomOpts(type_="slider")],
        yaxis_opts=opts.AxisOpts(axislabel_opts=opts.LabelOpts(formatter="{value}")),
    )
)

out = "artifacts/chart_net_revenue_trend.html"
chart.render(out)
print(out)
```

### 2）饼图（构成）

```python
import pandas as pd
from pyecharts.charts import Pie
from pyecharts import options as opts

df = pd.read_csv("data/revenue_mix.csv")
items = list(zip(df["category"].tolist(), df["amount"].tolist()))

chart = (
    Pie(init_opts=opts.InitOpts(width="980px", height="520px"))
    .add("", items, radius=["35%", "65%"])
    .set_global_opts(
        title_opts=opts.TitleOpts(title="收入构成"),
        legend_opts=opts.LegendOpts(orient="vertical", pos_left="2%", pos_top="10%"),
    )
    .set_series_opts(label_opts=opts.LabelOpts(formatter="{b}: {d}%"))
)

out = "artifacts/chart_mix_pie.html"
chart.render(out)
print(out)
```

### 3）柱状图（TopN）

```python
import pandas as pd
from pyecharts.charts import Bar
from pyecharts import options as opts

df = pd.read_csv("data/top_products.csv")
names = df["product"].tolist()
vals = df["amount"].tolist()

chart = (
    Bar(init_opts=opts.InitOpts(width="980px", height="520px"))
    .add_xaxis(names)
    .add_yaxis("金额", vals, category_gap="35%")
    .reversal_axis()
    .set_global_opts(
        title_opts=opts.TitleOpts(title="Top 产品线"),
        tooltip_opts=opts.TooltipOpts(trigger="axis"),
    )
)

out = "artifacts/chart_top_products.html"
chart.render(out)
print(out)
```

### 4）双轴图（柱 + 折线，金额 + 比例）

```python
import pandas as pd
from pyecharts.charts import Bar, Line
from pyecharts import options as opts

df = pd.read_csv("data/dual_axis.csv")
x = df["month"].tolist()
amount = df["amount"].tolist()
ratio = df["ratio"].tolist()

bar = (
    Bar(init_opts=opts.InitOpts(width="980px", height="520px"))
    .add_xaxis(x)
    .add_yaxis("金额", amount, yaxis_index=0)
    .extend_axis(
        yaxis=opts.AxisOpts(
            name="比例",
            type_="value",
            min_=0,
            max_=1,
            axislabel_opts=opts.LabelOpts(formatter="{value}"),
        )
    )
    .set_global_opts(
        title_opts=opts.TitleOpts(title="双轴：金额 + 比例"),
        tooltip_opts=opts.TooltipOpts(trigger="axis"),
        yaxis_opts=opts.AxisOpts(name="金额"),
        datazoom_opts=[opts.DataZoomOpts(type_="inside"), opts.DataZoomOpts(type_="slider")],
    )
)

line = (
    Line()
    .add_xaxis(x)
    .add_yaxis("比例", ratio, yaxis_index=1, is_smooth=True)
)

chart = bar.overlap(line)
out = "artifacts/chart_dual_axis.html"
chart.render(out)
print(out)
```

### 5）热力图（矩阵/二维分布）

```python
import pandas as pd
from pyecharts.charts import HeatMap
from pyecharts import options as opts

df = pd.read_csv("data/heatmap.csv")
# CSV 格式：region,quarter,value
x = sorted(df["quarter"].unique().tolist())
y = sorted(df["region"].unique().tolist())
data = [
    [x.index(row["quarter"]), y.index(row["region"]), row["value"]]
    for _, row in df.iterrows()
]

chart = (
    HeatMap(init_opts=opts.InitOpts(width="980px", height="520px"))
    .add_xaxis(x)
    .add_yaxis("", y, data)
    .set_global_opts(
        title_opts=opts.TitleOpts(title="区域×季度热力图"),
        visualmap_opts=opts.VisualMapOpts(min_=0, max_=20),
    )
)

out = "artifacts/chart_heatmap.html"
chart.render(out)
print(out)
```

## 批量输出多个图（不合并）

```python
charts = [
    ("artifacts/chart_a.html", chart_a),
    ("artifacts/chart_b.html", chart_b),
    ("artifacts/chart_c.html", chart_c),
]

for path, ch in charts:
    ch.render(path)
    print(path)
```
