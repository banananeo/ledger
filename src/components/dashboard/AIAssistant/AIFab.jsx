import React from 'react';
import './AIAssistantDrawer.css';

export default function AIFab({ onClick }) {
  return (
    <button className="ai-fab" onClick={onClick} aria-label="Open Ledger AI Assistant" title="Ledger AI">
      <span style={{fontSize:16}}>✨</span>
      <span>Ledger AI</span>
    </button>
  );
}
