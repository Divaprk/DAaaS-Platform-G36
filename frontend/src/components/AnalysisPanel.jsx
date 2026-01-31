import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, DollarSign, X } from 'lucide-react';
import SalaryEvolutionChart from './charts/SalaryEvolutionChart';
import EmploymentChart from './charts/EmploymentChart';
import IncomeDispersionChart from './charts/IncomeDispersionChart';

const AnalysisPanel = ({ data, selectedCourses }) => {
    const [activeView, setActiveView] = useState(null);

    const analysisOptions = [
        {
            id: 'salary',
            title: 'Salary Evolution',
            description: 'Median salary trends (2013-2023)',
            icon: TrendingUp,
        },
        {
            id: 'employment',
            title: 'Employment',
            description: 'Overall vs Full-time rates',
            icon: Users,
        },
        {
            id: 'dispersion',
            title: 'Income Spread',
            description: 'Salary percentile analysis',
            icon: DollarSign,
        },
    ];

    const closeView = () => setActiveView(null);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-zinc-900">
            {/* Analysis Buttons */}
            {!activeView && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    {analysisOptions.map((option, index) => {
                        const Icon = option.icon;
                        return (
                            <motion.button
                                key={option.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveView(option.id)}
                                disabled={selectedCourses.length === 0}
                                className={`text-left relative overflow-hidden group p-8 rounded-xl border transition-colors duration-300 ${selectedCourses.length > 0
                                        ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                                        : 'bg-zinc-950/50 border-zinc-900 opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <div className="relative z-10">
                                    <div className={`inline-flex p-3 rounded-lg mb-6 transition-colors duration-300 ${selectedCourses.length > 0 ? 'bg-zinc-800 text-white group-hover:bg-white group-hover:text-black' : 'bg-zinc-900 text-zinc-600'
                                        }`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{option.title}</h3>
                                    <p className="text-zinc-500 text-sm">{option.description}</p>
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>
            )}

            {/* Visualization Overlay */}
            <AnimatePresence>
                {activeView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                        onClick={closeView}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black border border-zinc-800 rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl"
                        >
                            <button
                                onClick={closeView}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="mt-2">
                                {activeView === 'salary' && (
                                    <SalaryEvolutionChart data={data} selectedCourses={selectedCourses} />
                                )}
                                {activeView === 'employment' && (
                                    <EmploymentChart data={data} selectedCourses={selectedCourses} />
                                )}
                                {activeView === 'dispersion' && (
                                    <IncomeDispersionChart data={data} selectedCourses={selectedCourses} />
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hint Message */}
            {selectedCourses.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 text-center"
                >
                    <p className="text-zinc-600 text-sm">
                        Select courses above to unlock analysis tools
                    </p>
                </motion.div>
            )}
        </div>
    );
};

export default AnalysisPanel;
