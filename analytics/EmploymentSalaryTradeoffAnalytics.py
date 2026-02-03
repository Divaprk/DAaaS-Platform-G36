"""
EMPLOYMENT VS SALARY TRADEOFF ANALYTICS
======================================
Examines whether course categories with higher employment rates also
have higher median salaries.

Outputs:
- Scatter plot of avg employment rate vs avg median salary by category
- Summary table with averages and sample sizes
- Pearson correlation between employment rate and median salary
- Weighted correlation (by sample size)
- Quadrant classification (high/low salary vs high/low employment)
- Rankings and tradeoff outliers for reporting
"""

import json
from typing import Optional, List, Dict, Any

import matplotlib

matplotlib.use("Agg")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.lines import Line2D
from pathlib import Path

sns.set_style("whitegrid")
plt.rcParams["figure.dpi"] = 100

DATA_PATH = (Path(__file__).resolve().parents[1] / "data" / "CleanedGraduateEmploymentSurvey.csv").as_posix()

def _scale_sizes(values: np.ndarray, size_min: float, size_max: float) -> np.ndarray:
    vmin = float(values.min()) if len(values) else 0.0
    vmax = float(values.max()) if len(values) else 0.0
    if vmin == vmax:
        return np.full_like(values, (size_min + size_max) / 2.0, dtype=float)
    return size_min + (values - vmin) * (size_max - size_min) / (vmax - vmin)


def _scale_value(value: float, vmin: float, vmax: float, size_min: float, size_max: float) -> float:
    if vmin == vmax:
        return (size_min + size_max) / 2.0
    return size_min + (value - vmin) * (size_max - size_min) / (vmax - vmin)


def _nice_ticks(values: np.ndarray, n: int = 4) -> list[int]:
    vmin = float(values.min())
    vmax = float(values.max())
    if vmin == vmax:
        return [int(round(vmin))]

    rng = vmax - vmin
    if rng <= 50:
        base = 5
    elif rng <= 200:
        base = 10
    elif rng <= 500:
        base = 25
    else:
        base = 50

    start = base * np.ceil(vmin / base)
    end = base * np.floor(vmax / base)
    if start >= end:
        return sorted(set([int(round(vmin)), int(round(vmax))]))

    raw = np.linspace(start, end, n)
    ticks = sorted(set(int(round(x / base) * base) for x in raw))
    return ticks

def _non_overlapping_positions(
    x_vals: np.ndarray,
    y_vals: np.ndarray,
    sizes: np.ndarray,
    ax: matplotlib.axes.Axes,
    padding_px: float = 3.0,
    max_iter: int = 200
) -> tuple[np.ndarray, np.ndarray]:
    """
    Simple collision-avoidance in display space to reduce bubble overlap.
    Positions are nudged slightly for readability only.
    """
    dpi = ax.figure.dpi
    placed: list[tuple[float, float, float]] = []
    x_plot: list[float] = []
    y_plot: list[float] = []
    inv = ax.transData.inverted()

    for x, y, s in zip(x_vals, y_vals, sizes):
        px, py = ax.transData.transform((x, y))
        radius_px = np.sqrt(s / np.pi) * dpi / 72.0
        px_i, py_i = px, py

        for k in range(max_iter):
            overlap = False
            for opx, opy, orad in placed:
                if (px_i - opx) ** 2 + (py_i - opy) ** 2 < (radius_px + orad + padding_px) ** 2:
                    overlap = True
                    break
            if not overlap:
                break
            angle = 0.5 * k
            step = 2.0 + (k // 8)
            px_i = px + step * np.cos(angle)
            py_i = py + step * np.sin(angle)

        placed.append((px_i, py_i, radius_px))
        x_d, y_d = inv.transform((px_i, py_i))
        x_plot.append(x_d)
        y_plot.append(y_d)

    return np.array(x_plot), np.array(y_plot)


def load_data(
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    categories: Optional[List[str]] = None
) -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)

    if year_start is not None:
        df = df[df["year"] >= year_start].copy()
    if year_end is not None:
        df = df[df["year"] <= year_end].copy()
    if categories:
        df = df[df["course_category"].isin(categories)].copy()

    return df


def employment_salary_tradeoff(
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    categories: Optional[List[str]] = None,
    min_sample_size: int = 20,
    top_n: int = 5,
    add_trendline: bool = True,
    save_path: Optional[str] = "viz_employment_vs_salary.png"
) -> Dict[str, Any]:
    """
    Create a tradeoff analysis between employment rate and salary by course category.

    Returns:
    dict with:
      - summary: DataFrame of category-level averages and sample sizes
      - correlation: Pearson correlation (float)
      - quadrants: DataFrame with quadrant labels
      - rankings: dict of top categories by salary/employment and tradeoff outliers
      - meta: diagnostics (rows used, years, missing values)
    """
    df = load_data(year_start, year_end, categories)

    required_cols = ["employment_rate_overall", "gross_monthly_median", "course_category", "year"]
    missing_before = df[required_cols].isna().sum().to_dict()
    df = df.dropna(subset=["employment_rate_overall", "gross_monthly_median", "course_category"])

    summary = (
        df.groupby("course_category", as_index=False)
          .agg(
              avg_employment_rate=("employment_rate_overall", "mean"),
              avg_median_salary=("gross_monthly_median", "mean"),
              employment_rate_std=("employment_rate_overall", "std"),
              median_salary_std=("gross_monthly_median", "std"),
              sample_size=("course", "count")
          )
    )

    if min_sample_size > 0:
        summary = summary[summary["sample_size"] >= min_sample_size].copy()

    summary = summary.sort_values("avg_median_salary", ascending=False).reset_index(drop=True)

    # Correlation between employment rate and salary across categories
    if len(summary) >= 2:
        correlation = summary[["avg_employment_rate", "avg_median_salary"]].corr().iloc[0, 1]
    else:
        correlation = None

    # Weighted correlation (by sample size)
    if len(summary) >= 2:
        w = summary["sample_size"].to_numpy(dtype=float)
        xw = summary["avg_employment_rate"].to_numpy(dtype=float)
        yw = summary["avg_median_salary"].to_numpy(dtype=float)
        w_sum = w.sum()
        if w_sum > 0:
            x_mean = (w * xw).sum() / w_sum
            y_mean = (w * yw).sum() / w_sum
            cov = (w * (xw - x_mean) * (yw - y_mean)).sum() / w_sum
            var_x = (w * (xw - x_mean) ** 2).sum() / w_sum
            var_y = (w * (yw - y_mean) ** 2).sum() / w_sum
            weighted_correlation = cov / np.sqrt(var_x * var_y) if var_x > 0 and var_y > 0 else None
        else:
            weighted_correlation = None
    else:
        weighted_correlation = None

    # Quadrant classification using medians
    if len(summary) > 0:
        salary_median = summary["avg_median_salary"].median()
        employment_median = summary["avg_employment_rate"].median()
        summary["salary_level"] = np.where(summary["avg_median_salary"] >= salary_median, "High", "Low")
        summary["employment_level"] = np.where(summary["avg_employment_rate"] >= employment_median, "High", "Low")
        summary["quadrant"] = summary["salary_level"] + " Salary / " + summary["employment_level"] + " Employment"
    else:
        summary = summary.assign(
            salary_level=pd.Series(dtype=str),
            employment_level=pd.Series(dtype=str),
            quadrant=pd.Series(dtype=str)
        )

    # Scatter plot
    fig, ax = plt.subplots(figsize=(11, 7))

    plot_data = summary.copy()
    plot_data["Quadrant"] = plot_data["quadrant"]
    plot_data["Sample Size"] = plot_data["sample_size"]

    x_min, x_max = plot_data["avg_employment_rate"].min(), plot_data["avg_employment_rate"].max()
    y_min, y_max = plot_data["avg_median_salary"].min(), plot_data["avg_median_salary"].max()
    x_pad = max(0.5, (x_max - x_min) * 0.05)
    y_pad = max(50.0, (y_max - y_min) * 0.05)
    ax.set_xlim(x_min - x_pad, x_max + x_pad)
    ax.set_ylim(y_min - y_pad, y_max + y_pad)

    size_min, size_max = 60, 900
    size_values = plot_data["Sample Size"].to_numpy()
    sizes = _scale_sizes(size_values, size_min, size_max)
    x_plot, y_plot = _non_overlapping_positions(
        plot_data["avg_employment_rate"].to_numpy(),
        plot_data["avg_median_salary"].to_numpy(),
        sizes,
        ax
    )
    plot_data["x_plot"] = x_plot
    plot_data["y_plot"] = y_plot

    quadrant_list = plot_data["Quadrant"].unique().tolist()
    palette = sns.color_palette("Set2", n_colors=len(quadrant_list))
    color_map = dict(zip(quadrant_list, palette))

    sns.scatterplot(
        data=plot_data,
        x="x_plot",
        y="y_plot",
        size="Sample Size",
        hue="Quadrant",
        palette=color_map,
        sizes=(size_min, size_max),
        size_norm=(size_values.min(), size_values.max()) if len(size_values) > 0 else None,
        alpha=0.85,
        edgecolor="white",
        linewidth=0.8,
        legend=False,
        ax=ax
    )
    ax.set_xlim(x_min - x_pad, x_max + x_pad)
    ax.set_ylim(y_min - y_pad, y_max + y_pad)

    ax.set_title("Employment Rate vs Median Salary by Course Category", fontsize=14, fontweight="bold")
    ax.set_xlabel("Average Employment Rate (%)", fontsize=11, fontweight="bold")
    ax.set_ylabel("Average Median Monthly Salary (SGD)", fontsize=11, fontweight="bold")
    ax.grid(True, alpha=0.3)

    # Format salary axis
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"${x:,.0f}"))

    # Optional trendline (simple linear fit)
    trendline = None
    if add_trendline and len(summary) >= 2:
        x = summary["avg_employment_rate"].to_numpy()
        y = summary["avg_median_salary"].to_numpy()
        slope, intercept = np.polyfit(x, y, 1)
        y_hat = slope * x + intercept
        ss_res = np.sum((y - y_hat) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r2 = 1 - ss_res / ss_tot if ss_tot != 0 else None
        trendline = {"slope": slope, "intercept": intercept, "r2": r2}
        x_line = np.linspace(x.min(), x.max(), 100)
        ax.plot(x_line, slope * x_line + intercept, linestyle="--", linewidth=2, color="black", alpha=0.6)

    # Annotate each point with category name
    for _, row in plot_data.iterrows():
        ax.text(
            row["x_plot"] + 0.08,
            row["y_plot"],
            row["course_category"],
            fontsize=8,
            alpha=0.75
        )

    quadrant_handles = [
        Line2D([0], [0], marker="o", color="none", markerfacecolor=color_map[q], markersize=8, label=q)
        for q in quadrant_list
    ]
    legend1 = ax.legend(
        handles=quadrant_handles,
        title="Quadrant",
        loc="upper left",
        bbox_to_anchor=(0.0, 1.0),
        framealpha=0.9,
        borderpad=0.8,
        labelspacing=0.6
    )
    ax.add_artist(legend1)
    fig.canvas.draw()

    if len(size_values) > 0:
        size_ticks = _nice_ticks(size_values, n=4)
        vmin = float(size_values.min())
        vmax = float(size_values.max())
        size_handles = []
        legend_scale = 0.9
        for s in size_ticks:
            scaled = _scale_value(float(s), vmin, vmax, size_min, size_max)
            size_handles.append(
                Line2D(
                    [0], [0],
                    marker="o",
                    color="none",
                    markerfacecolor="gray",
                    markersize=float(np.sqrt(scaled)) * legend_scale,
                    label=str(int(s))
                )
            )
        legend1_box = legend1.get_window_extent().transformed(ax.transAxes.inverted())
        anchor_y = max(legend1_box.y0 - 0.0002, 0.02)
        max_marker = float(np.sqrt(_scale_value(vmax, vmin, vmax, size_min, size_max)) * legend_scale)
        label_spacing = max(1.2, max_marker / 10.0)
        ax.legend(
            handles=size_handles,
            title="Sample Size",
            loc="upper left",
            bbox_to_anchor=(legend1_box.x0, anchor_y),
            framealpha=0.9,
            labelspacing=label_spacing,
            borderpad=0.9,
            handletextpad=0.4
        )

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches="tight")
    plt.close()

    # Rankings and tradeoff outliers
    rankings = {
        "top_salary": summary.nlargest(top_n, "avg_median_salary"),
        "top_employment": summary.nlargest(top_n, "avg_employment_rate")
    }

    if len(summary) >= 2:
        x = summary["avg_employment_rate"].to_numpy()
        y = summary["avg_median_salary"].to_numpy()
        slope, intercept = np.polyfit(x, y, 1)
        residuals = y - (slope * x + intercept)
        summary = summary.assign(salary_residual=residuals)
        rankings["positive_tradeoff"] = summary.nlargest(top_n, "salary_residual")
        rankings["negative_tradeoff"] = summary.nsmallest(top_n, "salary_residual")
    else:
        rankings["positive_tradeoff"] = summary.copy()
        rankings["negative_tradeoff"] = summary.copy()

    meta = {
        "rows_used": int(len(df)),
        "years": {
            "min": int(df["year"].min()) if len(df) > 0 else None,
            "max": int(df["year"].max()) if len(df) > 0 else None
        },
        "missing_before_dropna": missing_before,
        "categories_included": sorted(summary["course_category"].unique().tolist()) if len(summary) > 0 else []
    }

    return {
        "summary": summary.reset_index(drop=True),
        "correlation": correlation,
        "correlation_weighted": weighted_correlation,
        "quadrants": summary[["course_category", "quadrant"]].copy() if len(summary) > 0 else summary.copy(),
        "rankings": rankings,
        "trendline": trendline,
        "meta": meta,
        "chart_config": {
            "x_label": "Average Employment Rate (%)",
            "y_label": "Average Median Monthly Salary (SGD)",
            "size_label": "Sample Size",
            "hue_label": "Quadrant"
        }
    }


# ----------------------------
# AWS / Flask-friendly wrapper
# ----------------------------
def _parse_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_bool(value: Any, default: bool = False) -> bool:
    if value is None or value == "":
        return default
    return str(value).strip().lower() in {"1", "true", "t", "yes", "y"}


def _parse_list(value: Any) -> Optional[List[str]]:
    if value is None or value == "":
        return None
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [v.strip() for v in str(value).split(",") if v.strip()]


def _json_default(obj: Any) -> Any:
    if isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    return str(obj)


def tradeoff_api(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    DAaaS-ready API wrapper.
    Accepts query params from Flask (request.args) or Lambda (queryStringParameters).
    Returns JSON-serializable dict for API responses.
    """
    year_start = _parse_int(params.get("year_start"))
    year_end = _parse_int(params.get("year_end"))
    categories = _parse_list(params.get("categories"))
    min_sample_size = _parse_int(params.get("min_sample_size"), 20)
    top_n = _parse_int(params.get("top_n"), 5)
    add_trendline = _parse_bool(params.get("add_trendline"), True)
    include_plot = _parse_bool(params.get("include_plot"), False)
    save_path = "/tmp/viz_employment_vs_salary.png" if include_plot else None

    results = employment_salary_tradeoff(
        year_start=year_start,
        year_end=year_end,
        categories=categories,
        min_sample_size=min_sample_size,
        top_n=top_n,
        add_trendline=add_trendline,
        save_path=save_path
    )

    return {
        "summary": results["summary"].to_dict(orient="records"),
        "rankings": {k: v.to_dict(orient="records") for k, v in results["rankings"].items()},
        "correlation": results["correlation"],
        "correlation_weighted": results["correlation_weighted"],
        "trendline": results["trendline"],
        "meta": results["meta"],
        "chart_config": results["chart_config"],
        "image_path": save_path if include_plot else None
    }


def lambda_handler(event, context):
    """
    AWS Lambda entry point.
    Pass query string params like:
      ?year_start=2016&year_end=2022&categories=Engineering,Information%20Technology
    """
    params = event.get("queryStringParameters") or {}
    payload = tradeoff_api(params)

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, default=_json_default)
    }


if __name__ == "__main__":
    results = employment_salary_tradeoff()
    corr = results["correlation"]
    w_corr = results["correlation_weighted"]
    print("Correlation (employment rate vs median salary):", round(corr, 3) if corr is not None else "N/A")
    print("Weighted correlation (by sample size):", round(w_corr, 3) if w_corr is not None else "N/A")
    print(results["summary"].head(10))
