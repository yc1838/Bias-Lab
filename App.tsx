import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CharacterCard } from './components/CharacterCard';
import { AnalysisPanel } from './components/AnalysisPanel';
import { generateGameAssets } from './services/assetService';
import { 
  GamePhase, 
  TrialRecord, 
  CharacterAttributes, 
  Race,
  Attire, 
  GameAsset,
  GameStats,
  BiasMetric
} from './types';
import { 
  GAME_DURATION_MS, 
  SPAWN_INTERVAL_MS, 
  VISIBILITY_DURATION_MS, 
  RACES, 
  GENDERS, 
  ATTIRES, 
  THREAT_OBJECTS, 
  NON_THREAT_OBJECTS 
} from './constants';

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Loading);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS / 1000);
  
  // Asset Management
  const [loadingProgress, setLoadingProgress] = useState<{current: number, total: number, msg: string}>({ current: 0, total: 1, msg: 'Initializing...' });
  const [assets, setAssets] = useState<GameAsset[]>([]);

  // Grid state: 3x3 grid = 9 slots. -1 means empty, other is index of active trial
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [currentCharacter, setCurrentCharacter] = useState<CharacterAttributes | null>(null);
  const [currentAssetUrl, setCurrentAssetUrl] = useState<string | null>(null);
  
  // Data recording
  const trialsRef = useRef<TrialRecord[]>([]);
  const currentTrialIdRef = useRef<string | null>(null);
  const spawnTimeRef = useRef<number>(0);
  
  // Deck State
  const deckRef = useRef<GameAsset[]>([]);

  // --- Initialization ---

  useEffect(() => {
    // Auto-start asset generation
    const initAssets = async () => {
        try {
            const generatedAssets = await generateGameAssets((current, total, msg) => {
                setLoadingProgress({ current, total, msg });
            });
            setAssets(generatedAssets);
            setPhase(GamePhase.Intro);
        } catch (e) {
            console.error("Failed to generate assets", e);
            // Fallback to Intro (will use SVG mode if no assets found, handled in CharacterCard)
            setPhase(GamePhase.Intro); 
        }
    };
    initAssets();
  }, []);


  // --- Deck Generation ---
  
  const generateBalancedDeck = () => {
    // If we have generated assets, build a deck using them
    // Requirement: "Every race have at least 5 data points in both having weapon and not having weapon"
    // Total = 4 Races * 2 Conditions * 5 Samples = 40 cards.
    
    const deck: GameAsset[] = [];
    const SAMPLES_PER_CONDITION = 5;

    // We assume 'assets' contains at least some variations for each race/condition.
    // If assets are empty (generation failed), we need a fallback logic (handled by creating dummy assets).

    if (assets.length > 0) {
        RACES.forEach(race => {
            // Find assets for this race + threat
            const threatAssets = assets.filter(a => a.attributes.race === race && a.attributes.isThreat);
            const safeAssets = assets.filter(a => a.attributes.race === race && !a.attributes.isThreat);

            // Repeat assets to fill the quota
            for (let i = 0; i < SAMPLES_PER_CONDITION; i++) {
                if (threatAssets.length > 0) {
                    deck.push(threatAssets[i % threatAssets.length]);
                }
                if (safeAssets.length > 0) {
                    deck.push(safeAssets[i % safeAssets.length]);
                }
            }
        });
    } else {
        // Fallback: Generate "Virtual" assets (no image URL) for SVG mode
        RACES.forEach(race => {
             for (let i = 0; i < SAMPLES_PER_CONDITION; i++) {
                 deck.push(createRandomVirtualAsset(race, true));
                 deck.push(createRandomVirtualAsset(race, false));
             }
        });
    }

    return shuffle(deck);
  };

  const createRandomVirtualAsset = (race: Race, isThreat: boolean): GameAsset => {
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
    const attire = ATTIRES[Math.floor(Math.random() * ATTIRES.length)];
    const objectList = isThreat ? THREAT_OBJECTS : NON_THREAT_OBJECTS;
    const object = objectList[Math.floor(Math.random() * objectList.length)];
    return {
        id: crypto.randomUUID(),
        attributes: { race, gender, attire, object, isThreat },
        imageUrl: '' // Empty string signals CharacterCard to use SVG
    };
  };

  const getNextCard = (): GameAsset => {
    if (deckRef.current.length === 0) {
        // If deck runs out (game goes long), generate a mini balanced batch or random
        const race = RACES[Math.floor(Math.random() * RACES.length)];
        const isThreat = Math.random() > 0.5;
        return createRandomVirtualAsset(race, isThreat);
    }
    return deckRef.current.pop()!;
  };

  const spawnTarget = useCallback(() => {
    // If there was an active trial that wasn't acted upon (Missed), record it
    if (currentTrialIdRef.current) {
        const existingRecordIndex = trialsRef.current.findIndex(t => t.id === currentTrialIdRef.current);
        if (existingRecordIndex !== -1 && trialsRef.current[existingRecordIndex].outcome === 'miss') {
            // It was already initialized as a 'miss' (or wait state), confirm it
        }
    }

    const card = getNextCard();
    const newSlot = Math.floor(Math.random() * 9); // 3x3 grid
    const trialId = crypto.randomUUID();
    
    setCurrentCharacter(card.attributes);
    setCurrentAssetUrl(card.imageUrl);
    setActiveSlot(newSlot);
    currentTrialIdRef.current = trialId;
    spawnTimeRef.current = performance.now();

    // Init record (assume miss until interaction)
    trialsRef.current.push({
      id: trialId,
      timestamp: Date.now(),
      attributes: card.attributes,
      spawnTime: spawnTimeRef.current,
      reactionTime: null,
      action: 'ignore',
      outcome: card.attributes.isThreat ? 'miss' : 'correct_rejection' 
    });

  }, []);

  const handleInteraction = useCallback((action: 'shoot' | 'ignore', slotIndex: number) => {
    // If clicking empty slot or already handled
    if (activeSlot !== slotIndex || !currentCharacter || !currentTrialIdRef.current) return;

    const now = performance.now();
    const rt = now - spawnTimeRef.current;
    
    // Find the record
    const recordIndex = trialsRef.current.findIndex(t => t.id === currentTrialIdRef.current);
    if (recordIndex === -1) return;

    const isThreat = currentCharacter.isThreat;
    let outcome: TrialRecord['outcome'];

    if (action === 'shoot') {
        if (isThreat) {
            outcome = 'correct_hit';
            setScore(s => s + 100);
        } else {
            outcome = 'false_alarm';
            setScore(s => s - 50);
        }
    } else {
        return; 
    }

    // Update record
    trialsRef.current[recordIndex] = {
        ...trialsRef.current[recordIndex],
        reactionTime: rt,
        action: action,
        outcome: outcome
    };

    // Immediate cleanup visually
    setActiveSlot(null);
    setCurrentCharacter(null);
    setCurrentAssetUrl(null);
    currentTrialIdRef.current = null;
  }, [activeSlot, currentCharacter]);

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== GamePhase.Playing) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (activeSlot !== null) {
          handleInteraction('shoot', activeSlot);
        } else {
          // Penalize spamming spacebar when no target
          setScore(s => s - 20);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, activeSlot, handleInteraction]);

  // --- Game Loops ---

  // Timer
  useEffect(() => {
    if (phase !== GamePhase.Playing) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
            setPhase(GamePhase.Results);
            return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // Spawning Loop
  useEffect(() => {
    if (phase !== GamePhase.Playing) return;

    const spawnLoop = setInterval(() => {
       if (activeSlot === null) {
           spawnTarget();
       }
    }, SPAWN_INTERVAL_MS);

    // Auto-clear active target if it stays too long (Visiblity Duration)
    const clearLoop = setInterval(() => {
        if (activeSlot !== null && currentTrialIdRef.current) {
            const now = performance.now();
            if (now - spawnTimeRef.current > VISIBILITY_DURATION_MS) {
                // Time's up for this target
                setActiveSlot(null);
                setCurrentCharacter(null);
                setCurrentAssetUrl(null);
                currentTrialIdRef.current = null;
            }
        }
    }, 100);

    return () => {
        clearInterval(spawnLoop);
        clearInterval(clearLoop);
    };
  }, [phase, activeSlot, spawnTarget]);


  // --- Analysis Logic ---
  
  const calculateStats = (): GameStats => {
    const records = trialsRef.current;
    const totalTrials = records.length;
    
    // Filter for valid interactions or clear misses
    const correctCount = records.filter(r => r.outcome === 'correct_hit' || r.outcome === 'correct_rejection').length;
    const accuracy = totalTrials > 0 ? correctCount / totalTrials : 0;

    const correctHits = records.filter(r => r.outcome === 'correct_hit');
    const avgReactionTime = correctHits.length > 0 
        ? correctHits.reduce((acc, r) => acc + (r.reactionTime || 0), 0) / correctHits.length
        : 0;

    // Bias Metrics aggregation
    const categories: string[] = [
        ...(Object.values(Race) as string[]),
        ...(Object.values(Attire) as string[])
    ];

    const biasData: BiasMetric[] = categories.map(cat => {
        // Filter records belonging to this category
        const catRecords = records.filter(r => 
            r.attributes.race === cat || r.attributes.attire === cat
        );

        const threats = catRecords.filter(r => r.attributes.isThreat);
        const nonThreats = catRecords.filter(r => !r.attributes.isThreat);
        
        const hitThreats = threats.filter(r => r.outcome === 'correct_hit');
        // const correctSafe = nonThreats.filter(r => r.outcome === 'correct_rejection');

        const avgRTThreat = hitThreats.length > 0
            ? hitThreats.reduce((a, b) => a + (b.reactionTime || 0), 0) / hitThreats.length
            : 0;

        const falseAlarms = nonThreats.filter(r => r.outcome === 'false_alarm');
        const avgRTSafe = falseAlarms.length > 0
             ? falseAlarms.reduce((a, b) => a + (b.reactionTime || 0), 0) / falseAlarms.length
             : 0;
        
        const errorRateFalseAlarm = nonThreats.length > 0
            ? falseAlarms.length / nonThreats.length
            : 0;

        const misses = threats.filter(r => r.outcome === 'miss');
        const errorRateMiss = threats.length > 0
            ? misses.length / threats.length
            : 0;

        return {
            category: cat,
            avgReactionTimeThreat: avgRTThreat,
            avgReactionTimeNonThreat: avgRTSafe, // This implies "Speed of error"
            errorRateFalseAlarm,
            errorRateMiss
        };
    });

    return {
        totalTrials,
        accuracy,
        avgReactionTime,
        biasData
    };
  };

  // --- Render Sections (Visual Refactor) ---

  const renderBranding = () => (
    <section className="flex flex-col justify-between h-full">
        <div className="relative">
            <h1 className="title-display">Bias<br/>Lab</h1>
            <span className="font-mono text-xs tracking-[0.3em] uppercase block mt-4 opacity-70">Cognitive Shooter Paradigm v.4.0.1</span>
        </div>

        {(phase === GamePhase.Loading || phase === GamePhase.Intro) && (
             <div className="mt-16 border-t-2 border-[var(--lead-heavy)] pt-6">
                <div className="font-mono text-[10px] uppercase mb-2 flex justify-between">
                    <span>{phase === GamePhase.Loading ? 'GENERATING ASSETS' : 'SYSTEM READY'}</span>
                    <span>{phase === GamePhase.Loading ? Math.floor((loadingProgress.current / loadingProgress.total) * 100) : 100}%</span>
                </div>
                {/* Progress Bar Container */}
                <div className="h-10 bg-black/5 border border-[var(--lead-light)] relative overflow-hidden">
                    {/* Progress Bar Fill */}
                    <div 
                        className="absolute top-0 left-0 h-full bg-[var(--lead-heavy)] transition-all duration-500 ease-out"
                        style={{ width: phase === GamePhase.Loading ? `${(loadingProgress.current / loadingProgress.total) * 100}%` : '100%' }}
                    ></div>
                </div>
                <p className="font-mono text-[9px] mt-2 opacity-50 uppercase">
                    {phase === GamePhase.Loading ? `NEURAL MAPPING... ${loadingProgress.msg}` : 'ASSETS CACHED. WAITING FOR INPUT.'}
                </p>
            </div>
        )}
    </section>
  );

  const renderIntroInstructions = () => (
     <section className="panel-paper p-12 flex flex-col justify-between">
        <div>
            {/* Step 1 */}
            <div className="mb-10 grid grid-cols-[40px_1fr] gap-4">
                <div className="font-mono font-bold border border-[var(--ink)] h-[30px] flex items-center justify-center text-sm">01</div>
                <div>
                    <h3 className="font-display uppercase text-xl mb-2 tracking-tighter">React</h3>
                    <p className="font-mono text-xs leading-relaxed text-[var(--lead-light)]">Targets manifest in a 3x3 grid. Decisions must be made in &lt;600ms. Hesitation is failure.</p>
                </div>
            </div>

             {/* Step 2 */}
             <div className="mb-10 grid grid-cols-[40px_1fr] gap-4">
                <div className="font-mono font-bold border border-[var(--ink)] h-[30px] flex items-center justify-center text-sm">02</div>
                <div>
                    <h3 className="font-display uppercase text-xl mb-2 tracking-tighter">Controls</h3>
                    <p className="font-mono text-xs leading-relaxed text-[var(--lead-light)]">
                        Press <span className="inline-block px-1 bg-[var(--lead-heavy)] text-white font-bold mx-1">SPACEBAR</span> immediately if target is armed with a <strong className="text-[var(--ink)]">GUN</strong>.
                    </p>
                    <p className="font-mono text-xs leading-relaxed text-[var(--lead-light)] mt-2">
                         Do <strong className="text-[var(--ink)]">NOTHING</strong> if holding: Phone, Wallet, or Camera.
                    </p>
                </div>
            </div>

            {/* Step 3 */}
            <div className="mb-8 grid grid-cols-[40px_1fr] gap-4">
                <div className="font-mono font-bold border border-[var(--ink)] h-[30px] flex items-center justify-center text-sm">03</div>
                <div>
                    <h3 className="font-display uppercase text-xl mb-2 tracking-tighter">Review</h3>
                    <p className="font-mono text-xs leading-relaxed text-[var(--lead-light)]">Post-simulation neural analysis reveals implicit variance across demographic vectors.</p>
                </div>
            </div>
        </div>

        <div className="mt-8">
             <button 
                disabled={phase === GamePhase.Loading}
                onClick={() => {
                    setScore(0);
                    setTimeLeft(GAME_DURATION_MS / 1000);
                    trialsRef.current = [];
                    deckRef.current = generateBalancedDeck(); // Generate deck
                    setPhase(GamePhase.Playing);
                }}
                className="btn-brutalist"
            >
                {phase === GamePhase.Loading ? 'CALIBRATING...' : 'INITIALIZE LAB'}
            </button>
        </div>
     </section>
  );

  const renderPlaying = () => (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl">
          {/* HUD */}
          <div className="w-full flex justify-between items-end mb-8 border-b-2 border-black pb-2">
             <div className="font-mono text-xs">
                <span className="block opacity-50 mb-1">TIMER</span>
                <span className="text-4xl font-bold block">{timeLeft.toString().padStart(2, '0')}s</span>
             </div>
             <div className="font-mono text-xs text-right">
                <span className="block opacity-50 mb-1">SCORE</span>
                <span className="text-4xl font-bold block">{score}</span>
             </div>
          </div>

          {/* Grid */}
          <div className="w-full aspect-square grid grid-cols-3 gap-2 p-2 border-2 border-[var(--lead-heavy)] bg-white/20 backdrop-blur-sm">
             {Array.from({ length: 9 }).map((_, i) => (
                <div 
                    key={i} 
                    className={`
                        relative border border-[var(--lead-light)] bg-transparent overflow-hidden flex items-end justify-center
                        ${activeSlot === i ? 'bg-white/80' : 'hover:bg-black/5'}
                        transition-colors duration-100
                    `}
                    onClick={() => {
                        // Miss click penalty if empty
                        if (activeSlot !== i) setScore(s => s - 20);
                    }}
                >
                    {activeSlot === i && currentCharacter && (
                        <CharacterCard 
                            attributes={currentCharacter} 
                            isVisible={true} 
                            imageUrl={currentAssetUrl || undefined}
                            onClick={() => handleInteraction('shoot', i)}
                        />
                    )}
                    
                    {/* Grid Markers */}
                    <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-black opacity-20"></div>
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-black opacity-20"></div>
                </div>
             ))}
          </div>

          {/* Instruction Hint */}
          <div className="mt-8 text-center font-mono text-[10px] text-[var(--lead-light)] opacity-60">
             SPACEBAR TO SHOOT  ///  IGNORE HARMLESS TARGETS
          </div>
      </div>
  );

  return (
    <main className={`ink-container ${phase === GamePhase.Loading || phase === GamePhase.Intro ? 'split' : ''}`}>
        
        {/* Phase Controller */}
        
        {(phase === GamePhase.Loading || phase === GamePhase.Intro) && (
            <>
                {renderBranding()}
                {renderIntroInstructions()}
            </>
        )}

        {phase === GamePhase.Playing && (
            <div className="col-span-2 flex justify-center">
                {renderPlaying()}
            </div>
        )}

        {phase === GamePhase.Results && (
             <div className="col-span-2 flex justify-center">
                <AnalysisPanel 
                    stats={calculateStats()} 
                    onRestart={() => setPhase(GamePhase.Intro)}
                />
            </div>
        )}

    </main>
  );
};

export default App;