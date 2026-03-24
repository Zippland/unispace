---
name: matplotlib
description: "用 Matplotlib 生成 think-cell 咨询风格的静态图表并导出为图片。当用户要求生成 PNG/JPG 图片格式的图表时调用。"
---

# Matplotlib（think-cell 咨询风格图表）

## 目标

- 从 CSV 文件读取数据，用 Matplotlib 绘制 **think-cell 咨询风格** 的图表。
- 输出为 PNG 图片文件。

## 什么时候用

- 用户要求生成"图片/PNG/JPG"格式的图表。
- 用户要求"咨询风格/商务风格/PPT 风格"图表。
- 需要嵌入到 Word/PPT 等文档中的静态图表。

## 数据来源

- **所有画图数据必须从 CSV 文件读取**，不要在代码中硬编码数据。
- 使用 `pandas.read_csv()` 读取数据文件，再提取所需列。
- 如果用户没有指定 CSV 文件路径，先确认文件位置再画图。

## CSV 文件格式要求

- 编码：UTF-8（带或不带 BOM 均可）
- 分隔符：逗号 `,`
- 第一行必须是表头（列名），后续行为数据

各图表类型对应的 CSV 格式示例：

### 折线图 / 柱状图（时序趋势）

```csv
month,revenue
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

### 多系列（宽格式）

```csv
month,系列A,系列B,系列C
2025-01,12,8,15
2025-02,18,11,14
2025-03,9,13,16
```

## 输出建议

- 默认输出路径放在 `artifacts/` 或 `output/` 目录下。
- 文件命名体现内容：`chart_revenue_trend.png`、`chart_top_products.png`。
- 使用 `dpi=200` 保证清晰度。

## think-cell 风格规范

### 核心设计原则

- **白色背景，极简设计** — 去除一切不必要的装饰元素
- **数据标签直接标注** — 减少对坐标轴刻度的依赖，值标在柱体上方或内部
- **有限且一致的配色** — 主色 + 强调色，避免彩虹配色
- **无网格线** — 保持画面干净
- **sans-serif 字体** — 使用 Calibri / Arial

### 颜色方案

```python
# think-cell 配色（基于 Office 默认主题 Accent 色）
COLORS = [
    "#4472C4",  # 蓝色（主色）
    "#ED7D31",  # 橙色（强调色）
    "#A5A5A5",  # 灰色
    "#FFC000",  # 黄色
    "#5B9BD5",  # 浅蓝
    "#70AD47",  # 绿色
]
TEXT_COLOR = "#44546A"   # 深蓝灰（文字/标签）
AXIS_COLOR = "#D9D9D9"  # 浅灰（坐标轴线）
```

### 全局样式设置（每个脚本开头必须执行）

```python
import matplotlib.pyplot as plt
import matplotlib as mpl

COLORS = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"]
TEXT_COLOR = "#44546A"
AXIS_COLOR = "#D9D9D9"

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": [
        "Noto Sans CJK SC", "Source Han Sans CN", "SimHei",
        "Microsoft YaHei", "Arial Unicode MS", "Calibri", "Arial", "Helvetica",
    ],
    "axes.unicode_minus": False,
    "font.size": 10,
    "figure.facecolor": "#FFFFFF",
    "axes.facecolor": "#FFFFFF",
    "axes.edgecolor": AXIS_COLOR,
    "axes.linewidth": 0.8,
    "axes.labelcolor": TEXT_COLOR,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": False,
    "axes.prop_cycle": mpl.cycler(color=COLORS),
    "xtick.color": TEXT_COLOR,
    "ytick.color": TEXT_COLOR,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "text.color": TEXT_COLOR,
    "figure.dpi": 200,
    "savefig.dpi": 200,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.3,
})
```

## 基本用法（Python）

> **重要**：每个脚本必须在开头执行上面的「中文字体处理」和「全局样式设置」两段代码，以下示例中用 `# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...` 代替，实际代码必须完整包含。

### 1）柱状图（趋势）

```python
import pandas as pd
import matplotlib.pyplot as plt
# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...

df = pd.read_csv("data/revenue.csv")
x = df["month"].tolist()
y = df["revenue"].tolist()

fig, ax = plt.subplots(figsize=(9, 5))
bars = ax.bar(x, y, width=0.6, color=COLORS[0])

# 数据标签（think-cell 核心特征）
for bar, val in zip(bars, y):
    ax.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + max(y) * 0.02,
        f"{val:,.1f}",
        ha="center", va="bottom", fontsize=9, color=TEXT_COLOR,
    )

ax.set_title("收入趋势", fontsize=13, fontweight="bold", color=TEXT_COLOR, pad=15)
ax.set_ylim(0, max(y) * 1.15)

out = "artifacts/chart_revenue_trend.png"
plt.savefig(out)
plt.close()
print(out)
```

### 2）饼图（构成）

```python
import pandas as pd
import matplotlib.pyplot as plt
# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...

df = pd.read_csv("data/revenue_mix.csv")
labels = df["category"].tolist()
values = df["amount"].tolist()

fig, ax = plt.subplots(figsize=(8, 6))
wedges, texts, autotexts = ax.pie(
    values,
    labels=labels,
    colors=COLORS[:len(labels)],
    autopct="%1.1f%%",
    startangle=90,
    pctdistance=0.75,
    wedgeprops={"edgecolor": "white", "linewidth": 2},
)

for t in texts:
    t.set_fontsize(10)
    t.set_color(TEXT_COLOR)
for t in autotexts:
    t.set_fontsize(9)
    t.set_color("white")
    t.set_fontweight("bold")

ax.set_title("收入构成", fontsize=13, fontweight="bold", color=TEXT_COLOR, pad=15)

out = "artifacts/chart_mix_pie.png"
plt.savefig(out)
plt.close()
print(out)
```

### 3）横向柱状图（TopN 排名）

```python
import pandas as pd
import matplotlib.pyplot as plt
# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...

df = pd.read_csv("data/top_products.csv")
# 按值排序，最大的在上面
df = df.sort_values("amount", ascending=True)
names = df["product"].tolist()
vals = df["amount"].tolist()

fig, ax = plt.subplots(figsize=(9, 5))
bars = ax.barh(names, vals, height=0.6, color=COLORS[0])

# 数据标签
for bar, val in zip(bars, vals):
    ax.text(
        bar.get_width() + max(vals) * 0.02,
        bar.get_y() + bar.get_height() / 2,
        f"{val:,.0f}",
        ha="left", va="center", fontsize=9, color=TEXT_COLOR,
    )

ax.set_title("Top 产品线", fontsize=13, fontweight="bold", color=TEXT_COLOR, pad=15)
ax.set_xlim(0, max(vals) * 1.15)
ax.spines["bottom"].set_visible(False)
ax.tick_params(axis="x", which="both", bottom=False, labelbottom=False)

out = "artifacts/chart_top_products.png"
plt.savefig(out)
plt.close()
print(out)
```

### 4）折线图（多系列趋势）

```python
import pandas as pd
import matplotlib.pyplot as plt
# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...

df = pd.read_csv("data/trend.csv")
x = df.iloc[:, 0].tolist()
series_cols = df.columns[1:]

fig, ax = plt.subplots(figsize=(9, 5))
for i, col in enumerate(series_cols):
    y = df[col].tolist()
    ax.plot(x, y, color=COLORS[i % len(COLORS)], linewidth=2, marker="o", markersize=5)
    # 末端标签（替代图例，think-cell 风格）
    ax.text(
        len(x) - 1 + 0.15, y[-1], col,
        fontsize=9, color=COLORS[i % len(COLORS)], va="center",
    )

ax.set_title("趋势对比", fontsize=13, fontweight="bold", color=TEXT_COLOR, pad=15)
ax.set_xlim(-0.3, len(x) - 0.3)

out = "artifacts/chart_trend.png"
plt.savefig(out)
plt.close()
print(out)
```

### 5）堆叠柱状图

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...

df = pd.read_csv("data/stacked.csv")
x = df.iloc[:, 0].tolist()
series_cols = df.columns[1:]
x_pos = np.arange(len(x))

fig, ax = plt.subplots(figsize=(9, 5))
bottom = np.zeros(len(x))
for i, col in enumerate(series_cols):
    vals = df[col].values
    ax.bar(
        x_pos, vals, width=0.6, bottom=bottom,
        color=COLORS[i % len(COLORS)], label=col,
    )
    # 段内数据标签
    for j, val in enumerate(vals):
        if val > 0:
            ax.text(
                x_pos[j], bottom[j] + val / 2,
                f"{val:,.0f}",
                ha="center", va="center", fontsize=8, color="white", fontweight="bold",
            )
    bottom += vals

# 顶部总计标签
totals = df[series_cols].sum(axis=1).tolist()
for j, total in enumerate(totals):
    ax.text(
        x_pos[j], total + max(totals) * 0.02,
        f"{total:,.0f}",
        ha="center", va="bottom", fontsize=9, color=TEXT_COLOR, fontweight="bold",
    )

ax.set_xticks(x_pos)
ax.set_xticklabels(x)
ax.set_title("堆叠柱状图", fontsize=13, fontweight="bold", color=TEXT_COLOR, pad=15)
ax.set_ylim(0, max(totals) * 1.15)
ax.legend(loc="upper left", frameon=False, fontsize=9)

out = "artifacts/chart_stacked.png"
plt.savefig(out)
plt.close()
print(out)
```

### 6）瀑布图

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
# ... 此处执行上面的 find_chinese_font() 和全局样式设置 ...

COLOR_POSITIVE = "#4472C4"
COLOR_NEGATIVE = "#ED7D31"
COLOR_TOTAL = "#44546A"

# CSV 格式：label,value,type（type 取值 start/delta/total）
df = pd.read_csv("data/waterfall.csv")
labels = df["label"].tolist()
values = df["value"].tolist()
types = df["type"].tolist()

fig, ax = plt.subplots(figsize=(10, 5))
running = 0
bottoms = []
bar_colors = []
for val, t in zip(values, types):
    if t == "start":
        bottoms.append(0)
        bar_colors.append(COLOR_TOTAL)
        running = val
    elif t == "total":
        bottoms.append(0)
        bar_colors.append(COLOR_TOTAL)
        running = val
    else:
        if val >= 0:
            bottoms.append(running)
            bar_colors.append(COLOR_POSITIVE)
        else:
            bottoms.append(running + val)
            bar_colors.append(COLOR_NEGATIVE)
        running += val

x_pos = np.arange(len(labels))
heights = [abs(v) if t == "delta" else v for v, t in zip(values, types)]
ax.bar(x_pos, heights, bottom=bottoms, width=0.6, color=bar_colors)

# 连接虚线（think-cell 瀑布图特征）
for i in range(len(labels) - 1):
    if types[i] != "total":
        y = bottoms[i] + heights[i]
        ax.plot([x_pos[i] + 0.3, x_pos[i + 1] - 0.3], [y, y],
                color=AXIS_COLOR, linewidth=0.8, linestyle="--")

# 数据标签
for i, (val, t) in enumerate(zip(values, types)):
    y = bottoms[i] + heights[i]
    label_text = f"{val:+,.0f}" if t == "delta" else f"{val:,.0f}"
    ax.text(x_pos[i], y + max(heights) * 0.02, label_text,
            ha="center", va="bottom", fontsize=9, color=TEXT_COLOR)

ax.set_xticks(x_pos)
ax.set_xticklabels(labels)
ax.set_title("瀑布图", fontsize=13, fontweight="bold", color=TEXT_COLOR, pad=15)
ax.spines["bottom"].set_position(("data", 0))

out = "artifacts/chart_waterfall.png"
plt.savefig(out)
plt.close()
print(out)
```

瀑布图 CSV 格式：

```csv
label,value,type
起始值,100,start
增长A,30,delta
增长B,20,delta
减少C,-15,delta
减少D,-10,delta
最终值,125,total
```

## 批量输出多个图

```python
for name, fig in charts:
    path = f"artifacts/{name}.png"
    fig.savefig(path)
    plt.close(fig)
    print(path)
```
