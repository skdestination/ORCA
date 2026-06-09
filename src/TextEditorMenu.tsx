import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Settings, Activity, Plus, Check } from 'lucide-react';

export function TextEditorMenu({ 
  clip,
  updateClip,
  setToastMessage
}: {
  clip: any;
  updateClip: (updates: any) => void;
  setToastMessage: (msg: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<'preset' | 'font' | 'style' | 'animation'>('style');
  const [activeSubTab, setActiveSubTab] = useState<'text' | 'stroke' | 'glow' | 'spacing' | 'shadow'>('text');
  const [customFonts, setCustomFonts] = useState<{name: string, url: string}[]>([]);
  const fontInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_studio_custom_fonts');
      if (saved) setCustomFonts(JSON.parse(saved));
    } catch(e){}
  }, []);

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newFontName = file.name.split('.')[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      const newFont = new FontFace(newFontName, `url(${b64})`);
      newFont.load().then((loadedFace) => {
        document.fonts.add(loadedFace);
        const newFonts = [...customFonts, { name: newFontName, url: b64 }];
        setCustomFonts(newFonts);
        try {
          localStorage.setItem('ai_studio_custom_fonts', JSON.stringify(newFonts));
        } catch (err) {
          console.warn("Could not save font to localStorage (likely too large)");
        }
        updateClip({ fontFamily: newFontName });
        setToastMessage(`Added font: ${newFontName}`);
        setTimeout(() => setToastMessage(null), 2000);
      }).catch((err) => {
        console.error(err);
        setToastMessage("Failed to load font");
        setTimeout(() => setToastMessage(null), 2000);
      });
    };
    reader.readAsDataURL(file);
  };

  const fonts = ["Inter", "sans-serif", "serif", "monospace", "Impact", "Arial", "Georgia", "Courier New"];
  const animations = ["None", "Fade In", "Slide Up", "Typewriter", "Bounce"];
  
  const presets = [
    { name: "Classic Pure", color: "#ffffff", fontSize: 48, fontFamily: "Inter", textAnimation: "None", bg: "bg-gradient-to-br from-zinc-800 to-zinc-900" },
    { name: "Neon Vibes", color: "#ff2a85", fontSize: 56, fontFamily: "Impact", textAnimation: "Bounce", bg: "bg-gradient-to-br from-pink-900/40 to-black border-pink-500/20" },
    { name: "Retro Synth", color: "#e2db81", fontSize: 50, fontFamily: "monospace", textAnimation: "Typewriter", bg: "bg-gradient-to-b from-yellow-900/40 to-purple-900/30 border-purple-500/10" },
    { name: "Cinematic Gold", color: "#ffd700", fontSize: 52, fontFamily: "Georgia", textAnimation: "Fade In", bg: "bg-gradient-to-br from-yellow-950/40 to-black border-yellow-700/30" },
    { name: "Nordic Minimal", color: "#a5b4fc", fontSize: 42, fontFamily: "sans-serif", textAnimation: "Slide Up", bg: "bg-gradient-to-br from-indigo-900/30 to-slate-900 border-indigo-500/10" },
    { name: "Bold Block", color: "#ffffff", fontSize: 64, fontFamily: "Arial", textAnimation: "Fade In", bg: "bg-zinc-950 border-white/10" }
  ];

  const presetColors = ["#ffffff", "#d1d5db", "#9ca3af", "#4b5563", "#000000", "#eab308"];

  const tabs = [
    { id: 'preset', label: 'PRESET' },
    { id: 'font', label: 'FONT' },
    { id: 'style', label: 'STYLE' },
    { id: 'animation', label: 'ANIMATION' }
  ] as const;

  const subTabs = [
    { id: 'text', label: 'Text' },
    { id: 'stroke', label: 'Stroke' },
    { id: 'glow', label: 'Glow' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'shadow', label: 'Shadow' }
  ] as const;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="flex flex-col w-[217px] h-[140px] bg-transparent shadow-none p-2.5 pb-1.5 gap-2 overflow-visible font-sans border-none select-none"
    >
      {/* Premium Segmented Control Tab Header */}
      <div className="flex items-center w-full bg-zinc-950/20 p-[2px] rounded-lg border border-white/[0.04] select-none relative shrink-0 h-[22px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`relative flex-1 flex items-center justify-center py-0.5 rounded-md transition-all duration-150 outline-none text-[7.5px] tracking-[0.14em] font-medium uppercase ${
                isActive 
                  ? 'bg-zinc-800 text-white shadow-[0_1px_4px_rgba(0,0,0,0.4)] border border-white/[0.04]' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content Container */}
      <div className="w-full flex-1 overflow-visible">
        <AnimatePresence mode="wait">
          {activeTab === 'preset' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-3 gap-1 h-full px-0.5 scrollbar-hide overflow-y-auto"
            >
              {presets.map((p, i) => {
                const isSelected = clip?.color === p.color && clip?.fontSize === p.fontSize && clip?.fontFamily === p.fontFamily && clip?.textAnimation === p.textAnimation;
                return (
                  <button
                    key={`${p.name}-${i}`}
                    onClick={() => updateClip({
                      color: p.color,
                      fontSize: p.fontSize,
                      fontFamily: p.fontFamily,
                      textAnimation: p.textAnimation
                    })}
                    className={`relative flex flex-col items-center justify-center p-1 rounded-lg border overflow-hidden transition-all h-[42px] bg-zinc-950/30 ${
                      isSelected 
                        ? 'border-white/50 bg-zinc-900/60 shadow-[0_2px_8px_rgba(0,0,0,0.5)] scale-[1.02]' 
                        : 'border-white/[0.03] hover:border-white/[0.08] hover:bg-zinc-900/20'
                    }`}
                  >
                    <span 
                      className="text-xs w-full text-center leading-none mb-0.5 drop-shadow-md"
                      style={{ color: p.color, fontFamily: p.fontFamily }}
                    >
                      Aa
                    </span>
                    <span className="text-[5.5px] font-semibold text-zinc-400 uppercase tracking-[0.12em] truncate w-full">{p.name}</span>
                    
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5 w-[3px] h-[3px] rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'font' && (
            <motion.div
              key="fonts"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full overflow-y-auto px-0.5 scrollbar-hide"
            >
              <div className="grid grid-cols-2 gap-1 auto-rows-min">
                <button
                  onClick={() => fontInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 px-2 py-1 text-[7.5px] uppercase tracking-wider font-semibold bg-zinc-950/15 border border-dashed border-white/[0.08] hover:border-white/[0.15] hover:bg-zinc-950/30 rounded-md transition-all text-zinc-300"
                >
                  <Plus size={8} className="text-zinc-400" /> Custom
                </button>
                <input
                  type="file"
                  ref={fontInputRef}
                  className="hidden"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontUpload}
                />
                
                {[...customFonts.map(f => f.name), ...fonts].map(f => {
                  const isSelected = clip?.fontFamily === f || (!clip?.fontFamily && f === "Inter");
                  return (
                    <button
                      key={f}
                      onClick={() => updateClip({ fontFamily: f })}
                      className={`flex items-center px-1.5 py-1 rounded-md transition-all outline-none border text-left ${
                        isSelected 
                          ? 'bg-zinc-800 border-white/[0.08] text-white shadow-sm' 
                          : 'border-transparent bg-zinc-950/10 text-zinc-400 hover:text-white hover:bg-zinc-900/20'
                      }`}
                    >
                      <span className="text-[7.5px] truncate w-full tracking-[0.04em]" style={{ fontFamily: f }}>
                         {f}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'style' && (
            <motion.div
              key="style"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full w-full"
            >
              <div className="flex gap-2 items-center flex-1 h-[68px]">
                {/* Left Side Controls (Changes based on activeSubTab!) */}
                <div className="flex flex-col gap-1.5 w-[130px] justify-center shrink-0">
                  {activeSubTab === 'text' && (
                    <>
                      {/* Recent Colors */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Palette</span>
                        </div>
                        <div className="flex gap-1.5 items-center px-0.5">
                          <button
                            onClick={() => updateClip({ color: '#ffffff' })}
                            className={`w-3 h-3 rounded-full transition-all outline-none bg-white border border-black/30 relative flex items-center justify-center ${
                              clip?.color === '#ffffff' 
                                ? 'ring-1 ring-white/50 scale-105' 
                                : 'hover:scale-105'
                            }`}
                          >
                            {clip?.color === '#ffffff' && (
                              <Check size={8} className="text-zinc-950 shrink-0 font-bold" strokeWidth={3} />
                            )}
                          </button>
                          {presetColors.slice(1).map((color, i) => {
                            const isChosen = clip?.color === color;
                            return (
                              <button
                                key={i}
                                onClick={() => updateClip({ color })}
                                className="w-3 h-3 rounded-full transition-all outline-none border border-black/30 relative flex items-center justify-center hover:scale-105"
                                style={{ backgroundColor: color }}
                              >
                                {isChosen && (
                                  <Check size={8} className="text-zinc-950 bg-white/70 rounded-full p-[0.5px] scale-90 font-bold shrink-0" strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Size Slider */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Size</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{clip?.fontSize || 48}px</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="12" max="150" step="1"
                            value={clip?.fontSize || 48}
                            onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Opacity Slider */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Opacity</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{Math.round((clip?.opacity ?? 1) * 100)}%</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="0" max="100" step="1"
                            value={Math.round((clip?.opacity ?? 1) * 100)}
                            onChange={(e) => updateClip({ opacity: parseInt(e.target.value) / 100 })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${Math.max(0, Math.min(100, (clip?.opacity ?? 1) * 100))}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${Math.max(0, Math.min(100, (clip?.opacity ?? 1) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'stroke' && (
                    <>
                      {/* Stroke Presets Row */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Stroke Color</span>
                        </div>
                        <div className="flex gap-1.5 items-center px-0.5">
                          {["#000000", "#ffffff", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"].map((color, i) => {
                            const isChosen = clip?.strokeColor === color;
                            return (
                              <button
                                key={i}
                                onClick={() => updateClip({ strokeColor: color, strokeWidth: clip?.strokeWidth || 1.5 })}
                                className="w-3 h-3 rounded-full transition-all outline-none border border-black/30 relative flex items-center justify-center hover:scale-105"
                                style={{ backgroundColor: color }}
                              >
                                {isChosen && (
                                  <Check size={8} className="text-zinc-950 bg-white/70 rounded-full p-[0.5px] scale-90 font-bold shrink-0" strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stroke Width Slider */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Stroke Width</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{clip?.strokeWidth || 0}px</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="0" max="12" step="0.5"
                            value={clip?.strokeWidth || 0}
                            onChange={(e) => updateClip({ strokeWidth: parseFloat(e.target.value) })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${((clip?.strokeWidth || 0) / 12) * 100}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${((clip?.strokeWidth || 0) / 12) * 100}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'glow' && (
                    <>
                      {/* Glow Presets Row */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Glow Color</span>
                        </div>
                        <div className="flex gap-1.5 items-center px-0.5">
                          {["#ffffff", "#ffd700", "#ff007f", "#00ffff", "#8b5cf6", "#10b981"].map((color, i) => {
                            const isChosen = clip?.glowColor === color;
                            return (
                              <button
                                key={i}
                                onClick={() => updateClip({ glowColor: color, glowRadius: clip?.glowRadius || 8 })}
                                className="w-3 h-3 rounded-full transition-all outline-none border border-black/30 relative flex items-center justify-center hover:scale-105"
                                style={{ backgroundColor: color }}
                              >
                                {isChosen && (
                                  <Check size={8} className="text-zinc-950 bg-white/70 rounded-full p-[0.5px] scale-90 font-bold shrink-0" strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Glow Radius Slider */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Glow Radius</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{clip?.glowRadius || 0}px</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="0" max="40" step="1"
                            value={clip?.glowRadius || 0}
                            onChange={(e) => updateClip({ glowRadius: parseInt(e.target.value) })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${((clip?.glowRadius || 0) / 40) * 100}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${((clip?.glowRadius || 0) / 40) * 100}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'spacing' && (
                    <>
                      {/* Letter Spacing */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Letter Spacing</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{clip?.letterSpacing || 0}px</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="-5" max="25" step="0.5"
                            value={clip?.letterSpacing || 0}
                            onChange={(e) => updateClip({ letterSpacing: parseFloat(e.target.value) })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${((parseFloat(clip?.letterSpacing || 0) + 5) / 30) * 100}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${((parseFloat(clip?.letterSpacing || 0) + 5) / 30) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Line Height */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Line Height</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{clip?.lineHeight || 1.25}x</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="0.8" max="2.5" step="0.05"
                            value={clip?.lineHeight || 1.25}
                            onChange={(e) => updateClip({ lineHeight: parseFloat(e.target.value) })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${((parseFloat(clip?.lineHeight || 1.25) - 0.8) / 1.7) * 100}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${((parseFloat(clip?.lineHeight || 1.25) - 0.8) / 1.7) * 100}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'shadow' && (
                    <>
                      {/* Shadow Presets Row */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Shadow Color</span>
                        </div>
                        <div className="flex gap-1.5 items-center px-0.5">
                          {["#000000", "#ffffff", "rgba(0,0,0,0.5)", "rgba(99,102,241,0.5)"].map((color, i) => {
                            const isChosen = clip?.shadowColor === color;
                            return (
                              <button
                                key={i}
                                onClick={() => updateClip({ shadowColor: color, shadowBlur: clip?.shadowBlur || 5, shadowOffsetX: clip?.shadowOffsetX || 3, shadowOffsetY: clip?.shadowOffsetY || 3 })}
                                className="w-3 h-3 rounded-full transition-all outline-none border border-black/30 relative flex items-center justify-center hover:scale-105"
                                style={{ backgroundColor: color }}
                              >
                                {isChosen && (
                                  <Check size={8} className="text-zinc-950 bg-white/70 rounded-full p-[0.5px] scale-90 font-bold shrink-0" strokeWidth={3} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Blur Slider */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6.5px] font-bold text-zinc-500 uppercase tracking-[0.16em] leading-none">Blur</span>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold leading-none">{clip?.shadowBlur || 0}px</span>
                        </div>
                        <div className="flex items-center group relative h-2.5">
                          <input 
                            type="range" 
                            min="0" max="25" step="1"
                            value={clip?.shadowBlur || 0}
                            onChange={(e) => updateClip({ shadowBlur: parseInt(e.target.value) })}
                            className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                          />
                          <div className="w-full h-[2px] bg-zinc-950 rounded-full overflow-hidden pointer-events-none border border-white/[0.02]">
                             <div 
                               className="h-full bg-white/90" 
                               style={{ width: `${((clip?.shadowBlur || 0) / 25) * 100}%` }}
                             />
                          </div>
                          <div 
                             className="absolute h-1.5 w-1.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none -ml-[3px] border border-zinc-950 transition-transform group-hover:scale-110"
                             style={{ left: `${((clip?.shadowBlur || 0) / 25) * 100}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Color Wheel with Polished Ring Bezel */}
                <div 
                  className="flex flex-col items-center justify-center shrink-0 w-[48px] h-[48px] m-auto relative"
                >
                  <div className="relative w-[44px] h-[44px] rounded-full overflow-hidden ring-1 ring-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.5)] bg-zinc-950/40 shrink-0 cursor-pointer hover:scale-105 transition-transform p-[1px]">
                    {/* Conic-gradient background */}
                    <div className="absolute inset-[1px] rounded-full bg-[conic-gradient(from_90deg,red,yellow,lime,cyan,blue,magenta,red)]" />
                    <div className="absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_center,white_0%,transparent_62%)] pointer-events-none" />
                    
                    {/* Center Preview Dot showing current selected color with standard glass dome style */}
                    <div 
                      className="absolute inset-[12px] rounded-full shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.45),0_1.5px_4px_rgba(0,0,0,0.45)] border border-black/30 pointer-events-none flex items-center justify-center transition-colors duration-150" 
                      style={{ 
                        backgroundColor: 
                          activeSubTab === 'stroke' ? (clip?.strokeColor || "#000000") : 
                          activeSubTab === 'glow' ? (clip?.glowColor || "#ffffff") : 
                          activeSubTab === 'shadow' ? (clip?.shadowColor || "#000000") : 
                          (clip?.color || "#ffffff") 
                      }}
                    >
                      {/* Gloss glossmorphism highlight reflection */}
                      <div className="absolute top-[1px] left-[1.5px] right-[1.5px] h-[5px] rounded-t-full bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0)_100%)]" />
                    </div>

                    <input
                      type="color"
                      aria-label="Color Picker"
                      value={
                        activeSubTab === 'stroke' ? (clip?.strokeColor || "#000000") : 
                        activeSubTab === 'glow' ? (clip?.glowColor || "#ffffff") : 
                        activeSubTab === 'shadow' ? (clip?.shadowColor || "#000000") : 
                        (clip?.color || "#ffffff")
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeSubTab === 'stroke') {
                          updateClip({ strokeColor: val, strokeWidth: clip?.strokeWidth || 1.5 });
                        } else if (activeSubTab === 'glow') {
                          updateClip({ glowColor: val, glowRadius: clip?.glowRadius || 8 });
                        } else if (activeSubTab === 'shadow') {
                          updateClip({ shadowColor: val, shadowBlur: clip?.shadowBlur || 5, shadowOffsetX: clip?.shadowOffsetX || 3, shadowOffsetY: clip?.shadowOffsetY || 3 });
                        } else {
                          updateClip({ color: val });
                        }
                      }}
                      className="absolute inset-0 p-0 border-none bg-transparent cursor-pointer opacity-0 w-full h-full"
                    />
                  </div>
                </div>
              </div>

              {/* Minimal Capsule Sub-tabs */}
              <div className="flex items-center justify-between gap-[2px] mt-1 pt-1.5 border-t border-white/[0.04] w-full shrink-0">
                 {subTabs.map(tab => {
                   const isActive = activeSubTab === tab.id;
                   return (
                     <button
                       key={tab.id}
                       onClick={() => setActiveSubTab(tab.id)}
                       className={`px-1.5 py-[2px] rounded text-[6.5px] tracking-[0.16em] uppercase font-bold transition-all duration-150 ${
                         isActive 
                           ? 'bg-zinc-800 text-white border border-white/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.4)]' 
                           : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                       }`}
                     >
                       {tab.label}
                     </button>
                   );
                 })}
              </div>
            </motion.div>
          )}

          {activeTab === 'animation' && (
            <motion.div
              key="animation"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 gap-1 h-full px-0.5 overflow-y-auto scrollbar-hide"
            >
              {animations.map(a => {
                const isSelected = clip?.textAnimation === a || (!clip?.textAnimation && a === "None");
                return (
                  <button
                    key={a}
                    onClick={() => updateClip({ textAnimation: a })}
                    className={`flex items-center justify-center p-1.5 rounded-lg transition-all outline-none border h-[28px] ${
                      isSelected 
                        ? 'bg-zinc-800 border-white/[0.08] text-white shadow-sm font-semibold' 
                        : 'border-white/[0.03] bg-zinc-950/15 text-zinc-400 hover:text-white hover:bg-zinc-900/20'
                    }`}
                  >
                    <span className="text-[7.5px] uppercase tracking-wider font-semibold">{a}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
