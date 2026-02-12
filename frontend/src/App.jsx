import { useState, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import SearchFilter from './components/SearchFilter';
import DataTable from './components/DataTable';
import AnalysisPanel from './components/AnalysisPanel';

// We keep these for mapping/filtering, but remove parseCSVData
import { filterByCourses } from './utils/mockData';
import { getUniqueCourses } from './utils/categoryMapping';

function App() {
    const [allData, setAllData] = useState([]);
    const [displayData, setDisplayData] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- YOUR AWS API ENDPOINT ---
    // Make sure it ends with /analytics
    const AWS_API_URL = "https://uihec8ny2d.execute-api.us-east-1.amazonaws.com/analytics";

    // Load Live Data from AWS on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(AWS_API_URL);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                // Note: Your Lambda returns 'salary_trends' as the main list
                const data = result.salary_trends;
                
                setAllData(data);
                setDisplayData(data);
                setAllCourses(getUniqueCourses(data));
            } catch (err) {
                console.error("Failed to fetch data:", err);
                setError("Failed to connect to AWS Backend. Check CORS settings.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Update display data when search/filters are used
    useEffect(() => {
        if (selectedCourses.length > 0) {
            const filtered = filterByCourses(allData, selectedCourses);
            setDisplayData(filtered);
        } else {
            setDisplayData(allData);
        }
    }, [selectedCourses, allData]);

    const handleCategorySelect = (presetCourses) => {
        setSelectedCourses(presetCourses);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-16 w-16 border-t-2 border-b-2 border-accent-cyan mx-auto mb-4"></div>
                    <p className="text-slate-300 text-lg">Fetching live AWS data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="glass p-8 rounded-2xl border border-red-900/50 text-center">
                    <p className="text-red-400 text-lg mb-2">Backend Error</p>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <HeroSection />

            <SearchFilter
                allCourses={allCourses}
                selectedCourses={selectedCourses}
                setSelectedCourses={setSelectedCourses}
                onCategorySelect={handleCategorySelect}
            />

            <AnalysisPanel
                data={allData}
                selectedCourses={selectedCourses}
            />

            <DataTable data={displayData} />

            <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-20">
                <div className="glass rounded-2xl p-8 text-center">
                    <p className="text-slate-400">
                        DAaaS Platform © 2026 | Graduate Employment Trends Analytics
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                        Connected to: {AWS_API_URL}
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default App;