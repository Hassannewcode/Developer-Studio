/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useEffect, useState, memo} from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import * as styles from 'react-syntax-highlighter/dist/esm/styles/hljs'
import c from 'clsx'
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {allModes} from '../lib/modes.js'
import models from '../lib/models.js'
import Renderer from './Renderer.jsx'
import { setFocusedOutput } from '../lib/actions.js';

const OutputConsole = ({logs}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="output-console-wrapper">
      <button className="console-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="icon">terminal</span>
        Console ({logs.length})
        <span className={c("icon", { 'toggled': isOpen })}>expand_more</span>
      </button>
      {isOpen && (
        <div className="output-console">
          {logs.length > 0 ? logs.map((log, i) => (
            <div key={i} className={c('log-entry', `log-${log.level}`)}>
              <span className="log-level">{log.level}</span>
              <pre className="log-message">{log.message}</pre>
              <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
          )) : <div className="log-entry log-info">No console output yet.</div>}
        </div>
      )}
    </div>
  );
};

const GroundingSources = ({ metadata }) => {
  if (!metadata?.groundingChunks?.length) return null;

  const sources = metadata.groundingChunks
    .map(chunk => chunk.web)
    .filter(Boolean);
    
  if (sources.length === 0) return null;

  return (
    <div className="grounding-sources">
      <h4><span className="icon">travel_explore</span> Sources</h4>
      <ol>
        {sources.map((source, index) => (
          <li key={index}>
            <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title || source.uri}>
              {source.title || new URL(source.uri).hostname}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};


function ModelOutput({
  modelKey,
  outputData,
  outputMode,
  isBusy,
  startTime,
  totalTime,
  gotError,
  isFunctionCall,
  critiqueNotes,
  statusText,
  groundingMetadata,
}) {
  const [time, setTime] = useState(0)
  const [showSource, setShowSource] = useState(isFunctionCall)
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState([]);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    // Reset logs when outputData changes
    setLogs([]);
    const handleMessage = (event) => {
      // A simple check to see if the message is from one of our iframes
      if (event.data?.source === 'renderer-console') {
        setLogs(prevLogs => [...prevLogs, { ...event.data, timestamp: Date.now() }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [outputData]);

  const effectiveOutputModeId = isFunctionCall ? 'json' : (typeof outputMode === 'string' ? outputMode : outputMode.id);
  const currentMode = allModes[effectiveOutputModeId];
  const isRenderable = currentMode?.isRenderable;

  const copySource = () => {
    if (currentMode?.imageOutput) {
      const byteString = atob(outputData.split(',')[1])
      const mimeString = outputData.split(',')[0].split(':')[1].split(';')[0]
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)

      byteString.split('').forEach((char, i) => (ia[i] = char.charCodeAt(0)))

      const item = new ClipboardItem({
        [mimeString]: new Blob([ab], {type: mimeString})
      })
      navigator.clipboard.write([item]).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1000)
      })
    } else {
      navigator.clipboard.writeText(outputData.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1000)
    }
  }

  useEffect(() => {
    let interval

    if (isBusy) {
      interval = setInterval(() => setTime(Date.now() - startTime), 10)
    } else {
      clearInterval(interval)
    }

    return () => clearInterval(interval)
  }, [startTime, isBusy])

  useEffect(() => {
    setShowSource(isFunctionCall);
  }, [isFunctionCall]);

  const handleFullscreen = () => {
    setFocusedOutput({
      code: outputData,
      mode: effectiveOutputModeId,
      modelKey,
    });
  };

  const handleReset = () => {
    setLogs([]);
    setRenderKey(prev => prev + 1);
  };


  return (
    <div className="modelOutput">
      <div className={c('outputRendering', {flipped: showSource})}>
        {!currentMode?.imageOutput && (
          <div className="back">
            <SyntaxHighlighter
              language={currentMode?.syntax || 'text'}
              style={styles.atomOneDark}
              customStyle={{margin: 0, height: '100%', background: 'transparent'}}
            >
              {outputData || ''}
            </SyntaxHighlighter>
          </div>
        )}

        <div className="front">
          {gotError && (
            <div className="error">
              <p>
                <span className="icon">error</span>
              </p>
              <p>Response error</p>
            </div>
          )}

          {isBusy && (
            <div className="loader-wrapper">
              <span className="icon loader">
                {statusText ? 'autorenew' : 'hourglass'}
              </span>
              {statusText && <p className="status-text">{statusText}</p>}
            </div>
          )}

          {outputData && (
            <Renderer key={renderKey} mode={effectiveOutputModeId} code={outputData} />
          )}
        </div>
      </div>
      
      {critiqueNotes && (
        <details className="critique-details" open>
          <summary>
            <span className="icon">auto_awesome_motion</span>
            Self-Correction Notes
          </summary>
          <div className="critique-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(critiqueNotes)) }}></div>
        </details>
      )}

      <GroundingSources metadata={groundingMetadata} />

      {isRenderable && <OutputConsole logs={logs} />}

      <div className="modelInfo">
        <div className="modelName">
          <div className="chip">
            {models[modelKey]?.name || '...'}
          </div>
           {groundingMetadata && (
            <div className="chip supercharged-chip">
              <span className="icon">travel_explore</span> Grounded
            </div>
          )}
          {critiqueNotes && (
            <div className="chip supercharged-chip">
              <span className="icon">auto_awesome</span> Supercharged
            </div>
          )}
          {(time || totalTime) && (
            <div className="timer">
              {((isBusy ? time : totalTime) / 1000).toFixed(2)}s
            </div>
          )}
        </div>

        <div className={c('outputActions', {active: outputData})}>
          {!currentMode?.imageOutput && isRenderable && (
            <button
              className="iconButton"
              onClick={() => setShowSource(!showSource)}
              disabled={isFunctionCall}
            >
              <span className="icon">{showSource ? 'visibility' : 'code'}</span>
              <span className="tooltip">
                View {showSource ? 'rendering' : 'source'}
              </span>
            </button>
          )}

          {isRenderable && (
            <button className="iconButton" onClick={handleReset}>
                <span className="icon">replay</span>
                <span className="tooltip">Reset</span>
            </button>
          )}

          {isRenderable && (
            <button className="iconButton" onClick={handleFullscreen}>
                <span className="icon">fullscreen</span>
                <span className="tooltip">Focus Mode</span>
            </button>
          )}

          <button className="iconButton" onClick={copySource}>
            <span className="icon">content_copy</span>
            <span className="tooltip">
              {copied
                ? 'Copied!'
                : currentMode?.imageOutput
                  ? 'Copy image'
                  : 'Copy source'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(ModelOutput)
