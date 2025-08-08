/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {addRound} from '../lib/actions.js'

const presets = [
  {label: 'Robot', prompt: 'a robot', icon: 'smart_toy'},
  {label: 'React Counter', prompt: 'a simple counter component in React', icon: 'code'},
  {label: 'Ocean Waves', prompt: 'a mesmerizing animation of ocean waves', icon: 'waves'},
  {label: 'Bar Chart', prompt: 'a bar chart showing pokemon stats', icon: 'bar_chart'},
  {label: 'Synth Sound', prompt: 'a simple synth sound that plays a C-major scale', icon: 'volume_up'},
  {label: 'ASCII Skull', prompt: 'a skull in ascii art', icon: 'edit_note'}
]

export default function Intro({onSelectPreset}) {
  return (
    <section className="intro">
      <h2>Welcome to the AI Studio</h2>
      <p>A minimalist playground to generate and compare visual outputs from language models. Get started by entering a prompt above, or try one of these examples:</p>
      <div className="presets-intro">
        {presets.map(({label, prompt, icon}) => (
          <button key={label} className="button" onClick={() => addRound(prompt)}>
            <span className="icon">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
