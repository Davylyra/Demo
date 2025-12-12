import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHelpCircle, FiMessageCircle, FiMail, FiPhone } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useTheme } from '../contexts/ThemeContext';
import { HELP_SECTIONS } from '../data/constants';
import { contentService, type PageContent } from '../services/contentService';

const HelpSupport: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);

  // Use dynamic help sections from constants
  const helpSections = HELP_SECTIONS;

  // Load page content
  useEffect(() => {
    const loadPageContent = async () => {
      try {
        const content = await contentService.getPageContent('help-support');
        setPageContent(content);
      } catch (error) {
        console.error('Failed to load page content:', error);
      }
    };

    loadPageContent();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar 
        title="HELP & SUPPORT"
        showBackButton={true}
        onBackClick={() => navigate('/')}
        showMenuButton={false}
      />

      <div className="max-w-md mx-auto px-4 py-6">
        {helpSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="mb-6"
          >
            <h3 className={`text-lg font-bold mb-4 transition-colors duration-200 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>{section.title}</h3>
            
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: sectionIndex * 0.1 + itemIndex * 0.05 }}
                  className={`p-4 hover:shadow-lg transition-all duration-300 cursor-pointer ${
                    theme === 'dark' 
                      ? 'glass-card-unified-dark bg-gray-700/80' 
                      : 'glass-card-unified bg-white/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiHelpCircle className="w-5 h-5 text-primary-600" />
                    <span className={`transition-colors duration-200 ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                    }`}>{item}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 ${
            theme === 'dark' 
              ? 'glass-card-unified-dark bg-gray-700/80' 
              : 'glass-card-unified bg-white/80'
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 transition-colors duration-200 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            {pageContent?.sections.find(s => s.id === 'get-in-touch-title')?.title || 'Get in Touch'}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <FiMessageCircle className="w-5 h-5 text-primary-600" />
              <div>
                <p className={`font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {pageContent?.sections.find(s => s.id === 'live-chat')?.title || 'Live Chat'}
                </p>
                <p className={`text-sm transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {pageContent?.sections.find(s => s.id === 'live-chat')?.content || 'Available 24/7'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <FiMail className="w-5 h-5 text-primary-600" />
              <div>
                <p className={`font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {pageContent?.sections.find(s => s.id === 'email-support')?.title || 'Email'}
                </p>
                <p className={`text-sm transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {pageContent?.sections.find(s => s.id === 'email-support')?.content || 'support@glinax.com'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <FiPhone className="w-5 h-5 text-primary-600" />
              <div>
                <p className={`font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {pageContent?.sections.find(s => s.id === 'phone-support')?.title || 'Phone'}
                </p>
                <p className={`text-sm transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {pageContent?.sections.find(s => s.id === 'phone-support')?.content || '+233 24 123 4567'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpSupport;
