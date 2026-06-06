import { useState, useEffect } from 'react';
import './FactsBanner.css';

const FACTS = [
  '⚽ Brazil is the only nation to have played in every single FIFA World Cup',
  '🏆 Brazil holds the record with 5 World Cup titles (1958, 1962, 1970, 1994, 2002)',
  '🥅 The fastest World Cup goal was scored by Hakan Şükür in just 10.8 seconds (2002)',
  '👴 The 2026 World Cup will feature 48 teams — the largest in tournament history',
  '🌍 Only 8 different nations have ever lifted the World Cup trophy',
  '👦 Pelé is the youngest World Cup winner ever — just 17 years old in 1958',
  '🎯 Miroslav Klose holds the all-time World Cup scoring record with 16 goals',
  '🇫🇷 Kylian Mbappé became the 2nd player ever to score in a World Cup final as a teenager',
  '🤝 2026 marks the first World Cup co-hosted by three nations: USA, Canada & Mexico',
  '🏟️ The 2026 Final will be held at MetLife Stadium in New Jersey, USA',
  '📺 The 2022 World Cup Final was the most-watched football match in history',
  '🔢 The 2026 group stage introduces a brand-new Round of 32 knockout stage',
  '🇦🇷 Argentina ended a 36-year wait for glory when Messi lifted the 2022 trophy in Qatar',
  '🌐 For the first time, Africa gets 9 spots and Asia gets 8 spots in the 2026 edition',
  '⏱️ Extra time was played in 8 of the last 10 World Cup finals',
];

function FactsBanner() {
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % FACTS.length);
        setVisible(true);
      }, 500);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="facts-banner">
      <span className="facts-banner__label">Did you know?</span>
      <p className={`facts-banner__text ${visible ? 'facts-banner__text--visible' : ''}`}>
        {FACTS[index]}
      </p>
    </div>
  );
}

export default FactsBanner;
