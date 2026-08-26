import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useMotionValueEvent } from 'motion/react';
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

const PULL_MAX = 80;
const PULL_TRIGGER = 60;

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

  const pullY = useMotionValue(0);
  const pullOpacity = useTransform(pullY, [0, PULL_MAX], [0, 1]);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const [pullArmed, setPullArmed] = useState(false);

  useMotionValueEvent(pullY, 'change', (latest) => {
    const next = latest > PULL_TRIGGER;
    setPullArmed((prev) => (prev === next ? prev : next));
  });

  const handleTouchStart = (e) => {
    if (window.scrollY <= 0) {
      startYRef.current = e.touches[0].clientY;
      trackingRef.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!trackingRef.current) return;
    const distance = e.touches[0].clientY - startYRef.current;

    if (distance > 0 && window.scrollY <= 0) {
      pullY.set(Math.min(distance * 0.4, PULL_MAX));
    } else {
      pullY.set(0);
    }
  };

  const handleTouchEnd = () => {
    trackingRef.current = false;
    startYRef.current = 0;
    if (pullY.get() > PULL_TRIGGER && !refreshing) {
      onRefresh();
    }
    animate(pullY, 0, { type: 'spring', stiffness: 420, damping: 32 });
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
        <motion.div className="shell__main" style={{ y: pullY }}>
          <motion.div className="shell__pull-indicator" style={{ opacity: pullOpacity }}>
            {refreshing ? 'Syncing...' : pullArmed ? 'Release to refresh' : 'Pull down to refresh'}
          </motion.div>
          <TopBar
            view={view}
            onBack={() => navigate('home')}
            onRefresh={onRefresh}
            refreshing={refreshing}
            profile={profile}
            onLogout={onLogout}
          />
          <AcademiaDownBanner
            error={error}
            onRetry={onRefresh}
            onPlayGame={() => {
              navigate('games');
            }}
          />
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
        </motion.div>
        <MobileTabBar view={view} onNavigate={navigate} />
        <NotificationDrawer onNavigate={navigate} />
      </div>
    </NotificationProvider>
  );
}

export default Shell;
