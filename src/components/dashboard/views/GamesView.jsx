import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GamepadIcon, DiceIcon } from '../Icons.jsx';
import BunkRoulette from '../games/BunkRoulette.jsx';
import CampusRush from '../games/CampusRush.jsx';
import './GamesView.css';

const viewVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function GamesView({ schedule = [], attendance = [], calendar, defaultGame = 'roulette' }) {
  const [activeTab, setActiveTab] = useState(defaultGame); // 'roulette' | 'rush'

  return (
    <div className="games-view">
      {/* Top Header Card */}
      <div className="games-view__header bcard">
        <div className="games-view__title-row">
          <div className="games-view__icon-box">
            <GamepadIcon width={22} height={22} />
          </div>
          <div>
            <p className="eyebrow">Student Hub</p>
            <h2 className="games-view__title">Games & Bunk Roulette</h2>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="games-view__tabs">
          <button
            className={`bbtn ${activeTab === 'roulette' ? 'bbtn--good' : 'bbtn--outline'} games-view__tab`}
            onClick={() => setActiveTab('roulette')}
          >
            <DiceIcon width={16} height={16} />
            <span>Bunk Roulette</span>
          </button>

          <button
            className={`bbtn ${activeTab === 'rush' ? 'bbtn--good' : 'bbtn--outline'} games-view__tab`}
            onClick={() => setActiveTab('rush')}
          >
            <span>🏃‍♂️ Campus Rush</span>
          </button>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="games-view__content">
        {activeTab === 'roulette' ? (
          <BunkRoulette schedule={schedule} attendance={attendance} calendar={calendar} />
        ) : (
          <div className="bcard games-view__snake-card">
            <CampusRush />
          </div>
        )}
      </div>
    </div>
  );
}

export default GamesView;
