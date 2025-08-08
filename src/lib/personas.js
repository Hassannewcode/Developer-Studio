/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const PERSONAS_STORAGE_KEY = 'vibecheck_personas';
const APIS_STORAGE_KEY = 'vibecheck_apis';
const CODE_FILES_STORAGE_KEY = 'vibecheck_code_files';
const HISTORY_STORAGE_KEY = 'vibecheck_history';
const SETTINGS_STORAGE_KEY = 'vibecheck_settings';


/**
 * Loads personas from localStorage.
 * @returns {Array} The array of personas or an empty array if none are found.
 */
export function getPersonas() {
  try {
    const personas = localStorage.getItem(PERSONAS_STORAGE_KEY);
    return personas ? JSON.parse(personas) : [];
  } catch (error) {
    console.error('Failed to load personas from localStorage', error);
    return [];
  }
}

/**
 * Saves personas to localStorage.
 * @param {Array} personas The array of personas to save.
 */
export function savePersonas(personas) {
  try {
    localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas));
  } catch (error) {
    console.error('Failed to save personas to localStorage', error);
  }
}

/**
 * Loads APIs from localStorage.
 * @returns {Array} The array of APIs or an empty array if none are found.
 */
export function getApis() {
  try {
    const apis = localStorage.getItem(APIS_STORAGE_KEY);
    return apis ? JSON.parse(apis) : [];
  } catch (error) {
    console.error('Failed to load APIs from localStorage', error);
    return [];
  }
}

/**
 * Saves APIs to localStorage.
 * @param {Array} apis The array of APIs to save.
 */
export function saveApis(apis) {
  try {
    localStorage.setItem(APIS_STORAGE_KEY, JSON.stringify(apis));
  } catch (error) {
    console.error('Failed to save APIs to localStorage', error);
  }
}

/**
 * Loads code files from localStorage.
 * @returns {Array} The array of code files or an empty array if none are found.
 */
export function getCodeFiles() {
  try {
    const codeFiles = localStorage.getItem(CODE_FILES_STORAGE_KEY);
    return codeFiles ? JSON.parse(codeFiles) : [];
  } catch (error) {
    console.error('Failed to load code files from localStorage', error);
    return [];
  }
}

/**
 * Saves code files to localStorage.
 * @param {Array} codeFiles The array of code files to save.
 */
export function saveCodeFiles(codeFiles) {
  try {
    localStorage.setItem(CODE_FILES_STORAGE_KEY, JSON.stringify(codeFiles));
  } catch (error) {
    console.error('Failed to save code files to localStorage', error);
  }
}


/**
 * Loads history from localStorage.
 * @returns {Array} The array of history sessions or an empty array if none are found.
 */
export function getHistory() {
  try {
    const history = localStorage.getItem(HISTORY_STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to load history from localStorage', error);
    return [];
  }
}

/**
 * Saves history to localStorage.
 * @param {Array} history The array of history sessions to save.
 */
export function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save history to localStorage', error);
  }
}

/**
 * Loads app settings from localStorage.
 * @returns {object} The settings object or defaults.
 */
export function getSettings() {
  try {
    const settings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const defaults = {
      useStudioSupercharge: true,
      useHybridChat: true,
      useGoogleSearch: false,
      useMultiAgentPipeline: false,
      isAbTestMode: false,
      abTestProfileId: null,
      isSidebarCollapsed: false,
    };
    return settings ? { ...defaults, ...JSON.parse(settings) } : defaults;
  } catch (error) {
    console.error('Failed to load settings from localStorage', error);
    return {
      useStudioSupercharge: true,
      useHybridChat: true,
      useGoogleSearch: false,
      useMultiAgentPipeline: false,
      isAbTestMode: false,
      abTestProfileId: null,
      isSidebarCollapsed: false,
    };
  }
}

/**
 * Saves app settings to localStorage.
 * @param {object} settings The settings object to save.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage', error);
  }
}