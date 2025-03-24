import { useEffect, useRef, useState } from 'react';
import './App.css';
import confetti from 'canvas-confetti';

type ScoreEntry = {
  name: string;
  score: number;
};

const CIRCLE_RADIUS = 60;

function App() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [clicks, setClicks] = useState<number[]>([]);
  const [cps, setCps] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [circlePop, setCirclePop] = useState(false);
  const [showHighScoreMessage, setShowHighScoreMessage] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const redCircleRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!username) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const rect = redCircleRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= CIRCLE_RADIUS) {
      const now = Date.now();
      setClicks(prev => [...prev.filter(t => now - t <= 1000), now]);
      audioRef.current?.play();
      setCirclePop(true);
      setTimeout(() => setCirclePop(false), 200);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const recentClicks = clicks.filter(t => now - t <= 1000);
      setClicks(recentClicks);
      setCps(recentClicks.length);

      if (recentClicks.length > highScore) {
        setHighScore(recentClicks.length);
        if (username) {
          submitHighScore(username, recentClicks.length);
        }

        setShowHighScoreMessage(true);
        setTimeout(() => setShowHighScoreMessage(false), 1500);

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [clicks, highScore, username]);

  const fetchLeaderboard = () => {
    fetch('http://localhost:8000/leaderboard')
      .then(res => res.json())
      .then((data: ScoreEntry[]) => {
        const bestPerPlayer = new Map<string, number>();
        for (const entry of data) {
          if (!bestPerPlayer.has(entry.name) || entry.score > bestPerPlayer.get(entry.name)!) {
            bestPerPlayer.set(entry.name, entry.score);
          }
        }
        const uniqueLeaderboard: ScoreEntry[] = Array.from(bestPerPlayer.entries())
          .map(([name, score]) => ({ name, score }))
          .sort((a, b) => b.score - a.score);

        setLeaderboard(uniqueLeaderboard);
      })
      .catch(err => console.error('Leaderboard fetch failed:', err));
  };

  const submitHighScore = (name: string, score: number) => {
    fetch('http://localhost:8000/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    })
      .then(() => fetchLeaderboard())
      .catch(err => console.error('Submit failed:', err));
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUsername(nameInput.trim());
    }
  };

  return (
    <div className="game" onClick={handleClick} onTouchStart={handleClick}>
      <audio ref={audioRef} src="/click.wav" preload="auto" />
      <img
        src="/pointer.png"
        alt="pointer"
        className="pointer"
        style={{ left: mouse.x, top: mouse.y }}
      />

      {username && (
        <div
          className={`circle ${circlePop ? 'pop' : ''}`}
          ref={redCircleRef}
        ></div>
      )}

      {username && (
        <div className="scoreboard">
          <h2>CPS: {cps}</h2>
          <h3>High Score: {highScore}</h3>
          <h3>Leaderboard:</h3>
          <ol>
            {leaderboard.map((entry, i) => (
              <li key={i}>
                {entry.name}: {entry.score}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!username && (
        <div className="name-input">
          <form onSubmit={handleNameSubmit}>
            <h2>Enter your name</h2>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <br />
            <button type="submit">Start</button>
          </form>
        </div>
      )}

      {showHighScoreMessage && (
        <div className="highscore-message">🎉 NEW HIGH SCORE! 🎉</div>
      )}
    </div>
  );
}

export default App;

