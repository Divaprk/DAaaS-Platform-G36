"""
RELATIVE PERFORMANCE INDEX (Z-SCORE NORMALIZATION)
=================================================
computes per-year z-scores for courses to remove macro effects (e.g. inflation).

z = (course salary - national mean salary for that year) / national std for that year

outputs:
- table of course-year z-scores and ranks
- bump chart showing rank changes over time
"""

import json
from pathlib import Path
from typing import Optional, List, Dict, Any, Sequence, Tuple, Literal

import matplotlib

matplotlib.use("Agg")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_style("whitegrid")
plt.rcParams["figure.dpi"] = 100

DATA_PATH = (Path(__file__).resolve().parents[1] / "data" / "CleanedGraduateEmploymentSurvey.csv").as_posix()

WeightMode = Literal["none", "sample_size"]


def load_data(
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    universities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    courses: Optional[List[str]] = None,
) -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)

    if year_start is not None:
        df = df[df["year"] >= year_start].copy()
    if year_end is not None:
        df = df[df["year"] <= year_end].copy()
    if universities:
        df = df[df["university"].isin(universities)].copy()
    if categories:
        df = df[df["course_category"].isin(categories)].copy()
    if courses:
        df = df[df["course"].isin(courses)].copy()

    return df


def _weighted_mean_std(values: np.ndarray, weights: np.ndarray) -> Tuple[float, float]:
    v = np.asarray(values, dtype=float)
    w = np.asarray(weights, dtype=float)
    w_sum = float(w.sum())
    if w_sum <= 0:
        return float(np.mean(v)), float(np.std(v, ddof=0))
    mean = float((w * v).sum() / w_sum)
    var = float((w * (v - mean) ** 2).sum() / w_sum)
    return mean, float(np.sqrt(var))


def compute_relative_performance_index(
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    universities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    courses: Optional[List[str]] = None,
    salary_column: str = "gross_monthly_median",
    group_by: Sequence[str] = ("course",),
    min_sample_size: int = 1,
    weight_mode: WeightMode = "none",
    zscore_floor_std: float = 1e-9,
) -> Dict[str, Any]:
    df = load_data(year_start, year_end, universities, categories, courses)

    required = ["year", salary_column, *list(group_by)]
    missing_required = [c for c in required if c not in df.columns]
    if missing_required:
        raise ValueError(f"missing required columns: {missing_required}")

    df = df.dropna(subset=["year", salary_column, *list(group_by)]).copy()
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df[salary_column] = pd.to_numeric(df[salary_column], errors="coerce")
    df = df.dropna(subset=["year", salary_column]).copy()
    df["year"] = df["year"].astype(int)

    group_cols = ["year", *list(group_by)]
    agg = (
        df.groupby(group_cols, as_index=False)
        .agg(
            mean_salary=(salary_column, "mean"),
            sample_size=(salary_column, "count"),
        )
    )

    if "course_category" in df.columns and "course" in group_by:
        cat = (
            df.groupby(group_cols)["course_category"]
            .agg(lambda s: s.mode().iat[0] if len(s.mode()) else s.iloc[0])
            .reset_index()
        )
        agg = agg.merge(cat, on=group_cols, how="left")

    if min_sample_size > 0:
        agg = agg[agg["sample_size"] >= min_sample_size].copy()

    years = sorted(agg["year"].unique().tolist())
    year_stats_rows = []
    for y in years:
        sub = agg[agg["year"] == y]
        vals = sub["mean_salary"].to_numpy(dtype=float)
        if weight_mode == "sample_size":
            w = sub["sample_size"].to_numpy(dtype=float)
            mu, sd = _weighted_mean_std(vals, w)
        else:
            mu = float(np.mean(vals)) if len(vals) else np.nan
            sd = float(np.std(vals, ddof=0)) if len(vals) else np.nan
        year_stats_rows.append(
            {
                "year": int(y),
                "year_mean": mu,
                "year_std": sd,
                "n_groups": int(len(sub)),
                "weight_mode": weight_mode,
            }
        )

    year_stats = pd.DataFrame(year_stats_rows)
    out = agg.merge(year_stats[["year", "year_mean", "year_std", "n_groups"]], on="year", how="left")

    # keep z-score stable when std is too small
    out["year_std_safe"] = out["year_std"].where(out["year_std"] >= zscore_floor_std, np.nan)
    out["z_score"] = (out["mean_salary"] - out["year_mean"]) / out["year_std_safe"]
    out["z_score"] = out["z_score"].fillna(0.0)

    out["rank"] = (
        out.groupby("year")["z_score"]
        .rank(method="dense", ascending=False)
        .astype(int)
    )
    out["percentile"] = (
        out.groupby("year")["z_score"]
        .rank(method="average", ascending=True, pct=True) * 100.0
    )

    meta = {
        "rows_used": int(len(df)),
        "groups_used": int(len(out)),
        "years": {"min": int(min(years)) if years else None, "max": int(max(years)) if years else None},
        "salary_column": salary_column,
        "group_by": list(group_by),
        "min_sample_size": int(min_sample_size),
        "weight_mode": weight_mode,
    }

    return {
        "table": out.sort_values(["year", "rank"]).reset_index(drop=True),
        "year_stats": year_stats.sort_values("year").reset_index(drop=True),
        "meta": meta,
    }


def select_focus_groups(
    table: pd.DataFrame,
    group_col: str = "course",
    top_k: int = 10,
    min_years: int = 6,
    focus: Optional[List[str]] = None,
) -> List[str]:
    if focus:
        return [g for g in focus if g in set(table[group_col].unique().tolist())]

    g = (
        table.groupby(group_col)
        .agg(avg_z=("z_score", "mean"), years=("year", "nunique"))
        .reset_index()
    )
    g = g[g["years"] >= min_years].copy()
    g = g.sort_values(["avg_z", "years"], ascending=[False, False]).head(top_k)
    return g[group_col].astype(str).tolist()


def build_bump_chart_data(
    table: pd.DataFrame,
    group_col: str = "course",
    focus_groups: Optional[List[str]] = None,
    top_k: int = 10,
    min_years: int = 6,
) -> pd.DataFrame:
    focus = select_focus_groups(
        table=table,
        group_col=group_col,
        top_k=top_k,
        min_years=min_years,
        focus=focus_groups,
    )
    bump = table[table[group_col].isin(focus)].copy()
    bump = bump.sort_values(["year", "rank", group_col]).reset_index(drop=True)
    return bump[[group_col, "year", "rank", "z_score", "mean_salary", "sample_size"]]


def plot_bump_chart(
    bump: pd.DataFrame,
    group_col: str = "course",
    title: str = "relative standing over time (bump chart)",
    save_path: Optional[str] = None,
) -> None:
    if len(bump) == 0:
        return

    years = sorted(bump["year"].unique().tolist())
    groups = bump[group_col].unique().tolist()

    fig, ax = plt.subplots(figsize=(13, 7))
    palette = sns.color_palette("tab10", n_colors=max(3, len(groups)))
    color_map = {g: palette[i % len(palette)] for i, g in enumerate(groups)}

    for g in groups:
        sub = bump[bump[group_col] == g].sort_values("year")
        ax.plot(
            sub["year"],
            sub["rank"],
            marker="o",
            linewidth=2.2,
            alpha=0.9,
            label=str(g),
            color=color_map[g],
        )

        last = sub[sub["year"] == max(years)].head(1)
        if len(last):
            ax.text(
                float(last["year"].iloc[0]) + 0.2,
                float(last["rank"].iloc[0]),
                str(g)[:28],
                fontsize=8,
                alpha=0.85,
                color=color_map[g],
                va="center",
            )

    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel("year", fontsize=11, fontweight="bold")
    ax.set_ylabel("rank (1 = best)", fontsize=11, fontweight="bold")
    ax.set_xticks(years)
    ax.grid(True, alpha=0.25)
    ax.invert_yaxis()

    handles, labels = ax.get_legend_handles_labels()
    if len(labels) <= 12:
        ax.legend(loc="lower left", framealpha=0.85)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches="tight")
    plt.close()


def relative_performance_index(
    year_start: Optional[int] = None,
    year_end: Optional[int] = None,
    universities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    salary_column: str = "gross_monthly_median",
    min_sample_size: int = 1,
    weight_mode: WeightMode = "none",
    focus_courses: Optional[List[str]] = None,
    top_k: int = 10,
    min_years: int = 6,
    save_path: Optional[str] = None,
) -> Dict[str, Any]:
    results = compute_relative_performance_index(
        year_start=year_start,
        year_end=year_end,
        universities=universities,
        categories=categories,
        salary_column=salary_column,
        group_by=("course",),
        min_sample_size=min_sample_size,
        weight_mode=weight_mode,
    )

    table = results["table"]
    bump = build_bump_chart_data(
        table=table,
        group_col="course",
        focus_groups=focus_courses,
        top_k=top_k,
        min_years=min_years,
    )

    if save_path is None:
        save_path = (Path(__file__).resolve().parent / "viz_relative_performance_bump.png").as_posix()

    plot_bump_chart(
        bump=bump,
        group_col="course",
        title="relative course standing over time (z-score rank bump chart)",
        save_path=save_path,
    )

    # simple trend metric: slope of z-score vs year per course
    slopes = []
    for course, sub in table.groupby("course"):
        sub = sub.sort_values("year")
        if sub["year"].nunique() < 2:
            continue
        x = sub["year"].to_numpy(dtype=float)
        y = sub["z_score"].to_numpy(dtype=float)
        slope = float(np.polyfit(x, y, 1)[0])
        slopes.append({"course": course, "z_score_slope_per_year": slope, "years": int(sub["year"].nunique())})
    slopes_df = pd.DataFrame(slopes).sort_values("z_score_slope_per_year", ascending=False).reset_index(drop=True)

    return {
        "table": table,
        "year_stats": results["year_stats"],
        "bump_data": bump,
        "slopes": slopes_df,
        "meta": {**results["meta"], "focus_courses": focus_courses, "top_k": int(top_k), "min_years": int(min_years)},
        "image_path": save_path,
    }


# ----------------------------
# aws / flask-friendly wrapper
# ----------------------------
def _parse_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_list(value: Any) -> Optional[List[str]]:
    if value is None or value == "":
        return None
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [v.strip() for v in str(value).split(",") if v.strip()]


def _parse_str(value: Any, default: Optional[str] = None) -> Optional[str]:
    if value is None or value == "":
        return default
    return str(value)


def _json_default(obj: Any) -> Any:
    if isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    return str(obj)


def relative_performance_api(params: Dict[str, Any]) -> Dict[str, Any]:
    year_start = _parse_int(params.get("year_start"))
    year_end = _parse_int(params.get("year_end"))
    salary_column = _parse_str(params.get("salary_column"), "gross_monthly_median") or "gross_monthly_median"
    min_sample_size = _parse_int(params.get("min_sample_size"), 1) or 1
    top_k = _parse_int(params.get("top_k"), 10) or 10
    min_years = _parse_int(params.get("min_years"), 6) or 6
    weight_mode = _parse_str(params.get("weight_mode"), "none") or "none"
    categories = _parse_list(params.get("categories"))
    universities = _parse_list(params.get("universities"))
    focus_courses = _parse_list(params.get("focus_courses"))
    include_plot = str(params.get("include_plot") or "").strip().lower() in {"1", "true", "t", "yes", "y"}
    save_path = "/tmp/viz_relative_performance_bump.png" if include_plot else None

    results = relative_performance_index(
        year_start=year_start,
        year_end=year_end,
        universities=universities,
        categories=categories,
        salary_column=salary_column,
        min_sample_size=min_sample_size,
        weight_mode=weight_mode if weight_mode in {"none", "sample_size"} else "none",
        focus_courses=focus_courses,
        top_k=top_k,
        min_years=min_years,
        save_path=save_path,
    )

    return {
        "meta": results["meta"],
        "year_stats": results["year_stats"].to_dict(orient="records"),
        "bump_data": results["bump_data"].to_dict(orient="records"),
        "slopes": results["slopes"].head(30).to_dict(orient="records"),
        "image_path": save_path if include_plot else None,
    }


def lambda_handler(event, context):
    params = event.get("queryStringParameters") or {}
    payload = relative_performance_api(params)
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload, default=_json_default),
    }


if __name__ == "__main__":
    results = relative_performance_index(
        year_start=2013,
        year_end=2023,
        salary_column="gross_monthly_median",
        min_sample_size=1,
        weight_mode="none",
        top_k=10,
        min_years=6,
        save_path=None,
    )
    print("saved bump chart to:", results["image_path"])
    print(results["slopes"].head(10))
