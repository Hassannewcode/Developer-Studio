/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import c from 'clsx';
import modes, { allModes } from '../lib/modes.js';
import useStore from '../lib/store.js';
import { setChatMode, toggleHistoryPanel, toggleAbTestMode, setAbTestProfileId } from '../lib/actions.js';

const SidebarButton = ({ icon, text, onClick, isActive = false, isCollapsed }) => (
  <button
    className={c('button', { active: isActive })}
    onClick={onClick}
    title={isCollapsed ? text : undefined}
  >
    <span className="icon">{icon}</span>
    {!isCollapsed && <span className="text">{text}</span>}
    {isCollapsed && <span className="tooltip">{text}</span>}
  </button>
);

const SidebarList = ({ title, items, outputMode, onSetOutputMode, isCollapsed }) => (
  <div className="sidebar-list">
    {!isCollapsed && <h4>{title}</h4>}
    <ul>
      {items.map(({ id, name, icon }) => (
        <li key={id}>
          <button
            className={c('button', { active: outputMode === id })}
            onClick={() => onSetOutputMode(id)}
            title={isCollapsed ? name : undefined}
          >
            <span className="icon">{icon}</span>
            {!isCollapsed && <span className="text">{name}</span>}
            {isCollapsed && <span className="tooltip">{name}</span>}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

const AbTestSelector = ({ isCollapsed }) => {
    const { personas, abTestProfileId, outputMode } = useStore();
    const allOptions = [...Object.entries(allModes).map(([id, data]) => ({ id, ...data })), ...personas];

    return (
        <div className="sidebar-list ab-test-selector">
            {!isCollapsed && <h4>Variant B</h4>}
            <select 
                value={abTestProfileId || ''} 
                onChange={e => setAbTestProfileId(e.target.value)}
                title="Select Variant B for A/B Test"
            >
                <option value="">Select Profile...</option>
                {allOptions
                  .filter(opt => opt.id !== outputMode) // Prevent selecting same as Variant A
                  .map(option => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function Sidebar({
  outputMode,
  onSetOutputMode,
  onStartNewSession,
  onShowAiStudio,
  isCollapsed,
  onToggleCollapse,
}) {
  const { personas, isChatMode, isAbTestMode, useHybridChat } = useStore();
  const isNavDisabled = isChatMode && !useHybridChat;

  return (
    <aside className={c('sidebar', { collapsed: isCollapsed })}>
      <div className="sidebar-title-header">
        {!isCollapsed && <h1 className="sidebar-title">AI Studio</h1>}
      </div>
      <div className="sidebar-header">
        <button className="button primary" onClick={onStartNewSession}>
            <span className="icon">add</span>
            {!isCollapsed && <span className="text">{isChatMode ? 'New Chat' : 'New Round'}</span>}
        </button>
        <button className={c('iconButton', 'chat-toggle', { active: isChatMode })} onClick={() => setChatMode(!isChatMode)}>
            <span className="icon">chat_bubble</span>
            <span className="tooltip">Chat Mode</span>
        </button>
      </div>
      
      <div className={c("sidebar-nav-main", { "disabled": isNavDisabled })}>
        {isAbTestMode && <AbTestSelector isCollapsed={isCollapsed} />}
        
        {Object.entries(modes).map(([categoryName, categoryModes]) => (
          <SidebarList
            key={categoryName}
            title={isAbTestMode ? `Variant A: ${categoryName}`: categoryName}
            items={Object.entries(categoryModes).map(([id, data]) => ({ id, ...data }))}
            outputMode={outputMode}
            onSetOutputMode={onSetOutputMode}
            isCollapsed={isCollapsed}
          />
        ))}

        {personas.length > 0 && (
          <SidebarList
            title={isAbTestMode ? 'Variant A: AI Profiles' : 'AI Profiles'}
            items={personas}
            outputMode={outputMode}
            onSetOutputMode={onSetOutputMode}
            isCollapsed={isCollapsed}
          />
        )}
      </div>

      <div className="sidebar-nav-footer">
        <SidebarButton
            icon="history"
            text="History"
            onClick={() => toggleHistoryPanel()}
            isCollapsed={isCollapsed}
        />
        <SidebarButton
            icon="compare_arrows"
            text="A/B Test"
            onClick={() => toggleAbTestMode()}
            isActive={isAbTestMode}
            isCollapsed={isCollapsed}
        />
        <SidebarButton
            icon="star"
            text="AI Studio"
            onClick={onShowAiStudio}
            isCollapsed={isCollapsed}
        />
        <button className="collapse-button button" onClick={onToggleCollapse} title={isCollapsed ? 'Expand' : 'Collapse'}>
            <span className="icon">{isCollapsed ? 'menu_open' : 'menu'}</span>
            {!isCollapsed && <span className="text">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
