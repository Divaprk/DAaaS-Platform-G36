import { useState, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import SearchFilter from './components/SearchFilter';
import DataTable from './components/DataTable';
import AnalysisPanel from './components/AnalysisPanel';
import { parseCSVData, filterByCourses } from './utils/mockData';
import { getUniqueCourses, getCoursesByPreset } from './utils/categoryMapping';

function App() {
    const [allData, setAllData] = useState([]);
    const [displayData, setDisplayData] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load CSV data on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const data = await parseCSVData();
            setAllData(data);
            setDisplayData(data);
            setAllCourses(getUniqueCourses(data));
            setLoading(false);
        };
        loadData();
    }, []);

    // Update display data when courses are selected
    useEffect(() => {
        if (selectedCourses.length > 0) {
            const filtered = filterByCourses(allData, selectedCourses);
            setDisplayData(filtered);
        } else {
            setDisplayData(allData);
        }
    }, [selectedCourses, allData]);

    // Handle category selection
    const handleCategorySelect = (categoryName, isSelected) => {
        if (isSelected) {
            const categoryCourses = getCoursesByPreset(categoryName, allData);
            const newCourses = categoryCourses.map(item => item.course);
            const uniqueCourses = [...new Set([...selectedCourses, ...newCourses])];
            setSelectedCourses(uniqueCourses);
        } else {
            // Remove courses from this category
            const categoryCourses = getCoursesByPreset(categoryName, allData);
            const coursesToRemove = new Set(categoryCourses.map(item => item.course));
            setSelectedCourses(selectedCourses.filter(course => !coursesToRemove.has(course)));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent-cyan mx-auto mb-4"></div>
                    <p className="text-slate-300 text-lg">Loading employment data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <HeroSection />

            {/* Search and Filter */}
            <SearchFilter
                allCourses={allCourses}
                selectedCourses={selectedCourses}
                setSelectedCourses={setSelectedCourses}
                onCategorySelect={handleCategorySelect}
            />

            {/* Analysis Panel */}
            <AnalysisPanel
                data={allData}
                selectedCourses={selectedCourses}
            />

            {/* Data Table */}
            <DataTable data={displayData} />

            {/* Footer */}
            <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-20">
                <div className="glass rounded-2xl p-8 text-center">
                    <p className="text-slate-400">
                        DAaaS Platform © 2024 | Graduate Employment Trends Analytics
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Data source: Graduate Employment Survey (2013-2023)
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;
