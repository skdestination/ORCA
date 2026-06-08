import React from 'react';

export const EditorScreen = (props: any) => {
  const { 
    // TODO: Destructure props here
  } = props;

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e20] overflow-hidden">
      {/* Exporting Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md bg-zinc-900 rounded-3xl p-6 border border-white/10 flex flex-col items-center">
            <div className="text-white font-bold text-lg mb-2">
              Exporting Video...
            </div>
            <div className="text-zinc-400 text-sm mb-6">
              Please do not close this window
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <div className="text-white font-mono text-xs mt-3">
              {exportProgress}%
            </div>
          </div>
        </div>
      )}
      {/* Export Complete Overlay */}
      {exportedVideoUrl && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl bg-zinc-900 rounded-3xl p-6 border border-white/10 flex flex-col">
            <h2 className="text-white font-bold text-xl mb-4 text-center">Export Complete</h2>
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 flex items-center justify-center">
              <video 
                src={exportedVideoUrl} 
                controls 
                autoPlay
                className="w-full h-full object-contain" 
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = exportedVideoUrl;
                  a.download = `project-${exportResolution}-${Date.now()}.webm`;
                  a.click();
                  showToast("Video downloaded.");
                }}
                className="flex-1 bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
              >
                <Download size={18} />
                Save to Device
              </button>
              {navigator.share && (
                <button
                  onClick={async () => {
                    try {
                      if (!exportedVideoBlob) return;
                      const file = new File([exportedVideoBlob], `project-${Date.now()}.webm`, { type: 'video/webm' });
                      await navigator.share({
                        files: [file],
                        title: 'My Video Project',
                      });
                    } catch (err) {
                      console.warn("Share failed", err);
                    }
                  }}
                  className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
                >
                  <Share size={18} />
                  Share / Save to Gallery
                </button>
              )}
              <button
                onClick={() => {
                  setExportedVideoUrl(null);
                  URL.revokeObjectURL(exportedVideoUrl);
                }}
                className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="flex justify-between items-center px-4 py-4 shrink-0 relative z-[100] pointer-events-none">
        {/* Pill Popup */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto">
          <AnimatePresence>
            {pillPopup && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="bg-zinc-900 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl"
              >
                {pillPopup.type === 'loading' && pillPopup.progress !== undefined && (
                  <div className="w-5 h-5 relative">
                    <svg className="w-5 h-5" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="9" className="stroke-zinc-700" strokeWidth="2" fill="none" />
                      <circle cx="10" cy="10" r="9" className="stroke-blue-500" strokeWidth="2" fill="none" strokeDasharray={`${pillPopup.progress * 2 * Math.PI * 9 / 100} 1000`} transform="rotate(-90 10 10)" />
                    </svg>
                  </div>
                )}
                <span className="text-[12px] font-medium text-white">{pillPopup.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center bg-zinc-800 rounded-full px-1 py-1 shadow-lg border border-white/5 pointer-events-auto">
          <button
            onClick={handleBackToHome}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-zinc-700 flex items-center justify-center transition-colors text-white"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="w-px h-3 sm:h-4 bg-zinc-700 mx-1 sm:mx-2"></div>
          
          <div className="relative">
            <div
              onClick={() => setIsRatioExpanded(!isRatioExpanded)}
              className={`px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider cursor-pointer select-none flex items-center gap-2 transition-all duration-300 ${
                isRatioExpanded
                  ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                  : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {currentProjectRatio === "9:16" ? (
                  <div className={`w-1.5 h-3 border rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/80"}`} />
                ) : currentProjectRatio === "16:9" ? (
                  <div className={`w-3 h-1.5 border rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/80"}`} />
                ) : currentProjectRatio === "1:1" ? (
                  <div className={`w-2.5 h-2.5 border rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/80"}`} />
                ) : (
                  <div className={`w-2.5 h-2 border border-dashed rounded-[1px] transition-colors ${isRatioExpanded ? "border-black" : "border-white/60"}`} />
                )}
                <span>Aspect: {currentProjectRatio}</span>
              </div>
              <ChevronDown
                size={12}
                className={`transition-transform duration-300 ${isRatioExpanded ? "rotate-180" : "opacity-80"}`}
              />
            </div>

            <AnimatePresence>
              {isRatioExpanded && (
                <>
                  <div
                    className="fixed inset-0 z-[140] cursor-default pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRatioExpanded(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-[calc(100%+12px)] left-0 bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl w-[240px] flex flex-col p-3 z-[150] origin-top-left overflow-hidden text-left pointer-events-auto"
                  >
                    <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-2.5 px-1">
                      Change Aspect Ratio
                    </div>
                    {[
                      { r: "9:16", label: "Reels, TikTok", desc: "Vertical video" },
                      { r: "16:9", label: "YouTube", desc: "Horizontal video" },
                      { r: "1:1", label: "Instagram", desc: "Square post" },
                    ].map(({ r, label }) => (
                      <button
                        key={r}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentProjectRatio(r);
                          setIsRatioExpanded(false);
                          showToast(`Ratio changed to ${r}`);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-250 mb-1 group ${
                          currentProjectRatio === r
                            ? "bg-white text-black font-extrabold shadow-md"
                            : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {r === "9:16" ? (
                            <div className={`w-2 h-4 border rounded-[2px] shrink-0 ${currentProjectRatio === r ? "border-black" : "border-zinc-400 group-hover:border-white"}`} />
                          ) : r === "16:9" ? (
                            <div className={`w-4 h-2.5 border rounded-[2px] shrink-0 ${currentProjectRatio === r ? "border-black" : "border-zinc-400 group-hover:border-white"}`} />
                          ) : (
                            <div className={`w-3 h-3 border rounded-[2px] shrink-0 ${currentProjectRatio === r ? "border-black" : "border-zinc-400 group-hover:border-white"}`} />
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-normal">{r}</span>
                            <span className={`text-[9px] font-medium leading-none mt-0.5 ${currentProjectRatio === r ? "text-zinc-700" : "text-zinc-500 group-hover:text-zinc-300"}`}>{label}</span>
                          </div>
                        </div>
                        {currentProjectRatio === r && (
                          <Check size={14} className="text-black stroke-[3]" />
                        )}
                      </button>
                    ))}

                    <div className="h-px bg-white/10 my-2.5"></div>
                    <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider mb-2 px-1">
                      Custom Ratio
                    </div>
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="W"
                          className="bg-zinc-900 w-full text-center text-xs text-white outline-none font-bold py-2 rounded-lg border border-white/10 focus:border-white/30"
                          value={customRatioW}
                          onChange={(e) => setCustomRatioW(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="absolute right-1 top-1 text-[8px] font-bold text-zinc-600">W</span>
                      </div>
                      <span className="text-zinc-600 text-xs font-bold">:</span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="H"
                          className="bg-zinc-900 w-full text-center text-xs text-white outline-none font-bold py-2 rounded-lg border border-white/10 focus:border-white/30"
                          value={customRatioH}
                          onChange={(e) => setCustomRatioH(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="absolute right-1 top-1 text-[8px] font-bold text-zinc-600">H</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const w = parseInt(customRatioW);
                          const h = parseInt(customRatioH);
                          if (w > 0 && h > 0) {
                            const newRatio = `${w}:${h}`;
                            setCurrentProjectRatio(newRatio);
                            setIsRatioExpanded(false);
                            showToast(`Ratio changed to ${newRatio}`);
                          } else {
                            showToast("Enter valid W & H");
                          }
                        }}
                        className="bg-white hover:bg-zinc-100 text-black rounded-lg text-[10px] font-black px-2.5 py-2.5 transition-colors shadow-md shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
          
        <div className="flex items-center pointer-events-auto">
          <div className="relative">
            <button
              onClick={() => setIsExportExpanded(!isExportExpanded)}
              className="bg-white text-black px-4 h-[28px] rounded-full text-[10px] font-bold shadow hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              EXPORT
            </button>

            <AnimatePresence>
              {isExportExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-[calc(100%+8px)] right-0 bg-zinc-800 border border-white/10 shadow-2xl rounded-2xl w-[200px] flex flex-col p-2 z-[150] origin-top-right overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] font-semibold text-white/50">
                      Resolution
                    </span>
                    <select
                      className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer hover:text-yellow-400 transition-colors text-right"
                      value={exportResolution}
                      onChange={(e) => setExportResolution(e.target.value)}
                    >
                      <option value="1080p" className="bg-zinc-800 text-white">
                        1080p
                      </option>
                      <option value="2K" className="bg-zinc-800 text-white">
                        2K
                      </option>
                      <option value="4K" className="bg-zinc-800 text-white">
                        4K
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] font-semibold text-white/50">
                      Frame Rate
                    </span>
                    <select
                      className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer hover:text-yellow-400 transition-colors text-right"
                      value={exportFps}
                      onChange={(e) => setExportFps(e.target.value)}
                    >
                      <option value="24" className="bg-zinc-800 text-white">
                        24 fps
                      </option>
                      <option value="30" className="bg-zinc-800 text-white">
                        30 fps
                      </option>
                      <option value="60" className="bg-zinc-800 text-white">
                        60 fps
                      </option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 mb-2">
                    <span className="text-[11px] font-semibold text-white/50">
                      Bitrate
                    </span>
                    <select
                      className="bg-transparent text-white text-[11px] font-semibold outline-none cursor-pointer hover:text-yellow-400 transition-colors text-right"
                      value={exportBitrate}
                      onChange={(e) => setExportBitrate(e.target.value)}
                    >
                      <option value="Smart" className="bg-zinc-800 text-white">
                        Smart
                      </option>
                      <option value="High" className="bg-zinc-800 text-white">
                        High
                      </option>
                      <option value="Max" className="bg-zinc-800 text-white">
                        Max
                      </option>
                    </select>
                  </div>
                  <div className="flex flex-col px-3 py-2 border-t border-white/10 mb-2">
                    <span className="text-[11px] font-semibold text-white/90 mb-1">
                      Frame Interpolation
                    </span>
                    <label className="flex items-center justify-between cursor-pointer group mt-1">
                      <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors">
                        Smooth Slow-Mo (Optical Flow)
                      </span>
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={exportOpticalFlow}
                          onChange={(e) =>
                            setExportOpticalFlow(e.target.checked)
                          }
                        />
                        <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                      </div>
                    </label>
                  </div>
                  <button
                    onClick={startExport}
                    className="w-full bg-white text-black py-2.5 rounded-xl text-[11px] font-bold shadow hover:bg-zinc-200 transition-colors active:scale-95 mt-1"
                  >
                    Start Export
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Preview Area */}
      <main className="flex-1 min-h-0 flex flex-col pt-2 pb-4 relative z-[80] bg-[#1e1e20]">
        <div className="flex-1 min-h-0 relative flex items-center justify-center px-4">
          <div className="relative w-full h-full flex items-center justify-center">
            <svg
              viewBox={`0 0 ${currentProjectRatio.split(":")[0]} ${currentProjectRatio.split(":")[1]}`}
              className="max-w-full max-h-full h-[100%] pointer-events-none opacity-0"
            />
            <motion.div
              id="preview-screen"
              layoutId="preview-screen"
              onTouchStart={handlePreviewTouchStart}
              onTouchMove={handlePreviewTouchMove}
              onTouchEnd={handlePreviewTouchEnd}
              onTouchCancel={handlePreviewTouchEnd}
              className="absolute top-0 bottom-0 left-0 right-0 m-auto bg-black rounded-3xl overflow-hidden shadow-[20px_20px_60px_rgba(0,0,0,0.5)] border border-white/10"
              style={{
                aspectRatio: currentProjectRatio.replace(":", "/"),
                maxHeight: "100%",
                maxWidth: "100%",
                touchAction: "none"
              }}
            >
            {/* Media Rendering */}
            {[...visibleLayers].reverse().map((layer) => {
              if (layer.isHidden) return null;
              const layerClips = clips.filter((c) => c.layerId === layer.id);
              // Find active clip
              const activeClipRaw = layerClips.find(
                (c) =>
                  currentTime >= c.leftSeconds &&
                  currentTime <= c.leftSeconds + c.durationSeconds,
              );

              if (!activeClipRaw) return null;

              const interpolatedProps = getInterpolatedProps(activeClipRaw, currentTime - activeClipRaw.leftSeconds, activeExpandedMenu);
              const activeClip = { ...activeClipRaw, ...interpolatedProps };

              const getClipPath = (maskType?: string) => {
                switch (maskType) {
                  case "circle":
                    return "circle(50% at 50% 50%)";
                  case "square":
                    return "inset(15% 15% 15% 15%)";
                  case "rounded":
                    return "inset(5% 5% 5% 5% round 15%)";
                  default:
                    return "none";
                }
              };

              const transformStyle: React.CSSProperties = {
                transform: `translate(${activeClip.translateX || 0}px, ${activeClip.translateY || 0}px) rotate(${activeClip.rotation || 0}deg) scale(${activeClip.scale ?? 1})`,
                clipPath: getClipPath(activeClip.maskType),
                opacity: activeClip.opacity ?? 1,
                mixBlendMode: activeClip.mixBlendMode as any || "normal",
                ...(activeClip.cropRatio ? { aspectRatio: activeClip.cropRatio.replace(":", "/") } : {})
              };

              return (
                <div
                  key={layer.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  {erroredClips.has(activeClip.id) &&
                  activeClip.type !== "text" ? (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center bg-[#171719] border border-red-500/50 m-4 rounded-[32px] overflow-hidden"
                      style={transformStyle}
                    >
                      <AlertCircle className="text-red-500 mb-2" size={32} />
                      <span className="text-red-400 text-sm font-bold">
                        File missing
                      </span>
                    </div>
                  ) : (
                    <>
                      {activeClip.type === "text" && (
                        <div
                          id={`clip-media-${activeClip.id}`}
                          className="flex items-center justify-center w-full h-full font-sans break-words whitespace-pre-wrap text-center overflow-hidden"
                          style={{
                            ...transformStyle,
                            color: activeClip.color || "#ffffff",
                            fontSize: `${activeClip.fontSize || 48}px`,
                            fontFamily: activeClip.fontFamily || "sans-serif",
                            ...(activeClip.textAnimation === "Fade In" ? { opacity: (activeClip.opacity ?? 1) * Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1) } : {}),
                            ...(activeClip.textAnimation === "Slide Up" ? { 
                                opacity: (activeClip.opacity ?? 1) * Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1),
                                transform: `${transformStyle.transform} translateY(${(1 - Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1)) * 50}px)`
                            } : {}),
                            ...(activeClip.textAnimation === "Bounce" ? { 
                                opacity: (activeClip.opacity ?? 1) * Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1),
                                transform: `${transformStyle.transform} translateY(${-(Math.sin(Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1) * Math.PI) * 20 * (1-Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 1)))}px)`
                            } : {})
                          }}
                        >
                          <span
                             className={`pointer-events-none select-none ${!activeClip.text ? 'opacity-40 italic' : ''}`}>
                             {activeClip.text ? (
                               activeClip.textAnimation === "Typewriter" 
                                 ? (activeClip.text || "").substring(0, Math.floor(Math.min(1, (currentTime - activeClipRaw.leftSeconds) / 2) * (activeClip.text || "").length))
                                 : activeClip.text
                             ) : (selectedClipId === activeClip.id ? "Type text..." : "")}
                          </span>
                        </div>
                      )}
                      {activeClip.type === "image" && (
                        <div
                          className="pointer-events-none select-none overflow-hidden max-w-full max-h-full flex items-center justify-center relative shadow-lg"
                          style={{
                               ...transformStyle,
                               ...(activeClip.cropRatio ? {
                                  width: activeClip.cropRatio === "16:9" ? "100%" : activeClip.cropRatio === "9:16" ? "auto" : activeClip.cropRatio === "1:1" ? "auto" : "100%",
                                  height: activeClip.cropRatio ? (activeClip.cropRatio === "16:9" ? "auto" : activeClip.cropRatio === "9:16" ? "100%" : activeClip.cropRatio === "1:1" ? "100%" : "100%") : '100%',
                               } : { width: '100%', height: '100%' }),
                          }}
                        >
                          <img
                            id={`clip-media-${activeClip.id}`}
                            src={activeClip.src}
                            className="w-full h-full object-cover pointer-events-none"
                            crossOrigin="anonymous"
                            onError={() => handleClipError(activeClip.id)}
                          />
                          {activeExpandedMenu === "crop" && selectedClipId === activeClip.id && (
                             <div className="absolute inset-0 pointer-events-none border-2 border-white grid grid-cols-3 grid-rows-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div></div>
                             </div>
                          )}
                        </div>
                      )}
                      {activeClip.type === "video" && (
                        <div
                          className="pointer-events-none select-none overflow-hidden max-w-full max-h-full flex items-center justify-center relative shadow-lg"
                          style={{
                               ...transformStyle,
                               ...(activeClip.cropRatio ? {
                                  width: activeClip.cropRatio === "16:9" ? "100%" : activeClip.cropRatio === "9:16" ? "auto" : activeClip.cropRatio === "1:1" ? "auto" : "100%",
                                  height: activeClip.cropRatio ? (activeClip.cropRatio === "16:9" ? "auto" : activeClip.cropRatio === "9:16" ? "100%" : activeClip.cropRatio === "1:1" ? "100%" : "100%") : '100%',
                               } : { width: '100%', height: '100%' }),
                          }}
                        >
                          <VideoRenderer
                            id={`clip-media-${activeClip.id}`}
                            clip={activeClip}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            isMuted={layer.isMuted}
                            className="w-full h-full object-cover pointer-events-none"
                            onError={() => handleClipError(activeClip.id)}
                          />
                          {activeExpandedMenu === "crop" && selectedClipId === activeClip.id && (
                             <div className="absolute inset-0 pointer-events-none border-2 border-white grid grid-cols-3 grid-rows-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-50">
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-r border-b border-white/40"></div>
                               <div className="border-b border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div className="border-r border-white/40"></div>
                               <div></div>
                             </div>
                          )}
                        </div>
                      )}
                      {activeClip.type === "audio" && (
                        <AudioRenderer
                          clip={activeClip}
                          currentTime={currentTime}
                          isPlaying={isPlaying}
                          isMuted={layer.isMuted}
                          onError={() => handleClipError(activeClip.id)}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </motion.div>
          </div>
        </div>

        {/* Playback Transport Controls */}
        <div 
          className="flex justify-between items-center shrink-0 w-full"
          style={{
            paddingRight: "7px",
            paddingLeft: "5px",
            height: "40px",
            marginTop: "0px",
            marginLeft: "0px",
            paddingTop: "29px",
            paddingBottom: "0px"
          }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-zinc-300 font-mono text-[10px] sm:text-xs tracking-wider opacity-80 min-w-[40px] sm:min-w-[50px]">
              {formatTime(currentTime)}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                className="w-6 h-6 sm:w-8 sm:h-8 bg-zinc-800 text-white rounded-full shadow flex items-center justify-center hover:bg-zinc-700 transition-colors m-0"
                onClick={() => {
                  setCurrentTime(0);
                  setPlayheadX(0);
                  playheadXRef.current = 0;
                  if (timelineScrollRef.current) {
                    timelineScrollRef.current.scrollLeft = 0;
                  }
                }}
                title="Go to Start"
              >
                <SkipBack size={12} fill="currentColor" />
              </button>
              <button
                className="w-7 h-7 sm:w-9 sm:h-9 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform m-0 pl-0 pr-[4px]"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause size={14} fill="currentColor" />
                ) : (
                  <Play size={14} fill="currentColor" className="ml-[4px] sm:ml-[6px]" />
                )}
              </button>
            </div>
            
            {selectedClipId && clips.find(c => c.id === selectedClipId)?.type === "text" && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-2 overflow-hidden"
              >
                <input
                  type="text"
                  value={clips.find((c) => c.id === selectedClipId)?.text || ""}
                  onChange={(e) => {
                    setClips((prev) =>
                      prev.map((c) =>
                        c.id === selectedClipId ? { ...c, text: e.target.value } : c
                      )
                    );
                  }}
                  placeholder="Enter text..."
                  className="bg-zinc-800 border border-white/10 rounded-full px-4 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:bg-zinc-700 transition-all placeholder:text-zinc-500 shadow-inner w-[140px] sm:w-[180px]"
                />
              </motion.div>
            )}
          </div>
          <div className="flex items-center">
            <div className="flex bg-zinc-800 rounded-full px-0.5 py-0.5 mr-1 sm:px-1 sm:py-1 sm:mr-2">
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={!selectedClipId}
                onClick={handleToggleKeyframe}
              >
                <Diamond size={12} className={isAtKeyframe ? "fill-white" : ""} />
              </button>
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${(selectedClipId && isBetweenKeyframes) ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={!selectedClipId || !isBetweenKeyframes}
                onClick={() => setShowKeyframeGraph(!showKeyframeGraph)}
              >
                <LineChart size={12} />
              </button>
            </div>
            <div className="flex bg-zinc-800 rounded-full px-0.5 py-0.5 mr-1 sm:px-1 sm:py-1 sm:mr-2">
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${selectedClipId ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={!selectedClipId}
                onClick={splitSelectedClip}
              >
                <Scissors size={12} />
              </button>
              <div className="w-px h-3 sm:h-4 bg-zinc-700 mx-0.5 sm:mx-1 my-auto"></div>
              <button
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${selectedClipIds.length > 0 ? "hover:bg-zinc-700 text-white" : "opacity-30"}`}
                disabled={selectedClipIds.length === 0}
                onClick={deleteSelectedClip}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex bg-zinc-800 rounded-full px-0.5 py-0.5 sm:px-1 sm:py-1">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${historyIndex <= 0 ? "opacity-30" : "hover:bg-zinc-700"}`}
              >
                <Undo2 size={12} />
              </button>
              <div className="w-px h-3 sm:h-4 bg-zinc-700 mx-0.5 sm:mx-1 my-auto"></div>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className={`p-1 sm:p-1.5 rounded-full transition-colors ${historyIndex >= history.length - 1 ? "opacity-30" : "hover:bg-zinc-700"}`}
              >
                <Redo2 size={12} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Horizontal Splitter */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent relative z-[80] bg-[#1e1e20]"></div>

      {/* Editor Timeline Space */}
      <div className="h-[40vh] shrink-0 bg-[#171719] flex flex-col relative w-full select-none z-0 overflow-hidden">
        {/* Timeline Content Flex Container */}
        <div
          id="master-vertical-scroll"
          ref={timelineScrollRef}
          className="flex-1 w-full relative overflow-auto scrollbar-hide bg-[#171719]"
          style={{ touchAction: "pan-x pan-y" }}
          onScroll={(e) => {
            if (!isPlayingRef.current) {
              setCurrentTime(
                (e.currentTarget.scrollLeft + playheadXRef.current) /
                  currentPixelsPerSecondRef.current,
              );
            }
          }}
        >
          <div className="flex min-h-full min-w-max relative w-[fit-content]">
            {/* Left Layer Control Panel */}
            <div className="w-[100px] shrink-0 flex flex-col border-r border-white/5 bg-[#171719] z-[70] sticky left-0 pb-[200px] shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
              <div className="text-[9px] uppercase tracking-widest text-zinc-500 text-center font-bold sticky top-0 w-full z-[80] bg-[#171719] h-[20px] flex items-center justify-center border-b border-white/5 shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                Layers
              </div>

              <div id="layers-sidebar" className="flex flex-col flex-1">
                {visibleLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`h-[32px] sm:h-[38px] flex flex-col items-center justify-center shrink-0 border-b group py-1 relative transition-all transform-gpu ${draggingLayerId === layer.id ? "bg-indigo-500/20 border-indigo-500/50 scale-[1.02] z-50 shadow-xl" : "bg-zinc-800/20 border-white/5 backdrop-blur-sm z-10"}`}
                  >
                    <div className="flex gap-0.5 sm:gap-1 items-center">
                      <button
                        onClick={() => toggleLayerMute(layer.id)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${layer.isMuted ? "text-red-400 bg-red-400/10" : "text-zinc-400 hover:text-white"}`}
                      >
                        {layer.isMuted ? (
                          <VolumeX size={13} sm:size={14} />
                        ) : (
                          <Volume2 size={13} sm:size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${layer.isHidden ? "text-blue-400 bg-blue-400/10" : "text-zinc-400 hover:text-white"}`}
                      >
                        {layer.isHidden ? (
                          <EyeOff size={13} sm:size={14} />
                        ) : (
                          <Eye size={13} sm:size={14} />
                        )}
                      </button>
                      <div
                        onPointerDown={(e) =>
                          handleLayerPointerDown(e, layer.id)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasDraggedLayerRef.current) {
                            setLayerMenuOpenId(layerMenuOpenId === layer.id ? null : layer.id);
                          }
                        }}
                        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full cursor-grab touch-none transition-colors ${layerMenuOpenId === layer.id || draggingLayerId === layer.id ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
                      >
                        <MoreVertical size={13} sm:size={14} />
                      </div>
                    </div>

                    {/* Layer Options Menu */}
                    <AnimatePresence>
                      {layerMenuOpenId === layer.id && (
                        <>
                          <div
                            className="fixed inset-0 z-[60]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayerMenuOpenId(null);
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: -10 }}
                            className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[70] bg-zinc-800 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col w-[120px]"
                          >
                            <button
                              className="px-3 py-2 text-xs text-left text-zinc-300 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers((prev) => {
                                  const sorted = [...prev].sort(
                                    (a, b) => b.order - a.order,
                                  );
                                  const visIdx = sorted.findIndex(
                                    (l) => l.id === layer.id,
                                  );
                                  // insert new layer right above this one visually (so order is between this and the one above)
                                  let newOrder = layer.order + 0.5;
                                  if (visIdx > 0) {
                                    newOrder =
                                      (layer.order + sorted[visIdx - 1].order) /
                                      2;
                                  } else {
                                    newOrder = layer.order + 1;
                                  }
                                  return [
                                    ...prev,
                                    {
                                      id: "L_" + Date.now(),
                                      order: newOrder,
                                      isMuted: false,
                                      isHidden: false,
                                    },
                                  ];
                                });
                                setLayerMenuOpenId(null);
                              }}
                            >
                              <PlusIcon size={12} /> Add Up
                            </button>
                            <button
                              className="px-3 py-2 text-xs text-left text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayerMenuOpenId(null);
                              }}
                            >
                              Decide Later
                            </button>
                            <button
                              className="px-3 py-2 text-xs text-left text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-2 border-t border-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers((prev) =>
                                  prev.filter((l) => l.id !== layer.id),
                                );
                                setClips((prev) =>
                                  prev.filter((c) => c.layerId !== layer.id),
                                );
                                setLayerMenuOpenId(null);
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                <div
                  className="h-[44px] sm:h-[50px] flex items-center justify-center shrink-0 border-b border-white/5 bg-zinc-800/10 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => {
                    setLayers((prev) => {
                      const maxOrder = prev.reduce(
                        (max, l) => Math.max(max, l.order),
                        -1,
                      );
                      return [
                        ...prev,
                        {
                          id: "L_" + Date.now(),
                          order: maxOrder + 1,
                          isMuted: false,
                          isHidden: false,
                        },
                      ];
                    });
                  }}
                >
                  <PlusIcon
                    size={16}
                    className="text-zinc-500 hover:text-white"
                  />
                </div>
              </div>
            </div>

            {/* STATIONARY PLAYHEAD (Now perfectly aligned) */}
            {layers.length > 0 && (
              <div
                className="sticky top-0 left-[100px] pointer-events-none z-[60] w-0 h-0"
                style={{ transform: `translateX(${playheadX}px)` }}
              >
                <div className="absolute top-0 -translate-x-[1px] flex flex-col items-center">
                  <div
                    className="w-[14px] h-[15px] bg-red-500 relative flex items-end justify-center"
                    style={{
                      clipPath:
                        "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)",
                    }}
                  >
                    <div className="w-[4px] h-[4px] bg-red-950/30 rounded-full mb-[5px]"></div>
                  </div>
                </div>
                <div className="absolute top-0 left-0 transform -translate-x-[1px] w-[1.5px] bg-red-500 h-[100vh] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>
            )}

            {/* Right Scrollable Timeline Container */}
            <div className="flex-1 relative flex flex-col min-w-max pt-[0px]">
              {/* sticky wrapper for Ruler */}
              {layers.length > 0 && (
                <div
                  id="ruler-container"
                  className="sticky top-0 z-[50] h-[20px] bg-[#171719] border-b border-white/5 cursor-pointer hover:bg-[#222] transition-colors"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setIsPlaying(false);
                    const target = e.currentTarget;
                    target.setPointerCapture(e.pointerId);

                    const updateSeek = (clientX: number) => {
                      const rx = clientX - 100;
                      const rect = target.getBoundingClientRect();
                      const x = rx + timelineScrollRef.current!.scrollLeft;
                      const newTime = Math.max(
                        0,
                        x / currentPixelsPerSecondRef.current,
                      );
                      setCurrentTime(newTime);

                      setPlayheadX(Math.max(0, rx));
                      playheadXRef.current = Math.max(0, rx);
                    };
                    updateSeek(e.clientX);

                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      updateSeek(moveEvent.clientX);
                    };
                    const handlePointerUp = (upEvent: PointerEvent) => {
                      target.releasePointerCapture(upEvent.pointerId);
                      window.removeEventListener(
                        "pointermove",
                        handlePointerMove,
                      );
                      window.removeEventListener("pointerup", handlePointerUp);
                    };
                    window.addEventListener("pointermove", handlePointerMove);
                    window.addEventListener("pointerup", handlePointerUp);
                  }}
                >
                  <div
                    className="relative h-full"
                    style={{
                      width: `${maxTimelineDuration * pixelsPerSecond}px`,
                    }}
                  >
                    {Array.from({ length: Math.ceil(maxTimelineDuration) }).map(
                      (_, i) => {
                        let step = 1;
                        if (pixelsPerSecond < 10) step = 30; // very zoomed out
                        else if (pixelsPerSecond < 20) step = 10;
                        else if (pixelsPerSecond < 35) step = 5;
                        else if (pixelsPerSecond < 70) step = 2; // normal default is 100
                        
                        const showText = i % step === 0;

                        // Skip rendering the tick entirely if it's too squished
                        const hideTick = pixelsPerSecond < 5 && i % 5 !== 0;
                        if (hideTick) return null;

                        return (
                          <div
                            key={i}
                            className="absolute h-full border-l border-zinc-600/80 pointer-events-none"
                            style={{ left: `${i * pixelsPerSecond}px` }}
                          >
                            {showText && (
                              <span
                                className="absolute -left-[4px] top-[2px] text-[9px] text-zinc-300 font-medium font-mono pl-1 bg-transparent px-1 rounded line-height-none leading-none"
                                style={{ textShadow: "none" }}
                              >
                                {i < 60 ? i.toString() : `${Math.floor(i/60)}:${(i%60).toString().padStart(2,"0")}`}
                              </span>
                            )}
                            {/* Sub-ticks for zoom */}
                            {zoomLevel >= 3 && Array.from({ length: 9 }).map((_, subIndex) => {
                              const isHalf = subIndex === 4;
                              return (
                                <div
                                  key={subIndex}
                                  className={`absolute bottom-0 w-px ${isHalf ? "bg-zinc-500" : "bg-zinc-700/80"} pointer-events-none`}
                                  style={{
                                    left: `${(subIndex + 1) * (pixelsPerSecond / 10)}px`,
                                    height: isHalf ? "10px" : "5px",
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
              <div
                className="w-full h-full relative"
                onPointerDown={(e) => {
                  setIsPlaying(false);
                  pointerMoveCanvasRef.current = false;
                  setPastePopup(null);

                  const target = e.target as Element;
                  const isEmptySpace =
                    e.target === e.currentTarget ||
                    target.id === "timeline-content" ||
                    target.id === "timeline-inner" ||
                    target.closest(".track-space");

                  let clickTime = currentTime;
                  const innerRect = document
                    .getElementById("timeline-inner")
                    ?.getBoundingClientRect();
                  if (innerRect) {
                    const x = e.clientX - innerRect.left;
                    clickTime = Math.max(
                      0,
                      x / currentPixelsPerSecondRef.current,
                    );
                  }

                  if (isEmptySpace) {
                    setSelectedClipId(null);

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const pointerId = e.pointerId;
                    const isMouse = e.pointerType === "mouse";
                    const masterScroll = timelineScrollRef.current;
                    if (!masterScroll) return;

                    const startScrollLeft = masterScroll.scrollLeft;
                    const startScrollTop = masterScroll.scrollTop;
                    const rect = document.getElementById("timeline-inner")?.getBoundingClientRect() || {left:0, top:0};

                    const container = e.currentTarget as HTMLElement;
                    container.setPointerCapture(pointerId);

                    let hasMoved = false;
                    let isMarquee = false;

                    const handlePointerMove = (moveEvent: PointerEvent) => {
                      pointerMoveCanvasRef.current = true;
                      const deltaX = moveEvent.clientX - startX;
                      const deltaY = moveEvent.clientY - startY;

                      if (!isMarquee) {
                        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                          hasMoved = true;
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          // Only polyfill scroll for mouse, touch is native pan
                          if (isMouse) {
                            masterScroll.scrollLeft = startScrollLeft - deltaX;
                            masterScroll.scrollTop = startScrollTop - deltaY;
                          }
                        }
                      } else {
                        // Marquee Selection Mode!
                        if (!isMouse) moveEvent.preventDefault(); // attempt to stop scroll on touch if we can

                        const curX = moveEvent.clientX - rect.left + masterScroll.scrollLeft;
                        const curY = moveEvent.clientY - rect.top + masterScroll.scrollTop;
                        const absStartX = startX - rect.left + masterScroll.scrollLeft;
                        const absStartY = startY - rect.top + masterScroll.scrollTop;

                        setMarquee({ startX: absStartX, startY: absStartY, currentX: curX, currentY: curY });

                        // Check Intersections
                        const minX = Math.min(absStartX, curX);
                        const maxX = Math.max(absStartX, curX);
                        const minY = Math.min(absStartY, curY);
                        const maxY = Math.max(absStartY, curY);

                        const newSelected: string[] = [];
                        const layerMap = new Map();
                        visibleLayers.forEach((l, i) => layerMap.set(l.id, i));

                        clips.forEach(clip => {
                           const lidx = layerMap.get(clip.layerId);
                           if (lidx === undefined) return;
                           const cLeft = clip.leftSeconds * currentPixelsPerSecondRef.current;
                           const cRight = cLeft + clip.durationSeconds * currentPixelsPerSecondRef.current;
                           const rowHeight = window.innerWidth >= 640 ? 48 : 40;
                           const clipHeight = window.innerWidth >= 640 ? 36 : 30;
                           const cTop = 32 + lidx * rowHeight;
                           const cBottom = cTop + clipHeight;

                           if (cLeft < maxX && cRight > minX && cTop < maxY && cBottom > minY) {
                               newSelected.push(clip.id);
                           }
                        });

                        setSelectedClipIds(newSelected);
                      }
                    };

                    const handlePointerUp = (upEvent: PointerEvent) => {
                      if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                      
                      if (isMarquee) {
                        setMarquee(null);
                      } else if (!hasMoved && copiedClip) {
                        // Handle paste popup exactly as before if no drag occurred
                        const trackElement = target.closest(".track-space");
                        const layerId = trackElement?.getAttribute("data-layer-id") || undefined;
                        setPastePopup({
                          x: startX,
                          y: startY,
                          time: clickTime,
                          layerId,
                        });
                      }

                      container.releasePointerCapture(upEvent.pointerId);
                      window.removeEventListener("pointermove", handlePointerMove);
                      window.removeEventListener("pointerup", handlePointerUp);
                      window.removeEventListener("pointercancel", handlePointerUp);
                    };

                    window.addEventListener("pointermove", handlePointerMove, { passive: false });
                    window.addEventListener("pointerup", handlePointerUp);
                    window.addEventListener("pointercancel", handlePointerUp);

                    // Start Long Press Timer for Marquee
                    longPressTimerRef.current = setTimeout(() => {
                      if (!hasMoved) {
                        isMarquee = true;
                        const absStartX = startX - rect.left + masterScroll.scrollLeft;
                        const absStartY = startY - rect.top + masterScroll.scrollTop;
                        setMarquee({ startX: absStartX, startY: absStartY, currentX: absStartX, currentY: absStartY });
                      }
                    }, 350);
                  }
                }}
                onPointerMove={() => {
                  pointerMoveCanvasRef.current = true;
                }}
                onPointerUp={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onPointerLeave={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
              >
                {/* Scroll Content Width defined by max duration */}
                <div
                  id="timeline-content"
                  className="min-h-full min-w-full flex flex-col"
                  style={{
                    paddingRight: "calc(100vw - 100px)",
                    paddingBottom: "0px",
                    width: "fit-content",
                    boxSizing: "content-box",
                  }}
                >
                  <div
                    id="timeline-inner"
                    className="relative min-h-full w-full"
                    style={{
                      width: `${maxTimelineDuration * pixelsPerSecond}px`,
                    }}
                  >
                    {/* Moving Playhead Cursor Removed (Now stationary in parent) */}

                    {/* Tracks Grid Area */}
                    <div
                      className="w-full pb-[200px] relative z-10"
                      style={{ paddingTop: "0" }}
                    >
                      {visibleLayers.map((layer) => (
                        <div
                          key={layer.id}
                          data-layer-id={layer.id}
                          className={`relative h-[32px] sm:h-[38px] w-full border-b flex items-center group track-space transition-[background,transform,border,shadow] transform-gpu ${draggingLayerId === layer.id ? "bg-indigo-500/10 border-indigo-500/30 scale-[1.02] shadow-xl z-50 rounded-lg overflow-hidden" : "border-white/5 z-0"}`}
                        >
                          {/* Grid Background */}
                          <div
                            className="absolute inset-0 pointer-events-none opacity-20"
                            style={{
                              backgroundImage:
                                zoomLevel > 1
                                  ? `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px)`
                                  : `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                              backgroundSize:
                                zoomLevel > 1
                                  ? `${pixelsPerSecond}px 100%, ${pixelsPerSecond / 10}px 100%`
                                  : `${pixelsPerSecond}px 100%`,
                              backgroundPosition: `0 0`,
                            }}
                          />

                          {/* Render Clips for this layer */}
                          {clips
                            .filter((c) => c.layerId === layer.id)
                            .map((clip) => (
                              <div
                                key={clip.id}
                                onPointerDown={(e) =>
                                  handleClipDragStart(e, clip)
                                }
                                className={`absolute h-[28px] sm:h-[34px] overflow-hidden flex items-center cursor-pointer select-none border backdrop-blur-sm transition-shadow duration-300
                                           ${clip.type === "audio" ? "rounded-2xl bg-[#2b0e45]/95 border-purple-500/25" : "rounded-lg"}
                                           ${clip.type === "video" ? "bg-gradient-to-r from-blue-900/80 to-indigo-900/60 border-white/10" : ""}
                                           ${clip.type === "text" ? "bg-gradient-to-r from-amber-900/80 to-orange-900/60 border-white/10" : ""}
                                           ${clip.type === "image" ? "bg-gradient-to-r from-emerald-900/80 to-teal-900/60 border-white/10" : ""}
                                           ${selectedClipIds.includes(clip.id) ? (clip.type === "audio" ? "z-20 opacity-100 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-gradient-to-b from-[#3a155c] to-[#250a3b]" : "z-20 opacity-100 border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.1)] bg-white/5") : "z-10 opacity-90 hover:opacity-100 border-white/10 hover:border-white/20"}
                                           ${layer.isHidden || (layer.isMuted && clip.type === "audio") ? "grayscale opacity-30 shadow-none" : ""}
                                         `}
                                style={{
                                  left: clip.leftSeconds * pixelsPerSecond,
                                  width: Math.max(2, clip.durationSeconds * pixelsPerSecond),
                                  touchAction: "none",
                                }}
                              >
                                <div className="absolute inset-0 bg-black/10 pointer-events-none z-10"></div>
                                {clip.type === "text" && (
                                  <div className="w-full h-full flex items-center justify-center px-4 pointer-events-none overflow-hidden pb-1 pt-3">
                                    <span className="text-[12px] font-bold text-white/90 truncate drop-shadow-sm bg-black/40 px-2 py-0.5 rounded border border-white/10">
                                      {clip.text || "Type text..."}
                                    </span>
                                  </div>
                                )}
                                {clip.type === "image" && (
                                  <>
                                    <img
                                      src={clip.src}
                                      className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
                                      draggable={false}
                                      onError={() => handleClipError(clip.id)}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-10"></div>
                                  </>
                                )}
                                {clip.type === "video" && (
                                  <>
                                    <video
                                      src={clip.src + "#t=0.001"}
                                      className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
                                      draggable={false}
                                      preload="metadata"
                                      onError={() => handleClipError(clip.id)}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none z-10"></div>
                                  </>
                                )}
                                {clip.type === "audio" && (() => {
                                  const seed = clip.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                  const freq1 = 0.07 + (seed % 7) * 0.015;
                                  const freq2 = 0.14 + (seed % 11) * 0.012;
                                  const freq3 = 0.03 + (seed % 5) * 0.008;

                                  const hasVolumeKeyframes = clip.keyframes?.some(k => k.properties.volume !== undefined);
                                  const constantVolume = typeof clip.volume === "number" ? clip.volume : 100;
                                  const constantVolMult = constantVolume / 100;

                                  const barCount = 140;
                                  let pathD = "";

                                  for (let i = 0; i < barCount; i++) {
                                    const h1 = Math.sin(i * freq1);
                                    const h2 = Math.cos(i * freq2);
                                    const h3 = Math.sin(i * freq3);
                                    
                                    // Generate a premium fluid song acoustic pattern
                                    let val = 0.12 + 0.38 * Math.abs(h1) + 0.32 * Math.abs(h2 * h3) + 0.12 * Math.sin(i * 0.3);
                                    val = Math.max(0.06, Math.min(0.95, val));

                                    // Check volume at this slice of the audio duration
                                    let volMult = constantVolMult;
                                    if (hasVolumeKeyframes && clip.durationSeconds) {
                                      const tRel = (i / (barCount - 1)) * clip.durationSeconds;
                                      const propsAtBar = getInterpolatedProps(clip, tRel, activeExpandedMenu);
                                      volMult = (propsAtBar.volume ?? 100) / 100;
                                    }
                                    
                                    const finalVal = val * volMult;
                                    const x = i * 10 + 5;
                                    const halfH = finalVal * 42; // Vertically symmetric waves scaling up to 42 units up & down
                                    const y1 = 50 - halfH;
                                    const y2 = 50 + halfH;
                                    pathD += `M ${x} ${y1} L ${x} ${y2} `;
                                  }

                                  return (
                                    <svg 
                                      className="absolute inset-y-[4px] left-[12px] right-[12px] w-[calc(100%-24px)] h-[calc(100%-8px)] pointer-events-none opacity-[0.88]"
                                      viewBox={`0 0 ${barCount * 10} 100`}
                                      preserveAspectRatio="none"
                                    >
                                      <path
                                        d={pathD}
                                        stroke="#a76ef2"
                                        strokeWidth="3.2"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  );
                                })()}

                                {/* Type indicator icon */}
                                <div className={`absolute max-w-full overflow-hidden whitespace-nowrap pl-2 flex items-center gap-1 ${clip.type === "audio" ? "inset-y-0 z-20 pointer-events-none" : "top-1 pointer-events-none"}`}>
                                  {erroredClips.has(clip.id) &&
                                    clip.type !== "text" && (
                                      <span className="text-[10px] font-bold text-red-100 uppercase drop-shadow-md pb-0.5 px-1 bg-red-500/80 rounded inline-flex items-center gap-1">
                                        <AlertCircle size={10} /> Missing File
                                      </span>
                                    )}
                                  
                                  {clip.type === "audio" ? (
                                    <span className="text-[11px] font-semibold text-purple-100 tracking-wide drop-shadow-sm py-0.5 px-2.5 bg-black/40 border border-purple-500/15 rounded-full inline-flex items-center backdrop-blur-md shadow-inner gap-1.5 ml-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                                      Audio {layer.isHidden && "(Hidden)"} {layer.isMuted && "(Muted)"}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold tracking-wide text-white/90 drop-shadow-sm py-0.5 px-1.5 bg-black/40 border border-white/10 rounded shadow-sm backdrop-blur-md inline-flex items-center">
                                      {clip.type.charAt(0).toUpperCase() + clip.type.slice(1)} {layer.isHidden && "(Hidden)"}{" "}
                                      {layer.isMuted && "(Muted)"}
                                    </span>
                                  )}

                                  {clip.opticalFlow && (
                                    <span className="text-[10px] font-bold text-indigo-200 uppercase drop-shadow-md pb-0.5 px-1 bg-indigo-500/50 rounded inline-flex items-center gap-1">
                                      <Activity size={10} /> Smooth
                                    </span>
                                  )}
                                </div>

                                {/* Keyframe Markers and Slope Connections */}
                                {clip.keyframes && clip.keyframes.length > 0 && (
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
                                    {(() => {
                                      const sortedKfs = [...clip.keyframes].sort((a, b) => a.timeOffset - b.timeOffset);
                                      const isVol = activeExpandedMenu === "volume";
                                      const relevantSortedKfs = sortedKfs.filter(kf => {
                                        if (isVol) {
                                          return kf.properties.volume !== undefined;
                                        } else {
                                          return kf.properties.translateX !== undefined || kf.properties.scale !== undefined;
                                        }
                                      });
                                      const points = relevantSortedKfs.map(kf => {
                                        const xCoord = kf.timeOffset * pixelsPerSecond;
                                        
                                        let val = 1.0;
                                        if (kf.properties.volume !== undefined) {
                                          val = kf.properties.volume > 1.5 ? kf.properties.volume / 100 : kf.properties.volume;
                                        } else if (kf.properties.opacity !== undefined) {
                                          val = kf.properties.opacity;
                                        } else if (kf.properties.scale !== undefined) {
                                          val = (kf.properties.scale - 0.1) / 2.9;
                                        }
                                        val = Math.max(0, Math.min(1, val));
                                        
                                        // keeping it beautifully inset within 9px to 29px in the 38px tall container
                                        const yCoord = 29 - (val * 20); 
                                        return { x: xCoord, y: yCoord, val, kf };
                                      });

                                      let pathD = "";
                                      if (points.length >= 2) {
                                        pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
                                      }

                                      return (
                                        <>
                                          {pathD && (
                                            <>
                                              {/* High-visibility core connecting slope line */}
                                              <path
                                                d={pathD}
                                                fill="none"
                                                stroke="#a5b4fc"
                                                strokeWidth="0.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </>
                                          )}

                                          {points.map((p) => {
                                            const isSelectedKf = selectedClipId === clip.id && Math.abs(currentTime - (clip.leftSeconds + p.kf.timeOffset)) < 0.05;
                                            return (
                                              <g key={p.kf.id} className="transform-gpu">
                                                {/* Soft pulse effect around active keyframe */}
                                                {isSelectedKf && (
                                                  <circle
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r="7"
                                                    fill="none"
                                                    stroke="#818cf8"
                                                    strokeWidth="1.5"
                                                    className="animate-pulse"
                                                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                                  />
                                                )}
                                                {/* Solid contrasting circle node background */}
                                                <circle
                                                  cx={p.x}
                                                  cy={p.y}
                                                  r="5"
                                                  fill="#1e1b4b"
                                                  stroke="none"
                                                />
                                                {/* Vibrant front keyframe circle */}
                                                <circle
                                                  cx={p.x}
                                                  cy={p.y}
                                                  r="3.5"
                                                  fill={isSelectedKf ? "#ffffff" : "#c7d2fe"}
                                                  stroke={isSelectedKf ? "#4f46e5" : "#4338ca"}
                                                  strokeWidth="1.5"
                                                />
                                                {/* Precision value percentage badge above point (visible when selected) */}
                                                {selectedClipId === clip.id && (
                                                  <text
                                                    x={p.x}
                                                    y={p.y - 7}
                                                    textAnchor="middle"
                                                    fill="#ffffff"
                                                    fontSize="7"
                                                    fontWeight="bold"
                                                    className="font-mono pointer-events-none drop-shadow-[0_1px_2.5px_rgba(0,0,0,0.95)] select-none"
                                                    style={{ paintOrder: "stroke", stroke: "#000000", strokeWidth: "1.5px", strokeLinejoin: "round" }}
                                                  >
                                                    {p.kf.properties.volume !== undefined 
                                                      ? `${Math.round((p.kf.properties.volume > 1.5 ? p.kf.properties.volume / 100 : p.kf.properties.volume) * 100)}%` 
                                                      : p.kf.properties.opacity !== undefined 
                                                      ? `${Math.round(p.kf.properties.opacity * 100)}%`
                                                      : p.kf.properties.scale !== undefined
                                                      ? `${Math.round(p.kf.properties.scale * 100)}%`
                                                      : ""
                                                    }
                                                  </text>
                                                )}
                                              </g>
                                            );
                                          })}
                                        </>
                                      );
                                    })()}
                                  </svg>
                                )}

                                {/* Trim Controls for selected */}
                                {selectedClipId === clip.id && (
                                  <>
                                    <div
                                      onPointerDown={(e) =>
                                        handleTrimStart(e, clip, "left")
                                      }
                                      className="absolute left-0 top-0 bottom-0 w-3 bg-white hover:w-4 flex items-center justify-center cursor-col-resize transition-all rounded-r"
                                      style={{ touchAction: "none" }}
                                    >
                                      <div className="w-0.5 h-3 bg-black/50 rounded-full"></div>
                                    </div>
                                    <div
                                      onPointerDown={(e) =>
                                        handleTrimStart(e, clip, "right")
                                      }
                                      className="absolute right-0 top-0 bottom-0 w-3 bg-white hover:w-4 flex items-center justify-center cursor-col-resize transition-all rounded-l"
                                      style={{ touchAction: "none" }}
                                    >
                                      <div className="w-0.5 h-3 bg-black/50 rounded-full"></div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      ))}

                      {/* Empty state instruction inside timeline */}
                      {layers.length === 0 && (
                        <div className="w-full h-[150px] flex flex-col items-center justify-center pt-8 text-zinc-500 gap-3">
                          <PlusCircle size={32} className="opacity-30" />
                          <span className="text-sm font-medium tracking-wide">
                            Tap '+' to add media to your timeline
                          </span>
                        </div>
                      )}

                      {/* Marquee Selection Box */}
                      {marquee && (
                        <div
                          className="absolute bg-white/20 border border-white/50 z-[100] pointer-events-none rounded-[2px]"
                          style={{
                            left: Math.min(marquee.startX, marquee.currentX),
                            top: Math.min(marquee.startY, marquee.currentY),
                            width: Math.abs(marquee.currentX - marquee.startX),
                            height: Math.abs(marquee.currentY - marquee.startY)
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};