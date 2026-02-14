import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { Search, TrendingUp, Loader2, DollarSign, Award, Percent, X, ChevronRight, ChevronDown, School, BookOpen, Layers } from 'lucide-react';

const API_URL = "https://uihec8ny2d.execute-api.us-east-1.amazonaws.com/analytics";

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // View Modes
  const [viewMode, setViewMode] = useState('courses'); // 'courses' or 'categories'
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // RESTORED: Salary Metric State
  const [salaryMetric, setSalaryMetric] = useState('gross_monthly_median');

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTool, setActiveTool] = useState('growth');
  const [expandedUnis, setExpandedUnis] = useState({});
  const [expandedCats, setExpandedCats] = useState({});
  const [selectionsCollapsed, setSelectionsCollapsed] = useState(false);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(json => {
        setData(json.records);
        setSummary(json.summary);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // 1. Group Data for the "Courses" view
  const groupedData = useMemo(() => {
    const groups = {};
    if (!data || !Array.isArray(data)) return groups;
    data.forEach(item => {
      const { university, course_category, course } = item;
      if (!university || !course_category) return;
      if (!groups[university]) groups[university] = {};
      if (!groups[university][course_category]) groups[university][course_category] = new Set();
      groups[university][course_category].add(course);
    });
    return groups;
  }, [data]);

  // 2. Extract unique categories for the "Categories" view
  const allCategories = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return [...new Set(data.map(d => d.course_category))].sort();
  }, [data]);

  // 3. Dynamic Chart Data (RESTORED: dynamically uses salaryMetric)
  const chartData = useMemo(() => {
    if (viewMode === 'courses') {
      return data.filter(d => selectedCourses.includes(`${d.university} - ${d.course}`));
    } else {
      if (!selectedCategories.length) return [];
      const aggregated = [];

      selectedCategories.forEach(cat => {
        const catData = data.filter(d => d.course_category === cat);
        const years = [...new Set(catData.map(d => d.year))];

        years.forEach(year => {
          const yearData = catData.filter(d => d.year === year);
          if (yearData.length > 0) {
            aggregated.push({
              year: year,
              course: cat,
              university: 'Industry Average',
              course_category: cat,
              sample_size: yearData.length,
              // Mapped dynamically based on dropdown
              [salaryMetric]: yearData.reduce((acc, curr) => acc + (curr[salaryMetric] || 0), 0) / yearData.length,
              employment_rate_overall: yearData.reduce((acc, curr) => acc + curr.employment_rate_overall, 0) / yearData.length,
              z_score: yearData.reduce((acc, curr) => acc + curr.z_score, 0) / yearData.length
            });
          }
        });
      });
      return aggregated;
    }
  }, [data, viewMode, selectedCourses, selectedCategories, salaryMetric]); // Added salaryMetric dependency

  // TEAMMATE'S CODE: Tradeoff view aggregation
  const tradeoffData = useMemo(() => {
    if (!chartData.length) return [];

    const grouped = chartData.reduce((acc, row) => {
      const key = viewMode === 'courses' ? `${row.university} - ${row.course}` : row.course_category;
      if (!acc[key]) {
        acc[key] = { label: key, totalSalary: 0, totalEmployment: 0, count: 0, totalSampleSize: 0 };
      }
      // ADAPTED: Uses the dynamic salaryMetric instead of hardcoded gross_monthly_median
      acc[key].totalSalary += Number(row[salaryMetric] || 0);
      acc[key].totalEmployment += Number(row.employment_rate_overall || 0);
      acc[key].count += 1;
      acc[key].totalSampleSize += Number(row.sample_size || 1);
      return acc;
    }, {});

    const points = Object.values(grouped).map(g => ({
      label: g.label,
      avg_salary: g.count ? g.totalSalary / g.count : 0,
      avg_employment: g.count ? g.totalEmployment / g.count : 0,
      sample_size: Math.max(1, Math.round(g.totalSampleSize))
    }));

    if (!points.length) return [];

    const salaryMedian = [...points].map(p => p.avg_salary).sort((a, b) => a - b);
    const employmentMedian = [...points].map(p => p.avg_employment).sort((a, b) => a - b);
    const midSalary = salaryMedian[Math.floor(salaryMedian.length / 2)];
    const midEmployment = employmentMedian[Math.floor(employmentMedian.length / 2)];

    return points.map(p => {
      const salaryLevel = p.avg_salary >= midSalary ? 'High' : 'Low';
      const employmentLevel = p.avg_employment >= midEmployment ? 'High' : 'Low';
      return {
        ...p,
        quadrant: `${salaryLevel} Salary / ${employmentLevel} Employment`
      };
    });
  }, [chartData, viewMode, salaryMetric]);

  // TEAMMATE'S CODE: Auto-scaling Tradeoff Domains
  const tradeoffDomains = useMemo(() => {
    if (!tradeoffData.length) return { x: [70, 100], y: [0, 7000] };
    const xVals = tradeoffData.map(d => d.avg_employment);
    const yVals = tradeoffData.map(d => d.avg_salary);
    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const xPad = Math.max(0.5, (xMax - xMin) * 0.08);
    const yPad = Math.max(80, (yMax - yMin) * 0.08);
    return {
      x: [Math.max(0, xMin - xPad), Math.min(100, xMax + xPad)],
      y: [Math.max(0, yMin - yPad), yMax + yPad]
    };
  }, [tradeoffData]);

  // TEAMMATE'S CODE: Trendline Math
  const tradeoffTrend = useMemo(() => {
    if (tradeoffData.length < 2) return null;
    const x = tradeoffData.map(d => d.avg_employment);
    const y = tradeoffData.map(d => d.avg_salary);
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + (xi * y[i]), 0);
    const sumX2 = x.reduce((acc, xi) => acc + (xi * xi), 0);
    const denom = (n * sumX2) - (sumX * sumX);
    if (denom === 0) return null;
    const slope = ((n * sumXY) - (sumX * sumY)) / denom;
    const intercept = (sumY - (slope * sumX)) / n;
    const x1 = Math.min(...x);
    const x2 = Math.max(...x);
    return [
      { x: x1, y: (slope * x1) + intercept },
      { x: x2, y: (slope * x2) + intercept }
    ];
  }, [tradeoffData]);

  // TEAMMATE'S CODE: Quadrant Colors
  const quadrantColors = {
    'High Salary / High Employment': '#34d399', // Emerald
    'High Salary / Low Employment': '#fb923c',  // Orange
    'Low Salary / High Employment': '#93c5fd',  // Blue
    'Low Salary / Low Employment': '#f472b6'    // Pink
  };

  const salaryMetricLabel = useMemo(() => {
    const labels = {
      basic_monthly_mean: 'Basic Mean Salary',
      basic_monthly_median: 'Basic Median Salary',
      gross_monthly_mean: 'Gross Mean Salary',
      gross_monthly_median: 'Gross Median Salary',
      gross_mthly_25_percentile: 'Gross 25th Percentile Salary',
      gross_mthly_75_percentile: 'Gross 75th Percentile Salary'
    };
    return labels[salaryMetric] || 'Salary';
  }, [salaryMetric]);

  const tradeoffSampleLegend = useMemo(() => {
    if (!tradeoffData.length) return [];

    const roundLegendSample = (value) => {
      if (value < 10) return Math.round(value);
      if (value < 50) return Math.round(value / 5) * 5;
      if (value < 200) return Math.round(value / 10) * 10;
      return Math.round(value / 25) * 25;
    };

    const values = [...new Set(tradeoffData.map(d => Number(d.sample_size) || 0))]
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    if (!values.length) return [];

    const rounded = [...new Set(values.map(roundLegendSample))].sort((a, b) => a - b);
    if (rounded.length <= 5) return rounded;

    const idx = [
      0,
      Math.floor((rounded.length - 1) * 0.25),
      Math.floor((rounded.length - 1) * 0.5),
      Math.floor((rounded.length - 1) * 0.75),
      rounded.length - 1
    ];

    return [...new Set(idx.map(i => rounded[i]))].sort((a, b) => a - b);
  }, [tradeoffData]);

  const tradeoffLegendBubblePx = (sampleSize) => {
    if (!tradeoffData.length) return 10;
    const all = tradeoffData.map(d => Number(d.sample_size) || 0).filter(v => v > 0);
    if (!all.length) return 10;
    const min = Math.min(...all);
    const max = Math.max(...all);
    if (min === max) return 12;
    const area = 100 + ((sampleSize - min) / (max - min)) * 700;
    return Math.max(8, Math.round(Math.sqrt(area)));
  };

  const tooltipContentStyle = { backgroundColor: '#09090b', border: '1px solid #27272a' };
  const tooltipLabelStyle = { color: '#e4e4e7', fontWeight: 600 };
  const tooltipItemStyle = { color: '#e4e4e7' };

  const renderTradeoffTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    const title = viewMode === 'courses' ? `Course: ${point.label}` : `Category: ${point.label}`;

    return (
      <div style={{ backgroundColor: '#09090b', border: '1px solid #27272a', padding: '8px 10px', borderRadius: '8px' }}>
        <div style={{ color: '#e4e4e7', fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ color: '#e4e4e7', fontSize: 12 }}>{`Avg Employment: ${Number(point.avg_employment).toFixed(2)}%`}</div>
        <div style={{ color: '#e4e4e7', fontSize: 12 }}>{`${salaryMetricLabel}: $${Math.round(Number(point.avg_salary))}`}</div>
        <div style={{ color: '#e4e4e7', fontSize: 12 }}>{`Sample Size: ${point.sample_size}`}</div>
        <div style={{ color: '#e4e4e7', fontSize: 12 }}>{`Quadrant: ${point.quadrant}`}</div>
      </div>
    );
  };

  const renderPerformanceTooltip = ({ active, payload, label: tooltipLabel }) => {
    if (!active || !payload || !payload.length) return null;
    // use payload from the hovered bar (shared={false} ensures per-bar payload)
    const item = payload[0];
    const point = item?.payload;
    const z = point?.z_score != null ? Number(point.z_score) : Number(item?.value);
    if (z === undefined || isNaN(z)) return null;
    const label = point
      ? (viewMode === 'courses'
        ? `${point.year} · ${point.university} · ${point.course}`
        : `${point.year} · ${point.course}`)
      : (tooltipLabel ?? '');
    const interpretation = z > 0 ? 'Above average' : 'Below average';
    const detail = z !== 0 ? `${Math.abs(z).toFixed(2)} standard deviation${Math.abs(z) !== 1 ? 's' : ''} ${z > 0 ? 'above' : 'below'} the mean` : 'at the mean';

    return (
      <div key={point ? `${point.year}-${point.university}-${point.course}` : tooltipLabel} style={{ backgroundColor: '#09090b', border: '1px solid #27272a', padding: '8px 10px', borderRadius: '8px' }}>
        <div style={{ color: '#e4e4e7', fontWeight: 700, marginBottom: 6 }}>{label}</div>
        <div style={{ color: '#e4e4e7', fontSize: 12 }}>Z-score: {z.toFixed(2)}</div>
        <div style={{ color: z > 0 ? '#22d3ee' : '#fb7185', fontSize: 12, fontWeight: 600 }}>{interpretation}</div>
        <div style={{ color: '#a1a1aa', fontSize: 11, marginTop: 4 }}>{detail}</div>
      </div>
    );
  };

  const activeSelections = viewMode === 'courses' ? selectedCourses : selectedCategories;
  const setActiveSelections = viewMode === 'courses' ? setSelectedCourses : setSelectedCategories;

  // RESTORED: Dynamic Selected Stats
  const selAvgSalary = chartData.length > 0 ? (chartData.reduce((acc, curr) => acc + (curr[salaryMetric] || 0), 0) / chartData.length).toFixed(0) : 0;
  const selAvgEmp = chartData.length > 0 ? (chartData.reduce((acc, curr) => acc + curr.employment_rate_overall, 0) / chartData.length).toFixed(1) : 0;

  const toggleUni = (uni) => setExpandedUnis(prev => ({ ...prev, [uni]: !prev[uni] }));
  const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin mb-4 text-cyan-400" size={40} />
      <div className="tracking-widest animate-pulse text-xs font-mono uppercase">Restoring_Analytics_Pipeline...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-10">
        <h1 className="text-5xl font-black text-white tracking-tighter italic">Graduate Employment Analytics</h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] mt-2">Group 36</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-2xl sticky top-8 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registry</span>
              <span className="text-[10px] font-mono text-cyan-500">{activeSelections.length} ACTIVE</span>
            </div>

            {/* VIEW MODE TOGGLE */}
            <div className="flex gap-1 mb-4 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
              <button
                onClick={() => setViewMode('courses')}
                className={`flex-1 py-1.5 flex justify-center items-center gap-2 text-[9px] font-black uppercase tracking-widest rounded transition-all ${viewMode === 'courses' ? 'bg-zinc-800 text-cyan-400 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                <BookOpen size={10} /> Courses
              </button>
              <button
                onClick={() => setViewMode('categories')}
                className={`flex-1 py-1.5 flex justify-center items-center gap-2 text-[9px] font-black uppercase tracking-widest rounded transition-all ${viewMode === 'categories' ? 'bg-zinc-800 text-purple-400 shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                <Layers size={10} /> Categories
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-zinc-950 rounded-lg border border-zinc-800">
              <Search size={14} className="text-zinc-600" />
              <input
                className="bg-transparent border-none outline-none text-xs w-full text-white"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-2">

              {/* RESTORED: SMART SEARCH FOR COURSES */}
              {viewMode === 'courses' && Object.keys(groupedData).map(uni => {
                const searchLower = searchTerm.toLowerCase();
                const uniMatches = uni.toLowerCase().includes(searchLower);

                const matchingCats = Object.keys(groupedData[uni]).filter(cat => {
                  const catMatches = cat.toLowerCase().includes(searchLower);
                  const courseMatches = [...groupedData[uni][cat]].some(c => c.toLowerCase().includes(searchLower));
                  return uniMatches || catMatches || courseMatches;
                });

                // Hide university if it doesn't match search
                if (searchTerm && !uniMatches && matchingCats.length === 0) return null;

                // Auto-expand if searching
                const isUniExpanded = searchTerm ? true : expandedUnis[uni];

                return (
                  <div key={uni} className="space-y-1">
                    <button onClick={() => toggleUni(uni)} className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 uppercase">
                      <span className="flex items-center gap-2"><School size={12} className="text-cyan-500" />{uni}</span>
                      {isUniExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {isUniExpanded && (
                      <div className="ml-4 space-y-1 border-l border-zinc-800 pl-2">
                        {matchingCats.map(cat => {
                          const catMatches = cat.toLowerCase().includes(searchLower);
                          const coursesToShow = (uniMatches || catMatches)
                            ? [...groupedData[uni][cat]]
                            : [...groupedData[uni][cat]].filter(c => c.toLowerCase().includes(searchLower));

                          return (
                            <div key={cat}>
                              <div className="w-full flex items-center p-1.5 text-[9px] font-bold text-zinc-500 uppercase">
                                <span className="flex items-center gap-2"><BookOpen size={10} />{cat}</span>
                              </div>
                              <div className="ml-4 flex flex-col gap-1 py-1">
                                {coursesToShow.map(course => {
                                  const compositeId = `${uni} - ${course}`;
                                  return (
                                    <button
                                      key={course}
                                      onClick={() => selectedCourses.includes(compositeId)
                                        ? setSelectedCourses(selectedCourses.filter(c => c !== compositeId))
                                        : setSelectedCourses([...selectedCourses, compositeId])
                                      }
                                      className={`text-left px-2 py-1.5 rounded text-[9px] transition-all ${selectedCourses.includes(compositeId) ? 'bg-cyan-500 text-black font-bold' : 'text-zinc-600 hover:text-zinc-300'}`}
                                    >
                                      {course}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* RENDER CATEGORY VIEW */}
              {viewMode === 'categories' && allCategories.filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())).map(cat => (
                <button
                  key={cat}
                  onClick={() => selectedCategories.includes(cat)
                    ? setSelectedCategories(selectedCategories.filter(c => c !== cat))
                    : setSelectedCategories([...selectedCategories, cat])
                  }
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedCategories.includes(cat) ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/20' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                >
                  {cat}
                </button>
              ))}

            </div>
          </div>
        </div>

        {/* Analytics Area */}
        <div className="lg:col-span-3 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={<DollarSign className="text-cyan-400" size={20} />} label="Market Avg Salary" value={summary ? summary.avg_salary : "$0"} subtext="Global Median" />
            <StatCard icon={<Award className="text-purple-400" size={20} />} label="Top University" value={summary ? summary.top_university : "..."} subtext="Highest Avg Pay" />
            <StatCard icon={<Percent className="text-rose-400" size={20} />} label="Best Employability" value={summary ? summary.top_degree : "..."} subtext="Peak Job Security" />
          </div>

          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden transition-all duration-300">
            {/* Header Bar - Always Visible */}
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-900/70 transition-colors" onClick={() => setSelectionsCollapsed(!selectionsCollapsed)}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Selections</span>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[9px] font-mono rounded-full border border-cyan-500/30">
                  {activeSelections.length}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Summary Stats - Always Visible */}
                <div className="flex gap-6">
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-widest text-zinc-500">Avg Pay</p>
                    <p className="text-lg font-bold text-white">${selAvgSalary}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-widest text-zinc-500">Avg Emp</p>
                    <p className="text-lg font-bold text-white">{selAvgEmp}%</p>
                  </div>
                </div>
                
                {/* Collapse/Expand Icon */}
                <div className={`transform transition-transform duration-300 ${selectionsCollapsed ? '' : 'rotate-180'}`}>
                  <ChevronDown size={16} className="text-zinc-500" />
                </div>
              </div>
            </div>

            {/* Expandable Content - Selection Chips */}
            <div className={`transition-all duration-300 overflow-hidden ${selectionsCollapsed ? 'max-h-0' : 'max-h-96'}`}>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
                <div className="flex flex-wrap gap-2 items-center">
                  {activeSelections.length > 0 ? (
                    <>
                      {activeSelections.map(id => (
                        <span key={id} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-zinc-950 border border-zinc-700 rounded-full text-[9px] font-bold text-zinc-300 uppercase hover:border-zinc-600 transition-colors">
                          {id.split(' - ').pop()}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSelections(activeSelections.filter(c => c !== id));
                            }} 
                            className="hover:bg-rose-500 hover:text-white p-1 rounded-full transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSelections([]);
                        }} 
                        className="text-[9px] text-zinc-600 hover:text-rose-400 font-bold uppercase ml-2 transition-colors"
                      >
                        Clear All
                      </button>
                    </>
                  ) : (
                    <span className="text-[9px] text-zinc-600 uppercase tracking-widest italic">No selections</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RESTORED: DYNAMIC METRIC DROPDOWN */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl w-fit border border-zinc-800">
              {['growth', 'performance', 'tradeoff'].map(tool => (
                <button key={tool} onClick={() => setActiveTool(tool)} className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${activeTool === tool ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-300'}`}>{tool}</button>
              ))}
            </div>

            <select
              value={salaryMetric}
              onChange={(e) => setSalaryMetric(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg px-4 py-2.5 outline-none cursor-pointer"
            >
              <option value="basic_monthly_mean">Basic Mean</option>
              <option value="basic_monthly_median">Basic Median</option>
              <option value="gross_monthly_mean">Gross Mean</option>
              <option value="gross_monthly_median">Gross Median</option>
              <option value="gross_mthly_25_percentile">Gross 25th Pct</option>
              <option value="gross_mthly_75_percentile">Gross 75th Pct</option>
            </select>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 min-h-[500px]">
            {activeSelections.length > 0 ? (
              <div className="h-[450px] w-full">

                {activeTool === 'growth' && (
                  <>
                    <ResponsiveContainer>
                      {/* RESTORED: Pass salaryMetric to growth formatter */}
                      <LineChart data={formatGrowthData(chartData, viewMode, salaryMetric)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="year" stroke="#71717a" fontSize={10} />
                        <YAxis stroke="#71717a" fontSize={10} tickFormatter={(val) => `$${val}`} />
                        <Tooltip
                          contentStyle={tooltipContentStyle}
                          labelStyle={tooltipLabelStyle}
                          itemStyle={tooltipItemStyle}
                          formatter={(value) => `$${parseFloat(Number(value).toFixed(2))}`}
                        />
                        {/* Legend removed - will render separately below */}
                        {activeSelections.map((c, i) => (
                          <Line key={c} type="monotone" dataKey={viewMode === 'courses' ? c : c} stroke={['#22d3ee', '#a855f7', '#fb7185', '#facc15', '#4ade80'][i % 5]} strokeWidth={4} dot={{ r: 4 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                )}

                {activeTool === 'performance' && (
                  <ResponsiveContainer>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#71717a" fontSize={10} />
                      <YAxis dataKey="course" type="category" stroke="#71717a" fontSize={8} width={120} tickFormatter={(value, index) => viewMode === 'courses' ? `${chartData[index]?.year} - ${chartData[index]?.university.split(' ')[0]} - ${value}` : `${chartData[index]?.year} - ${value}`} />
                      <Tooltip content={renderPerformanceTooltip} shared={false} />
                      <Bar dataKey="z_score" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`${entry.year}-${entry.university}-${entry.course}-${index}`} fill={entry.z_score > 0 ? '#22d3ee' : '#fb7185'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* TEAMMATE'S TRADEOFF CODE (Kept Intact) */}
                {activeTool === 'tradeoff' && (
                  <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis type="number" dataKey="avg_employment" name="Employment" stroke="#71717a" domain={tradeoffDomains.x} fontSize={10} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <YAxis type="number" dataKey="avg_salary" name="Salary" stroke="#71717a" domain={tradeoffDomains.y} fontSize={10} tickFormatter={(v) => `$${Math.round(v)}`} />
                      <ZAxis type="number" dataKey="sample_size" range={[100, 800]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={renderTradeoffTooltip}
                      />
                      {tradeoffTrend && (
                        <ReferenceLine
                          segment={[
                            { x: tradeoffTrend[0].x, y: tradeoffTrend[0].y },
                            { x: tradeoffTrend[1].x, y: tradeoffTrend[1].y }
                          ]}
                          stroke="#a1a1aa"
                          strokeDasharray="6 4"
                        />
                      )}
                      <Scatter name="Tradeoff" data={tradeoffData}>
                        {tradeoffData.map((entry, index) => (
                          <Cell key={`tradeoff-${index}`} fill={quadrantColors[entry.quadrant] || '#22d3ee'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-zinc-700 font-mono text-[10px] tracking-widest uppercase animate-pulse">Select Items to Analyze</div>
            )}
          </div>

          {/* Custom Legend Section - Scrollable, Only for Growth Chart */}
          {activeSelections.length > 0 && activeTool === 'growth' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Chart Legend</h3>
                <span className="text-[9px] text-zinc-600 font-mono">{activeSelections.length} series</span>
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeSelections.map((selection, i) => {
                    const color = ['#22d3ee', '#a855f7', '#fb7185', '#facc15', '#4ade80'][i % 5];
                    return (
                      <div key={selection} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: color }}></div>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                        </div>
                        <span className="text-[9px] text-zinc-300 truncate" title={selection}>
                          {selection}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Performance Legend - Z-score colors and short explanation */}
          {activeSelections.length > 0 && activeTool === 'performance' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Chart Legend</h3>
              </div>
              <p className="text-[9px] text-zinc-500 mb-3">Z-score measures relative performance vs dataset average.</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 p-2 rounded-lg">
                  <div className="w-6 h-3 rounded" style={{ backgroundColor: '#22d3ee' }} />
                  <span className="text-[10px] text-zinc-300">Above average (z &gt; 0)</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg">
                  <div className="w-6 h-3 rounded" style={{ backgroundColor: '#fb7185' }} />
                  <span className="text-[10px] text-zinc-300">Below average (z ≤ 0)</span>
                </div>
              </div>
            </div>
          )}

          {/* Tradeoff Legend Box */}
          {activeSelections.length > 0 && activeTool === 'tradeoff' && (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tradeoff Legend</h3>
                <span className="text-[9px] text-zinc-600 font-mono">{tradeoffData.length} points</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-[10px]">
                <div className="space-y-2">
                  <div className="text-zinc-500 uppercase tracking-widest text-[9px]">Quadrant Colors</div>
                  <div className="flex flex-col gap-1">
                    {Object.entries(quadrantColors).map(([label, color]) => (
                      <span key={label} className="inline-flex items-center gap-2 text-zinc-300">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-zinc-500 uppercase tracking-widest text-[9px]">Sample Size</div>
                  {tradeoffSampleLegend.length > 0 ? (
                    <div className="flex items-end gap-3">
                      {tradeoffSampleLegend.map(size => (
                        <span key={`tradeoff-sz-${size}`} className="inline-flex flex-col items-center gap-1 text-zinc-300">
                          <span
                            className="inline-block rounded-full border border-zinc-300/70 bg-zinc-300/20"
                            style={{
                              width: `${tradeoffLegendBubblePx(size)}px`,
                              height: `${tradeoffLegendBubblePx(size)}px`
                            }}
                          />
                          <span>{size}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-500">No sample size data</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, subtext }) {
  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-lg flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-[9px] uppercase font-black tracking-widest text-zinc-600">{label}</span>
      </div>
      <div className="text-2xl font-black text-white tracking-tighter truncate" title={value}>{value}</div>
      <div className="text-[8px] uppercase text-zinc-700 font-bold mt-1 tracking-wider">{subtext}</div>
    </div>
  );
}

// RESTORED: Dynamic Metric argument
function formatGrowthData(data, viewMode, metric) {
  const years = [...new Set(data.map(d => d.year))].sort();
  return years.map(yr => {
    const obj = { year: yr };
    data.filter(d => d.year === yr).forEach(d => {
      const key = viewMode === 'courses' ? `${d.university} - ${d.course}` : d.course;
      obj[key] = d[metric];
    });
    return obj;
  });
}
