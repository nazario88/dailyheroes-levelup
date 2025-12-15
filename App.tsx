import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Dumbbell, 
  Heart, 
  Activity, 
  Users, 
  Zap, 
  Moon, 
  Sun,
  Briefcase, 
  BookOpen, 
  Apple, 
  Cigarette,
  Pizza,
  Smile, 
  Frown, 
  AlertTriangle,
  History,
  Trophy,
  PersonStanding,
  ArrowRight,
  Share2,
  ExternalLink,
  User,
  Sparkles,
  BatteryLow,
  ShieldAlert,
  Volume2,
  VolumeX,
  Skull,
  Crown,
  Gamepad2,
  Anchor
} from 'lucide-react';
import { PlayerState, INITIAL_STATS, OBJECTIVES, GameLogEntry } from './types';
import { StatGauge, ActionCard, LogEntry, Modal } from './components/GameUI';

const MAX_LOGS = 50;

// --- Audio System (Web Audio API) ---
// We use a simple synthesizer to avoid external assets dependencies
const playSynthSound = (type: 'success' | 'error' | 'click' | 'sleep' | 'start' | 'levelUp', audioCtx: AudioContext | null) => {
  if (!audioCtx) return;
  
  // Resume context if suspended (browser policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'success') {
    // Pleasant ascending chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);

    // Harmony
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(750, now); // 5th
    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.start(now);
    osc2.stop(now + 0.4);

  } else if (type === 'error') {
    // Low buzz
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);

  } else if (type === 'sleep') {
    // Power down effect
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 1);
    osc.start(now);
    osc.stop(now + 1);

  } else if (type === 'start') {
    // Power up / Start game
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);

  } else if (type === 'levelUp') {
    // Victory fanfare (simple)
    const playNote = (freq: number, time: number, duration: number) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.1, time);
      g.gain.linearRampToValueAtTime(0.001, time + duration);
      o.start(time);
      o.stop(time + duration);
    };
    playNote(523.25, now, 0.2); // C5
    playNote(659.25, now + 0.2, 0.2); // E5
    playNote(783.99, now + 0.4, 0.4); // G5
  }
};


export default function App() {
  // --- State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [summaryData, setSummaryData] = useState<string[]>([]);
  
  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [player, setPlayer] = useState<PlayerState>({
    name: '',
    stats: { ...INITIAL_STATS },
    energy: 100,
    maxEnergy: 100,
    money: 0,
    day: 1,
    hasAddiction: true,
    addictionRecoveryProgress: 0,
    injuredUntilDay: null,
    muscleFatigue: false,
    motivation: 'normal',
    daysSinceLastSocial: 0,
    sportActionsYesterday: 0,
    gameWon: false,
    actionsPerformedToday: 0,
    sportActionsToday: 0,
    ateHealthyToday: false,
    ateJunkToday: false,
  });

  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  // Initialize Audio Context on first interaction
  useEffect(() => {
    // We don't init here to avoid strict browser autoplay policies
    // We init in handleStartGame or first interaction
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Handle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Check victory condition
  useEffect(() => {
    if (player.gameWon) return; // Already won
    
    const allStatsMaxed = Object.values(player.stats).every(val => (val as number) >= 100);
    if (allStatsMaxed) {
      playSound('levelUp');
      setPlayer(p => ({...p, gameWon: true}));
    }
  }, [player.stats, player.gameWon]);

  // Determine current objective
  const currentObjectiveIndex = OBJECTIVES.findIndex(obj => !obj.check(player.stats));
  const currentObjective = currentObjectiveIndex === -1 
    ? { id: 99, text: "Jeu Terminé ! Vous êtes au top !", check: () => true } 
    : OBJECTIVES[currentObjectiveIndex];

  // --- Helpers ---

  const initAudio = () => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
  };

  const playSound = (type: 'success' | 'error' | 'click' | 'sleep' | 'start' | 'levelUp') => {
    if (isMuted) return;
    initAudio(); // Ensure init
    playSynthSound(type, audioCtxRef.current);
  };

  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    setLogs(prev => {
      const newLogs = [...prev, { id: Math.random().toString(36), day: player.day, text, type }];
      if (newLogs.length > MAX_LOGS) return newLogs.slice(newLogs.length - MAX_LOGS);
      return newLogs;
    });
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // --- Core Mechanics ---

  const handleStartGame = (name: string) => {
    initAudio();
    playSound('start');
    setPlayer(p => ({ ...p, name }));
    setHasStarted(true);
    addLog(`Bienvenue, ${name}. Votre voyage vers une vie meilleure commence.`, 'info');
    addLog("Vous commencez avec une addiction et une santé fragile. Il va falloir changer ça.", 'warning');
  };

  const calculateSportInjuryChance = (): number => {
    const safeLimit = Math.max(1, Math.floor(player.stats.sport / 10) + 1);
    if (player.sportActionsToday <= safeLimit) return 0;
    return (player.sportActionsToday - safeLimit) * 15; 
  };

  const performAction = (
    label: string, 
    energyCost: number, 
    effects: (current: PlayerState) => Partial<PlayerState>,
    logMessage: string,
    isSport: boolean = false
  ) => {
    if (player.energy < energyCost) {
      playSound('error');
      addLog("Pas assez d'énergie ! Reposez-vous.", 'warning');
      return;
    }

    if (isSport) {
      if (player.injuredUntilDay && player.injuredUntilDay > player.day) {
        playSound('error');
        addLog("Vous êtes blessé ! Impossible de faire du sport.", 'danger');
        return;
      }
      if (player.muscleFatigue) {
        playSound('error');
        addLog("Vos muscles sont tétanisés. Reposez-vous aujourd'hui.", 'danger');
        return;
      }
    }

    if (isSport) {
      const risk = calculateSportInjuryChance();
      const roll = Math.random() * 100;
      
      if (roll < risk) {
        playSound('error');
        addLog(`Aïe ! Vous vous êtes blessé en forçant trop (${Math.round(risk)}% risque).`, 'danger');
        addLog("Repos forcé pour le sport pendant 5 jours.", 'danger');
        setPlayer(prev => ({
          ...prev,
          energy: Math.max(0, prev.energy - energyCost),
          injuredUntilDay: prev.day + 5,
          stats: {
            ...prev.stats,
            wellbeing: Math.max(0, prev.stats.wellbeing - 10)
          }
        }));
        return;
      }
    }

    playSound('success');
    setPlayer(prev => {
      const changes = effects(prev);
      const newStats = { ...prev.stats, ...(changes.stats || {}) };
      (Object.keys(newStats) as Array<keyof typeof INITIAL_STATS>).forEach(k => {
        newStats[k] = Math.max(0, Math.min(100, newStats[k]));
      });

      return {
        ...prev,
        ...changes,
        stats: newStats,
        energy: prev.energy - energyCost,
        actionsPerformedToday: prev.actionsPerformedToday + 1,
        sportActionsToday: isSport ? prev.sportActionsToday + 1 : prev.sportActionsToday
      };
    });

    addLog(logMessage, 'success');
  };

  const endDay = () => {
    playSound('sleep');
    const summary: string[] = [];
    let healthChange = 0;
    let wellbeingChange = 0;
    let socialChange = 0;

    // 1. Food Check
    if (player.ateJunkToday) {
      summary.push("La malbouffe pèse sur votre organisme (-5 Santé).");
      healthChange -= 5;
    } else if (player.ateHealthyToday) {
      summary.push("Manger sainement porte ses fruits (+2 Santé).");
      healthChange += 2;
    } else {
      summary.push("Vous n'avez pas assez mangé aujourd'hui (-5 Bien-être).");
      wellbeingChange -= 5;
    }

    // 2. Addiction Check
    if (player.hasAddiction) {
      summary.push("Votre addiction diminue votre santé (-3 Santé).");
      healthChange -= 3;
      wellbeingChange -= 2;
    }

    // 3. Muscle Fatigue Check
    let nextMuscleFatigue = false;
    if (player.sportActionsToday >= 2) {
      summary.push("Vous avez forcé sur le sport (2 fois/jour). Courbatures garanties demain !");
      nextMuscleFatigue = true;
    } else if (player.sportActionsToday > 0 && player.sportActionsYesterday > 0) {
      summary.push("Deux jours de sport d'affilée... Vos muscles réclament une pause.");
      nextMuscleFatigue = true;
    }

    if (nextMuscleFatigue && !player.muscleFatigue) {
       // Only warn if it wasn't already the case
    } else if (player.muscleFatigue && !nextMuscleFatigue) {
       summary.push("Vos muscles ont récupéré. Prêt pour le sport !");
    }

    // 4. Social Decay
    const newDaysSinceSocial = player.daysSinceLastSocial + 1;
    if (newDaysSinceSocial >= 5) {
      summary.push("L'isolement social vous pèse (-20 Social).");
      socialChange -= 20;
    }

    summary.push("Une bonne nuit de sommeil remet l'énergie à 100.");
    
    // 5. Random Events / Mood (Buffed by Wellbeing)
    const moodRoll = Math.random();
    let newMotivation: PlayerState['motivation'] = 'normal';
    
    // If wellbeing > 60, impossible to have low motivation
    if (player.stats.wellbeing > 60) {
      if (moodRoll > 0.6) {
        newMotivation = 'high';
        summary.push("Grâce à votre bien-être, vous êtes super motivé !");
      } else {
        newMotivation = 'normal';
      }
    } else {
      // Standard rolls
      if (moodRoll < 0.2) {
        newMotivation = 'low';
        summary.push("Vous vous réveillez sans motivation...");
      } else if (moodRoll > 0.8) {
        newMotivation = 'high';
        summary.push("Vous vous réveillez super motivé !");
      }
    }

    // 6. Stat Decay (Entropy)
    if (player.day % 3 === 0) { 
      summary.push("Vos compétences diminuent légèrement par manque de pratique.");
    }

    setPlayer(prev => {
      let stats = { ...prev.stats };
      
      stats.health = Math.max(0, Math.min(100, stats.health + healthChange));
      stats.wellbeing = Math.max(0, Math.min(100, stats.wellbeing + wellbeingChange));
      stats.social = Math.max(0, Math.min(100, stats.social + socialChange));

      // Decay logic
      if (prev.day % 3 === 0) {
         if (prev.stats.sport > 20) stats.sport -= 1;
         if (prev.stats.intelligence > 20) stats.intelligence -= 1;
      }

      return {
        ...prev,
        day: prev.day + 1,
        daysSinceLastSocial: newDaysSinceSocial,
        energy: prev.maxEnergy,
        motivation: newMotivation,
        muscleFatigue: nextMuscleFatigue,
        sportActionsYesterday: prev.sportActionsToday,
        stats,
        actionsPerformedToday: 0,
        sportActionsToday: 0,
        ateHealthyToday: false,
        ateJunkToday: false,
      };
    });

    setSummaryData(summary);
    setShowDaySummary(true);
    addLog("--- FIN DE LA JOURNÉE " + player.day + " ---", 'info');
  };

  const shareGame = () => {
    const text = `J'ai atteint la meilleure version de moi-même en ${player.day} jours sur Level Up! #DailyHeroes`;
    const url = "https://dailyheroes.io";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  // --- Rendering Helpers ---
  
  const getCharacterMood = () => {
    // 1. Injured
    if (player.injuredUntilDay && player.injuredUntilDay > player.day) {
      return (
        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-red-900/20 ring-4 ring-white dark:ring-slate-800 transition-transform hover:scale-105">
          <ShieldAlert size={48} className="text-white drop-shadow-md lg:w-16 lg:h-16" strokeWidth={1.5} />
        </div>
      );
    }
    // 2. Low Wellbeing (< 20)
    if (player.stats.wellbeing < 20) {
      return (
        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-slate-900/20 ring-4 ring-white dark:ring-slate-800 transition-transform hover:scale-105">
          <Skull size={48} className="text-white drop-shadow-md lg:w-16 lg:h-16" strokeWidth={1.5} />
        </div>
      );
    }
    // 3. High Wellbeing (> 70)
    if (player.stats.wellbeing > 70) {
      return (
        <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-orange-900/20 ring-4 ring-white dark:ring-slate-800 transition-transform hover:scale-105">
          <Crown size={48} className="text-white drop-shadow-md lg:w-16 lg:h-16" strokeWidth={1.5} />
        </div>
      );
    }
    // 4. Normal
    return (
      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20 ring-4 ring-white dark:ring-slate-800 transition-transform hover:scale-105">
        <Gamepad2 size={48} className="text-white drop-shadow-md lg:w-16 lg:h-16" strokeWidth={1.5} />
      </div>
    );
  };

  const MobileStat = ({ icon: Icon, value, colorClass }: any) => {
    const textClass = colorClass.replace('bg-', 'text-');
    return (
      <div className="flex flex-col items-center gap-1.5 flex-1">
        <div className={`p-1.5 rounded-full bg-slate-100 dark:bg-slate-800`}>
          <Icon size={14} className={textClass} strokeWidth={2.5} />
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
           <div className={`h-full ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      </div>
    );
  };

  const Header = () => (
    <header className="w-full max-w-7xl mx-auto p-4 flex justify-between items-center z-40 relative shrink-0">
       <div className="flex items-center gap-3">
         <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-orange-200 dark:shadow-none transform transition-transform hover:scale-110">
           <Activity size={20} strokeWidth={3} />
         </div>
         <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">LEVEL UP</span>
       </div>
       <div className="flex items-center gap-2">
         <button 
          onClick={toggleMute}
          className={`p-2.5 rounded-xl border shadow-sm hover:shadow-md transition-all active:scale-95 ${isMuted ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 text-primary border-slate-200 dark:border-slate-700'}`}
          title={isMuted ? "Activer le son" : "Couper le son"}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
         <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-yellow-400 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95"
          title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
       </div>
    </header>
  );

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col transition-colors duration-300">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
            <div className="flex justify-center mb-6 text-primary">
              <Activity size={72} className="drop-shadow-lg" />
            </div>
            <h1 className="text-5xl font-black text-center text-slate-900 dark:text-white mb-2 tracking-tighter">LEVEL UP</h1>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 font-medium">Incarnez la meilleure version de vous-même.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleStartGame(formData.get('name') as string || 'Joueur');
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Comment vous appelez-vous ?</label>
                <input name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder-slate-400 font-medium" placeholder="Ex: Alex" />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl transition-all mt-6 shadow-lg shadow-orange-200 dark:shadow-none hover:transform hover:scale-[1.02]">
                COMMENCER L'AVENTURE
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans flex flex-col transition-colors duration-300 relative pb-32 lg:pb-6">
      <Header />
      
      {/* --- Victory Modal --- */}
      {player.gameWon && (
        <Modal title="FÉLICITATIONS !" showConfetti>
           <div className="text-center">
             <div className="flex justify-center mb-4 text-yellow-500 animate-bounce-slow">
               <Trophy size={80} />
             </div>
             <p className="text-lg text-slate-600 dark:text-slate-300 mb-2">Vous êtes devenu la meilleure version de vous-même.</p>
             <p className="text-3xl font-black text-primary mb-8">Objectif atteint en {player.day} jours !</p>
             
             <div className="flex gap-3 mb-6">
                <button onClick={shareGame} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]">
                  <Share2 size={18} /> Partager
                </button>
             </div>

             <a 
               href="https://dailyheroes.io" 
               target="_blank" 
               rel="noreferrer"
               className="block w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-xl shadow-orange-200 dark:shadow-none transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
             >
                <span>Appliquer dans la vraie vie</span>
                <ExternalLink size={18} />
             </a>
             <p className="text-xs text-slate-400 mt-4">Découvrez DailyHeroes.io</p>
           </div>
        </Modal>
      )}

      {/* --- Day Summary Modal --- */}
      {showDaySummary && !player.gameWon && (
        <Modal title={`Bilan du jour ${player.day - 1}`}>
          <div className="space-y-3 mb-8">
            {summaryData.map((s, i) => (
              <p key={i} className="text-slate-700 dark:text-slate-300 flex items-start gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="mt-1.5 w-2 h-2 bg-primary rounded-full shrink-0 shadow-sm shadow-primary"></span>
                {s}
              </p>
            ))}
          </div>
          <button 
            onClick={() => setShowDaySummary(false)}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 dark:shadow-none transition-transform hover:scale-[1.02]"
          >
            Se réveiller (Jour {player.day})
          </button>
        </Modal>
      )}

      <div className="flex-1 w-full p-2 md:p-6 flex justify-center">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* --- LEFT COLUMN: Status & Character --- */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Avatar Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center relative overflow-hidden shadow-sm transition-colors">
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-400 to-pink-500"></div>
              <div className="mt-6 mb-4">
                {getCharacterMood()}
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{player.name}</h2>
              
              <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex justify-between items-center mb-4 mt-6 border border-slate-100 dark:border-slate-700">
                <span className="text-primary font-bold flex items-center gap-2"><Zap size={20}/> Énergie</span>
                <span className="font-mono text-2xl font-bold text-slate-700 dark:text-slate-200">{player.energy}/{player.maxEnergy}</span>
              </div>

              {/* Active Effects */}
              <div className="w-full space-y-2.5">
                {player.hasAddiction && (
                  <div className="text-xs bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold">
                    <Cigarette size={16} /> Addiction (Santé -3/jour)
                  </div>
                )}
                 {player.injuredUntilDay && player.injuredUntilDay > player.day && (
                  <div className="text-xs bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold">
                    <AlertTriangle size={16} /> Blessé ({player.injuredUntilDay - player.day}j restants)
                  </div>
                )}
                 {player.muscleFatigue && (
                  <div className="text-xs bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold">
                    <Dumbbell size={16} /> Fatigue Musculaire (Repos requis)
                  </div>
                )}
                 {player.motivation === 'low' && (
                  <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold">
                    <Frown size={16} /> Motivation faible
                  </div>
                )}
                 {player.daysSinceLastSocial >= 3 && (
                  <div className="text-xs bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-2.5 rounded-xl flex items-center gap-2 font-bold">
                    <Users size={16} /> Besoin social ({5 - player.daysSinceLastSocial}j avant déprime)
                  </div>
                )}
              </div>
            </div>

            {/* Objective Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Trophy size={14} /> Objectif Actuel
              </h3>
              <p className="text-xl font-bold text-slate-800 dark:text-white leading-tight mb-4">
                {currentObjective.text}
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/2 animate-pulse rounded-full"></div>
              </div>
            </div>

             {/* Stats (Desktop Only) */}
             <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Caractéristiques</h3>
              <StatGauge label="Santé" value={player.stats.health} color="bg-red-500" icon={Heart} />
              <StatGauge label="Sport" value={player.stats.sport} color="bg-orange-500" icon={Dumbbell} />
              <StatGauge label="Intelligence" value={player.stats.intelligence} color="bg-blue-500" icon={Brain} />
              <StatGauge label="Bien-être" value={player.stats.wellbeing} color="bg-teal-500" icon={Smile} />
              <StatGauge label="Social" value={player.stats.social} color="bg-purple-500" icon={Users} />
            </div>

          </div>

          {/* --- MIDDLE/RIGHT: Actions --- */}
          <div className="lg:col-span-6 flex flex-col gap-4">
             {/* Section Title */}
             <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Activity size={24} /> 
                  </div>
                  Actions
                </h2>
                <span className="text-sm text-slate-400 font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">Jour {player.day}</span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* --- SPORT --- */}
                <div className="md:col-span-2 text-xs font-bold text-slate-400 uppercase mt-2 pl-1 tracking-widest">Sport & Physique</div>
                
                <ActionCard 
                  label="Cardio Léger"
                  description="Bon pour le coeur et l'esprit."
                  cost={20}
                  icon={PersonStanding}
                  color="text-orange-500"
                  disabledReason={player.injuredUntilDay && player.injuredUntilDay > player.day ? "Blessure en cours" : player.muscleFatigue ? "Fatigue musculaire" : false}
                  disabled={!!((player.injuredUntilDay && player.injuredUntilDay > player.day) || player.muscleFatigue)}
                  onClick={() => performAction(
                    "Cardio", 20, 
                    (p) => ({ stats: { ...p.stats, sport: p.stats.sport + 10, wellbeing: p.stats.wellbeing + 5 } }),
                    "Séance de cardio terminée. Vous vous sentez vivifié !",
                    true
                  )}
                />

                <ActionCard 
                  label="Musculation Intense"
                  description="Développe la force brute."
                  cost={30}
                  icon={Dumbbell}
                  color="text-red-500"
                  disabledReason={player.injuredUntilDay && player.injuredUntilDay > player.day ? "Blessure en cours" : player.muscleFatigue ? "Fatigue musculaire" : false}
                  disabled={!!((player.injuredUntilDay && player.injuredUntilDay > player.day) || player.muscleFatigue)}
                  onClick={() => performAction(
                    "Muscu", 30, 
                    (p) => ({ stats: { ...p.stats, sport: p.stats.sport + 5 } }),
                    "Grosse séance de muscu. Les muscles tirent !",
                    true
                  )}
                />

                {/* --- INTELLIGENCE --- */}
                <div className="md:col-span-2 text-xs font-bold text-slate-400 uppercase mt-2 pl-1 tracking-widest">Esprit & Travail</div>

                <ActionCard 
                  label="Lire un livre"
                  description="Apprendre de nouvelles choses."
                  cost={15}
                  icon={BookOpen}
                  color="text-blue-500"
                  disabledReason={player.motivation === 'low' ? "Trop déprimé pour lire..." : false}
                  disabled={player.motivation === 'low'}
                  onClick={() => performAction(
                    "Lecture", 15, 
                    (p) => ({ stats: { ...p.stats, intelligence: p.stats.intelligence + 8 } }),
                    "Vous avez lu un chapitre passionnant.",
                    false
                  )}
                />

                <ActionCard 
                  label="Travailler"
                  description="Il faut bien gagner sa vie."
                  cost={40}
                  icon={Briefcase}
                  color="text-slate-500 dark:text-slate-400"
                  onClick={() => performAction(
                    "Travail", 40, 
                    (p) => ({ stats: { ...p.stats, intelligence: p.stats.intelligence + 2 }, money: p.money + 50 }),
                    "Journée de travail terminée.",
                    false
                  )}
                />

                {/* --- WELLBEING & HEALTH --- */}
                <div className="md:col-span-2 text-xs font-bold text-slate-400 uppercase mt-2 pl-1 tracking-widest">Santé & Bien-être</div>

                <ActionCard 
                  label="Méditer"
                  description="Calmer son esprit."
                  cost={10}
                  icon={Smile}
                  color="text-teal-500"
                  onClick={() => performAction(
                    "Méditation", 10, 
                    (p) => ({ stats: { ...p.stats, wellbeing: p.stats.wellbeing + 10 } }),
                    "Vous vous sentez plus zen.",
                    false
                  )}
                />

                <ActionCard 
                  label="Repas Sain"
                  description="Légumes et protéines."
                  cost={10}
                  icon={Apple}
                  color="text-green-500"
                  disabledReason={player.ateJunkToday ? "Vous avez déjà mangé gras..." : player.ateHealthyToday ? "Déjà mangé." : false}
                  disabled={player.ateJunkToday || player.ateHealthyToday}
                  onClick={() => performAction(
                    "Manger Sain", 10, 
                    (p) => ({ ateHealthyToday: true, stats: { ...p.stats, health: p.stats.health + 2 } }),
                    "Un repas équilibré, bravo !",
                    false
                  )}
                />
                
                <ActionCard 
                  label="Fast Food"
                  description="Rapide, bon, mais gras."
                  cost={5}
                  icon={Pizza}
                  color="text-yellow-600"
                  disabledReason={player.ateHealthyToday ? "Déjà mangé." : player.ateJunkToday ? "L'estomac va exploser..." : false}
                  disabled={player.ateHealthyToday || player.ateJunkToday}
                  onClick={() => performAction(
                    "Junk Food", 5, 
                    (p) => ({ ateJunkToday: true, stats: { ...p.stats, wellbeing: p.stats.wellbeing + 5 } }),
                    "C'était bon, mais vous culpabilisez un peu.",
                    false
                  )}
                />

                {/* --- SPECIAL --- */}
                <div className="md:col-span-2 text-xs font-bold text-slate-400 uppercase mt-2 pl-1 tracking-widest">Social & Spécial</div>

                <ActionCard 
                  label="Voir des amis"
                  description="Discuter et rire."
                  cost={25}
                  icon={Users}
                  color="text-purple-500"
                  onClick={() => performAction(
                    "Social", 25, 
                    (p) => ({ daysSinceLastSocial: 0, stats: { ...p.stats, social: p.stats.social + 15, wellbeing: p.stats.wellbeing + 5 } }),
                    "Un bon moment passé entre amis. Votre jauge sociale est rechargée.",
                    false
                  )}
                />

                {player.hasAddiction && (
                   <ActionCard 
                   label={`Arrêter l'addiction (${player.addictionRecoveryProgress}/3)`}
                   description="Effort de sevrage."
                   cost={50}
                   icon={AlertTriangle}
                   color="text-red-500"
                   disabledReason={player.stats.sport < 30 && player.stats.wellbeing < 30 ? "Il faut + de Sport ou Bien-être (>30%)" : false}
                   disabled={player.stats.sport < 30 && player.stats.wellbeing < 30}
                   onClick={() => performAction(
                     "Sevrage", 50, 
                     (p) => {
                        const newProgress = p.addictionRecoveryProgress + 1;
                        const isCured = newProgress >= 3;
                        return { 
                          addictionRecoveryProgress: newProgress,
                          hasAddiction: !isCured, 
                          stats: { ...p.stats, wellbeing: p.stats.wellbeing - 15, health: p.stats.health + 5 } 
                        };
                     },
                     player.addictionRecoveryProgress >= 2 ? "LIBÉRATION ! Vous êtes sevré !" : "Une étape de plus vers la liberté. Tenez bon !",
                     false
                   )}
                 />
                )}

             </div>

             {/* --- SLEEP BUTTON (Desktop) --- */}
             <div className="hidden lg:flex mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
               <button 
                onClick={endDay}
                className="w-full group bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-800 dark:border-slate-600 text-white p-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl dark:shadow-none hover:-translate-y-1"
               >
                  <Moon size={24} className="group-hover:animate-pulse text-primary" />
                  <span className="font-black text-xl tracking-tight">Dormir (Fin du jour)</span>
                  <ArrowRight size={20} className="opacity-50 group-hover:translate-x-1 transition-transform" />
               </button>
             </div>
          </div>

          {/* --- RIGHT/BOTTOM: History Log --- */}
          <div className="lg:col-span-3 h-full min-h-[300px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Journal de bord</span>
            </div>
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 max-h-[500px] lg:max-h-[calc(100vh-200px)]">
               {logs.length === 0 && (
                 <p className="text-slate-400 text-sm text-center italic mt-10">Le journal est vide.</p>
               )}
               {logs.map(log => (
                 <LogEntry key={log.id} text={log.text} type={log.type} day={log.day} />
               ))}
            </div>
          </div>

        </div>
      </div>

      {/* --- MOBILE FLOATING HUD --- */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] p-3 safe-area-pb">
         <div className="flex justify-between items-end gap-3 mb-3 px-1">
            <MobileStat icon={Heart} value={player.stats.health} colorClass="bg-red-500" />
            <MobileStat icon={Dumbbell} value={player.stats.sport} colorClass="bg-orange-500" />
            <MobileStat icon={Brain} value={player.stats.intelligence} colorClass="bg-blue-500" />
            <MobileStat icon={Smile} value={player.stats.wellbeing} colorClass="bg-teal-500" />
            <MobileStat icon={Users} value={player.stats.social} colorClass="bg-purple-500" />
         </div>
         <button 
           onClick={endDay}
           className="w-full bg-slate-900 dark:bg-slate-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
         >
           <Moon size={20} className="text-primary" />
           <span>Dormir</span>
         </button>
      </div>

    </div>
  );
}