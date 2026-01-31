import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, BarChart3, Table2, Grid3x3 } from 'lucide-react';
import { getSalaryEvolutionData } from '../../utils/mockData';

const SalaryEvolutionChart = ({ data, selectedCourses }) => {
    const [viewMode, setViewMode] = useState('chart'); // 'chart', 'table', 'grid'
    const { data: chartData, yoyChanges } = getSalaryEvolutionData(data, selectedCourses);

    // Group by year for the chart - transform to wide format
    const yearlyData = {};
    chartData.forEach(item => {
        if (!yearlyData[item.year]) {
            yearlyData[item.year] = { year: item.year };
        }
        yearlyData[item.year][item.course] = item.median;
    });

    const processedData = Object.values(yearlyData).sort((a, b) => a.year - b.year);

    // Generate colors for each course (expanded palette)
    const colors = [
        '#06b6d4', '#a855f7', '#ec4899', '#f59e0b', '#10b981',
        '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1',
    ];

    // Calculate latest YoY change
    const latestYoY = yoyChanges[yoyChanges.length - 1];

    // Show warning if too many courses in chart mode
    const tooManyCourses = selectedCourses.length > 10;

    // Custom legend formatter
    const renderLegend = (props) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap gap-3 justify-center mt-4">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm text-slate-300">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    // Get latest salary for each course (for grid view)
    const latestSalaries = chartData.reduce((acc, item) => {
        if (!acc[item.course] || acc[item.course].year < item.year) {
            acc[item.course] = item;
        }
        return acc;
    }, {});

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Salary Evolution Analysis</h2>

                {/* View Mode Toggles */}
                <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                    <button
                        onClick={() => setViewMode('chart')}
                        className={`px-3 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === 'chart'
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-sm font-medium">Chart</span>
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === 'table'
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        <Table2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Table</span>
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 rounded-md flex items-center gap-2 transition-all ${viewMode === 'grid'
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        <Grid3x3 className="w-4 h-4" />
                        <span className="text-sm font-medium">Grid</span>
                    </button>
                </div>
            </div>

            {/* Warning for too many courses in chart mode */}
            {tooManyCourses && viewMode === 'chart' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-light rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4 border-accent-pink"
                >
                    <AlertCircle className="w-5 h-5 text-accent-pink mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-white font-semibold">Too Many Courses Selected</p>
                        <p className="text-slate-400 text-sm mt-1">
                            Showing first 10 of {selectedCourses.length} courses. Switch to Table or Grid view to see all data.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Chart View */}
            {viewMode === 'chart' && (
                <>
                    {latestYoY && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-light rounded-xl p-6 mb-6"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 mb-1">Latest Year-on-Year Change</p>
                                    <p className="text-3xl font-bold text-white">
                                        {latestYoY.change > 0 ? '+' : ''}{latestYoY.change}%
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">({latestYoY.year})</p>
                                </div>
                                <div className={`p-4 rounded-xl ${latestYoY.change > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    {latestYoY.change > 0 ? (
                                        <TrendingUp className="w-10 h-10 text-green-400" />
                                    ) : (
                                        <TrendingDown className="w-10 h-10 text-red-400" />
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="glass-light rounded-xl p-6">
                        <ResponsiveContainer width="100%" height={450}>
                            <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="year" stroke="#94a3b8" style={{ fontSize: '14px' }} domain={['dataMin', 'dataMax']} />
                                <YAxis stroke="#94a3b8" style={{ fontSize: '14px' }} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: '#e2e8f0',
                                    }}
                                    formatter={(value) => [`$${value}`, 'Median Salary']}
                                />
                                <Legend content={renderLegend} />
                                {selectedCourses.slice(0, 10).map((course, index) => (
                                    <Line
                                        key={course}
                                        type="monotone"
                                        dataKey={course}
                                        stroke={colors[index % colors.length]}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {yoyChanges.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-light rounded-xl p-6 mt-6"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">Year-on-Year Changes (Average)</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {yoyChanges.map((item) => (
                                    <div key={item.year} className="text-center p-3 glass rounded-lg">
                                        <p className="text-slate-400 text-sm mb-1">{item.year}</p>
                                        <p className={`text-lg font-bold ${item.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.change > 0 ? '+' : ''}{item.change}%
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-light rounded-xl p-6 overflow-x-auto"
                >
                    <h3 className="text-xl font-bold text-white mb-4">Salary Data by Year</h3>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Course</th>
                                {processedData.map(yearRow => (
                                    <th key={yearRow.year} className="text-right py-3 px-4 text-slate-400 font-semibold">{yearRow.year}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {selectedCourses.map((course, index) => (
                                <tr key={course} className="border-b border-slate-700/50 hover:bg-zinc-900/40 transition-colors">
                                    <td className="py-3 px-4 text-slate-200 font-medium">{course}</td>
                                    {processedData.map(yearRow => (
                                        <td key={yearRow.year} className="text-right py-3 px-4 text-accent-cyan font-mono">
                                            {yearRow[course] ? `$${yearRow[course].toLocaleString()}` : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                    {Object.values(latestSalaries).map((courseData) => {
                        const yoyData = yoyChanges.find(y => y.year === courseData.year);
                        return (
                            <motion.div
                                key={courseData.course}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-light rounded-xl p-5 hover:border-zinc-700 transition-colors border border-zinc-800"
                            >
                                <h4 className="text-white font-semibold mb-3 text-sm line-clamp-2">{courseData.course}</h4>
                                <div className="mb-3">
                                    <p className="text-slate-500 text-xs mb-1">Latest Median ({courseData.year})</p>
                                    <p className="text-2xl font-bold text-accent-cyan">${courseData.median.toLocaleString()}</p>
                                </div>
                                {yoyData && (
                                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                                        {yoyData.change > 0 ? (
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-red-400" />
                                        )}
                                        <span className={`text-sm font-semibold ${yoyData.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {yoyData.change > 0 ? '+' : ''}{yoyData.change}% YoY
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
};

export default SalaryEvolutionChart;
