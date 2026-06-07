import { useState } from 'react';
import './NewRules.css';

const RULES = [
  {
    icon: '🌍',
    title: '48 Teams — The Biggest World Cup Ever',
    summary: 'Expanded from 32 to 48 nations',
    detail: 'For the first time in history, 48 teams will compete, giving more nations than ever the chance to experience the world\'s greatest sporting event. This expansion means more matches, more stories, and more surprises.',
  },
  {
    icon: '🏟️',
    title: 'Three Nations, One Dream',
    summary: 'USA, Canada & Mexico co-host',
    detail: 'The 2026 World Cup is jointly hosted by the United States, Canada, and Mexico — the first tournament with three host nations. 16 iconic stadiums across 3 countries will host matches, with the final taking place at MetLife Stadium in New Jersey.',
  },
  {
    icon: '🔢',
    title: 'The New Group Format',
    summary: '12 groups of 4, top 2 advance',
    detail: 'The tournament features 12 groups of 4 teams. The top 2 from each group advance automatically, and the 8 best third-placed teams also progress — making a total of 32 teams entering the knockout rounds.',
  },
  {
    icon: '🥉',
    title: 'How the Best Third-Placed Teams Are Chosen',
    summary: 'A cross-group ranking decides the final 8 spots',
    detail: 'With 12 groups, there are 12 third-placed teams — but only 8 of them advance. FIFA lines all 12 up in a single ranking table and compares them, in order, by: total points, goal difference, goals scored, Fair Play points (fewer yellow/red cards = better), and finally a draw if it\'s still level. The top 8 in that ranking claim the remaining Round of 32 spots alongside the 24 group winners and runners-up — so even finishing third in your group can be enough if it was a tightly fought one.',
  },
  {
    icon: '🥊',
    title: 'Round of 32 — A Brand New Stage',
    summary: 'New knockout round before the Last 16',
    detail: 'A completely new stage has been added: the Round of 32. The 24 group qualifiers face the 8 best third-placed teams in this extra round, adding an entirely new layer of drama before the traditional Round of 16.',
  },
  {
    icon: '👕',
    title: 'Bigger Squads, More Options',
    summary: '26 players per squad (up from 23)',
    detail: 'Each nation can now register 26 players for the tournament, up from 23. This gives coaches more flexibility for injuries, tactical variety, and allows more players to experience a World Cup.',
  },
  {
    icon: '🤖',
    title: 'Semi-Automated Offside Technology',
    summary: 'Faster, more accurate VAR decisions',
    detail: 'Building on the system used at the 2022 World Cup, semi-automated offside technology uses dedicated cameras and AI to produce near-instant offside decisions — eliminating the long waits that frustrated fans and players alike.',
  },
  {
    icon: '⏱️',
    title: 'Accurate Stoppage Time',
    summary: 'More added time, fewer time-wasting tricks',
    detail: 'Following the success of extended stoppage time at the 2022 World Cup, referees are instructed to accurately account for goal celebrations, VAR checks, injuries, and substitutions. Expect 8–12 minutes of added time in many matches.',
  },
  {
    icon: '🚫',
    title: 'No More Time Wasting',
    summary: '5-second throw-ins & 10-second substitution exits',
    detail: 'Two strict anti-time-wasting rules are in force at WC 2026. First, throw-ins and goal-kicks now have a 5-second countdown — if the ball is not in play in time, possession switches to the opposition (or the opponent earns a corner if a goal-kick is delayed). Second, substituted players must leave the field within 10 seconds of the 4th official raising the board. If they refuse, their team plays a man down until the next stoppage after one minute, at which point the replacement is finally allowed on.',
  },
  {
    icon: '🌐',
    title: 'Expanded Global Representation',
    summary: 'Africa gets 9 spots, Asia gets 8',
    detail: 'The expanded format means more slots for every confederation. Africa rises from 5 to 9 spots, Asia from 4.5 to 8, CONCACAF from 3.5 to 6 (including the 3 hosts), and South America from 4.5 to 6.5. True global representation.',
  },
];

function RuleCard({ rule }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rule-card ${open ? 'rule-card--open' : ''}`} onClick={() => setOpen(o => !o)}>
      <div className="rule-card__header">
        <span className="rule-card__icon">{rule.icon}</span>
        <div className="rule-card__titles">
          <h3 className="rule-card__title">{rule.title}</h3>
          <p className="rule-card__summary">{rule.summary}</p>
        </div>
        <span className="rule-card__chevron">{open ? '▲' : '▼'}</span>
      </div>
      {open && <p className="rule-card__detail">{rule.detail}</p>}
    </div>
  );
}

function NewRules() {
  return (
    <div>
      <h1 style={{ color: 'var(--color-gold)', fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
        What's New in 2026
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Click any card to learn more
      </p>
      <div className="rules-list">
        {RULES.map((rule, i) => <RuleCard key={i} rule={rule} />)}
      </div>
    </div>
  );
}

export default NewRules;
