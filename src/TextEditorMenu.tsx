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
      className="flex flex-col w-[217px] h-[140px] bg-transparent shadow-none p-3 pb-2 gap-2 overflow-visible font-sans border-none"
    >
      {/* Segmented Control Tabs */}
      <div className="flex items-center w-full justify-between select-none px-1 relative shrink-0">
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            <button 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center justify-center py-0.5 transition-colors outline-none text-[8px] tracking-widest font-bold uppercase ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab.label}
            </button>
            {index < tabs.length - 1 && <div className="w-[1px] h-2.5 bg-white/10" />}
          </React.Fragment>
        ))}
      </div>

      {/* Tab Content Container */}
      <div className="w-full flex-1 overflow-visible">
        <AnimatePresence mode="wait">
          {activeTab === 'preset' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 gap-1 h-full px-1 scrollbar-hide overflow-y-auto"
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
                    className={`relative flex flex-col items-center justify-center p-1 rounded-xl border overflow-hidden transition-all h-[44px] ${p.bg} ${
                      isSelected 
                        ? 'ring-1 ring-indigo-500 border-transparent mask-squircle' 
                        : 'border-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span 
                      className="text-sm w-full text-center leading-none mb-0.5 drop-shadow-md"
                      style={{ color: p.color, fontFamily: p.fontFamily }}
                    >
                      Aa
                    </span>
                    <span className="text-[6px] font-medium text-white/70 uppercase tracking-tighter truncate w-full">{p.name}</span>
                  </button>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'font' && (
            <motion.div
              key="fonts"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full overflow-y-auto px-1 scrollbar-hide"
            >
              <div className="grid grid-cols-2 gap-1 auto-rows-min">
                <button
                  onClick={() => fontInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-medium bg-white/5 hover:bg-white/10 rounded-lg transition-all text-white border border-white/5"
                >
                  <Plus size={10} className="text-zinc-400" /> Custom Font
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
                      className={`flex items-center px-2 py-1.5 rounded-lg transition-all outline-none border ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <span className={`text-[9px] truncate w-full text-left ${isSelected ? 'font-bold' : ''}`} style={{ fontFamily: f }}>
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full px-1 w-[190px]"
            >
              <div className="flex gap-2 items-center flex-1">
                {/* Left Side Controls */}
                <div className="flex flex-col gap-2 w-[120px] justify-center">
                  
                  {/* Recent Colors */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-zinc-400 w-7 shrink-0 text-left">Recent</span>
                    <div className="flex gap-[3px] items-center">
                      <button
                        onClick={() => updateClip({ color: '#ffffff' })}
                        className={`w-3.5 h-3.5 rounded-full transition-transform outline-none bg-white ${clip?.color === '#ffffff' ? 'scale-110 ring-1 ring-white/50 ring-offset-1 ring-offset-[#1E1E1E]' : 'hover:scale-110'}`}
                      />
                      {presetColors.slice(1).map((color, i) => (
                        <button
                          key={i}
                          onClick={() => updateClip({ color })}
                          className={`w-3.5 h-3.5 rounded-full transition-transform outline-none ${clip?.color === color ? 'scale-110 ring-1 ring-white/50 ring-offset-1 ring-offset-[#1E1E1E]' : 'hover:scale-110'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <div className="w-[14px] h-[14px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Size Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-zinc-400 w-7 shrink-0 text-left">Size</span>
                    <div className="flex-1 right-0 flex items-center group relative h-3">
                      <input 
                        type="range" 
                        min="12" max="150" step="1"
                        value={clip?.fontSize || 48}
                        onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                        className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-1 bg-zinc-700/50 rounded-full overflow-hidden pointer-events-none">
                         <div 
                           className="h-full bg-[#1bc5bd]" 
                           style={{ width: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / (150 - 12) * 100))}%` }}
                         />
                      </div>
                      <div 
                         className="absolute h-2 w-2 bg-white rounded-full shadow pointer-events-none -ml-1 transition-transform group-hover:scale-110"
                         style={{ left: `${Math.max(0, Math.min(100, ((clip?.fontSize || 48) - 12) / (150 - 12) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] text-zinc-400 w-7 shrink-0 text-left">Opacity</span>
                    <div className="flex-1 flex items-center group relative h-3">
                      <input 
                         type="range" 
                         min="0" max="100" step="1"
                         value={(clip?.opacity ?? 1) * 100}
                         onChange={(e) => updateClip({ opacity: parseInt(e.target.value) / 100 })}
                         className="w-full absolute inset-0 z-10 opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-1 bg-zinc-700/50 rounded-full overflow-hidden pointer-events-none">
                         <div 
                           className="h-full bg-[#1bc5bd]" 
                           style={{ width: `${Math.max(0, Math.min(100, (clip?.opacity ?? 1) * 100))}%` }}
                         />
                      </div>
                      <div 
                         className="absolute h-2 w-2 bg-white rounded-full shadow pointer-events-none -ml-1 transition-transform group-hover:scale-110"
                         style={{ left: `${Math.max(0, Math.min(100, (clip?.opacity ?? 1) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Color Wheel */}
                <div 
                  className="flex flex-col items-center justify-center shrink-0 w-[50px] h-[50px] group relative"
                  style={{ paddingTop: '0px', paddingLeft: '0px', marginTop: '-1px', marginLeft: '-5px' }}
                >
                  <div className="relative w-[48px] h-[48px] rounded-full overflow-hidden border-0 shrink-0 cursor-pointer group-hover:scale-105 transition-transform">
                    {/* The classic Color Wheel gradient background */}
                    <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_90deg,red,yellow,lime,cyan,blue,magenta,red)]" />
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,white_0%,transparent_70%)] pointer-events-none" />
                    
                    <input
                      type="color"
                      value={clip?.color || "#ffffff"}
                      onChange={(e) => updateClip({ color: e.target.value })}
                      className="absolute w-full h-[200%] -top-[50%] p-0 border-none bg-transparent cursor-pointer opacity-0"
                      style={{ paddingTop: '0px', paddingLeft: '0px', paddingRight: '0px', paddingBottom: '-5px', marginBottom: '0px', marginRight: '0px', width: '0px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-tabs for properties - Text Stroke Glow Spacing Shadow */}
              <div className="flex items-center justify-center gap-[2px] mt-2 mb-1">
                 {subTabs.map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveSubTab(tab.id)}
                     className={`px-2 py-[3px] rounded-full text-[8px] font-medium transition-colors ${
                       activeSubTab === tab.id 
                         ? 'bg-zinc-700/80 text-white shadow-sm font-semibold' 
                         : 'text-zinc-500 hover:text-white hover:bg-white/5'
                     }`}
                   >
                     {tab.label}
                   </button>
                 ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'animation' && (
            <motion.div
              key="animation"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 gap-1 h-full px-1 overflow-y-auto scrollbar-hide"
            >
              {animations.map(a => {
                const isSelected = clip?.textAnimation === a || (!clip?.textAnimation && a === "None");
                return (
                  <button
                    key={a}
                    onClick={() => updateClip({ textAnimation: a })}
                    className={`flex items-center justify-center py-2 px-1 rounded-lg transition-all outline-none border ${isSelected ? 'bg-white/10 border-white/20 text-white shadow-inner' : 'border-white/5 bg-[#18181A] text-zinc-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <span className="text-[9px] font-medium">{a}</span>
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
