import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

const DataTable = ({ data }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'year', direction: 'desc' });
    const pageSize = 20;

    // Sort data
    const sortedData = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Paginate
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

    // Handle sort
    const handleSort = (key) => {
        setSortConfig({
            key,
            direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black border border-zinc-800 rounded-xl overflow-hidden"
            >
                {/* Table Header */}
                <div className="px-6 py-5 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Raw Data</h2>
                        <p className="text-zinc-500 text-sm mt-1">
                            {sortedData.length} records found
                        </p>
                    </div>
                    <div className="text-sm text-zinc-600">
                        Showing {startIndex + 1}-{Math.min(startIndex + pageSize, sortedData.length)}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-900/50 border-b border-zinc-800">
                            <tr>
                                {['Year', 'University', 'Course', 'Category', 'Employment Rate', 'Median Salary'].map((header, index) => (
                                    <th
                                        key={index}
                                        onClick={() => handleSort(['year', 'university', 'course', 'course_category', 'employment_rate_overall', 'gross_monthly_median'][index])}
                                        className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group select-none whitespace-nowrap"
                                    >
                                        <div className="flex items-center gap-2">
                                            {header}
                                            <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {paginatedData.map((row, index) => (
                                <motion.tr
                                    key={index}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.01 }}
                                    className="hover:bg-zinc-900/40 transition-colors"
                                >
                                    <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{row.year}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-300 font-medium">{row.university}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">{row.course}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                                            {row.course_category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white font-mono">
                                        {row.employment_rate_overall?.toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white font-mono">
                                        ${row.gross_monthly_median?.toLocaleString()}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-900/30">
                    <div className="text-sm text-zinc-500 hidden sm:block">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronsLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-4 text-sm text-white font-medium sm:hidden">
                            {currentPage} / {totalPages}
                        </div>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronsRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DataTable;
