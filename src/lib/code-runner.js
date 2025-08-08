/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { allModes } from './modes.js';
import { scaffolds } from './scaffold.js';

const EXECUTION_TIMEOUT = 3000; // 3 seconds to run and report errors

/**
 * Executes code in a hidden iframe and captures console.error output.
 * @param {string} code The code to execute.
 * @param {string} modeId The ID of the mode (e.g., 'react', 'canvas').
 * @returns {Promise<string[]>} A promise that resolves with an array of error messages.
 */
export async function executeCodeAndGetErrors(code, modeId) {
  const currentMode = allModes[modeId];
  if (!currentMode?.isRenderable || currentMode.imageOutput || !scaffolds[modeId]) {
    // Can't execute non-renderable, image, or scaffold-less modes
    return [];
  }

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts allow-same-origin';

    const errors = [];

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(errors);
    }, EXECUTION_TIMEOUT);

    const messageHandler = (event) => {
      // Basic security check: ensure the message is from our iframe
      if (event.source !== iframe.contentWindow) {
        return;
      }
      if (event.data?.source === 'renderer-console' && event.data.level === 'error') {
        errors.push(event.data.message);
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', messageHandler);
      if (iframe.parentElement) {
        document.body.removeChild(iframe);
      }
    };

    window.addEventListener('message', messageHandler, false);

    // Set srcdoc and append to body
    try {
      const scaffoldFn = scaffolds[currentMode.name === 'HTML/JS' ? 'html' : modeId];
      if (scaffoldFn) {
        iframe.srcdoc = scaffoldFn(code);
        document.body.appendChild(iframe);
      } else {
        cleanup();
        resolve([`No scaffold available for mode ${modeId}`]);
      }
    } catch (e) {
      console.error("Error setting up iframe for execution:", e);
      cleanup();
      resolve([`Failed to create execution environment: ${e.message}`]);
    }
  });
}