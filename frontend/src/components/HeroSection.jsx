import { motion } from 'framer-motion';
import { TrendingUp, Users, GraduationCap } from 'lucide-react';

const HeroSection = () => {
    return (
        <div className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 border-b border-zinc-900">
            {/* Background Elements - Subtle monochrome glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-zinc-800/20 rounded-full blur-[100px] opacity-20" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-zinc-800/10 rounded-full blur-[100px] opacity-20" />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-white">
                        DAaaS Platform
                    </h1>
                    <p className="text-xl sm:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto font-light">
                        Data Analytics as a Service for Graduate Employment Trends
                    </p>

                    {/* Stats Cards - Sleek Monochrome */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors duration-300"
                        >
                            <div className="flex items-center justify-center mb-4">
                                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">1,143</h3>
                            <p className="text-zinc-500 text-sm uppercase tracking-wider">Survey Records</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors duration-300"
                        >
                            <div className="flex items-center justify-center mb-4">
                                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">2013-2023</h3>
                            <p className="text-zinc-500 text-sm uppercase tracking-wider">Years of Data</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors duration-300"
                        >
                            <div className="flex items-center justify-center mb-4">
                                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">3</h3>
                            <p className="text-zinc-500 text-sm uppercase tracking-wider">Analysis Tools</p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default HeroSection;
