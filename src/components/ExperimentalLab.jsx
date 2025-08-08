/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useCallback, useEffect } from 'react';
import useStore from '../lib/store.js';
import { toggleMultiAgentPipeline, toggleStudioSupercharge, toggleHybridChat, toggleGoogleSearch } from '../lib/actions.js';

export default function ExperimentalLab({ onClose }) {
  const { useStudioSupercharge, useHybridChat, useGoogleSearch } = useStore();

  const handleKeyDown = useCallback(e => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><span className="icon">science</span> Experimental Lab</h2>
          <button className="iconButton" onClick={onClose}>
            <span className="icon">close</span>
          </button>
        </div>
        <div className="modal-body">
            <div className="lab-section">
                <h3>Advanced Generation Features</h3>
                <p className="lab-description">
                    Enable advanced techniques to improve code quality and provide up-to-date information. These features may increase generation time.
                </p>
                <div className="lab-feature">
                    <div className="lab-feature-info">
                        <h4>Supercharge</h4>
                        <p>The AI performs a self-correction loop, critiquing its own work and re-generating for higher quality. Applies to code generation in both Studio and Chat modes.</p>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={useStudioSupercharge}
                            onChange={toggleStudioSupercharge}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                 <div className="lab-feature">
                    <div className="lab-feature-info">
                        <h4>Google Search Grounding</h4>
                        <p>Allows the model to use Google Search to answer prompts about recent events or information. Sources will be cited in the output.</p>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={useGoogleSearch}
                            onChange={toggleGoogleSearch}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>
            <div className="lab-section">
                <h3>Chat Mode Features</h3>
                <p className="lab-description">
                    Configure features that only apply when in Chat Mode.
                </p>
                <div className="lab-feature">
                    <div className="lab-feature-info">
                        <h4>Hybrid Studio Chat</h4>
                        <p>When enabled, you can select Studio modes from the sidebar while in Chat Mode. This allows the chat agent to use the specific instructions and rendering capabilities of that mode.</p>
                    </div>
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={useHybridChat}
                            onChange={toggleHybridChat}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}