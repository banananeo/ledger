import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import MobileTabBar from './MobileTabBar.jsx';
import TopBar from './TopBar.jsx';
import HomeView from './views/HomeView.jsx';
import TimetableView from './views/TimetableView.jsx';
import AttendanceView from './views/AttendanceView.jsx';
import MarksView from './views/MarksView.jsx';
import './Shell.css';

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
          profileName={profile?.name}
        />
        {error && <p className="shell__error">{error}</p>}
        <div className="shell__content">
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
            <TimetableView schedule={schedule} calendar={calendar} />
          )}
          {view === 'attendance' && (
            <AttendanceView attendance={attendance} />
          )}
          {view === 'marks' && (
            <MarksView marks={marks} />
          )}
        </div>
      </div>
      <MobileTabBar view={view} onNavigate={navigate} />
    </div>
  );
}

export default Shell;
