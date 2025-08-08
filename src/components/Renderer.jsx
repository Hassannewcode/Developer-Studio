/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {memo, useEffect, useRef, useState} from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import * as styles from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { allModes } from '../lib/modes.js';
import { scaffolds } from '../lib/scaffold.js';


function Renderer({mode, code}) {
  const iframeRef = useRef(null)
  const [error, setError] = useState(null)

  const currentMode = allModes[mode];

  // If the mode is not renderable (e.g., JSON, Python, SQL), show a syntax highlighter.
  if (currentMode && !currentMode.isRenderable) {
    const syntaxStyle = styles.atomOneDark;
    let parsedCode = code
    if (mode === 'json') {
      try {
        // This makes sure the JSON from the model (which might be a string) is formatted nicely.
        parsedCode = JSON.stringify(JSON.parse(code), null, 2)
      } catch (e) {
        // Ignore parsing errors, just show the raw string.
      }
    }
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#282c34',
          overflow: 'hidden',
          display: 'flex'
        }}
      >
        <SyntaxHighlighter
          language={currentMode.syntax || 'text'}
          style={syntaxStyle}
          customStyle={{
            margin: 0,
            height: '100%',
            width: '100%',
            background: 'transparent',
            padding: '15px',
            boxSizing: 'border-box'
          }}
          codeTagProps={{
            style: {
              fontSize: '12px',
              lineHeight: '1.6'
            }
          }}
        >
          {parsedCode}
        </SyntaxHighlighter>
      </div>
    )
  }

  // Handle HTML mode separately to inject console override script
  const scaffoldFn = currentMode?.name === 'HTML/JS' ? scaffolds.html : scaffolds[mode];
  const srcDoc = scaffoldFn ? scaffoldFn(code) : code;

  return (
    <div className={`renderer ${mode}Renderer`}>
      {mode === 'image' ? (
        <img src={code} alt="Generated image" />
      ) : (
        <iframe
          sandbox="allow-same-origin allow-scripts"
          loading="lazy"
          srcDoc={srcDoc}
          ref={iframeRef}
        />
      )}

      {error && (
        <div className="error">
          <p>
            <span className="icon">error</span>
          </p>
          <p>
            {error[0]} ({error[1]}:{error[2]})
          </p>
          <p></p>
        </div>
      )}
    </div>
  )
}

export default memo(Renderer)
