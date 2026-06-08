import React from 'react';

export const HomeScreen = (props: any) => {
    const { currentScreen, setCurrentScreen, toastMessage, setToastMessage, projectMenuOpenId, setProjectMenuOpenId, projectToDelete, setProjectToDelete, flowBarOrder, setFlowBarOrder, projects, setProjects, appScale, setAppScale, activeProjectId, setActiveProjectId, isCreatingProject, setIsCreatingProject, selectedRatioTransition, setSelectedRatioTransition, focusedRatio, setFocusedRatio, customRatioW, setCustomRatioW, customRatioH, setCustomRatioH, layers, setLayers, clips, setClips, currentTime, setCurrentTime, isPlaying, setIsPlaying, zoomLevel, setZoomLevel, playheadX, setPlayheadX, activeExpandedMenu, setActiveExpandedMenu, layerMenuOpenId, setLayerMenuOpenId, draggingLayerId, setDraggingLayerId, applyVolumeToAll, setApplyVolumeToAll, clipVolume, setClipVolume, clipSpeed, setClipSpeed, smoothProcessingProgress, setSmoothProcessingProgress, selectedClipIds, setSelectedClipIds, marquee, setMarquee, showKeyframeGraph, setShowKeyframeGraph, isExportExpanded, setIsExportExpanded, pillPopup, setPillPopup, isRatioExpanded, setIsRatioExpanded, exportResolution, setExportResolution, exportFps, setExportFps, exportBitrate, setExportBitrate, exportOpticalFlow, setExportOpticalFlow, erroredClips, setErroredClips, copiedClip, setCopiedClip, pastePopup, setPastePopup, history, setHistory, historyIndex, setHistoryIndex, isExporting, setIsExporting, exportProgress, setExportProgress, exportedVideoUrl, setExportedVideoUrl, exportedVideoBlob, setExportedVideoBlob, handleAppScaleChange, setSelectedClipId, isBetweenKeyframes, handleClipError, undo, redo, playLoop, deltaTime, showToast, drawFn, elapsed, absTranslateX, absTranslateY, handleBackToHome, handlePopState, createProject, duplicateProject, confirmDeleteProject, addMediaClip, handleAddText, deleteSelectedClip, splitSelectedClip, formatTime, handleCopy, handleExtractAudio, handleStabilize, handlePaste, toggleLayerMute, toggleLayerVisibility, handleLayerPointerDown, onPointerMove, onPointerUp, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel, handlePreviewTouchStart, startX, startY, handlePreviewTouchMove, currentX, currentY, deltaX, deltaY, handlePreviewTouchEnd, handleClipDragStart, handlePointerMove, handlePointerUp, handleTrimStart, diff, handleCreateProject, handleMoveFlowBarItem, getFlowBarItemLabel, updateVol, moveHandler, upHandler } = props;


  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden relative">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 scrollbar-hide">
        <div className="min-h-full flex flex-col pb-[120px]">
          {/* Header - ORCA Logo */}
          <div className="pt-20 pb-10 flex justify-center items-center w-full mt-[5vh]">
            <h1 className="text-[72px] font-black tracking-[-0.05em] text-[#A4C6D9]">
              ORCA
            </h1>
          </div>

          {/* Project List */}
          <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full">
            {projects.map((p) => (
              <div
                key={p.id}
                className="relative h-[150px] w-full rounded-[40px] overflow-hidden cursor-pointer shadow-lg active:scale-[0.98] transition-transform group"
                onClick={() => openProject(p)}
              >
                {/* Background Image */}
                <div className="absolute inset-0 bg-zinc-900">
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="w-full h-full object-cover object-left group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                
                {/* Frosted Overlay */}
                <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-2xl transition-opacity duration-300"
                  style={{ 
                    maskImage: 'linear-gradient(to right, transparent 0%, transparent 25%, black 50%, black 100%)', 
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 25%, black 50%, black 100%)' 
                  }}
                ></div>

                {/* Border effect like glass */}
                <div className="absolute inset-0 border-[1.5px] border-white/10 rounded-[40px] pointer-events-none"></div>

                {/* Content inside */}
                <div className="absolute inset-0 flex items-center p-6">
                  {/* Left spacer for clear image */}
                  <div className="w-[30%] h-full shrink-0"></div>

                  {/* Center Content */}
                  <div className="flex-1 flex justify-center items-start flex-col pl-4 sm:pl-8">
                    <h3 className="text-[26px] font-bold text-white tracking-tight mb-1 flex items-center gap-2">
                      {p.name}
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                        <Check size={10} strokeWidth={4} />
                      </span>
                    </h3>
                    <p className="text-[14px] font-medium text-white/60 leading-snug max-w-[220px]">
                      Concept project focusing on simplicity & usability.
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                       <div className="flex items-center gap-1.5 text-white/50 text-xs font-semibold uppercase tracking-wider">
                         <Clock size={13}/>
                         {p.duration}
                       </div>
                    </div>
                  </div>

                  {/* Actions on right */}
                  <div className="flex flex-col items-end justify-center gap-3 pr-2">
                    <button
                      className="h-10 px-5 rounded-full bg-white text-black font-bold text-sm tracking-wide flex items-center justify-center hover:scale-105 transition-transform z-10 shadow-[0_4px_14px_rgba(255,255,255,0.25)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProject(p);
                      }}
                    >
                      Open <ArrowUp size={14} className="rotate-45 ml-1" />
                    </button>
                    <div className="flex gap-2">
                      <button
                        className="w-[38px] h-[38px] rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all z-10 backdrop-blur-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateProject(p);
                        }}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="w-[38px] h-[38px] rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-all z-10 backdrop-blur-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(p.id);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Menu for Home */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center px-6 z-[60] pointer-events-none">
        <div className="w-full max-w-[340px] flex gap-4 pointer-events-auto">
          <AnimatePresence mode="popLayout">
            {!isCreatingProject && (
              <motion.div
                key="new-project"
                role="button"
                layoutId="new-project-btn"
                transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
                onClick={() => setIsCreatingProject(true)}
                className="flex-1 cursor-pointer flex justify-center items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-[0.98] h-[64px] bg-transparent rounded-full text-white font-medium text-xl border-[2px] border-white backdrop-blur-md hover:bg-white/10 transition-colors"
              >
                <span className="pr-2">New Project</span>
              </motion.div>
            )}
            {!isCreatingProject && (
              <motion.div
                key="settings-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setCurrentScreen("settings")}
                className="cursor-pointer shrink-0 w-[64px] h-[64px] rounded-full border-[2px] border-white flex items-center justify-center bg-transparent backdrop-blur-md text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-[0.98] hover:bg-white/10 transition-colors"
              >
                <Settings size={28} />
              </motion.div>
            )}
            {isCreatingProject && (
              <motion.div
                key="create-project"
                role="button"
                layoutId="new-project-btn"
                transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
                onClick={() => handleCreateProject(focusedRatio)}
                className="cursor-pointer pointer-events-auto flex justify-center items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-[0.98] w-full h-[64px] bg-white rounded-full text-black font-bold text-xl"
              >
                <span>Create</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ratio Selection Overlay */}
      <AnimatePresence>
        {isCreatingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 right-8 w-12 h-12 rounded-full bg-zinc-800/80 backdrop-blur hover:bg-zinc-700 flex items-center justify-center text-white transition-colors z-50"
              onClick={() => setIsCreatingProject(false)}
            >
              <X size={24} />
            </motion.button>

            <div 
              className="flex flex-nowrap items-center overflow-x-auto w-full pb-20 pt-10 scrollbar-hide snap-x snap-mandatory"
              onScroll={(e) => {
                const container = e.currentTarget;
                const containerCenter = container.getBoundingClientRect().left + container.clientWidth / 2;
                let closest = null;
                let minDist = Infinity;
                container.childNodes.forEach((node) => {
                  if (node.nodeType === 1) {
                    const el = node as HTMLElement;
                    const val = el.getAttribute("data-ratio");
                    if (val) {
                      const rect = el.getBoundingClientRect();
                      const elCenter = rect.left + rect.width / 2;
                      const dist = Math.abs(elCenter - containerCenter);
                      if (dist < minDist) {
                        minDist = dist;
                        closest = val;
                      }
                    }
                  }
                });
                if (closest && closest !== focusedRatio) setFocusedRatio(closest);
              }}
              style={{
                paddingLeft: "calc(50vw - 160px)",
                paddingRight: "calc(50vw - 160px)"
              }}
            >
              {[
                { ratio: "9:16", baseW: 180, baseH: 320, label: "Reels, TikTok" },
                { ratio: "16:9", baseW: 320, baseH: 180, label: "YouTube" },
                { ratio: "1:1", baseW: 240, baseH: 240, label: "Instagram" },
                { ratio: "custom", baseW: 240, baseH: 240, label: "Custom" },
              ].map((r, i) => {
                const isFocused = focusedRatio === r.ratio;
                const scale = isFocused ? 1 : 0.85;
                return (
                  <div key={r.ratio} data-ratio={r.ratio} className="w-[320px] shrink-0 snap-center flex justify-center items-center">
                    <motion.div
                       className="cursor-pointer group relative flex justify-center items-center"
                       onClick={(e) => {
                          if (!isFocused) {
                             e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                       }}
                    >
                      <motion.div
                        animate={{ width: r.baseW * scale, height: r.baseH * scale }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className={`border-[4px] rounded-[32px] flex items-center justify-center bg-transparent transition-colors duration-300 ${isFocused ? "border-white" : "border-zinc-700"}`}
                      >
                         <span className={`font-bold text-3xl transition-colors ${isFocused ? "text-white" : "text-zinc-500"}`}>
                           {r.ratio === "custom" ? "Custom" : r.ratio}
                         </span>
                      </motion.div>
                    </motion.div>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 pointer-events-none">
              {focusedRatio === "custom" ? (
                <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md rounded-2xl p-2 border border-zinc-700 pointer-events-auto">
                   <input type="number" placeholder="H" className="bg-transparent w-20 text-center text-xl text-white outline-none font-bold" value={customRatioH} onChange={(e) => setCustomRatioH(e.target.value)} />
                   <div className="w-[2px] h-6 bg-zinc-600"></div>
                   <input type="number" placeholder="W" className="bg-transparent w-20 text-center text-xl text-white outline-none font-bold" value={customRatioW} onChange={(e) => setCustomRatioW(e.target.value)} />
                </div>
              ) : (
                <span className="text-sm font-semibold text-white/50 tracking-widest uppercase">
                  {[
                    { ratio: "9:16", label: "Reels, TikTok" },
                    { ratio: "16:9", label: "YouTube" },
                    { ratio: "1:1", label: "Instagram" },
                  ].find(x => x.ratio === focusedRatio)?.label}
                </span>
              )}
              
              <button 
                className="pointer-events-auto w-[240px] h-14 border-[3px] border-white rounded-full flex items-center justify-center font-bold text-white hover:bg-white hover:text-black transition-colors text-lg"
                onClick={() => {
                   handleCreateProject(focusedRatio === "custom" ? `${customRatioW}:${customRatioH}` : focusedRatio);
                }}
              >
                 Create Project
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {projectToDelete && (
          <div
            className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setProjectToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#252528] border border-white/10 rounded-[32px] p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                Delete Project
              </h3>
              <p className="text-zinc-400 text-sm mb-6 font-medium">
                Are you sure you want to delete this project? This action cannot
                be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-5 py-2.5 rounded-full text-sm font-bold text-white hover:bg-zinc-700 transition-colors"
                  onClick={() => setProjectToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-full text-sm font-bold text-white transition-colors"
                  onClick={confirmDeleteProject}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};