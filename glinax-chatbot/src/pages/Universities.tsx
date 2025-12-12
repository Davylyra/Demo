import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiMapPin, FiUsers, FiCalendar } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useTheme } from '../contexts/ThemeContext';
import { useUniversities } from '../hooks/useUniversities';
import { usePerformance } from '../hooks/usePerformance';
import { useAppStore } from '../store';
// Animation variants for staggered animations
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
import LazyImage from '../components/LazyImage';

interface University {
  id: string;
  name: string;
  fullName: string;
  location: string;
  established: number;
  studentCount: string;
  type: 'public' | 'private';
  programs: string[];
  logo: string;
}

const Universities: React.FC = () => {
  const navigate = useNavigate();
  
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { currentConversation, saveCurrentConversation } = useAppStore();
  
  // Use dynamic universities hook
  const { universities, error, refreshUniversities } = useUniversities();

  // Mock universities data (fallback)
  const mockUniversities: University[] = [
    {
      id: '1',
      name: 'KNUST',
      fullName: 'Kwame Nkrumah University of Science and Technology',
      location: 'Kumasi, Ashanti Region',
      established: 1952,
      studentCount: '85,000+',
      type: 'public',
      programs: ['Engineering', 'Medicine', 'Agriculture', 'Architecture', 'Sciences'],
      logo: 'https://via.placeholder.com/80x80/1e40af/ffffff?text=KNUST'
    },
    {
      id: '2',
      name: 'UG',
      fullName: 'University of Ghana',
      location: 'Legon, Greater Accra',
      established: 1948,
      studentCount: '40,000+',
      type: 'public',
      programs: ['Business', 'Law', 'Arts', 'Social Sciences', 'Medicine'],
      logo: 'https://via.placeholder.com/80x80/059669/ffffff?text=UG'
    },
    {
      id: '3',
      name: 'UCC',
      fullName: 'University of Cape Coast',
      location: 'Cape Coast, Central Region',
      established: 1962,
      studentCount: '25,000+',
      type: 'public',
      programs: ['Education', 'Health Sciences', 'Business', 'Arts', 'Sciences'],
      logo: 'https://via.placeholder.com/80x80/dc2626/ffffff?text=UCC'
    },
    {
      id: '4',
      name: 'UDS',
      fullName: 'University for Development Studies',
      location: 'Tamale, Northern Region',
      established: 1992,
      studentCount: '15,000+',
      type: 'public',
      programs: ['Development Studies', 'Agriculture', 'Health', 'Education', 'Applied Sciences'],
      logo: 'https://via.placeholder.com/80x80/7c3aed/ffffff?text=UDS'
    },
    {
      id: '5',
      name: 'UENR',
      fullName: 'University of Energy and Natural Resources',
      location: 'Sunyani, Bono Region',
      established: 2011,
      studentCount: '5,000+',
      type: 'public',
      programs: ['Energy', 'Natural Resources', 'Engineering', 'Environmental Sciences'],
      logo: 'https://via.placeholder.com/80x80/f59e0b/ffffff?text=UENR'
    },
    {
      id: '6',
      name: 'UEW',
      fullName: 'University of Education, Winneba',
      location: 'Winneba, Central Region',
      established: 1992,
      studentCount: '30,000+',
      type: 'public',
      programs: ['Education', 'Arts', 'Sciences', 'Business', 'ICT'],
      logo: 'https://via.placeholder.com/80x80/8b5cf6/ffffff?text=UEW'
    },
    {
      id: '7',
      name: 'UMaT',
      fullName: 'University of Mines and Technology',
      location: 'Tarkwa, Western Region',
      established: 2004,
      studentCount: '8,000+',
      type: 'public',
      programs: ['Mining Engineering', 'Geological Engineering', 'Environmental Engineering', 'Computer Science'],
      logo: 'https://via.placeholder.com/80x80/0ea5e9/ffffff?text=UMaT'
    },
    {
      id: '8',
      name: 'UHA',
      fullName: 'University of Health and Allied Sciences',
      location: 'Ho, Volta Region',
      established: 2011,
      studentCount: '4,000+',
      type: 'public',
      programs: ['Medicine', 'Nursing', 'Public Health', 'Allied Health Sciences'],
      logo: 'https://via.placeholder.com/80x80/10b981/ffffff?text=UHA'
    },
    {
      id: '9',
      name: 'GCTU',
      fullName: 'Ghana Communication Technology University',
      location: 'Accra, Greater Accra',
      established: 2005,
      studentCount: '8,000+',
      type: 'public',
      programs: ['ICT', 'Communication Studies', 'Business', 'Engineering'],
      logo: 'https://via.placeholder.com/80x80/ec4899/ffffff?text=GCTU'
    },
    {
      id: '10',
      name: 'TTU',
      fullName: 'Takoradi Technical University',
      location: 'Takoradi, Western Region',
      established: 1954,
      studentCount: '12,000+',
      type: 'public',
      programs: ['Engineering', 'Built Environment', 'Applied Sciences', 'Business'],
      logo: 'https://via.placeholder.com/80x80/f97316/ffffff?text=TTU'
    }
  ];

  // Performance optimization
  const { shouldReduceAnimations } = usePerformance();
  
  // Use dynamic universities or fallback to mock data
  const displayUniversities = universities.length > 0 ? universities : mockUniversities;
  
  // Memoize filtered universities for better performance
  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) return displayUniversities;
    
    const query = searchQuery.toLowerCase();
    return displayUniversities.filter(uni =>
      uni.name.toLowerCase().includes(query) ||
      uni.fullName.toLowerCase().includes(query) ||
      uni.location.toLowerCase().includes(query)
    );
  }, [displayUniversities, searchQuery]);

  return (
    <div className={`min-h-screen ${
      theme === 'dark' 
        ? 'bg-gradient-to-b from-transparent via-gray-800/50 to-gray-800' 
        : 'bg-gradient-to-b from-transparent via-white/50 to-white'
    }`}>
      <Navbar 
        title="ALL UNIVERSITIES"
        showBackButton={true}
        onBackClick={() => navigate('/')}
        showMenuButton={false}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className={`p-4 flex items-center space-x-3 transition-all duration-200 ${
            theme === 'dark' ? 'glass-input-dark' : 'glass-input'
          }`}>
            <FiSearch className={`w-5 h-5 transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search universities by name or location..."
              className={`flex-1 bg-transparent outline-none transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'text-gray-200 placeholder-gray-400' 
                  : 'text-gray-700 placeholder-gray-500'
              }`}
            />
          </div>
        </motion.div>

        {/* Results Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 text-center"
        >
          <p className={`transition-colors duration-200 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Showing <span className={`font-semibold transition-colors duration-200 ${
              theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
            }`}>{filteredUniversities.length}</span> {filteredUniversities.length === 1 ? 'university' : 'universities'}
          </p>
        </motion.div>

        {/* App loads instantly - no loading states */}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-700 dark:text-red-300">
                {error}
              </span>
              <button
                onClick={refreshUniversities}
                className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

        {/* Universities Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filteredUniversities.map((university) => (
            <motion.div
              key={university.id}
              variants={staggerItem}
              whileHover={shouldReduceAnimations ? {} : { y: -2 }}
              whileTap={shouldReduceAnimations ? {} : { y: 0 }}
              className={`p-5 transition-all duration-300 ${
                theme === 'dark' ? 'glass-card-dark hover:bg-white/10' : 'glass-card hover:bg-white/80'
              }`}
            >
              {/* University Header */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center glass-effect flex-shrink-0">
                  <LazyImage 
                    src={university.logo}
                    alt={`${university.name} logo`}
                    className="w-12 h-12 rounded-xl"
                    priority={false}
                    fallback={
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white ${
                        university.name === 'KNUST' ? 'bg-blue-600' :
                        university.name === 'UG' ? 'bg-green-600' :
                        university.name === 'UCC' ? 'bg-cyan-500' :
                        university.name === 'UDS' ? 'bg-emerald-500' :
                        university.name === 'UENR' ? 'bg-amber-500' :
                        university.name === 'UEW' ? 'bg-purple-500' :
                        university.name === 'UMaT' ? 'bg-blue-500' :
                        university.name === 'UHAS' ? 'bg-emerald-500' :
                        university.name === 'GCTU' ? 'bg-pink-500' :
                        university.name === 'TTU' ? 'bg-orange-500' :
                        university.name === 'UPSA' ? 'bg-indigo-500' :
                        'bg-gray-500'
                      }`}>
                        {university.name}
                      </div>
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-lg mb-1 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>{university.name}</h3>
                  <p className={`text-sm line-clamp-2 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>{university.fullName}</p>
                </div>
              </div>

              {/* University Details */}
              <div className="space-y-2 mb-4">
                <div className={`flex items-center space-x-2 text-sm transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <FiMapPin className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-primary-400' : 'text-primary-500'
                  }`} />
                  <span>{university.location}</span>
                </div>
                <div className={`flex items-center space-x-2 text-sm transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <FiCalendar className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-primary-400' : 'text-primary-500'
                  }`} />
                  <span>Established {university.established}</span>
                </div>
                <div className={`flex items-center space-x-2 text-sm transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <FiUsers className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-primary-400' : 'text-primary-500'
                  }`} />
                  <span>{university.studentCount} students</span>
                </div>
              </div>

              {/* Programs */}
              <div className="mb-4">
                <p className={`text-xs font-semibold mb-2 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>POPULAR PROGRAMS:</p>
                <div className="flex flex-wrap gap-1">
                  {university.programs.slice(0, 3).map((program, idx) => (
                    <span 
                      key={idx}
                      className={`text-xs px-2 py-1 rounded-full transition-colors duration-200 ${
                        theme === 'dark' 
                          ? 'bg-primary-600/20 text-primary-300' 
                          : 'bg-primary-100 text-primary-700'
                      }`}
                    >
                      {program}
                    </span>
                  ))}
                  {university.programs.length > 3 && (
                    <span className={`text-xs px-2 py-1 rounded-full transition-colors duration-200 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      +{university.programs.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // Save current conversation before starting new one
                    if (currentConversation) {
                      saveCurrentConversation();
                    }
                    
                    navigate('/chat', { 
                      state: { 
                        universityContext: {
                          name: university.name,
                          fullName: university.fullName,
                          logo: university.logo
                        },
                        forceNewConversation: true,
                        initialMessage: `Tell me about ${university.fullName} - their programs, admission requirements, and application process.`
                      }
                    });
                  }}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  Chat About {university.name}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/forms');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                >
                  View Forms
                </motion.button>
              </div>
            </motion.div>
          ))}

          {/* No Results */}
          {filteredUniversities.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 col-span-full"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiSearch className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No universities found</h3>
              <p className="text-gray-600">Try adjusting your search terms</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Universities;

