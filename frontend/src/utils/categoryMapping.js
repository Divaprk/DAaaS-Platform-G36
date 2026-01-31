// Category mapping for filter chips
export const CATEGORY_PRESETS = {
    "Tech": ["Information Technology"],
    "Business": ["Business & Administration", "Accountancy"],
    "Engineering": ["Engineering", "Architecture & Built Environment"],
    "Health Sciences": ["Health Sciences", "Medicine", "Dentistry"],
    "Sciences": ["Sciences"],
    "Arts": ["Arts & Social Sciences"],
    "Education": ["Education"],
    "Law": ["Law"],
};

// Get all unique categories from presets
export const getAllCategories = () => {
    const categories = new Set();
    Object.values(CATEGORY_PRESETS).forEach(cats => {
        cats.forEach(cat => categories.add(cat));
    });
    return Array.from(categories);
};

// Get courses by category preset
export const getCoursesByPreset = (presetName, allData) => {
    const categories = CATEGORY_PRESETS[presetName] || [];
    return allData.filter(item =>
        categories.includes(item.course_category)
    );
};

// Get unique course names
export const getUniqueCourses = (data) => {
    const courses = new Set();
    data.forEach(item => {
        if (item.course) courses.add(item.course);
    });
    return Array.from(courses).sort();
};
