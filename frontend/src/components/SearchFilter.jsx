import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X } from 'lucide-react';
import { CATEGORY_PRESETS } from '../utils/categoryMapping';

const SearchFilter = ({
    allCourses,
    selectedCourses,
    setSelectedCourses,
    onCategorySelect
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeCategories, setActiveCategories] = useState([]);
    const dropdownRef = useRef(null);

    // Filter courses based on search term
    const filteredCourses = allCourses.filter(course =>
        course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle course selection
    const toggleCourse = (course) => {
        if (selectedCourses.includes(course)) {
            setSelectedCourses(selectedCourses.filter(c => c !== course));
        } else {
            setSelectedCourses([...selectedCourses, course]);
        }
    };

    // Handle category chip click
    const toggleCategory = (categoryName) => {
        if (activeCategories.includes(categoryName)) {
            setActiveCategories(activeCategories.filter(c => c !== categoryName));
            onCategorySelect(categoryName, false);
        } else {
            setActiveCategories([...activeCategories, categoryName]);
            onCategorySelect(categoryName, true);
        }
    };

    // Clear all selections
    const clearAll = () => {
        setSelectedCourses([]);
        setActiveCategories([]);
        setSearchTerm('');
    };

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Category Filter Chips */}
            <div className="mb-8">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Category Filters</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(CATEGORY_PRESETS).map((category) => (
                        <button
                            key={category}
                            onClick={() => toggleCategory(category)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${activeCategories.includes(category)
                                    ? 'bg-white text-black border-white'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative" ref={dropdownRef}>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Search for courses..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:ring-1 focus:ring-white focus:border-white transition-all outline-none"
                    />
                    {selectedCourses.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Dropdown */}
                <AnimatePresence>
                    {showDropdown && searchTerm && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.1 }}
                            className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-96 overflow-y-auto"
                        >
                            {filteredCourses.length > 0 ? (
                                filteredCourses.map((course, index) => (
                                    <button
                                        key={index}
                                        onClick={() => toggleCourse(course)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800 last:border-b-0"
                                    >
                                        <span className="text-zinc-300 text-sm">{course}</span>
                                        {selectedCourses.includes(course) && (
                                            <Check className="w-4 h-4 text-white" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                                    No courses found
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Selected Courses Display */}
            {selectedCourses.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 border-t border-zinc-900 pt-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Selected ({selectedCourses.length})
                        </h4>
                        <button
                            onClick={clearAll}
                            className="text-xs text-zinc-500 hover:text-white transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedCourses.map((course, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex items-center gap-2 group hover:border-zinc-700 transition-colors"
                            >
                                <span className="text-sm text-zinc-300">{course}</span>
                                <button
                                    onClick={() => toggleCourse(course)}
                                    className="text-zinc-500 group-hover:text-white transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default SearchFilter;
