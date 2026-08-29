import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GamepadIcon, SparklesIcon, DiceIcon } from '../Icons.jsx';
import BunkRoulette from './BunkRoulette.jsx';
import CampusRush from './CampusRush.jsx';
import './GamesSection.css';

export function GamesSection({ schedule = [], attendance = [], calendar, defaultGame = 'roulette' }) {
  const [activeGame, setActiveGame] = useState(defaultGame); // 'roulette' | 'rush'

  return (
    <section className="bcard games-section" id="arcade-games">
      <div className="games-section__header">
        <div className="games-section__title-group">
          <div className="games-section__badge">
            <GamepadIcon width={18} height={18} />
          </div>
          <div>
            <p className="eyebrow">SRM Student Arcade</p>
            <h3 className="games-section__heading">Campus Games & Roulette</h3>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="games-section__tabs">
          <button
            className={`bbtn ${activeGame === 'roulette' ? 'bbtn--good' : 'bbtn--outline'} games-section__tab-btn`}
            onClick={() => setActiveGame('roulette')}
          >
            <DiceIcon width={16} height={16} />
            <span>Bunk Roulette</span>
          </button>

          <button
            className={`bbtn ${activeGame === 'rush' ? 'bbtn--good' : 'bbtn--outline'} games-section__tab-btn`}
            onClick={() => setActiveGame('rush')}
          >
            <span>🏃‍♂️ Campus Rush</span>
          </button>
        </div>
      </div>

      <div className="games-section__body">
        {activeGame === 'roulette' ? (
          <BunkRoulette schedule={schedule} attendance={attendance} calendar={calendar} />
        ) : (
          <CampusRush />
        )}
      </div>
    </section>
  );
}

export default GamesSection;
