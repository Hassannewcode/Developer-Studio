/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useCallback, useEffect, useState } from 'react';
import useStore from '../lib/store.js';
import { setFocusedOutput } from '../lib/actions.js';
import Renderer from './Renderer.jsx';
import models from '../lib/models.js';

export default function FocusView() {
    const focusedOutput = useStore(state => state.focusedOutput);
    const [renderKey, setRenderKey] = useState(0);

    const handleClose = useCallback(() => {
        setFocusedOutput(null);
    }, []);

    const handleReset = () => {
        setRenderKey(prev => prev + 1);
    };

    const handleKeyDown = useCallback(e => {
        if (e.key === 'Escape') {
            handleClose();
        }
    }, [handleClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!focusedOutput) return null;

    const { code, mode, modelKey } = focusedOutput;

    return (
        <div className="focus-overlay">
            <div className="focus-header">
                <div className="focus-info">
                    <div className="chip">{models[modelKey]?.name || '...'}</div>
                </div>
                <div className="focus-actions">
                    <button className="button" onClick={handleReset}>
                        <span className="icon">replay</span> Reset
                    </button>
                    <button className="button" onClick={handleClose}>
                        <span className="icon">close</span> Exit Focus
                    </button>
                </div>
            </div>
            <div className="focus-content">
                <Renderer key={renderKey} mode={mode} code={code} />
            </div>
        </div>
    );
}