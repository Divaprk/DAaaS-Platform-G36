import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart3, Table2, Grid3x3, AlertCircle } from 'lucide-react';
import { getIncomeDispersionData } from '../../utils/mockData';

const IncomeDispersionChart = ({ data, selectedCourses }) => {
    const [viewMode, setViewMode] = useState('chart');
    const chartData = getIncomeDispersionData(data, selectedCourses);

    // Calculate spread statistics
    const avgSpread = chartData.reduce((sum, item) => sum + (item.p75 - item.p25), 0) / chartData.length;
    const maxSpread = Math.max(...chartData.map(item => item.p75 - item.p25));

    // Transform data for stacked bar chart
    const transformedData = chartData.map(item => ({
        course: item.course,
        'Below 25th': item.p25,
        '25th to Median': item.median - item.p25,
        'Median to 75th': item.p75 - item.median,
        p25: item.p25,
        median: item.median,
        p75: item.p75,
    }));

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Income Dispersion Analysis</h2>

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
            {selectedCourses.length > 10 && viewMode === 'chart' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-light rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4 border-accent-pink"
                >
                    <AlertCircle className="w-5 h-5 text-accent-pink mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-white font-semibold">Too Many Courses Selected</p>
                        <p className="text-slate-400 text-sm mt-1">
                            Showing all {selectedCourses.length} courses. For clearer visualization, consider selecting fewer courses or switch to Table/Grid view.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Chart View */}
            {viewMode === 'chart' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-light rounded-xl p-6"
                        >
                            <p className="text-slate-400 mb-2">Average Salary Spread (P75 - P25)</p>
                            <p className="text-4xl font-bold text-accent-pink">${avgSpread.toFixed(0)}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass-light rounded-xl p-6"
                        >
                            <p className="text-slate-400 mb-2">Maximum Salary Spread</p>
                            <p className="text-4xl font-bold text-accent-purple">${maxSpread.toFixed(0)}</p>
                        </motion.div>
                    </div>

                    <div className="glass-light rounded-xl p-6">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={transformedData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="course"
                                    stroke="#94a3b8"
                                    angle={-45}
                                    textAnchor="end"
                                    height={120}
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    style={{ fontSize: '14px' }}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: '#e2e8f0',
                                    }}
                                    formatter={(value, name, props) => {
                                        if (name === 'Below 25th' || name === '25th to Median' || name === 'Median to 75th') {
                                            return [`$${value}`, name];
                                        }
                                        return null;
                                    }}
                                />
                                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                                <Bar dataKey="Below 25th" stackId="a" fill="#64748b" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="25th to Median" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Median to 75th" stackId="a" fill="#a855f7" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6 glass-light rounded-xl p-4"
                    >
                        <p className="text-slate-300 text-sm">
                            <span className="font-semibold text-white">Insight:</span> The income dispersion shows the salary
                            distribution across different percentiles. A wider spread indicates greater salary variability within
                            the field, while a narrower spread suggests more consistent compensation.
                        </p>
                    </motion.div>
                </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-light rounded-xl p-6 overflow-x-auto"
                >
                    <h3 className="text-xl font-bold text-white mb-4">Salary Percentiles</h3>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left py-3 text-slate-400 font-semibold">Course</th>
                                <th className="text-right py-3 text-slate-400 font-semibold">25th Percentile</th>
                                <th className="text-right py-3 text-slate-400 font-semibold">Median (50th)</th>
                                <th className="text-right py-3 text-slate-400 font-semibold">75th Percentile</th>
                                <th className="text-right py-3 text-slate-400 font-semibold">Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.map((item, index) => (
                                <tr key={index} className="border-b border-slate-700/50 hover:bg-zinc-900/40 transition-colors">
                                    <td className="py-3 text-slate-200">{item.course}</td>
                                    <td className="text-right py-3 text-slate-400">${item.p25.toLocaleString()}</td>
                                    <td className="text-right py-3 text-accent-cyan font-medium">${item.median.toLocaleString()}</td>
                                    <td className="text-right py-3 text-slate-400">${item.p75.toLocaleString()}</td>
                                    <td className="text-right py-3 text-accent-pink font-medium">${(item.p75 - item.p25).toLocaleString()}</td>
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
                    {chartData.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-light rounded-xl p-5 hover:border-zinc-700 transition-colors border border-zinc-800"
                        >
                            <h4 className="text-white font-semibold mb-4 text-sm line-clamp-2">{item.course}</h4>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">Median Salary</p>
                                    <p className="text-2xl font-bold text-accent-cyan">${item.median.toLocaleString()}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                                    <div>
                                        <p className="text-slate-500 text-xs mb-1">25th</p>
                                        <p className="text-sm font-semibold text-slate-400">${item.p25.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs mb-1">75th</p>
                                        <p className="text-sm font-semibold text-slate-400">${item.p75.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-zinc-800">
                                    <p className="text-slate-500 text-xs mb-1">Salary Range</p>
                                    <p className="text-lg font-semibold text-accent-pink">${(item.p75 - item.p25).toLocaleString()}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
};

export default IncomeDispersionChart;
