// Mock data utility - loads CSV data
// In production, this would load from the actual CSV file or API

export const parseCSVData = async () => {
    try {
        const response = await fetch('/CleanedGraduateEmploymentSurvey.csv');
        const text = await response.text();

        const lines = text.split('\n');
        const headers = lines[0].split(',');

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = parseCSVLine(lines[i]);
            const entry = {};

            headers.forEach((header, index) => {
                const key = header.trim();
                const value = values[index]?.trim() || '';

                // Convert numeric fields
                if (['year', 'employment_rate_overall', 'employment_rate_ft_perm',
                    'basic_monthly_mean', 'basic_monthly_median', 'gross_monthly_mean',
                    'gross_monthly_median', 'gross_mthly_25_percentile', 'gross_mthly_75_percentile'].includes(key)) {
                    entry[key] = value ? parseFloat(value) : 0;
                } else {
                    entry[key] = value;
                }
            });

            data.push(entry);
        }

        return data;
    } catch (error) {
        console.error('Error loading CSV:', error);
        return [];
    }
};

// Parse CSV line handling quoted fields
const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
};

// Filter data by selected courses
export const filterByCourses = (data, selectedCourses) => {
    if (!selectedCourses || selectedCourses.length === 0) return data;
    return data.filter(item => selectedCourses.includes(item.course));
};

// Filter data by category
export const filterByCategory = (data, categories) => {
    if (!categories || categories.length === 0) return data;
    return data.filter(item => categories.includes(item.course_category));
};

// Get salary evolution data for chart
export const getSalaryEvolutionData = (data, selectedCourses) => {
    const filtered = filterByCourses(data, selectedCourses);

    // Group by year and course, averaging multiple entries
    const grouped = {};
    filtered.forEach(item => {
        const key = `${item.year}-${item.course}`;
        if (!grouped[key]) {
            grouped[key] = {
                year: item.year,
                course: item.course,
                medians: [],
            };
        }
        if (item.gross_monthly_median && item.gross_monthly_median > 0) {
            grouped[key].medians.push(item.gross_monthly_median);
        }
    });

    // Calculate averages and create final data structure
    const result = [];
    Object.values(grouped).forEach(item => {
        if (item.medians.length > 0) {
            const avgMedian = item.medians.reduce((a, b) => a + b, 0) / item.medians.length;
            result.push({
                year: item.year,
                course: item.course,
                median: Math.round(avgMedian),
            });
        }
    });

    // Sort by year
    result.sort((a, b) => a.year - b.year);

    // Calculate YoY change for each course
    const yoyChanges = [];
    const courseData = {};

    // Group by course first
    result.forEach(item => {
        if (!courseData[item.course]) courseData[item.course] = [];
        courseData[item.course].push(item);
    });

    // Calculate YoY for the average of all selected courses
    const yearGroups = {};
    result.forEach(item => {
        if (!yearGroups[item.year]) yearGroups[item.year] = [];
        yearGroups[item.year].push(item.median);
    });

    const years = Object.keys(yearGroups).sort();
    for (let i = 1; i < years.length; i++) {
        const currentAvg = yearGroups[years[i]].reduce((a, b) => a + b, 0) / yearGroups[years[i]].length;
        const prevAvg = yearGroups[years[i - 1]].reduce((a, b) => a + b, 0) / yearGroups[years[i - 1]].length;
        const change = ((currentAvg - prevAvg) / prevAvg * 100).toFixed(2);
        yoyChanges.push({ year: years[i], change: parseFloat(change) });
    }

    return { data: result, yoyChanges };
};

// Get employment data for comparison chart
export const getEmploymentData = (data, selectedCourses) => {
    const filtered = filterByCourses(data, selectedCourses);

    // Group by course and collect all entries
    const courseData = {};
    filtered.forEach(item => {
        if (!courseData[item.course]) {
            courseData[item.course] = {
                course: item.course,
                years: {},
            };
        }
        if (!courseData[item.course].years[item.year]) {
            courseData[item.course].years[item.year] = {
                overall: [],
                ftPerm: [],
            };
        }
        if (item.employment_rate_overall) {
            courseData[item.course].years[item.year].overall.push(item.employment_rate_overall);
        }
        if (item.employment_rate_ft_perm) {
            courseData[item.course].years[item.year].ftPerm.push(item.employment_rate_ft_perm);
        }
    });

    // Get latest year data for each course with averaging
    const result = [];
    Object.keys(courseData).forEach(courseName => {
        const years = Object.keys(courseData[courseName].years).map(Number).sort((a, b) => b - a);
        if (years.length > 0) {
            const latestYear = years[0];
            const latestData = courseData[courseName].years[latestYear];

            const avgOverall = latestData.overall.length > 0
                ? latestData.overall.reduce((a, b) => a + b, 0) / latestData.overall.length
                : 0;
            const avgFtPerm = latestData.ftPerm.length > 0
                ? latestData.ftPerm.reduce((a, b) => a + b, 0) / latestData.ftPerm.length
                : 0;

            result.push({
                course: courseName,
                year: latestYear,
                overall: parseFloat(avgOverall.toFixed(1)),
                ftPerm: parseFloat(avgFtPerm.toFixed(1)),
            });
        }
    });

    return result;
};

// Get income dispersion data
export const getIncomeDispersionData = (data, selectedCourses) => {
    const filtered = filterByCourses(data, selectedCourses);

    // Group by course and collect all entries
    const courseData = {};
    filtered.forEach(item => {
        if (!courseData[item.course]) {
            courseData[item.course] = {
                course: item.course,
                years: {},
            };
        }
        if (!courseData[item.course].years[item.year]) {
            courseData[item.course].years[item.year] = {
                p25: [],
                median: [],
                p75: [],
            };
        }
        if (item.gross_mthly_25_percentile) {
            courseData[item.course].years[item.year].p25.push(item.gross_mthly_25_percentile);
        }
        if (item.gross_monthly_median) {
            courseData[item.course].years[item.year].median.push(item.gross_monthly_median);
        }
        if (item.gross_mthly_75_percentile) {
            courseData[item.course].years[item.year].p75.push(item.gross_mthly_75_percentile);
        }
    });

    // Get latest year data for each course with averaging
    const result = [];
    Object.keys(courseData).forEach(courseName => {
        const years = Object.keys(courseData[courseName].years).map(Number).sort((a, b) => b - a);
        if (years.length > 0) {
            const latestYear = years[0];
            const latestData = courseData[courseName].years[latestYear];

            const avgP25 = latestData.p25.length > 0
                ? latestData.p25.reduce((a, b) => a + b, 0) / latestData.p25.length
                : 0;
            const avgMedian = latestData.median.length > 0
                ? latestData.median.reduce((a, b) => a + b, 0) / latestData.median.length
                : 0;
            const avgP75 = latestData.p75.length > 0
                ? latestData.p75.reduce((a, b) => a + b, 0) / latestData.p75.length
                : 0;

            result.push({
                course: courseName,
                year: latestYear,
                p25: Math.round(avgP25),
                median: Math.round(avgMedian),
                p75: Math.round(avgP75),
            });
        }
    });

    return result;
};

// Get paginated data for table
export const getPaginatedData = (data, page, pageSize) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
};
