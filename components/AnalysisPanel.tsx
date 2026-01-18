import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GameStats } from '../types';
import { generatePsychologicalReport } from '../services/geminiService';

interface AnalysisPanelProps {
  stats: GameStats;
  onRestart: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ stats, onRestart }) => {
  const [report, setReport] = useState<string>('Analyzing neural latency patterns...');

  useEffect(() => {
    let isMounted = true;
    generatePsychologicalReport(stats).then(text => {
      if (isMounted) setReport(text);
    });
    return () => { isMounted = false; };
  }, [stats]);

  // Transform data for charts
  const rtData = stats.biasData.map(d => ({
    name: d.category,
    'Threat': d.avgReactionTimeThreat,
    'Safe': d.avgReactionTimeNonThreat,
  }));

  const errorData = stats.biasData.map(d => ({
    name: d.category,
    'False Alarm': (d.errorRateFalseAlarm * 100).toFixed(1),
  }));

  return (
    <div className="ink-container w-full animate-fade-in flex flex-col items-center">
      
      <header className="w-full text-center mb-8 border-b-2 border-black pb-4">
        <h2 className="title-display text-4xl md:text-6xl mb-2">Assessment<br/>Complete</h2>
        <p className="font-mono text-sm tracking-widest text-[var(--lead-light)]">IMPLICIT BIAS DIAGNOSTIC REPORT v4.0.1</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        
        {/* Main Stats */}
        <div className="panel-paper p-6">
          <h3 className="font-display font-black text-2xl uppercase mb-6 border-b border-black/10 pb-2">Performance Metrics</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
             <div className="p-4 border border-black/20 bg-white/50">
                <p className="font-mono text-xs text-[var(--lead-light)] uppercase mb-1">Accuracy</p>
                <p className="font-display font-black text-3xl">{(stats.accuracy * 100).toFixed(1)}%</p>
             </div>
             <div className="p-4 border border-black/20 bg-white/50">
                <p className="font-mono text-xs text-[var(--lead-light)] uppercase mb-1">Avg Latency</p>
                <p className="font-display font-black text-3xl">{stats.avgReactionTime.toFixed(0)}<span className="text-sm">ms</span></p>
             </div>
             <div className="p-4 border border-black/20 bg-white/50">
                <p className="font-mono text-xs text-[var(--lead-light)] uppercase mb-1">Total N</p>
                <p className="font-display font-black text-3xl">{stats.totalTrials}</p>
             </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="panel-paper p-6 lg:row-span-2 overflow-y-auto max-h-[600px]">
          <h3 className="font-display font-black text-xl uppercase mb-4 flex items-center gap-2">
            <span>///</span> Neural Analysis
          </h3>
          <div className="font-mono text-sm leading-relaxed text-[var(--lead-heavy)] whitespace-pre-wrap">
            {report}
          </div>
        </div>

        {/* Reaction Time Chart */}
        <div className="panel-paper p-6 h-[400px]">
          <h3 className="font-display font-bold text-lg uppercase mb-4">Reaction Latency (ms)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rtData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#000000" opacity={0.1} />
              <XAxis dataKey="name" stroke="#000000" fontFamily="JetBrains Mono" fontSize={10} />
              <YAxis stroke="#000000" fontFamily="JetBrains Mono" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000', borderRadius: 0, fontFamily: 'JetBrains Mono' }}
              />
              <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '10px' }} />
              {/* Monochrome Bars */}
              <Bar dataKey="Threat" fill="#1a1a1a" name="Armed (Threat)" />
              <Bar dataKey="Safe" fill="#a3a3a3" name="Unarmed (Safe)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Error Rate Chart */}
         <div className="panel-paper p-6 h-[400px]">
          <h3 className="font-display font-bold text-lg uppercase mb-4">False Alarm Rate (%)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={errorData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#000000" opacity={0.1} />
              <XAxis dataKey="name" stroke="#000000" fontFamily="JetBrains Mono" fontSize={10} />
              <YAxis stroke="#000000" unit="%" fontFamily="JetBrains Mono" fontSize={10} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #000', borderRadius: 0, fontFamily: 'JetBrains Mono' }}
              />
              {/* Pattern fill for error bars would be cool, but solid for now */}
              <Bar dataKey="False Alarm" fill="#525252" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-12 w-full max-w-md">
        <button
            onClick={onRestart}
            className="btn-brutalist"
        >
            Reset Simulation
        </button>
      </div>
      
      <p className="font-mono text-[10px] text-[var(--lead-light)] mt-8 text-center max-w-2xl opacity-60">
        DISCLAIMER: SIMULATION DATA FOR EDUCATIONAL PURPOSES ONLY. NOT A CLINICAL DIAGNOSIS.
      </p>
    </div>
  );
};