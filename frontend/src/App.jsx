import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Search, TrendingUp, Loader2, DollarSign, Award, Percent, X, ChevronRight, ChevronDown, School, BookOpen } from 'lucide-react';

const API_URL = "https://uihec8ny2d.execute-api.us-east-1.amazonaws.com/analytics";

export default function App() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState([]); // Stores "Uni - Course"
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTool, setActiveTool] = useState('growth');
  const [expandedUnis, setExpandedUnis] = useState({});
  const [expandedCats, setExpandedCats] = useState({});

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

  // FIX: Filter data using the composite key (Uni - Course)
  const chartData = data.filter(d => 
    selectedCourses.includes(`${d.university} - ${d.course}`)
  );

  // Selection Stats (Calculated for current selection)
  const selAvgSalary = chartData.length > 0 ? (chartData.reduce((acc, curr) => acc + curr.gross_monthly_median, 0) / chartData.length).toFixed(0) : 0;
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
        <h1 className="text-5xl font-black text-white tracking-tighter italic">DAaaS_G36</h1>
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] mt-2">Unified Analytics Platform</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-2xl sticky top-8 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registry</span>
              <span className="text-[10px] font-mono text-cyan-500">{selectedCourses.length} ACTIVE</span>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-2">
              {Object.keys(groupedData).map(uni => (
                <div key={uni} className="space-y-1">
                  <button onClick={() => toggleUni(uni)} className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 uppercase">
                    <span className="flex items-center gap-2"><School size={12} className="text-cyan-500"/>{uni}</span>
                    {expandedUnis[uni] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                  </button>
                  {expandedUnis[uni] && (
                    <div className="ml-4 space-y-1 border-l border-zinc-800 pl-2">
                      {Object.keys(groupedData[uni]).map(cat => (
                        <div key={cat}>
                          <button onClick={() => toggleCat(uni+cat)} className="w-full flex items-center justify-between p-1.5 text-[9px] font-bold text-zinc-500 uppercase">
                            <span className="flex items-center gap-2"><BookOpen size={10}/>{cat}</span>
                          </button>
                          <div className="ml-4 flex flex-col gap-1 py-1">
                            {[...groupedData[uni][cat]].map(course => {
                               const compositeId = `${uni} - ${course}`;
                               return (
                                <button
                                  key={course}
                                  onClick={() => selectedCourses.includes(compositeId) 
                                    ? setSelectedCourses(selectedCourses.filter(c => c !== compositeId))
                                    : setSelectedCourses([...selectedCourses, compositeId])
                                  }
                                  className={`text-left px-2 py-1.5 rounded text-[9px] transition-all ${
                                    selectedCourses.includes(compositeId) 
                                      ? 'bg-cyan-500 text-black font-bold' 
                                      : 'text-zinc-600 hover:text-zinc-300'
                                  }`}
                                >
                                  {course}
                                </button>
                               );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              icon={<DollarSign className="text-cyan-400" size={20}/>} 
              label="Market Avg Salary" 
              value={summary ? summary.avg_salary : "$0"} 
              subtext="Global Median"
            />
            <StatCard 
              icon={<Award className="text-purple-400" size={20}/>} 
              label="Top University" 
              value={summary ? summary.top_university : "..."} 
              subtext="Highest Avg Pay"
            />
            <StatCard 
              icon={<Percent className="text-rose-400" size={20}/>} 
              label="Best Employability" 
              value={summary ? summary.top_degree : "..."} 
              subtext="Peak Job Security"
            />
          </div>

          {/* Current Selection Stats */}
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-around items-center text-center">
             <div className="space-y-1">
               <p className="text-[8px] uppercase tracking-widest text-zinc-500">Selected Avg Salary</p>
               <p className="text-xl font-bold text-white">${selAvgSalary}</p>
             </div>
             <div className="w-px h-8 bg-zinc-800" />
             <div className="space-y-1">
               <p className="text-[8px] uppercase tracking-widest text-zinc-500">Selected Avg Emp %</p>
               <p className="text-xl font-bold text-white">{selAvgEmp}%</p>
             </div>
          </div>

          <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl w-fit border border-zinc-800">
            {['growth', 'performance', 'tradeoff'].map(tool => (
              <button key={tool} onClick={() => setActiveTool(tool)} className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${activeTool === tool ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-300'}`}>{tool}</button>
            ))}
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 min-h-[500px]">
             {selectedCourses.length > 0 ? (
               <div className="h-[450px] w-full">
                  {activeTool === 'growth' && (
                    <ResponsiveContainer>
                      <LineChart data={formatGrowthData(chartData)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="year" stroke="#71717a" fontSize={10} />
                        <YAxis stroke="#71717a" fontSize={10} tickFormatter={(val) => `$${val}`} />
                        <Tooltip contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a'}} />
                        <Legend />
                        {selectedCourses.map((c, i) => (
                          <Line key={c} type="monotone" dataKey={c} stroke={['#22d3ee', '#a855f7', '#fb7185', '#facc15', '#4ade80'][i % 5]} strokeWidth={4} dot={{r: 4}} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {activeTool === 'performance' && (
                    <ResponsiveContainer>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                        <XAxis type="number" stroke="#71717a" fontSize={10} />
                        <YAxis dataKey="course" type="category" stroke="#71717a" fontSize={8} width={120} tickFormatter={(value, index) => `${chartData[index]?.university.split(' ')[0]} - ${value}`} />
                        <Tooltip contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a'}} />
                        <Bar dataKey="z_score" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={index} fill={entry.z_score > 0 ? '#22d3ee' : '#fb7185'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {activeTool === 'tradeoff' && (
                    <ResponsiveContainer>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis type="number" dataKey="employment_rate_overall" name="Employment" unit="%" stroke="#71717a" domain={[70, 100]} fontSize={10} />
                        <YAxis type="number" dataKey="gross_monthly_median" name="Salary" unit="$" stroke="#71717a" fontSize={10} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a'}} />
                        <Scatter name="Degrees" data={chartData} fill="#22d3ee" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
               </div>
             ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-zinc-700 font-mono text-[10px] tracking-widest uppercase">Select Courses to Analyze</div>
             )}
          </div>
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

// FIX: formatGrowthData must use the composite key (Uni - Course) for line chart mapping
function formatGrowthData(data) {
  const years = [...new Set(data.map(d => d.year))].sort();
  return years.map(yr => {
    const obj = { year: yr };
    data.filter(d => d.year === yr).forEach(d => { 
      const compositeId = `${d.university} - ${d.course}`;
      obj[compositeId] = d.gross_monthly_median; 
    });
    return obj;
  });
}