---
name: sentry_analysis
description: "Sentry 数据分析参考指南。当用户查询涉及 Sentry 数据集时，根据数据源 ID 查阅对应的 reference 文档获取查询方案。"
---

# Sentry 数据分析参考指南

当用户的查询涉及以下 Sentry 数据集时，**必须先阅读对应的 reference 文档**，了解常见查询方案、维度用法和注意事项，再构造工具调用参数。

## 数据源与参考文档对照表

所有参考文档位于 `skills/sentry_analysis/reference/` 目录下，使用 `sandbox_read_file` 读取时必须使用以下**完整相对路径**：

| 数据源 ID | 数据集名称 | 参考文档路径 |
|-----------|-----------|-------------|
| `self-analysis` | 集团管报数据库 | `skills/sentry_analysis/reference/self-analysis.md` |
| `self_analysis_pnl_pre` | 分摊前预实分析明细数据库 | `skills/sentry_analysis/reference/self_analysis_pnl_pre.md` |
| `group_management_general` | 集团管理通用数据集 | `skills/sentry_analysis/reference/group_management_general.md` |
| `head_work_space_expense` | 工位费数据库 | `skills/sentry_analysis/reference/head_work_space_expense.md` |
| `game_report` | 游戏定制管报数据库 | `skills/sentry_analysis/reference/game_report.md` |
| `ecom_manual_2026` | 中国电商手工数据集 | `skills/sentry_analysis/reference/ecom_manual_2026.md` |
| `self-cn-monetization-report` | 中国商业化定制管报数据集 | `skills/sentry_analysis/reference/self-cn-monetization-report.md` |
| `toufan-customized_mgrpt` | 番茄定制管报数据集 | `skills/sentry_analysis/reference/toufan-customized_mgrpt.md` |
| `lark_customized_business_type_dataset` | 飞书定制业务类型数据集 | `skills/sentry_analysis/reference/lark_customized_business_type_dataset.md` |
| `self-specific-mgrpt_outsource-df` | 外包分摊明细数据集 | `skills/sentry_analysis/reference/self-specific-mgrpt_outsource-df.md` |
| `tt-music` | TT Music 数据集 | `skills/sentry_analysis/reference/tt-music.md` |

## 使用规则

1. **确定数据源**：根据用户问题判断应使用哪个数据源（参考 system prompt 中的 Data Sources 索引）
2. **查阅参考文档**：使用 `sandbox_read_file` 读取对应的参考文档。路径必须使用上表中的完整相对路径（以 `skills/sentry_analysis/reference/` 开头），不要省略前缀
3. **构造查询参数**：参照文档中的示例构造 `sentry_data_fetch` 和 `sentry_get_dimensions_values` 的调用参数
4. **注意事项**：reference 文档中包含维度使用的特殊规则和常见错误，务必遵守