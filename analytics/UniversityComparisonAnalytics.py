"""
STREAMLINED UNIVERSITY COMPARISON ANALYTICS
===========================================
Four Key Visualizations
1 Employment Rates (Line Chart)
What it shows: Year-by-year overall employment rate (%) for each university
Chart type: Line chart with markers
Key insight: Identifies which universities maintain highest graduate employability over time

2 Salary Comparison (Line Chart)
What it shows: Year-by-year average gross monthly salary (SGD) for each university
Chart type: Line chart with markers
Key insight: Reveals salary trends and identifies highest-paying universities

3 Salary by Category (Grouped Bar Chart)
What it shows: Average salary across different fields (Engineering, Law, Medicine, IT, etc.) by university
Chart type: Grouped bar chart (universities side-by-side)
Key insight: Shows which universities excel in specific fields

4 Salary Growth (Line Chart)
What it shows: Year-over-year percentage change in salaries (baseline year = 0%)
Chart type: Line chart showing growth rates
Key insight: Reveals when growth occurred and which universities had fastest salary increases

"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Optional

# ============================================================================
# CONFIGURATION
# ============================================================================
COMMON_START_YEAR = 2015
COMMON_END_YEAR = 2022
MIN_RECORDS = 40  # Minimum records for a university to be included

sns.set_style("whitegrid")
plt.rcParams['figure.dpi'] = 100

# ============================================================================
# DATA LOADING WITH FILTER SUPPORT
# ============================================================================

def load_data(
    year_start: int = COMMON_START_YEAR,
    year_end: int = COMMON_END_YEAR,
    universities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Load and filter graduate employment data.
    
    Usage for Web App:
    -----------------
    # Get filter values from frontend (e.g., Flask request.args)
    year_start = int(request.args.get('year_start', 2018))
    year_end = int(request.args.get('year_end', 2022))
    selected_unis = request.args.getlist('universities')  # Multiple selection
    selected_cats = request.args.getlist('categories')
    
    # Load filtered data
    df = load_data(year_start, year_end, selected_unis if selected_unis else None, 
                   selected_cats if selected_cats else None)
    """
    df = pd.read_csv('../data/CleanedGraduateEmploymentSurvey.csv')
    
    # Apply year filter
    df = df[(df['year'] >= year_start) & (df['year'] <= year_end)].copy()
    
    # Apply university filter
    if universities:
        df = df[df['university'].isin(universities)].copy()
    
    # Apply category filter
    if categories:
        df = df[df['course_category'].isin(categories)].copy()
    
    # Filter to major universities only (bias mitigation)
    uni_counts = df['university'].value_counts()
    major_unis = uni_counts[uni_counts >= MIN_RECORDS].index.tolist()
    df = df[df['university'].isin(major_unis)].copy()
    
    return df


# ============================================================================
# VISUALIZATION 1: EMPLOYMENT RATES (LINE CHART)
# ============================================================================

def plot_employment_rates(
    year_start: int = COMMON_START_YEAR,
    year_end: int = COMMON_END_YEAR,
    universities: Optional[List[str]] = None,
    save_path: str = 'viz1_employment_rates.png'
) -> pd.DataFrame:
    """
    Plot employment rates over time with year-by-year trends.

    Web App Integration:
    -------------------
    # Flask example
    @app.route('/api/employment-rates')
    def employment_rates_api():
        year_start = int(request.args.get('year_start', 2018))
        year_end = int(request.args.get('year_end', 2022))
        unis = request.args.getlist('universities')
        
        summary = plot_employment_rates(year_start, year_end, unis if unis else None)
        return jsonify(summary.to_dict())
    """
    df = load_data(year_start, year_end, universities)
    
    # Calculate yearly averages with sample sizes
    yearly_emp = df.groupby(['year', 'university']).agg({
        'employment_rate_overall': 'mean',
        'course': 'count'  # SAMPLE SIZE (n)
    }).reset_index()
    yearly_emp.columns = ['year', 'university', 'employment_rate', 'sample_size']
    
    # Create line plot
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Plot each university as a separate line
    for uni in yearly_emp['university'].unique():
        uni_data = yearly_emp[yearly_emp['university'] == uni]
        
        # Shorten names for legend
        uni_short = uni.replace('University', 'Uni.').replace('Singapore', 'SG')
        
        ax.plot(
            uni_data['year'],
            uni_data['employment_rate'],
            marker='o',
            markersize=8,
            linewidth=2.5,
            label=uni_short,
            alpha=0.8
        )
        
        # Add sample size annotations above data points
        for _, row in uni_data.iterrows():
            ax.annotate(
                f"n={int(row['sample_size'])}",
                xy=(row['year'], row['employment_rate']),
                xytext=(0, 10),
                textcoords='offset points',
                ha='center',
                fontsize=8,
                alpha=0.7
            )
    
    ax.set_xlabel('Year', fontsize=12, fontweight='bold')
    ax.set_ylabel('Overall Employment Rate (%)', fontsize=12, fontweight='bold')
    ax.set_title(
        f'Employment Rates by University ({year_start}-{year_end})\n' +
        'Sample sizes (n) shown above data points',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.legend(loc='best', framealpha=0.9)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(85, 100)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    # Calculate summary statistics
    summary = df.groupby('university').agg({
        'employment_rate_overall': ['mean', 'std'],
        'course': 'count'
    }).round(2)
    summary.columns = ['avg_rate', 'std_dev', 'total_samples']
    
    return summary.sort_values('avg_rate', ascending=False)


# ============================================================================
# VISUALIZATION 2: SALARY COMPARISON (LINE CHART)
# ============================================================================

def plot_salary_comparison(
    year_start: int = COMMON_START_YEAR,
    year_end: int = COMMON_END_YEAR,
    universities: Optional[List[str]] = None,
    save_path: str = 'viz2_salary_comparison.png'
) -> pd.DataFrame:
    """
    Plot average salaries over time with year-by-year trends.
    
    Returns:
    --------
    pd.DataFrame
        Summary statistics (avg_salary, std_dev, total_samples) per university
    """
    df = load_data(year_start, year_end, universities)
    
    # Calculate yearly salary averages with sample sizes
    yearly_salary = df.groupby(['year', 'university']).agg({
        'gross_monthly_mean': 'mean',
        'course': 'count'  # SAMPLE SIZE (n)
    }).reset_index()
    yearly_salary.columns = ['year', 'university', 'avg_salary', 'sample_size']
    
    # Create line plot
    fig, ax = plt.subplots(figsize=(14, 7))
    
    for uni in yearly_salary['university'].unique():
        uni_data = yearly_salary[yearly_salary['university'] == uni]
        uni_short = uni.replace('University', 'Uni.').replace('Singapore', 'SG')
        
        ax.plot(
            uni_data['year'],
            uni_data['avg_salary'],
            marker='o',
            markersize=8,
            linewidth=2.5,
            label=uni_short,
            alpha=0.8
        )
        
        # Add sample size annotations
        for _, row in uni_data.iterrows():
            ax.annotate(
                f"n={int(row['sample_size'])}",
                xy=(row['year'], row['avg_salary']),
                xytext=(0, 10),
                textcoords='offset points',
                ha='center',
                fontsize=8,
                alpha=0.7
            )
    
    ax.set_xlabel('Year', fontsize=12, fontweight='bold')
    ax.set_ylabel('Average Gross Monthly Salary (SGD)', fontsize=12, fontweight='bold')
    ax.set_title(
        f'Graduate Salaries by University ({year_start}-{year_end})\n' +
        'Sample sizes (n) shown above data points',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.legend(loc='best', framealpha=0.9)
    ax.grid(True, alpha=0.3)
    
    # Format y-axis as currency
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    # Calculate summary statistics
    summary = df.groupby('university').agg({
        'gross_monthly_mean': ['mean', 'std'],
        'course': 'count'
    }).round(2)
    summary.columns = ['avg_salary', 'std_dev', 'total_samples']
    
    return summary.sort_values('avg_salary', ascending=False)


# ============================================================================
# VISUALIZATION 3: SALARY BY CATEGORY (GROUPED BAR CHART)
# ============================================================================

def plot_salary_by_category(
    year_start: int = COMMON_START_YEAR,
    year_end: int = COMMON_END_YEAR,
    universities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    top_n_categories: int = 8,
    save_path: str = 'viz3_salary_by_category.png'
) -> pd.DataFrame:
    """
    Plot average salary by course category across universities.
    
    Returns:
    --------
    pd.DataFrame
        Pivot table with categories as rows and universities as columns
    
    Available Categories:
    --------------------
    'Accountancy', 'Engineering', 'Information Technology', 'Business & Administration',
    'Medicine', 'Law', 'Architecture & Built Environment', 'Health Sciences',
    'Arts & Social Sciences', 'Sciences', 'Education', 'Dentistry', 'Others'
    """
    df = load_data(year_start, year_end, universities, categories)
    
    # Aggregate by university and category
    cat_salary = df.groupby(['university', 'course_category']).agg({
        'gross_monthly_mean': 'mean',
        'course': 'count'  # SAMPLE SIZE (n)
    }).reset_index()
    cat_salary.columns = ['university', 'category', 'avg_salary', 'sample_size']
    
    # If no categories specified, select top N by overall salary
    if categories is None:
        top_cats = (df.groupby('course_category')['gross_monthly_mean']
                    .mean()
                    .nlargest(top_n_categories)
                    .index.tolist())
        cat_salary = cat_salary[cat_salary['category'].isin(top_cats)]
    
    # Filter to categories with data from at least 2 universities
    cat_counts = cat_salary.groupby('category')['university'].nunique()
    valid_cats = cat_counts[cat_counts >= 2].index.tolist()
    cat_salary = cat_salary[cat_salary['category'].isin(valid_cats)]
    
    # Create grouped bar chart
    fig, ax = plt.subplots(figsize=(14, 8))
    
    categories_list = cat_salary['category'].unique()
    universities_list = cat_salary['university'].unique()
    
    x = np.arange(len(categories_list))
    width = 0.8 / len(universities_list)
    
    for i, uni in enumerate(universities_list):
        uni_data = cat_salary[cat_salary['university'] == uni]
        
        # Get salaries for each category (use 0 if missing)
        salaries = []
        sample_sizes = []
        for cat in categories_list:
            cat_row = uni_data[uni_data['category'] == cat]
            if len(cat_row) > 0:
                salaries.append(cat_row['avg_salary'].values[0])
                sample_sizes.append(cat_row['sample_size'].values[0])
            else:
                salaries.append(0)
                sample_sizes.append(0)
        
        uni_short = uni.replace('University', 'Uni.').replace('Singapore', 'SG')
        
        bars = ax.bar(
            x + i * width - (len(universities_list) - 1) * width / 2,
            salaries,
            width,
            label=uni_short,
            alpha=0.8
        )
        
        # Add sample size labels on bars
        for j, (bar, n) in enumerate(zip(bars, sample_sizes)):
            if n > 0:
                height = bar.get_height()
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    height + 50,
                    f'n={int(n)}',
                    ha='center',
                    va='bottom',
                    fontsize=7,
                    rotation=90,
                    alpha=0.7
                )
    
    ax.set_xlabel('Course Category', fontsize=12, fontweight='bold')
    ax.set_ylabel('Average Gross Monthly Salary (SGD)', fontsize=12, fontweight='bold')
    ax.set_title(
        f'Salaries by Field & University ({year_start}-{year_end})\n' +
        'Sample sizes (n) shown on bars',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.set_xticks(x)
    ax.set_xticklabels(categories_list, rotation=45, ha='right')
    ax.legend(loc='upper left', framealpha=0.9)
    ax.grid(axis='y', alpha=0.3)
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    # Return pivot table
    pivot = cat_salary.pivot_table(
        index='category',
        columns='university',
        values='avg_salary',
        aggfunc='mean'
    ).round(0)
    
    return pivot


# ============================================================================
# VISUALIZATION 4: SALARY GROWTH (HORIZONTAL BAR CHART)
# ============================================================================

def plot_salary_growth(
    year_start: int = COMMON_START_YEAR,
    year_end: int = COMMON_END_YEAR,
    universities: Optional[List[str]] = None,
    save_path: str = 'viz4_salary_growth.png'
) -> pd.DataFrame:
    """
    Plot year-by-year salary growth rates as line chart.
    
    Shows year-over-year percentage change in average graduate salaries.
    First year serves as baseline (0% growth).
    
    Returns:
    --------
    pd.DataFrame
        Year-by-year data with columns:
        - year: Year of measurement
        - university: University name
        - salary: Average gross monthly salary for that year
        - growth_rate: Year-over-year percentage change from previous year
        - sample_size: Number of programs included (n)
    
    Web App Integration:
    -------------------
    @app.route('/api/salary-growth')
    def salary_growth_api():
        year_start = int(request.args.get('year_start', 2018))
        year_end = int(request.args.get('year_end', 2022))
        unis = request.args.getlist('universities')
        
        growth_df = plot_salary_growth(
            year_start, year_end, 
            unis if unis else None,
            save_path='static/salary_growth.png'
        )
        
        return jsonify({
            'image_url': '/static/salary_growth.png',
            'data': growth_df.to_dict(orient='records')
        })
    """
    df = load_data(year_start, year_end, universities)
    
    # Calculate yearly salary averages
    yearly_salary = df.groupby(['year', 'university']).agg({
        'gross_monthly_mean': 'mean',
        'course': 'count'
    }).reset_index()
    yearly_salary.columns = ['year', 'university', 'avg_salary', 'sample_size']
    
    # Calculate year-over-year growth rate for each university
    growth_data = []
    
    for uni in yearly_salary['university'].unique():
        uni_data = yearly_salary[yearly_salary['university'] == uni].sort_values('year')
        
        for i in range(len(uni_data)):
            row = uni_data.iloc[i]
            
            if i == 0:
                # First year - no growth rate (baseline = 0%)
                growth_rate = 0
            else:
                prev_row = uni_data.iloc[i-1]
                growth_rate = ((row['avg_salary'] - prev_row['avg_salary']) / 
                              prev_row['avg_salary'] * 100)
            
            growth_data.append({
                'year': row['year'],
                'university': uni,
                'salary': row['avg_salary'],
                'growth_rate': growth_rate,
                'sample_size': row['sample_size']
            })
    
    growth_df = pd.DataFrame(growth_data)
    
    # Create line chart
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Plot each university's growth rate over time
    for uni in growth_df['university'].unique():
        uni_data = growth_df[growth_df['university'] == uni]
        
        # Shorten university names for legend
        uni_short = uni.replace('University', 'Uni.').replace('Singapore', 'SG')
        
        ax.plot(
            uni_data['year'],
            uni_data['growth_rate'],
            marker='o',
            markersize=8,
            linewidth=2.5,
            label=uni_short,
            alpha=0.8
        )
        
        # Add annotations (sample size + growth rate) on data points
        # Skip first year since it's always 0%
        for _, row in uni_data[uni_data['year'] > year_start].iterrows():
            ax.annotate(
                f"n={int(row['sample_size'])}\n{row['growth_rate']:.1f}%",
                xy=(row['year'], row['growth_rate']),
                xytext=(0, 10),
                textcoords='offset points',
                ha='center',
                fontsize=7,
                alpha=0.7
            )
    
    # Add zero line for reference
    ax.axhline(0, color='gray', linewidth=1, linestyle='--', alpha=0.5)
    
    ax.set_xlabel('Year', fontsize=12, fontweight='bold')
    ax.set_ylabel('Year-over-Year Salary Growth (%)', fontsize=12, fontweight='bold')
    ax.set_title(
        f'Graduate Salary Growth Rate by University ({year_start}-{year_end})\n' +
        f'Percentage change from previous year (baseline: {year_start})',
        fontsize=14,
        fontweight='bold',
        pad=20
    )
    ax.legend(loc='best', framealpha=0.9)
    ax.grid(True, alpha=0.3)
    
    # Format y-axis as percentage
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{x:.0f}%'))
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    return growth_df

# ============================================================================
# CONVENIENCE FUNCTION: GET AVAILABLE FILTERS
# ============================================================================

def get_available_filters() -> dict:
    """
    Get all available filter options from the dataset.
    Useful for populating dropdown menus in web applications.

    Web App Usage:
    -------------
    # Flask example
    @app.route('/api/filters')
    def get_filters():
        return jsonify(get_available_filters())
    """
    df = pd.read_csv('CleanedGraduateEmploymentSurvey.csv')
    
    return {
        'years': sorted(df['year'].unique().tolist()),
        'universities': sorted(df['university'].unique().tolist()),
        'categories': sorted(df['course_category'].unique().tolist())
    }


# ============================================================================
# MAIN ANALYTICS FUNCTION
# ============================================================================

def university_comparison_analytics(
    year_start: int = COMMON_START_YEAR,
    year_end: int = COMMON_END_YEAR,
    universities: Optional[List[str]] = None,
    categories: Optional[List[str]] = None
) -> dict:
    """
    Run all four analytics visualizations with specified filters.
    
    Returns:
    --------
    dict containing:
        - 'employment_summary': DataFrame with employment statistics
        - 'salary_summary': DataFrame with salary statistics
        - 'category_pivot': DataFrame with salary by category
        - 'growth_summary': DataFrame with growth statistics
    
    """
    print("="*70)
    print("UNIVERSITY COMPARISON ANALYTICS")
    print("="*70)
    print(f"Period: {year_start}-{year_end}")
    if universities:
        print(f"Universities: {', '.join(universities)}")
    if categories:
        print(f"Categories: {', '.join(categories)}")
    print("="*70)
    
    # Run all visualizations
    print("\n1️⃣  Generating Employment Rates (Line Chart)...")
    employment_summary = plot_employment_rates(year_start, year_end, universities)
    
    print("\n2️⃣  Generating Salary Comparison (Line Chart)...")
    salary_summary = plot_salary_comparison(year_start, year_end, universities)
    
    print("\n3️⃣  Generating Salary by Category (Grouped Bar Chart)...")
    category_pivot = plot_salary_by_category(year_start, year_end, universities, categories)
    
    print("\n4️⃣  Generating Salary Growth (Bar Chart)...")
    growth_summary = plot_salary_growth(year_start, year_end, universities)
    
    print("\n" + "="*70)
    print("✅ ALL VISUALIZATIONS COMPLETE")
    print("="*70)
    
    return {
        'employment_summary': employment_summary,
        'salary_summary': salary_summary,
        'category_pivot': category_pivot,
        'growth_summary': growth_summary
    }


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    # Example 1: Run with default parameters (all major universities, 2018-2022)
    results = university_comparison_analytics()
    
    # Example 2: Filter by specific universities and years
    # results = university_comparison_analytics(
    #     year_start=2019,
    #     year_end=2022,
    #     universities=[
    #         'National University of Singapore',
    #         'Nanyang Technological University'
    #     ]
    # )
    
    # Example 3: Get available filter options (for web app dropdowns)
    # filters = get_available_filters()
    # print("\nAvailable filters:")
    # print(f"Years: {filters['years']}")
    # print(f"Universities: {filters['universities']}")
    # print(f"Categories: {filters['categories']}")
