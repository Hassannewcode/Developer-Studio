/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useEffect, useState, useCallback, useRef} from 'react'
import c from 'clsx'
import {allModes} from '../lib/modes.js'
import models from '../lib/models.js'
import useStore from '../lib/store.js'
import {
  addRound,
  sendChatMessage,
  setOutputMode,
  setModel,
  startNewSession,
  enhancePrompt,
  toggleHistoryPanel,
  toggleSidebar,
} from '../lib/actions.js'
import {isIframe} from '../lib/consts.js'
import FeedItem from './FeedItem.jsx'
import Intro from './Intro.jsx'
import PersonaManager from './PersonaManager.jsx'
import Sidebar from './Sidebar.jsx'
import ChatView from './ChatView.jsx'
import HistoryPanel from './HistoryPanel.jsx'
import TopBar from './TopBar.jsx'
import ExperimentalLab from './ExperimentalLab.jsx'
import FocusView from './FocusView.jsx'


export default function App() {
  const {
    feed,
    outputMode,
    model,
    personas,
    isChatMode,
    isHistoryPanelOpen,
    focusedOutput,
    isSidebarCollapsed,
  } = useStore()

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showPersonaManager, setShowPersonaManager] = useState(false)
  const [showExperimentalLab, setShowExperimentalLab] = useState(false);

  const inputRef = useRef(null)
  const isGenerating = feed.length > 0 && feed[0].outputs.some(o => o.isBusy)
  const isChatThinking = useStore(state => state.chatHistory.some(m => m.content?.isThinking));

  const onModifyPrompt = useCallback(prompt => {
    inputRef.current.value = prompt
    inputRef.current.focus()
  }, [])

  const handleGenerate = () => {
    const prompt = inputRef.current.value;
    if (!prompt) return;
    
    if (isChatMode) {
      sendChatMessage(prompt);
    } else {
      addRound(prompt, null) // No inputImage support in this simplified UI
    }

    inputRef.current.value = '';
    inputRef.current.focus();
  }

  const handleEnhancePrompt = async () => {
    const prompt = inputRef.current.value
    if (!prompt || isEnhancing || isGenerating || isChatThinking) return

    setIsEnhancing(true)
    try {
      const result = await enhancePrompt(prompt)
      if (result) {
        inputRef.current.value = result.trim()
      }
    } catch (error) {
      // TODO: show error to user
      console.error('Failed to enhance prompt', error)
    } finally {
      setIsEnhancing(false)
    }
  }

  useEffect(() => {
    if (isChatMode) return; // Don't auto-switch models in chat mode
    const currentMode =
      allModes[outputMode] || personas.find(p => p.id === outputMode)
    if (!currentMode) return

    const currentModelIsImage = models[model].type === 'image'
    const requiredModelIsImage = currentMode.imageOutput

    if (currentModelIsImage !== requiredModelIsImage) {
      const newModelKey = Object.keys(models).find(
        key => (models[key].type === 'image') === requiredModelIsImage
      )
      if (newModelKey) {
        setModel(newModelKey)
      }
    }
  }, [outputMode, model, personas, isChatMode])

  const isBusy = isGenerating || isChatThinking;

  return (
    <div
      className={c(
        'app-layout',
        {
            iframe: isIframe,
            'sidebar-collapsed': isSidebarCollapsed,
            'history-panel-open': isHistoryPanelOpen,
        }
      )}
    >
      {showPersonaManager && <PersonaManager onClose={() => setShowPersonaManager(false)} />}
      {showExperimentalLab && <ExperimentalLab onClose={() => setShowExperimentalLab(false)} />}
      {focusedOutput && <FocusView />}
      <HistoryPanel isOpen={isHistoryPanelOpen} onClose={() => toggleHistoryPanel(false)} />


      <Sidebar
        outputMode={outputMode}
        onSetOutputMode={setOutputMode}
        onStartNewSession={startNewSession}
        onShowAiStudio={() => setShowPersonaManager(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <div className="main-content">
        <TopBar onShowExperimentalLab={() => setShowExperimentalLab(true)} />
        <main className="feed-container">
          {isChatMode ? (
            <ChatView />
          ) : feed.length ? (
            <ul className="feed">
              {feed.map(round => (
                <FeedItem
                  key={round.id}
                  round={round}
                  onModifyPrompt={onModifyPrompt}
                />
              ))}
            </ul>
          ) : (
            <Intro onSelectPreset={onModifyPrompt} />
          )}
        </main>
        
        <footer className="prompt-area">
          <div className="prompt-bar">
            <div className="prompt-control">
              <input
                className="promptInput"
                placeholder={isChatMode ? "Send a message..." : "Enter a prompt here, e.g., a photorealistic cat"}
                ref={inputRef}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
              />
               <button
                className="iconButton enhance-button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || isBusy}
              >
                <span className={c('icon', {loader: isEnhancing})}>
                  {isEnhancing ? 'progress_activity' : 'auto_fix_high'}
                </span>
                <span className="tooltip">Enhance Prompt</span>
              </button>
            </div>
            <button
              className="button primary"
              onClick={handleGenerate}
              disabled={isBusy}
            >
              {isBusy ? <span className="icon loader">progress_activity</span> : <span className="icon">send</span>}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}