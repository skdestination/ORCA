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

  const presetColors = ["#ffffff", "#000000", "#ff2a85", "#3b82f6", "#eab308", "#10b981", "#ef4444", "#a855f7"];

  const tabs = [
    { id: 'preset', icon: null, label: 'PRESET' },
    { id: 'font', icon: null, label: 'FONT' },
    { id: 'style', icon: null, label: 'STYLE' },
    { id: 'animation', icon: null, label: 'ANIMATION' }
  ] as const;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="flex flex-col w-[220px] max-w-[100vw] h-[120px] p-2 gap-1.5 shrink-0 items-center overflow-hidden font-sans"
    >
      {/* Segmented Control Tabs */}
      <div className="flex items-center w-full justify-between select-none p-0.5 relative shrink-0">
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            <button 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center gap-0.5 justify-center py-1 transition-colors outline-none flex-1 text-[8px] tracking-tight font-semibold uppercase ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab.label}
            </button>
            {index < tabs.length - 1 && <div className="w-[1px] h-3 bg-white/10" />}
          </React.Fragment>
        ))}
      </div>

      {/* Tab Content Container */}
      <div className="w-full flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-0.5">
        <AnimatePresence mode="wait">
          {activeTab === 'preset' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-3 gap-1"
            >
              {presets.map(p => {
                const isSelected = clip?.color === p.color && clip?.fontSize === p.fontSize && clip?.fontFamily === p.fontFamily && clip?.textAnimation === p.textAnimation;
                return (
                  <button
                    key={p.name}
                    onClick={() => updateClip({
                      color: p.color,
                      fontSize: p.fontSize,
                      fontFamily: p.fontFamily,
                      textAnimation: p.textAnimation
                    })}
                    className={`relative flex flex-col items-center justify-center p-1 rounded-sm border overflow-hidden transition-all duration-300 ${p.bg} ${
                      isSelected 
                        ? 'ring-1 ring-indigo-500 border-white/20' 
                        : 'border-white/5 opacity-80 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                  >
                    <span 
                      className="text-[10px] w-full text-center leading-none mb-0.5 drop-shadow-md"
                      style={{ color: p.color, fontFamily: p.fontFamily }}
                    >
                      Aa
                    </span>
                    <span className="text-[6px] font-medium text-zinc-400 uppercase tracking-tighter truncate w-full">{p.name}</span>
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
              className="flex flex-col h-full"
            >
              <div className="grid grid-cols-3 gap-0.5 auto-rows-min">
                <button
                  onClick={() => fontInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-1 text-[8px] font-semibold hover:bg-white/5 rounded-sm transition-all text-white"
                >
                  <Plus size={10} className="mb-0.5" /> Add
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
                      className={`flex items-center justify-center py-1 px-0.5 rounded-sm transition-all outline-none ${isSelected ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      <span className={`text-[8px] truncate w-full text-center ${isSelected ? 'font-bold' : ''}`} style={{ fontFamily: f }}>
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
              className="flex flex-col gap-2 px-1 py-0.5"
            >
              {/* Color Selection Section */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap gap-1">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      onClick={() => updateClip({ color })}
                      className={`w-4 h-4 rounded-full transition-transform outline-none ${clip?.color === color ? 'scale-125 ring-1 ring-white' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  
                  <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 via-emerald-500 to-indigo-500 pointer-events-none rounded-full" />
                    <Plus size={8} className="text-white relative z-10 pointer-events-none drop-shadow-md" />
                    <input
                      type="color"
                      value={clip?.color || "#ffffff"}
                      onChange={(e) => updateClip({ color: e.target.value })}
                      className="absolute w-full h-full p-0 border-none bg-transparent cursor-pointer opacity-0"
                      title="Custom Color"
                    />
                  </div>
                </div>
              </div>

              {/* Size Selection Section */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                   <span className="text-[8px] font-bold text-zinc-600">A</span>
                   <input 
                     type="range" 
                     min="12" max="150" step="1"
                     value={clip?.fontSize || 48}
                     onChange={(e) => updateClip({ fontSize: parseInt(e.target.value) })}
                     className="flex-1 accent-white h-0.5 bg-black/40 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                   />
                   <span className="text-[10px] font-bold text-zinc-400">A</span>
                </div>
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
              className="grid grid-cols-2 gap-x-1 gap-y-0.5 align-top pt-0.5"
            >
              {animations.map(a => {
                const isSelected = clip?.textAnimation === a || (!clip?.textAnimation && a === "None");
                return (
                  <button
                    key={a}
                    onClick={() => updateClip({ textAnimation: a })}
                    className={`flex items-center justify-center py-1 px-0.5 rounded-sm transition-all outline-none ${isSelected ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <span className="text-[8px] uppercase">{a}</span>
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
