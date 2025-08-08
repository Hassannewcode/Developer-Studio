/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import 'immer'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'

const useStore = create(
    immer(() => ({
      didInit: false,
      feed: [],
      personas: [], // User-defined AI profiles
      apis: [], // User-defined API definitions (tools or schemas)
      codeFiles: [], // User-defined code files for context
      outputMode: 'html', // Can be a built-in key or a persona ID
      model: 'gemini-2.5-flash',
      batchSize: 1,
      temperature: 0.4,
      topP: 0.95,
      topK: 64,
      systemInstruction: '', // The current system instruction

      // For Focus Mode
      focusedOutput: null,

      // New state for Chat Mode
      isChatMode: false,
      chatHistory: [],

      // New state for History Panel
      isHistoryPanelOpen: false,
      history: [], // Array of saved sessions ({id, type, timestamp, data})

      // Experimental features
      useMultiAgentPipeline: false,
      useStudioSupercharge: true,
      useHybridChat: true,
      useGoogleSearch: false,

      // A/B Testing
      isAbTestMode: false,
      abTestProfileId: null,

      // Bulk Creation
      isBulkCreating: false,

      // UI State
      isSidebarCollapsed: false,
    }))
);

export default useStore;