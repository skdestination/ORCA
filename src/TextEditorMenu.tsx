import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check } from 'lucide-react';

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
          console.warn("Could not save font to localStorage");
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

  const fonts = ["Inter", "Space Grotesk", "sans-serif", "serif", "monospace", "Impact", "Arial", "Georgia", "Courier New"];
  const animations = ["None", "Fade In", "Slide Up", "Typewriter", "Bounce"];
  
  const presets = [
    { name: "Classic Pure", color: "#ffffff", fontSize: 44, fontFamily: "Inter", textAnimation: "None" },
    { name: "Neon Vibes", color: "#ff2a85", fontSize: 50, fontFamily: "Impact", textAnimation: "Bounce" },
    { name: "Retro Synth", color: "#e2db81", fontSize: 46, fontFamily: "monospace", textAnimation: "Typewriter" },
    { name: "Cinematic Gold", color: "#ffd700", fontSize: 48, fontFamily: "Georgia", textAnimation: "Fade In" },
    { name: "Nordic Minimal", color: "#cbd5e1", fontSize: 38, fontFamily: "sans-serif", textAnimation: "Slide Up" },
    { name: "Bold Block", color: "#ffffff", fontSize: 56, fontFamily: "Arial", textAnimation: "Fade In" }
  ];

  // Specific Palette matching the image's high-polished palette list
  const paletteColors = ["#ffffff", "#cbd5e1", "#94a3b8", "#475569", "#18181b", "#f59e0b"];

  const tabs = [
    { id: 'preset', label: 'PRESET' },
    { id: 'font', label: 'FONT' },
    { id: 'style', label: 'STYLE' },
    { id: 'animation', label: 'ANIMATION' }
  ] as const;

  const subTabs = [
    { id: 'text', label: 'TEXT' },
    { id: 'stroke', label: 'STROKE' },
    { id: 'glow', label: 'GLOW' },
    { id: 'spacing', label: 'SPACE' },
    { id: 'shadow', label: 'SHADOW' }
  ] as const;

  // Active color getter depending on active sub-tab
  const getActiveColor = () => {
    if (activeSubTab === 'stroke') return clip?.strokeColor || "#000000";
    if (activeSubTab === 'glow') return clip?.glowColor || "#ffffff";
    if (activeSubTab === 'shadow') return clip?.shadowColor || "#000000";
    return clip?.color || "#ffffff";
  };

  // Active color setter depending on active sub-tab
  const setActiveColor = (color: string) => {
    if (activeSubTab === 'stroke') {
      updateClip({ strokeColor: color, strokeWidth: clip?.strokeWidth || 1.5 });
    } else if (activeSubTab === 'glow') {
      updateClip({ glowColor: color, glowRadius: clip?.glowRadius || 8 });
    } else if (activeSubTab === 'shadow') {
      updateClip({ shadowColor: color, shadowBlur: clip?.shadowBlur || 5, shadowOffsetX: clip?.shadowOffsetX || 3, shadowOffsetY: clip?.shadowOffsetY || 3 });
    } else {
      updateClip({ color });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="flex flex-col w-full h-auto min-h-[148px] bg-transparent shadow-none p-2 pt-1 gap-2.5 overflow-visible font-sans select-none text-left"
    >
      {/* 1. Header Area with dynamic indicators and tabs */}
      <div className="flex items-center justify-between w-full border-b border-white/[0.04] pb-0.5 select-none shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className="relative flex-1 flex flex-col items-center justify-center py-1 outline-none transition-colors duration-200 cursor-pointer"
            >
              <span className={`text-[7.5px] tracking-[0.14em] font-extrabold pb-1.5 uppercase transition-colors ${
                isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-[-1.5px] left-[15%] right-[15%] h-[1.5px] bg-[#e21d3c] rounded-full shadow-[0_0_8px_rgba(226,29,60,0.8)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* 2. Content Container */}
      <div className="w-full flex-1 overflow-visible">
        <AnimatePresence mode="wait">
          {activeTab === 'preset' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 gap-1 px-0.5 max-h-[88px] overflow-y-auto scrollbar-hide"
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
                    className={`relative flex items-center justify-start gap-2.5 p-1 px-2 rounded-[8px] border transition-all h-[26px] bg-zinc-950/20 cursor-pointer ${
                      isSelected 
                        ? 'border-[#e21d3c]/40 bg-zinc-900/60 shadow-[0_2px_8px_rgba(226,29,60,0.15)]' 
                        : 'border-white/[0.03] hover:border-white/[0.08] hover:bg-zinc-900/10'
                    }`}
                  >
                    <span 
                      className="text-[9px] font-black leading-none drop-shadow-md w-5 text-center shrink-0"
                      style={{ color: p.color, fontFamily: p.fontFamily }}
                    >
                      Aa
                    </span>
                    <span className="text-[6.5px] font-bold text-zinc-400 uppercase tracking-[0.1em] truncate w-full leading-none">{p.name}</span>
                    
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-[3px] h-[3px] rounded-full bg-[#e21d3c] shadow-[0_0_6px_#e21d3c]" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'font' && (
            <motion.div
              key="fonts"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col max-h-[88px] px-0.5 gap-1"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[6.5px] font-bold tracking-wider text-zinc-500 uppercase leading-none">FONT FAMILY</span>
                <button
                  onClick={() => fontInputRef.current?.click()}
                  className="flex items-center justify-center gap-1 px-1.5 py-0.5 text-[5.5px] uppercase tracking-wider font-extrabold bg-zinc-800 border border-white/5 hover:border-white/10 hover:bg-zinc-700 rounded-md transition-all text-zinc-300 cursor-pointer"
                >
                  <Plus size={6} className="text-zinc-400" /> UPLOAD
                </button>
              </div>
              <input
                type="file"
                ref={fontInputRef}
                className="hidden"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontUpload}
              />
              
              <div className="grid grid-cols-2 gap-1 auto-rows-min overflow-y-auto scrollbar-hide max-h-[70px]">
                {[...customFonts.map(f => f.name), ...fonts].map(f => {
                  const isSelected = clip?.fontFamily === f || (!clip?.fontFamily && f === "Inter");
                  return (
                    <button
                      key={f}
                      onClick={() => updateClip({ fontFamily: f })}
                      className={`flex items-center justify-center py-1 px-1.5 rounded-[6px] transition-all outline-none border text-center h-[20px] cursor-pointer ${
                        isSelected 
                          ? 'bg-zinc-800 border-[#e21d3c]/45 text-white font-bold' 
                          : 'border-transparent bg-zinc-950/20 text-zinc-500 hover:text-white hover:bg-zinc-900/30'
                      }`}
                    >
                      <span className="text-[6.5px] truncate w-full tracking-[0.04em] font-extrabold" style={{ fontFamily: f }}>
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
              <div className="flex gap-2.5 items-center justify-between flex-1">
                {/* Left side inputs: Sliders and Palette Swatches wrapper */}
                <div className="flex flex-col gap-1.5 w-[136px] justify-center shrink-0">
                  
                  {/* Row 1: Swatches (Available for all tabs except spacing) */}
                  {activeSubTab !== 'spacing' && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">PALETTE</span>
                      <div className="flex gap-1.5 items-center">
                        {paletteColors.map((color, i) => {
                          const currentVal = getActiveColor();
                          const isChosen = currentVal.toLowerCase() === color.toLowerCase();
                          return (
                            <button
                              key={i}
                              onClick={() => setActiveColor(color)}
                              className={`w-3 h-3 rounded-full transition-all outline-none border border-black/30 relative flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 ${
                                isChosen ? 'ring-1 ring-[#e21d3c] shadow-[0_0_6px_rgba(226,29,60,0.5)] scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            >
                              {isChosen && (
                                <Check size={7} className="text-zinc-950 bg-white/90 rounded-full p-[0.5px] font-bold" strokeWidth={3.5} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Slider controls definition depending on the subtab */}
                  {activeSubTab === 'text' && (
                    <>
                      {/* SIZE slider */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">SIZE</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="12" max="150" step="1"
                              value={clip?.fontSize || 48}
                              onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.4)]" 
                                 style={{ width: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px] transition-transform group-hover:scale-125"
                               style={{ left: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.fontSize || 48}px</span>
                        </div>
                      </div>

                      {/* OPACITY slider */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">OPACITY</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="0" max="100" step="1"
                              value={Math.round((clip?.opacity ?? 1) * 100)}
                              onChange={(e) => updateClip({ opacity: parseInt(e.target.value) / 100 })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.4)]" 
                                 style={{ width: `${Math.max(0, Math.min(100, (clip?.opacity ?? 1) * 100))}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px] transition-transform group-hover:scale-125"
                               style={{ left: `${Math.max(0, Math.min(100, (clip?.opacity ?? 1) * 100))}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{Math.round((clip?.opacity ?? 1) * 100)}%</span>
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'stroke' && (
                    <>
                      {/* STROKE WIDTH */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">ST. WIDTH</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="0" max="10" step="0.5"
                              value={clip?.strokeWidth || 0}
                              onChange={(e) => updateClip({ strokeWidth: parseFloat(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white animate-pulse-subtle" 
                                 style={{ width: `${((clip?.strokeWidth || 0) / 10) * 100}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${((clip?.strokeWidth || 0) / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.strokeWidth || 0}px</span>
                        </div>
                      </div>

                      {/* TEXT SIZE (Utility, super helpful here too!) */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">TEXT SIZE</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="12" max="150" step="1"
                              value={clip?.fontSize || 48}
                              onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.fontSize || 48}px</span>
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'glow' && (
                    <>
                      {/* GLOW RADIUS */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">WIDTH (RADIUS)</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="0" max="30" step="1"
                              value={clip?.glowRadius || 0}
                              onChange={(e) => updateClip({ glowRadius: parseInt(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${((clip?.glowRadius || 0) / 30) * 100}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${((clip?.glowRadius || 0) / 30) * 100}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.glowRadius || 0}px</span>
                        </div>
                      </div>

                      {/* TEXT SIZE */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">TEXT SIZE</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="12" max="150" step="1"
                              value={clip?.fontSize || 48}
                              onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.fontSize || 48}px</span>
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'spacing' && (
                    <>
                      {/* LETTER SPACING */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">LETTER SPACE</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="-4" max="20" step="0.5"
                              value={clip?.letterSpacing || 0}
                              onChange={(e) => updateClip({ letterSpacing: parseFloat(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${((parseFloat(clip?.letterSpacing || 0) + 4) / 24) * 100}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${((parseFloat(clip?.letterSpacing || 0) + 4) / 24) * 100}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.letterSpacing || 0}px</span>
                        </div>
                      </div>

                      {/* LINE HEIGHT */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">LINE HEIGHT</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="0.8" max="2.5" step="0.05"
                              value={clip?.lineHeight || 1.25}
                              onChange={(e) => updateClip({ lineHeight: parseFloat(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${((parseFloat(clip?.lineHeight || 1.25) - 0.8) / 1.7) * 100}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${((parseFloat(clip?.lineHeight || 1.25) - 0.8) / 1.7) * 100}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.lineHeight || 1.25}x</span>
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === 'shadow' && (
                    <>
                      {/* SHADOW BLUR */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">SHADOW BLUR</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="0" max="20" step="1"
                              value={clip?.shadowBlur || 0}
                              onChange={(e) => updateClip({ shadowBlur: parseInt(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${((clip?.shadowBlur || 0) / 20) * 100}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${((clip?.shadowBlur || 0) / 20) * 100}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.shadowBlur || 0}px</span>
                        </div>
                      </div>

                      {/* TEXT SIZE */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[6.5px] font-black tracking-widest text-[#8e8e93] uppercase leading-none">TEXT SIZE</span>
                        <div className="flex items-center gap-1">
                          <div className="relative flex-1 flex items-center group h-2">
                            <input 
                              type="range" 
                              min="12" max="150" step="1"
                              value={clip?.fontSize || 48}
                              onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                              className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                            />
                            {/* Visual representation */}
                            <div className="w-full h-[1.5px] bg-[#1a1a1c] rounded-full overflow-hidden pointer-events-none">
                               <div 
                                 className="h-full bg-white" 
                                 style={{ width: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                               />
                            </div>
                            <div 
                               className="absolute h-[5px] w-[5px] bg-white rounded-full shadow-[0_0.5px_2px_rgba(0,0,0,0.8)] pointer-events-none -ml-[2.5px]"
                               style={{ left: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / 138 * 100))}%` }}
                            />
                          </div>
                          <span className="text-[6.5px] font-mono text-zinc-400 font-bold w-[22px] text-right shrink-0">{clip?.fontSize || 48}px</span>
                        </div>
                      </div>
                    </>
                  )}

                </div>

                {/* Right side color wheel with concentric layout spectrum (only if subtab supports color) */}
                <div className="flex flex-col items-center justify-center shrink-0 w-[42px] h-[42px] relative m-auto select-none">
                  {activeSubTab !== 'spacing' ? (
                    <div className="relative w-[38px] h-[38px] rounded-full overflow-hidden border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] bg-zinc-950/40 p-[1px] cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-150">
                      {/* Rainbow spectral cone */}
                      <div className="absolute inset-[1px] rounded-full bg-[conic-gradient(from_90deg,red,yellow,lime,cyan,blue,magenta,red)]" />
                      <div className="absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_center,white_0%,transparent_62%)] pointer-events-none" />
                      
                      {/* Middle greyish/gradient border frame preview dot */}
                      <div 
                        className="absolute inset-[8px] rounded-full shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.45),0_1.5px_4px_rgba(0,0,0,0.45)] border border-black/30 pointer-events-none flex items-center justify-center transition-all duration-150" 
                        style={{ backgroundColor: getActiveColor() }}
                      >
                        {/* Shimmer overlay */}
                        <div className="absolute top-[0.5px] left-[1px] right-[1px] h-[3px] rounded-t-full bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_100%)]" />
                      </div>

                      <input
                        type="color"
                        aria-label="Color Picker"
                        value={getActiveColor().substring(0, 7)}
                        onChange={(e) => setActiveColor(e.target.value)}
                        className="absolute inset-0 p-0 border-none bg-transparent cursor-pointer opacity-0 w-full h-full"
                      />
                    </div>
                  ) : (
                    // Subtle text indicator replacement for spacing
                    <div className="flex items-center justify-center w-[38px] h-[38px] border border-white/[0.04] rounded-full bg-zinc-950/10 text-[9px] font-black text-zinc-500">
                      Abc
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist style horizontal dividers and Capsule sub-tabs */}
              <div className="flex items-center justify-between gap-[1px] mt-2.5 pt-1.5 border-t border-white/[0.04] w-full shrink-0">
                 {subTabs.map(tab => {
                   const isActive = activeSubTab === tab.id;
                   return (
                     <button
                       key={tab.id}
                       onClick={() => setActiveSubTab(tab.id)}
                       className={`relative px-1 pb-[1px] transition-all duration-250 cursor-pointer outline-none flex flex-col items-center justify-center ${
                         isActive 
                           ? 'border border-zinc-700/50 bg-[#121214]/50 rounded-[4px] px-1 py-[1px] text-white' 
                           : 'text-zinc-500 hover:text-zinc-300'
                       }`}
                     >
                       <span className="text-[6.5px] tracking-[0.06em] uppercase font-black transition-colors">
                         {tab.label}
                       </span>
                       {isActive && (
                         <div className="w-[10px] h-[1px] bg-[#e21d3c] rounded-full mt-[1px]" />
                       )}
                     </button>
                   );
                 })}
              </div>
            </motion.div>
          )}

          {activeTab === 'animation' && (
            <motion.div
              key="animation"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 gap-1 max-h-[88px] px-0.5 overflow-y-auto scrollbar-hide auto-rows-min"
            >
              {animations.map(a => {
                const isSelected = clip?.textAnimation === a || (!clip?.textAnimation && a === "None");
                return (
                  <button
                    key={a}
                    onClick={() => updateClip({ textAnimation: a })}
                    className={`flex items-center justify-center p-1 rounded-md transition-all outline-none border h-[22px] cursor-pointer ${
                      isSelected 
                        ? 'bg-zinc-800 border-[#e21d3c]/35 text-white font-bold' 
                        : 'border-white/[0.03] bg-zinc-950/20 text-zinc-500 hover:text-white hover:bg-zinc-900/30'
                    }`}
                  >
                    <span className="text-[6.5px] uppercase tracking-wider font-extrabold">{a}</span>
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
