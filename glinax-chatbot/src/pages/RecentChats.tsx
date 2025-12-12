import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiTrash2 } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store';

const RecentChats: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  
  // Use dynamic chat data from store
  const { conversations, deleteConversation } = useAppStore();
  const [chatSections, setChatSections] = useState<Array<{
    title: string;
    chats: Array<{
      id: string;
      name: string;
      color: string;
      timestamp: Date;
    }>;
  }>>([]);

  // Convert conversations to chat sections format
  useEffect(() => {
    if (conversations.length === 0) {
      setChatSections([]);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const sections: Array<{
      title: string;
      chats: Array<{
        id: string;
        name: string;
        color: string;
        timestamp: Date;
      }>;
    }> = [
      { title: "Today", chats: [] },
      { title: "Yesterday", chats: [] },
      { title: "Previous 7 Days", chats: [] }
    ];

    const colors = [
      "bg-orange-500", "bg-blue-500", "bg-purple-500", "bg-red-500", 
      "bg-green-500", "bg-pink-500", "bg-indigo-500", "bg-yellow-500"
    ];

    conversations.forEach((conv, index) => {
      const convDate = new Date(conv.timestamp);
      const chatItem = {
        id: conv.id,
        name: conv.title || `Chat ${index + 1}`,
        color: colors[index % colors.length],
        timestamp: convDate
      };

      if (convDate >= today) {
        sections[0].chats.push(chatItem);
      } else if (convDate >= yesterday) {
        sections[1].chats.push(chatItem);
      } else if (convDate >= weekAgo) {
        sections[2].chats.push(chatItem);
      }
    });

    // Filter out empty sections
    setChatSections(sections.filter(section => section.chats.length > 0));
  }, [conversations]);

  const deleteChat = (chatId: string) => {
    // Use store's deleteConversation method
    deleteConversation(chatId);
  };

  const filteredSections = chatSections.map(section => ({
    ...section,
    chats: section.chats.filter(chat => 
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.chats.length > 0);

  return (
    <div className="min-h-screen">
      <Navbar 
        title="RECENT CHATS"
        showBackButton={true}
        onBackClick={() => navigate('/')}
        showMenuButton={false}
      />

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className={`p-4 flex items-center space-x-3 transition-all duration-200 ${
            theme === 'dark' 
              ? 'glass-unified-dark' 
              : 'glass-unified'
          }`}>
            <FiSearch className={`w-5 h-5 transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search Chats...."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent outline-none transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'text-gray-200 placeholder-gray-400' 
                  : 'text-gray-700 placeholder-gray-500'
              }`}
            />
          </div>
        </motion.div>

        {/* Chat Sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <AnimatePresence>
            {filteredSections.length > 0 ? (
              filteredSections.map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: sectionIndex * 0.1 }}
                >
                  <h3 className={`text-lg font-bold mb-3 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>{section.title}</h3>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {section.chats.map((chat, chatIndex) => (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20, scale: 0.95 }}
                          transition={{ delay: chatIndex * 0.05 }}
                          className={`p-4 hover:shadow-lg transition-all duration-300 cursor-pointer relative group ${
                            theme === 'dark' 
                              ? 'glass-unified-dark hover:bg-white/10' 
                              : 'glass-unified hover:bg-white/30'
                          }`}
                          onClick={() => navigate('/chat')}
                          onMouseEnter={() => setHoveredChat(chat.id)}
                          onMouseLeave={() => setHoveredChat(null)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${chat.color}`}></div>
                              <span className={`font-medium transition-colors duration-200 ${
                                theme === 'dark' ? 'text-white' : 'text-gray-800'
                              }`}>{chat.name}</span>
                            </div>
                            
                            {/* Delete Button - appears on hover */}
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ 
                                opacity: hoveredChat === chat.id ? 1 : 0,
                                scale: hoveredChat === chat.id ? 1 : 0.8
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className={`p-2 rounded-full transition-all duration-200 ${
                                theme === 'dark'
                                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                  : 'bg-red-100 hover:bg-red-200 text-red-600'
                              }`}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className={`text-lg font-medium transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {searchQuery ? 'No chats found matching your search.' : 'No recent chats available.'}
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`mt-2 text-sm transition-colors duration-200 ${
                      theme === 'dark' ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'
                    }`}
                  >
                    Clear search
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Stats */}
        {filteredSections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-4 border-t border-white/20"
          >
            <div className={`flex justify-between items-center text-sm transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <span>{chatSections.reduce((total, section) => total + section.chats.length, 0)} Conversations</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>{chatSections.reduce((total, section) => total + section.chats.length, 0) * 3} Messages</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RecentChats;
