import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar.jsx';
import MobileTabBar from './MobileTabBar.jsx';
import TopBar from './TopBar.jsx';
import ClassReminderBanner from './ClassReminderBanner.jsx';
import NotificationDrawer from './NotificationDrawer.jsx';
import AcademiaDownBanner from './AcademiaDownBanner.jsx';
import { NotificationProvider } from '../../context/NotificationContext.tsx';
import HomeView from './views/HomeView.jsx';
import TimetableView from './views/TimetableView.jsx';
import AttendanceView from './views/AttendanceView.jsx';
import MarksView from './views/MarksView.jsx';
import CalendarView from './views/CalendarView.jsx';
import GamesView from './views/GamesView.jsx';
import './Shell.css';


const viewVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

function Shell({ data, lastSynced, onRefresh, refreshing, onLogout, error }) {
  const [view, setView] = useState('home');
  const { profile, attendance = [], schedule = [], marks = [], calendar } = data || {};

  // Pull-to-refresh state
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (startY === 0) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(distance * 0.4, 80)); // Add friction
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !refreshing) {
      onRefresh();
    }
    setStartY(0);
    setPullDistance(0);
  };

  const navigate = (next) => {
    setView(next);
    window.scrollTo(0, 0);
  };

  return (
    <NotificationProvider schedule={schedule} calendar={calendar}>
      <div 
        className="shell" 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Sidebar
          view={view}
          onNavigate={navigate}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onLogout={onLogout}
        />
        <div className="shell__main" style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none' }}>
          {/* Pull Indicator */}
          <div className="shell__pull-indicator" style={{ height: pullDistance > 0 ? 60 : 0, opacity: pullDistance / 80 }}>
            {refreshing ? 'Syncing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull down to refresh'}
          </div>
          <TopBar
            view={view}
            onBack={() => navigate('home')}
            onRefresh={onRefresh}
            refreshing={refreshing}
            profile={profile}
            onLogout={onLogout}
          />
          {error && (
            <AcademiaDownBanner
              error={error}
              onRetry={onRefresh}
              onPlayGame={(gameType) => {
                navigate('games');
              }}
            />
          )}
          <div className="shell__content">
            <ClassReminderBanner onNavigate={navigate} />

            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="shell__view-wrapper"
              >
                {view === 'home' && (
                  <HomeView
                    profile={profile}
                    attendance={attendance}
                    schedule={schedule}
                    marks={marks}
                    calendar={calendar}
                    lastSynced={lastSynced}
                    onNavigate={navigate}
                  />
                )}
                {view === 'timetable' && (
                  <TimetableView schedule={schedule} calendar={calendar} profile={profile} />
                )}

                {view === 'attendance' && (
                  <AttendanceView attendance={attendance} schedule={schedule} />
                )}
                {view === 'games' && (
                  <GamesView schedule={schedule} attendance={attendance} calendar={calendar} />
                )}
                {view === 'calendar' && (
                  <CalendarView calendar={calendar} />
                )}
                {view === 'marks' && (
                  <MarksView marks={marks} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <MobileTabBar view={view} onNavigate={navigate} />
        <NotificationDrawer onNavigate={navigate} />
      </div>
    </NotificationProvider>
  );
}

export default Shell;

