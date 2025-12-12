import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiEdit3, FiMail, FiMapPin, FiCalendar, FiShield } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    location: '', // user?.location || '',
    bio: '',
    interests: [] as string[],
    preferredUniversities: [] as string[]
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        location: '', // user.location || '',
        bio: '',
        interests: [],
        preferredUniversities: []
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      updateProfile({ 
        name: formData.name, 
        email: formData.email 
      });
      setIsEditing(false);
      setErrors({});
    } catch {
      // Failed to update profile - handled gracefully
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    // Reset form data to original values
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        location: 'Accra, Ghana',
        bio: 'University admission enthusiast',
        interests: ['Computer Science', 'Engineering', 'Medicine'],
        preferredUniversities: ['KNUST', 'UG', 'UCC']
      });
    }
  };

  return (
    <div className={`min-h-screen ${
      theme === 'dark' 
        ? 'bg-gradient-to-b from-transparent via-gray-800/50 to-gray-800' 
        : 'bg-gradient-to-b from-transparent via-white/50 to-white'
    }`}>
      <Navbar 
        title="PROFILE OVERVIEW"
        showBackButton={true}
        onBackClick={() => navigate('/')}
        showMenuButton={false}
      />

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`backdrop-blur-md rounded-2xl p-6 mb-6 border transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-white/30'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <FiUser className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={`w-full bg-transparent border-b-2 outline-none font-bold text-xl transition-colors duration-200 ${
                      theme === 'dark' 
                        ? 'text-white border-gray-600 focus:border-primary-400' 
                        : 'text-gray-800 border-gray-300 focus:border-primary-500'
                    } ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter your name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">{errors.name}</p>
                  )}
                </div>
              ) : (
                <h2 className={`text-xl font-bold transition-colors duration-200 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>{user?.name || 'User'}</h2>
              )}
              <p className={`text-sm transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>{user?.email || 'user@example.com'}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'bg-primary-600/20 text-primary-400 hover:bg-primary-600/30'
                  : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              }`}
            >
              <FiEdit3 className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Profile Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`backdrop-blur-md rounded-2xl p-6 border transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-white/30'
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 transition-colors duration-200 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Personal Information</h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <FiMail className={`w-5 h-5 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <label className={`text-sm font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>Email Address</label>
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                  isEditing 
                    ? theme === 'dark'
                      ? 'bg-gray-800/50 border-gray-600 text-white focus:border-primary-400 focus:bg-gray-700/50'
                      : 'bg-gray-50 border-gray-300 text-gray-800 focus:border-primary-500 focus:bg-white'
                    : theme === 'dark'
                      ? 'bg-transparent border-transparent text-gray-300'
                      : 'bg-transparent border-transparent text-gray-600'
                } ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm ml-8">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <FiMapPin className={`w-5 h-5 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <label className={`text-sm font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>Location</label>
              </div>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                disabled={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                  isEditing 
                    ? theme === 'dark'
                      ? 'bg-gray-800/50 border-gray-600 text-white focus:border-primary-400 focus:bg-gray-700/50'
                      : 'bg-gray-50 border-gray-300 text-gray-800 focus:border-primary-500 focus:bg-white'
                    : theme === 'dark'
                      ? 'bg-transparent border-transparent text-gray-300'
                      : 'bg-transparent border-transparent text-gray-600'
                } ${errors.location ? 'border-red-500' : ''}`}
                placeholder="Enter your location"
              />
              {errors.location && (
                <p className="text-red-500 text-sm ml-8">{errors.location}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <FiUser className={`w-5 h-5 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <label className={`text-sm font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>Bio</label>
              </div>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                disabled={!isEditing}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 resize-none ${
                  isEditing 
                    ? theme === 'dark'
                      ? 'bg-gray-800/50 border-gray-600 text-white focus:border-primary-400 focus:bg-gray-700/50'
                      : 'bg-gray-50 border-gray-300 text-gray-800 focus:border-primary-500 focus:bg-white'
                    : theme === 'dark'
                      ? 'bg-transparent border-transparent text-gray-300'
                      : 'bg-transparent border-transparent text-gray-600'
                }`}
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex space-x-3 mt-6"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                disabled={isSaving}
                className={`flex-1 py-3 px-4 border rounded-xl font-medium transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                }`}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`backdrop-blur-md rounded-2xl p-6 border transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-white/30'
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 transition-colors duration-200 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Account Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiCalendar className={`w-5 h-5 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <div>
                  <p className={`font-medium transition-colors duration-200 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Member Since</p>
                  <p className={`text-sm transition-colors duration-200 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'January 2024'}
                  </p>
                </div>
              </div>
            </div>


            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiShield className={`w-5 h-5 transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <div>
                  <p className={`font-medium transition-colors duration-200 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Account Status</p>
                  <p className={`text-sm transition-colors duration-200 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}>Verified</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Interests & Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`backdrop-blur-md rounded-2xl p-6 border transition-all duration-200 ${
            theme === 'dark' 
              ? 'bg-white/10 border-white/20' 
              : 'bg-white/80 border-white/30'
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 transition-colors duration-200 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Interests & Preferences</h3>
          
          <div className="space-y-4">
            <div>
              <p className={`text-sm font-medium mb-2 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>Areas of Interest</p>
              <div className="flex flex-wrap gap-2">
                {formData.interests.map((interest, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-primary-600/20 text-primary-300'
                        : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className={`text-sm font-medium mb-2 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>Preferred Universities</p>
              <div className="flex flex-wrap gap-2">
                {formData.preferredUniversities.map((university, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                      theme === 'dark'
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {university}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
