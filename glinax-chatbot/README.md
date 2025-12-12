# 🎓 Glinax Chatbot Frontend

> An AI-powered university admission assistant designed to help Ghanaian students navigate university applications, program selection, and form purchases.

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/your-username/glinax-chatbot-frontend)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg)](https://vitejs.dev/)

## 🌟 Overview

Glinax Chatbot is an intelligent web application that serves as a comprehensive university admission assistant for Ghanaian students. The platform helps students:

- 🤖 **Ask Questions**: Get instant answers about university admissions, programs, and requirements
- 📊 **Program Suggestions**: Receive personalized program recommendations based on academic grades
- 📝 **Form Management**: Browse and purchase university application forms
- 🎯 **University Discovery**: Explore various Ghanaian universities and their offerings
- 💬 **Interactive Chat**: Engage with an AI-powered chatbot for real-time assistance

## 🚀 Features

### Core Functionality
- **AI-Powered Chatbot**: Intelligent conversation system for university-related queries
- **University Database**: Comprehensive information about Ghanaian universities
- **Program Recommendations**: Grade-based program suggestions
- **Form Marketplace**: Browse and purchase university application forms
- **User Authentication**: Secure login/signup with email verification
- **Guest Mode**: Limited access for non-registered users

### User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: Theme switching for user preference
- **Real-time Updates**: Live chat and notification system
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Performance**: Optimized with lazy loading and code splitting

### Technical Features
- **PWA Ready**: Progressive Web App capabilities
- **Offline Support**: Service worker for offline functionality
- **State Management**: Zustand for efficient state handling
- **Type Safety**: Full TypeScript implementation
- **Modern UI**: Glassmorphism design with smooth animations

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript 5** - Type-safe JavaScript development
- **Vite 5** - Fast build tool and development server
- **Tailwind CSS 3** - Utility-first CSS framework
- **Framer Motion** - Animation library for smooth transitions

### State Management & Data
- **Zustand** - Lightweight state management
- **React Router 6** - Client-side routing
- **React Query** - Server state management (ready for backend integration)

### Development Tools
- **ESLint** - Code linting and quality assurance
- **Prettier** - Code formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```
glinax-chatbot/
├── public/                 # Static assets
│   ├── glinax-logo.jpeg   # App logo
│   ├── university-logos/  # University logos
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ChatBot.tsx   # Main chatbot component
│   │   ├── Navbar.tsx    # Navigation component
│   │   └── ...
│   ├── contexts/         # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ConfigContext.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useChat.ts
│   │   ├── useForms.ts
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── Home.tsx
│   │   ├── Chat.tsx
│   │   ├── Forms.tsx
│   │   └── ...
│   ├── services/         # API services and mock data
│   │   ├── api.ts
│   │   ├── formsApi.ts
│   │   └── mockData.ts
│   ├── store/            # Zustand store
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── routes/           # Route configuration
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
├── tailwind.config.cjs  # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher) or **yarn** (v1.22 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/glinax-chatbot-frontend.git
   cd glinax-chatbot-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_APP_NAME=Glinax Chatbot
   VITE_APP_VERSION=2.1.0
   # ... other variables
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:5173](http://localhost:5173)

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript type checking

# Testing (when implemented)
npm run test         # Run tests
npm run test:coverage # Run tests with coverage
```

## 🔧 Configuration

### Environment Variables

Key environment variables you can configure:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=10000

# App Configuration
VITE_APP_NAME=Glinax Chatbot
VITE_APP_VERSION=2.1.0
VITE_ENABLE_DEBUG_MODE=true

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_EMAIL_VERIFICATION=true
VITE_ENABLE_SERVICE_WORKER=true
```

### Tailwind Configuration

The project uses a custom Tailwind configuration with:
- Custom color palette for the Glinax brand
- Glassmorphism utilities
- Responsive design breakpoints
- Dark mode support

## 🎨 Design System

### Color Palette
- **Primary**: Blue gradient (#3B82F6 to #1D4ED8)
- **Secondary**: Gray scale for text and backgrounds
- **Accent**: Green for success states
- **Warning**: Yellow for warnings
- **Error**: Red for errors

### Typography
- **Headings**: Inter font family
- **Body**: System font stack
- **Code**: JetBrains Mono

### Components
- **Glassmorphism**: Frosted glass effect for cards and modals
- **Animations**: Smooth transitions using Framer Motion
- **Responsive**: Mobile-first design approach

## 🔌 Backend Integration

The frontend is designed to work with a RESTful API. Key integration points:

### API Endpoints (Expected)
```
GET    /api/universities          # Get universities list
GET    /api/forms                 # Get application forms
POST   /api/chat                  # Send chat message
POST   /api/auth/login            # User authentication
POST   /api/auth/signup           # User registration
GET    /api/user/profile          # Get user profile
```

### Mock Data
Currently uses mock data for development. See `src/services/mockData.ts` for data structure.

## 📱 Progressive Web App (PWA)

The application is PWA-ready with:
- **Service Worker**: Offline functionality
- **Web App Manifest**: Installable on mobile devices
- **Responsive Design**: Works on all screen sizes
- **Fast Loading**: Optimized bundle size and lazy loading

## 🧪 Testing

Testing setup is ready for implementation:
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Cypress**: End-to-end testing (optional)

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Deploy to GitHub Pages
```bash
npm run build
# Push dist/ folder to gh-pages branch
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run lint
   npm run type-check
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure TypeScript types are properly defined

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

### Development Team
- **Lead Developer**: [Your Name](mailto:your.email@example.com)
- **Frontend Team**: [frontend@glinax.com](mailto:frontend@glinax.com)

### Support
- **Email**: [support@glinax.com](mailto:support@glinax.com)
- **Phone**: +233 123 456 789
- **Website**: [https://glinax.com](https://glinax.com)

### Social Media
- **Twitter**: [@glinax_gh](https://twitter.com/glinax_gh)
- **Facebook**: [Glinax Ghana](https://facebook.com/glinaxgh)
- **Instagram**: [@glinax_gh](https://instagram.com/glinax_gh)

## 🙏 Acknowledgments

- **Ghanaian Universities**: For providing admission information
- **React Community**: For excellent documentation and tools
- **Tailwind CSS**: For the amazing utility-first CSS framework
- **Vite Team**: For the fast and modern build tool
- **Contributors**: All developers who contributed to this project

## 📊 Project Status

- ✅ **Core Features**: Complete
- ✅ **UI/UX Design**: Complete
- ✅ **Responsive Design**: Complete
- ✅ **PWA Features**: Complete
- 🔄 **Backend Integration**: In Progress
- 🔄 **Testing**: In Progress
- 🔄 **Documentation**: In Progress

---

**Made with ❤️ for Ghanaian students by the Glinax Team**