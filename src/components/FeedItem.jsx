/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import c from 'clsx'
import {addRound, removeRound} from '../lib/actions.js'
import ModelOutput from './ModelOutput.jsx'

const OutputsList = ({ outputs }) => (
    <ul className="outputs">
      {outputs.map(output => (
        <li key={output.id}>
          <ModelOutput {...output} isFunctionCall={output.isFunctionCall}/>
        </li>
      ))}
    </ul>
);

export default function FeedItem({round, onModifyPrompt}) {
  const outputsA = round.isAbTest ? round.outputs.filter(o => o.variant === 'A') : round.outputs;
  const outputsB = round.isAbTest ? round.outputs.filter(o => o.variant === 'B') : [];

  const promptText = round.prompt || (round.isAbTest ? 'A/B Test' : 'Prompt');

  return (
    <li key={round.id}>
      <div className="header">
        <h3>
          {!round.isAbTest && (
            <div className="chip">
              <span className="icon">{round.outputs[0]?.outputMode.icon}</span> {round.outputs[0]?.outputMode.name}
            </div>
          )}
          <p>{promptText}</p>
        </h3>
        <div className="actions">
          <button className="iconButton" onClick={() => removeRound(round.id)}>
            <span className="icon">delete</span>
            <span className="tooltip">Remove</span>
          </button>

          <button
            className="iconButton"
            onClick={() => onModifyPrompt(round.prompt)}
          >
            <span className="icon">edit</span>
            <span className="tooltip">Modify prompt</span>
          </button>

          <button className="iconButton" onClick={() => addRound(round.prompt)}>
            <span className="icon">replay</span>
            <span className="tooltip">Re-run prompt</span>
          </button>
        </div>
      </div>
      
      {round.isAbTest ? (
        <div className="ab-test-outputs">
          <div className="ab-test-column">
            <div className="ab-test-header chip">
              <span className="icon">{outputsA[0]?.outputMode.icon}</span> Variant A: {outputsA[0]?.outputMode.name}
            </div>
            <OutputsList outputs={outputsA} />
          </div>
          <div className="ab-test-column">
            <div className="ab-test-header chip">
              <span className="icon">{outputsB[0]?.outputMode.icon}</span> Variant B: {outputsB[0]?.outputMode.name}
            </div>
            <OutputsList outputs={outputsB} />
          </div>
        </div>
      ) : (
        <OutputsList outputs={outputsA} />
      )}
    </li>
  )
}
