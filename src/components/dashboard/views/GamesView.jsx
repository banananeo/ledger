import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GamepadIcon, DiceIcon } from '../Icons.jsx';
import BunkRoulette from '../games/BunkRoulette.jsx';
import RetroSnake from '../games/RetroSnake.jsx';
import './GamesView.css';

const tabContentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

export function GamesView({ schedule = [], attendance = [], calendar, defaultGame = 'roulette' }) {
  const [activeTab, setActiveTab] = useState(defaultGame); // 'roulette' | 'snake'

  return (
    <div className="games-view">
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

        <div className="games-view__tabs">
          <button
            className={`bbtn ${activeTab === 'roulette' ? 'bbtn--good' : 'bbtn--outline'} games-view__tab`}
            onClick={() => setActiveTab('roulette')}
          >
            {activeTab === 'roulette' && (
              <motion.span
                layoutId="games-tab-pill"
                className="games-view__tab-pill"
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
              />
            )}
            <DiceIcon width={16} height={16} />
            <span>Bunk Roulette</span>
          </button>

          <button
            className={`bbtn ${activeTab === 'snake' ? 'bbtn--good' : 'bbtn--outline'} games-view__tab`}
            onClick={() => setActiveTab('snake')}
          >
            {activeTab === 'snake' && (
              <motion.span
                layoutId="games-tab-pill"
                className="games-view__tab-pill"
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
              />
            )}
            <span>🐍 Retro Snake</span>
          </button>
        </div>
      </div>

      <div className="games-view__content">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'roulette' ? (
            <motion.div key="roulette" variants={tabContentVariants} initial="initial" animate="animate" exit="exit">
              <BunkRoulette schedule={schedule} attendance={attendance} calendar={calendar} />
            </motion.div>
          ) : (
            <motion.div
              key="snake"
              className="bcard games-view__snake-card"
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <RetroSnake />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default GamesView;
