import React, { useState, useRef } from 'react';
import Sidebar from './Sidebar.jsx';
import MobileRadialMenu from './MobileRadialMenu.jsx';
import TopBar from './TopBar.jsx';
import ClassReminderBanner from './ClassReminderBanner.jsx';
import NotificationDrawer from './NotificationDrawer.jsx';
import AcademiaDownBanner from './AcademiaDownBanner.jsx';
import CurtainsScopeTransition from './CurtainsScopeTransition.jsx';
import { NotificationProvider } from '../../context/NotificationContext.tsx';
import HomeView from './views/HomeView.jsx';
import TimetableView from './views/TimetableView.jsx';
import AttendanceView from './views/AttendanceView.jsx';
import MarksView from './views/MarksView.jsx';
import CalendarView from './views/CalendarView.jsx';
import GamesView from './views/GamesView.jsx';
import AIAssistantDrawer from './AIAssistant/AIAssistantDrawer.jsx';
import AIFab from './AIAssistant/AIFab.jsx';
import './Shell.css';

function Shell({ data, lastSynced, onRefresh, refreshing, onLogout, error }) {
  const [view, setView] = useState('home');
  const [transitionOrigin, setTransitionOrigin] = useState({ x: 50, y: 50 });
  const [aiOpen, setAiOpen] = useState(false);
  const stageRef = useRef(null);
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

  const navigate = (next, event) => {
    if (event && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const target = event.currentTarget?.getBoundingClientRect();
      const clientX = event.clientX || (target ? target.left + target.width / 2 : rect.left + rect.width / 2);
      const clientY = event.clientY || (target ? target.top + target.height / 2 : rect.top + rect.height / 2);
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      setTransitionOrigin({ x, y });
    }
    setView(next);
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
            onOpenAI={() => setAiOpen(true)}
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

            <CurtainsScopeTransition activeView={view} origin={transitionOrigin}>
              {(currentActiveView) => (
                <div className="shell__view-wrapper">
                  {currentActiveView === 'home' && (
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
                  {currentActiveView === 'timetable' && (
                    <TimetableView schedule={schedule} calendar={calendar} profile={profile} />
                  )}

                  {currentActiveView === 'attendance' && (
                    <AttendanceView attendance={attendance} schedule={schedule} />
                  )}
                  {currentActiveView === 'games' && (
                    <GamesView schedule={schedule} attendance={attendance} calendar={calendar} />
                  )}
                  {currentActiveView === 'calendar' && (
                    <CalendarView calendar={calendar} />
                  )}
                  {currentActiveView === 'marks' && (
                    <MarksView marks={marks} />
                  )}
                </div>
              )}
            </CurtainsScopeTransition>
          </div>
        </div>
        <MobileRadialMenu view={view} onNavigate={navigate} />
        <NotificationDrawer onNavigate={navigate} />
        <AIFab onClick={() => setAiOpen(true)} />
        <AIAssistantDrawer data={data} isOpen={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </NotificationProvider>
  );
}

export default Shell;

