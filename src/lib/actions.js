/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, HarmBlockThreshold, HarmCategory, Type } from "@google/genai";
import useStore from './store.js'
import modes, {allModes} from './modes.js'
import llmGen from './llm.js'
import models from './models.js'
import { executeCodeAndGetErrors } from './code-runner.js';
import {
  getPersonas,
  savePersonas,
  getApis,
  saveApis,
  getCodeFiles,
  saveCodeFiles,
  getHistory,
  saveHistory,
  getSettings,
  saveSettings,
} from './personas.js'

const get = useStore.getState
const set = useStore.setState

export const init = () => {
  if (get().didInit) {
    return
  }

  const loadedPersonas = getPersonas()
  const loadedApis = getApis()
  const loadedCodeFiles = getCodeFiles()
  const loadedHistory = getHistory()
  const loadedSettings = getSettings();
  const firstCategoryKey = Object.keys(modes)[0];
  const firstModeKey = Object.keys(modes[firstCategoryKey])[0];
  
  set(state => {
    state.didInit = true
    state.personas = loadedPersonas
    state.apis = loadedApis
    state.codeFiles = loadedCodeFiles
    state.history = loadedHistory
    state.outputMode = firstModeKey;
    state.systemInstruction = allModes[firstModeKey].systemInstruction;
    // Apply loaded settings
    state.useStudioSupercharge = loadedSettings.useStudioSupercharge;
    state.useHybridChat = loadedSettings.useHybridChat;
    state.useGoogleSearch = loadedSettings.useGoogleSearch;
    state.useMultiAgentPipeline = loadedSettings.useMultiAgentPipeline;
    state.isAbTestMode = loadedSettings.isAbTestMode;
    state.abTestProfileId = loadedSettings.abTestProfileId;
    state.isSidebarCollapsed = loadedSettings.isSidebarCollapsed;
  })
}

const newOutput = (modelKey, mode, variant) => ({
  modelKey,
  id: crypto.randomUUID(),
  startTime: Date.now(),
  outputData: null,
  isBusy: true,
  gotError: false,
  outputMode: mode,
  rating: 0,
  isFavorite: false,
  comments: '',
  isFunctionCall: false,
  critiqueNotes: null,
  statusText: null,
  groundingMetadata: null,
  variant,
})

async function superchargeGenerator({
  prompt,
  systemInstruction,
  model,
  temperature,
  topP,
  topK,
  modeId,
  updateFn
}) {
  const MAX_ITERATIONS = 3;
  let currentCode = '';
  let accumulatedCritique = '';
  const currentMode = allModes[modeId];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const iteration = i + 1;
    updateFn({
      status: `Iteration ${iteration}/${MAX_ITERATIONS}: Generating...`,
      critiqueNotes: accumulatedCritique,
      isBusy: true,
    });

    // Step 1: Generate or Refine code
    let generationSystemInstruction;
    let generationPrompt;

    if (i === 0) {
      // First iteration: simple generation
      generationSystemInstruction = systemInstruction;
      generationPrompt = prompt;
    } else {
      // Subsequent iterations: refine based on feedback
      generationSystemInstruction = `${systemInstruction}\n\nYou must refine a previous attempt based on critique and errors. Your goal is to produce a final, perfect, bug-free, and complete version of the code. The user's original prompt was: "${prompt}".\n\nThe previous code was:\n\`\`\`\n${currentCode}\n\`\`\`\n\nThe critique and errors were:\n${accumulatedCritique}\n\nBased on all this information, produce the final, corrected, and improved code. Your response MUST be only the raw code, with no explanatory text, commentary, or markdown fences. You must finish the work.`;
      generationPrompt = `Produce the final code for the prompt: "${prompt}"`;
    }

    const generationRes = await llmGen({
      model, systemInstruction: generationSystemInstruction, prompt: generationPrompt, temperature, topP, topK
    });
    currentCode = generationRes.text;
    updateFn({ status: `Iteration ${iteration}: Executing...`, outputData: currentCode });

    // Step 2: Execute code and get console errors
    const consoleErrors = await executeCodeAndGetErrors(currentCode, modeId);
    const errorString = consoleErrors.length > 0
      ? `The code produced the following console errors:\n- ${consoleErrors.join('\n- ')}`
      : "The code ran without console errors.";
    updateFn({ status: `Iteration ${iteration}: Critiquing...` });

    // Step 3: Get LLM critique
    const critiqueSystemInstruction = `You are a meticulous code reviewer. Your task is to analyze the provided code against the user's original request AND any runtime errors. Identify bugs, logical flaws, style issues, or incomplete work. Provide your response as a concise, professional, bulleted list in Markdown format. If the code is perfect and fulfills the request completely, respond with ONLY the word "perfect".`;
    const critiquePrompt = `Original User Prompt: "${prompt}"\n\nCode to Review:\n\`\`\`${currentMode.syntax || 'code'}\n${currentCode}\n\`\`\`\n\nRuntime Analysis:\n${errorString}`;
    const critiqueRes = await llmGen({
      model: models['gemini-2.5-flash'].modelString,
      systemInstruction: critiqueSystemInstruction,
      prompt: critiquePrompt,
      temperature: 0.2,
    });
    const critiqueText = critiqueRes.text.trim();

    // Step 4: Check for exit condition
    if (critiqueText.toLowerCase() === 'perfect' && consoleErrors.length === 0) {
      accumulatedCritique += `\n\n**Iteration ${iteration}**: Passed with no errors or critiques.`;
      updateFn({ critiqueNotes: accumulatedCritique });
      return { outputData: currentCode, critiqueNotes: accumulatedCritique };
    }

    // Step 5: Accumulate feedback for the next loop
    const iterationCritique = `**Iteration ${iteration} Feedback:**\n*Critique:* ${critiqueText}\n*Console Errors:* ${consoleErrors.length > 0 ? consoleErrors.join(', ') : 'None'}`;
    accumulatedCritique = accumulatedCritique ? `${accumulatedCritique}\n\n---\n\n${iterationCritique}` : iterationCritique;
    updateFn({ critiqueNotes: accumulatedCritique });

    if (i === MAX_ITERATIONS - 1) {
      accumulatedCritique += "\n\n**Max iterations reached.**";
      updateFn({ critiqueNotes: accumulatedCritique });
      return { outputData: currentCode, critiqueNotes: accumulatedCritique };
    }
  }

  // Fallback, should not be reached
  return { outputData: currentCode, critiqueNotes: accumulatedCritique };
}


export const addRound = (prompt, promptImage) => {
  scrollTo({top: 0, left: 0, behavior: 'smooth'})

  const {
    outputMode: outputModeA,
    batchSize,
    personas,
    apis,
    codeFiles,
    isAbTestMode,
    abTestProfileId,
    useStudioSupercharge,
    useGoogleSearch
  } = get()

  const newRound = {
    prompt,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    isAbTest: isAbTestMode && abTestProfileId,
    outputs: []
  }

  const configs = [{ id: outputModeA, variant: 'A' }];
  if (newRound.isAbTest) {
    configs.push({ id: abTestProfileId, variant: 'B' });
  }

  configs.forEach(config => {
    const currentMode = allModes[config.id] || personas.find(p => p.id === config.id)
    if (!currentMode) {
      console.error(`Selected mode/profile not found: ${config.id}`);
      return;
    }
    const modelKey = currentMode.model || get().model;
    const modelInfo = models[modelKey];
    
    if (currentMode.imageOutput && modelInfo.type !== 'image') {
      console.error("Image mode selected but text model is active. Won't generate.");
      return;
    }
    if (!currentMode.imageOutput && modelInfo.type === 'image') {
      console.error("Text mode selected but image model is active. Won't generate.");
      return;
    }

    const outputs = new Array(batchSize)
      .fill(null)
      .map(() => newOutput(modelKey, config.id, config.variant));
    
    newRound.outputs.push(...outputs);
  });
  
  newRound.outputs.forEach(async (output, i) => {
    const configId = output.outputMode;
    const currentMode = allModes[configId] || personas.find(p => p.id === configId);
    
    const baseConfig = models[output.modelKey].type === 'image' ? {} : {
      temperature: get().temperature,
      topP: get().topP,
      topK: get().topK,
    };

    const personaConfig = personas.find(p => p.id === configId);
    const finalConfig = personaConfig ? {
        temperature: personaConfig.temperature,
        topP: personaConfig.topP,
        topK: personaConfig.topK,
        model: personaConfig.model,
    } : { model: get().model, ...baseConfig };
    
    const modelInfo = models[finalConfig.model];

    const outputModeDetails = {
      id: configId,
      name: currentMode.name,
      icon: currentMode.icon,
    };
    output.outputMode = outputModeDetails; // Update outputMode to be the detailed object

    let systemInstruction = currentMode.systemInstruction || get().systemInstruction;

    if (personaConfig && personaConfig.codeFileIds?.length > 0) {
      const attachedFiles = personaConfig.codeFileIds
        .map(id => codeFiles.find(f => f.id === id))
        .filter(Boolean);

      if (attachedFiles.length > 0) {
        const filesContext = attachedFiles
          .map(file => `## File: ${file.name} (${file.language})\n\`\`\`${file.language}\n${file.content}\n\`\`\``)
          .join('\n\n');
        systemInstruction = `Here is some context from attached files:\n\n${filesContext}\n\n---\n\n${systemInstruction}`;
      }
    }
    
    let responseSchema = null;
    let tools = null;

    if (useGoogleSearch) {
      tools = [{googleSearch: {}}];
    } else if (currentMode.apiId) {
      const api = apis.find(a => a.id === currentMode.apiId);
      if (api) {
        try {
          const definition = JSON.parse(api.definition);
          if (api.type === 'schema') responseSchema = definition;
          else if (api.type === 'tools') tools = definition;
        } catch (e) {
          console.error(`Invalid JSON in API definition "${api.name}", proceeding without it.`, e);
        }
      }
    }

    let res;
    let critiqueNotes = null;
    try {
      const isCodeMode = !currentMode.imageOutput && currentMode.syntax && !['text', 'markdown', 'image'].includes(currentMode.syntax);
      
      if (useStudioSupercharge && isCodeMode && currentMode.isRenderable) {
        // SUPERCHARGE PATH
        const updateOutputFn = (updates) => {
          set(state => {
            const round = state.feed.find(r => r.id === newRound.id);
            const outputToUpdate = round?.outputs.find(o => o.id === output.id);
            if (outputToUpdate) {
              if (updates.status) outputToUpdate.statusText = updates.status;
              if (updates.critiqueNotes) outputToUpdate.critiqueNotes = updates.critiqueNotes;
              if (updates.outputData) outputToUpdate.outputData = updates.outputData;
              if (updates.isBusy !== undefined) outputToUpdate.isBusy = updates.isBusy;
            }
          });
        };

        const superchargeResult = await superchargeGenerator({
          prompt,
          systemInstruction,
          model: modelInfo.modelString,
          temperature: finalConfig.temperature,
          topP: finalConfig.topP,
          topK: finalConfig.topK,
          modeId: configId,
          updateFn: updateOutputFn
        });

        res = { text: superchargeResult.outputData, candidates: [{ groundingMetadata: null }] };
        critiqueNotes = superchargeResult.critiqueNotes;
      } else {
         // NORMAL PATH
        res = await llmGen({
          model: modelInfo.modelString,
          systemInstruction: modelInfo.type === 'image' ? null : systemInstruction,
          prompt: modelInfo.type === 'image' ? `${systemInstruction}\n\n${prompt}` : prompt,
          imageOutput: modelInfo.type === 'image',
          temperature: modelInfo.type === 'image' ? undefined : finalConfig.temperature,
          topP: modelInfo.type === 'image' ? undefined : finalConfig.topP,
          topK: modelInfo.type === 'image' ? undefined : finalConfig.topK,
          promptImage,
          responseSchema,
          tools,
        });
      }
    } catch (e) {
      console.error(e)
      set(state => {
        const round = state.feed.find(round => round.id === newRound.id)
        if (!round) return;
        const outputToUpdate = round.outputs.find(o => o.id === output.id);
        if (outputToUpdate) {
            Object.assign(outputToUpdate, { isBusy: false, gotError: true, totalTime: Date.now() - output.startTime });
        }
      });
      return
    }

    set(state => {
      const round = state.feed.find(round => round.id === newRound.id);
      if (!round) return;
      const outputToUpdate = round.outputs.find(o => o.id === output.id);
      if (!outputToUpdate) return;
      
      let outputData;
      let isFunctionCall = false;
      const functionCallPart = res.candidates?.[0]?.content?.parts?.find(part => part.functionCall);

      if (functionCallPart) {
        outputData = JSON.stringify({ functionCall: functionCallPart.functionCall }, null, 2);
        isFunctionCall = true;
      } else {
        outputData = res.text;
      }
      
      const responseModifier = currentMode.responseModifier || (data => data);

      Object.assign(outputToUpdate, {
          outputData: responseModifier(outputData),
          isBusy: false,
          totalTime: Date.now() - output.startTime,
          isFunctionCall,
          critiqueNotes,
          groundingMetadata: res.candidates?.[0]?.groundingMetadata,
      });
    });
  });

  set(state => {
    state.feed.unshift(newRound)
  });
};

export const setOutputMode = modeId =>
  set(state => {
    const persona = state.personas.find(p => p.id === modeId);
    if (persona) {
        state.model = persona.model;
        state.temperature = persona.temperature;
        state.topP = persona.topP;
        state.topK = persona.topK;
        state.systemInstruction = persona.systemInstruction;
    } else {
        const mode = allModes[modeId];
        if (mode) {
            state.systemInstruction = mode.systemInstruction;
            // In chat mode, don't auto-switch models. The user has control.
            if (!state.isChatMode) {
              const wasImage = models[state.model].type === 'image';
              const isImage = mode.imageOutput;

              if (wasImage !== isImage) {
                  const newModelKey = Object.keys(models).find(key => (models[key].type === 'image') === isImage);
                  if (newModelKey) {
                      state.model = newModelKey;
                  }
              }
            }
        }
    }
    state.outputMode = modeId
  })

export const setBatchSize = size => set(state => { state.batchSize = size });
export const setTemperature = temp => set(state => { state.temperature = temp });
export const setModel = modelKey => set(state => { state.model = modelKey });
export const setTopP = value => set(state => { state.topP = value });
export const setTopK = value => set(state => { state.topK = value });
export const setSystemInstruction = instruction => set(state => { state.systemInstruction = instruction });

export const removeRound = id =>
  set(state => {
    state.feed = state.feed.filter(round => round.id !== id)
  })

export const startNewSession = () => {
  const { isChatMode, chatHistory, feed } = get();

  let sessionToSave = null;

  if (isChatMode && chatHistory.length > 0) {
    sessionToSave = {
      id: crypto.randomUUID(),
      type: 'chat',
      timestamp: Date.now(),
      data: chatHistory,
      preview: chatHistory.find(m => m.role === 'user')?.content.substring(0, 50) || 'Chat Session'
    };
  } else if (!isChatMode && feed.length > 0) {
    sessionToSave = {
      id: crypto.randomUUID(),
      type: 'studio',
      timestamp: Date.now(),
      data: feed,
      preview: feed[feed.length - 1]?.prompt.substring(0, 50) || 'Studio Session'
    };
  }

  set(state => {
    if (sessionToSave) {
      state.history.unshift(sessionToSave);
      saveHistory(state.history);
    }
    state.feed = [];
    state.chatHistory = [];
  });
};

export const addPersona = (personaData) => {
  const newPersona = { ...personaData, id: crypto.randomUUID() };
  set(state => {
    state.personas.push(newPersona);
    savePersonas(state.personas);
  });
};

export const updatePersona = (personaData) => {
  set(state => {
    const index = state.personas.findIndex(p => p.id === personaData.id);
    if (index !== -1) {
      state.personas[index] = personaData;
      savePersonas(state.personas);
    }
  });
};

export const deletePersona = (personaId) => {
  set(state => {
    state.personas = state.personas.filter(p => p.id !== personaId);
    savePersonas(state.personas);
    // If the deleted persona was the active one, reset to a default mode
    if (state.outputMode === personaId) {
        const firstCategoryKey = Object.keys(modes)[0];
        const firstModeKey = Object.keys(modes[firstCategoryKey])[0];
        state.outputMode = firstModeKey;
        state.systemInstruction = allModes[firstModeKey].systemInstruction;
    }
  });
};

export const exportPersona = (personaId) => {
  const persona = get().personas.find(p => p.id === personaId);
  if (!persona) return;

  const dataStr = JSON.stringify(persona, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `${persona.name.toLowerCase().replace(/\s+/g, '-')}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

export const importPersonas = (data) => {
    const personasToImport = Array.isArray(data) ? data : [data];
    const newPersonas = [];
    
    // Basic validation
    for (const p of personasToImport) {
        if (p.name && p.systemInstruction && p.model) {
            newPersonas.push({ ...p, id: p.id || crypto.randomUUID() });
        }
    }
    
    if (newPersonas.length > 0) {
        set(state => {
            // Avoid duplicates by ID
            const existingIds = new Set(state.personas.map(p => p.id));
            const uniqueNewPersonas = newPersonas.filter(p => !existingIds.has(p.id));
            state.personas.push(...uniqueNewPersonas);
            savePersonas(state.personas);
        });
    }
}

export const addApi = (apiData) => {
  const newApi = { ...apiData, id: crypto.randomUUID() };
  set(state => {
    state.apis.push(newApi);
    saveApis(state.apis);
  });
};

export const updateApi = (apiData) => {
  set(state => {
    const index = state.apis.findIndex(a => a.id === apiData.id);
    if (index !== -1) {
      state.apis[index] = apiData;
      saveApis(state.apis);
    }
  });
};

export const deleteApi = (apiId) => {
  set(state => {
    state.apis = state.apis.filter(a => a.id !== apiId);
    saveApis(state.apis);
    
    // Unlink from any personas using it
    state.personas.forEach(p => {
      if (p.apiId === apiId) {
        p.apiId = null;
      }
    });
    savePersonas(state.personas);
  });
};

export const addCodeFile = fileData => {
  const newFile = {...fileData, id: crypto.randomUUID()};
  set(state => {
    state.codeFiles.push(newFile);
    saveCodeFiles(state.codeFiles);
  });
};

export const updateCodeFile = fileData => {
  set(state => {
    const index = state.codeFiles.findIndex(f => f.id === fileData.id);
    if (index !== -1) {
      state.codeFiles[index] = fileData;
      saveCodeFiles(state.codeFiles);
    }
  });
};

export const deleteCodeFile = fileId => {
  set(state => {
    state.codeFiles = state.codeFiles.filter(f => f.id !== fileId);
    saveCodeFiles(state.codeFiles);

    // Unlink from any personas using it
    state.personas.forEach(p => {
      if (p.codeFileIds?.includes(fileId)) {
        p.codeFileIds = p.codeFileIds.filter(id => id !== fileId);
      }
    });
    savePersonas(state.personas);
  });
};

export const enhancePrompt = async (prompt) => {
  try {
    const enhancedPromptResponse = await llmGen({
      model: models['gemini-2.5-flash'].modelString,
      systemInstruction:
        'You are a prompt engineering expert. Your task is to take a user\'s simple prompt and rewrite it into a more detailed and specific prompt. The enhanced prompt should be more effective for a generative AI model to create a high-quality, creative, and detailed output. Focus on adding descriptive adjectives, specific details about style, composition, lighting, and mood. The output should only be the new prompt, with no extra text or explanation.',
      prompt: `Original prompt: "${prompt}"`,
      imageOutput: false,
      temperature: 0.7
    })
    return enhancedPromptResponse.text;
  } catch (e) {
    console.error('Failed to enhance prompt', e)
    throw e; // re-throw to be handled by the UI
  }
}

// Chat Mode Actions
export const setChatMode = (enabled) => set(state => { state.isChatMode = enabled; });

const generateSingleChatResponse = async (config) => {
    const { profileId, prompt, messageId, variant } = config;
    const { useMultiAgentPipeline, useStudioSupercharge, useHybridChat, useGoogleSearch, personas, apis, codeFiles } = get();
    
    const currentMode = allModes[profileId] || personas.find(p => p.id === profileId);
    if (!currentMode) {
      throw new Error(`Profile ${profileId} not found.`);
    }

    const { temperature, topP, topK, model: modelKey } = currentMode;
    const modelInfo = models[modelKey];
    let chatSystemInstruction = currentMode.systemInstruction;
    const isCodeMode = !currentMode.imageOutput && currentMode.syntax && !['text', 'markdown', 'image'].includes(currentMode.syntax);
    const isRenderable = currentMode.isRenderable;

    // Add context from code files if attached
    if (currentMode.codeFileIds?.length > 0) {
      const attachedFiles = currentMode.codeFileIds.map(id => codeFiles.find(f => f.id === id)).filter(Boolean);
      if (attachedFiles.length > 0) {
        const filesContext = attachedFiles.map(file => `## File: ${file.name} (${file.language})\n\`\`\`${file.language}\n${file.content}\n\`\`\``).join('\n\n');
        chatSystemInstruction = `Here is some context from attached files:\n\n${filesContext}\n\n---\n\n${chatSystemInstruction}`;
      }
    }
    
    let responseSchema = null;
    let tools = null;

    if (useGoogleSearch) {
      tools = [{googleSearch: {}}];
    } else if (currentMode.apiId) {
      const api = apis.find(a => a.id === currentMode.apiId);
      if (api) {
        try {
          const definition = JSON.parse(api.definition);
          if (api.type === 'schema') responseSchema = definition;
          else if (api.type === 'tools') tools = definition;
        } catch (e) { console.error(`Invalid JSON in API definition "${api.name}"`); }
      }
    }

    try {
        let responsePayload = {
          finalCode: '', 
          fixerNotes: 'No agent notes.', 
          review: 'No agent review.',
          groundingMetadata: null
        };
        
        const updateChatFn = (updates) => {
          // In chat, we don't show iterative status updates, just the final result.
          // This function is a no-op for now but could be used for streaming UI updates in the future.
        };

        if (useStudioSupercharge && isCodeMode && isRenderable) {
            // Supercharge for chat
            const superchargeResult = await superchargeGenerator({ prompt, systemInstruction: chatSystemInstruction, model: modelInfo.modelString, temperature, topP, topK, modeId: profileId, updateFn: updateChatFn });
            responsePayload = { 
              finalCode: superchargeResult.outputData,
              fixerNotes: 'This code was improved using the Supercharge self-correction process.', 
              review: superchargeResult.critiqueNotes 
            };
        } else {
            // Simple single-agent logic
            const response = await llmGen({ model: modelInfo.modelString, systemInstruction: chatSystemInstruction, prompt, temperature, topP, topK, tools, responseSchema });
            responsePayload = {
               finalCode: response.text, 
               fixerNotes: 'Direct response from a single agent.', 
               review: 'N/A', 
               groundingMetadata: response.candidates?.[0]?.groundingMetadata 
            };
        }

        // Update the specific message in chat history
        set(state => {
            const msg = state.chatHistory.find(m => m.id === messageId);
            if (msg) {
                msg.content.responses.push({ ...responsePayload, hasError: false, profile: { name: currentMode.name, icon: currentMode.icon, id: profileId }, variant });
            }
        });

    } catch(e) {
        console.error(`Failed to get response from agent for profile ${profileId}`, e);
        set(state => {
            const msg = state.chatHistory.find(m => m.id === messageId);
            if (msg) {
                msg.content.responses.push({ 
                    finalCode: "Sorry, I encountered an error.", 
                    fixerNotes: `Error: ${e.message}`, 
                    review: "The agent failed to respond.", 
                    hasError: true, 
                    profile: { name: currentMode.name, icon: currentMode.icon, id: profileId },
                    variant
                });
            }
        });
    }
}

export const sendChatMessage = async (prompt) => {
  const { outputMode, isAbTestMode, abTestProfileId, useHybridChat } = get();

  const userMessage = { id: crypto.randomUUID(), role: 'user', content: prompt };
  const thinkingMessageId = crypto.randomUUID();
  const thinkingMessage = {
    id: thinkingMessageId,
    role: 'model',
    content: { isThinking: true, responses: [] }
  };

  set(state => {
    state.chatHistory.push(userMessage, thinkingMessage);
  });
  
  const configs = [];
  // Use the selected sidebar profile if hybrid chat is on, otherwise default to a basic text profile
  const primaryProfileId = useHybridChat ? outputMode : 'markdown'; 
  
  configs.push({ profileId: primaryProfileId, variant: (isAbTestMode ? 'A' : null), prompt, messageId: thinkingMessageId });

  if (isAbTestMode && abTestProfileId) {
    configs.push({ profileId: abTestProfileId, variant: 'B', prompt, messageId: thinkingMessageId });
  }

  try {
      await Promise.all(configs.map(cfg => generateSingleChatResponse(cfg)));
  } catch (e) {
      console.error("Error dispatching chat generations", e);
  } finally {
      set(state => {
          const msg = state.chatHistory.find(m => m.id === thinkingMessageId);
          if (msg) msg.content.isThinking = false;
      });
  }
};

// History Actions
export const toggleHistoryPanel = (isOpen) => set(state => {
  state.isHistoryPanelOpen = typeof isOpen === 'boolean' ? isOpen : !state.isHistoryPanelOpen;
});

export const loadHistorySession = (sessionId) => {
  const session = get().history.find(s => s.id === sessionId);
  if (!session) return;

  startNewSession(); // Archive current work before loading

  set(state => {
    if (session.type === 'chat') {
      state.isChatMode = true;
      state.chatHistory = session.data;
    } else {
      state.isChatMode = false;
      state.feed = session.data;
    }
    state.isHistoryPanelOpen = false;
  });
};

export const deleteHistorySession = (sessionId) => {
  set(state => {
    state.history = state.history.filter(s => s.id !== sessionId);
    saveHistory(state.history);
  });
};

const saveCurrentSettings = () => {
    const {
        useMultiAgentPipeline,
        useStudioSupercharge,
        useHybridChat,
        useGoogleSearch,
        isAbTestMode,
        abTestProfileId,
        isSidebarCollapsed,
    } = get();
    saveSettings({
        useMultiAgentPipeline,
        useStudioSupercharge,
        useHybridChat,
        useGoogleSearch,
        isAbTestMode,
        abTestProfileId,
        isSidebarCollapsed,
    });
};

// Experimental Features
export const toggleMultiAgentPipeline = () => {
    set(state => { state.useMultiAgentPipeline = !state.useMultiAgentPipeline; });
    saveCurrentSettings();
};
export const toggleStudioSupercharge = () => {
    set(state => { state.useStudioSupercharge = !state.useStudioSupercharge; });
    saveCurrentSettings();
};
export const toggleHybridChat = () => {
    set(state => { state.useHybridChat = !state.useHybridChat; });
    saveCurrentSettings();
};
export const toggleGoogleSearch = () => {
    set(state => { state.useGoogleSearch = !state.useGoogleSearch; });
    saveCurrentSettings();
};

// Focus Mode
export const setFocusedOutput = (output) => set(state => {
  state.focusedOutput = output;
});


// A/B Testing Actions
export const toggleAbTestMode = () => {
    set(state => {
        const newMode = !state.isAbTestMode;
        if (!newMode) {
            state.abTestProfileId = null;
        }
        state.isAbTestMode = newMode;
    });
    saveCurrentSettings();
};

export const setAbTestProfileId = (profileId) => {
    set(state => {
        state.abTestProfileId = profileId;
    });
    saveCurrentSettings();
};

// UI Actions
export const toggleSidebar = () => {
    set(state => { state.isSidebarCollapsed = !state.isSidebarCollapsed; });
    saveCurrentSettings();
};

// AI-powered Studio Manager Actions

export const generateApiDefinition = async (description, type) => {
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      jsonString: {
        type: Type.STRING,
        description: `A string containing the valid JSON definition for the API. The JSON must be perfectly formatted. This string itself will be parsed as JSON.`
      }
    },
    required: ["jsonString"]
  };
  
  const systemInstruction = `You are an expert API designer. Based on the user's description, generate a valid JSON definition as a string. The type of API required is "${type}". If the type is 'tools', it should be an array of function declarations. If the type is 'schema', it should be a response schema object.`;

  try {
    const res = await llmGen({
      model: models['gemini-2.5-flash'].modelString,
      systemInstruction,
      prompt: description,
      responseSchema,
    });
    const parsedOuter = JSON.parse(res.text);
    const definitionString = parsedOuter.jsonString;
    
    // Validate the inner string is valid JSON
    const parsedInner = JSON.parse(definitionString);
    
    // Return the prettified version
    return { success: true, definition: JSON.stringify(parsedInner, null, 2) };
  } catch (e) {
    console.error('API definition generation failed:', e);
    return { success: false, message: `AI generation failed: ${e.message}` };
  }
};

export const checkCodeWithAI = async (code, language) => {
  const systemInstruction = `You are a world-class code linter and static analysis tool. You will be given a snippet of code in ${language}.
Your tasks are:
1. Thoroughly analyze the code for any syntax errors, potential runtime bugs, logical flaws, or deviations from best practices.
2. If the code is completely error-free and of high quality, your ONLY response must be the exact string "OK". Do not add any other text.
3. If you find any issues, provide a concise, professional, bulleted list of the problems in Markdown format. Do not include any introductory or concluding sentences, just the list.
`;
  try {
    const res = await llmGen({
      model: models['gemini-2.5-flash'].modelString,
      systemInstruction,
      prompt: `\`\`\`${language}\n${code}\n\`\`\``
    });
    return res.text.trim();
  } catch (e) {
    console.error('AI code check failed:', e);
    return `An error occurred while checking the code: ${e.message}`;
  }
};


export const bulkCreateItems = async (prompt, itemType) => {
  set(state => { state.isBulkCreating = true; });

  let responseSchema;
  let systemInstruction;

  switch (itemType) {
    case 'profiles':
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'A concise, descriptive name for the profile.' },
            icon: { type: Type.STRING, description: 'A single, valid Google Material Symbols name (e.g., "code", "palette", "smart_toy").' },
            systemInstruction: { type: Type.STRING, description: 'A detailed system instruction defining the AI\'s persona, expertise, and rules.' },
          },
          required: ['name', 'icon', 'systemInstruction'],
        },
      };
      systemInstruction = `You are a configuration generator. The user will provide a high-level request to create multiple AI profiles. Your task is to interpret the request and generate a JSON array of objects that strictly adheres to the provided schema. For each profile, you must infer a suitable name, a Google Material Symbols icon name, and a detailed, effective system instruction that captures the essence of the requested persona. Be creative and thorough.`;
      break;
    case 'apis':
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'A concise, descriptive name for the API definition.' },
            type: { type: Type.STRING, enum: ['tools', 'schema'], description: 'The type of the API, either "tools" for function calling or "schema" for response validation.' },
            definition: { type: Type.STRING, description: 'A string containing valid JSON for the API definition. This string itself must be parseable as JSON.' },
            description: { type: Type.STRING, description: 'A natural language description of what the API does. This will be used to show the user what was generated.' },
          },
          required: ['name', 'type', 'definition', 'description'],
        },
      };
      systemInstruction = `You are a configuration generator. The user will provide a high-level request to create multiple API definitions (for function calling tools or response schemas). Your task is to interpret the request and generate a JSON array of objects that strictly adheres to the provided schema. The 'definition' field must be a valid JSON string. The 'description' field should be the original natural language prompt for that specific API.`;
      break;
    case 'code':
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'A concise, descriptive name for the code file, including its extension (e.g., "utils.js").' },
            language: { type: Type.STRING, description: 'The programming language of the code (e.g., "javascript", "python").' },
            content: { type: Type.STRING, description: 'The full source code content for the file.' },
          },
          required: ['name', 'language', 'content'],
        },
      };
      systemInstruction = `You are a configuration generator and expert programmer. The user will provide a high-level request to create multiple code files. Your task is to interpret the request and generate a JSON array of objects that strictly adheres to the provided schema. Write complete, useful, and well-documented code for the 'content' field.`;
      break;
    default:
      set(state => { state.isBulkCreating = false; });
      return { success: false, message: 'Invalid item type for bulk creation.' };
  }

  try {
    const res = await llmGen({
      model: models['gemini-2.5-flash'].modelString,
      systemInstruction,
      prompt,
      responseSchema,
    });

    const parsedData = JSON.parse(res.text);

    if (!Array.isArray(parsedData)) {
      throw new Error('AI response is not a JSON array.');
    }

    parsedData.forEach(item => {
      if (itemType === 'profiles') {
        addPersona({
          name: item.name,
          icon: item.icon,
          systemInstruction: item.systemInstruction,
          // Add default model params
          model: 'gemini-2.5-flash',
          temperature: 0.4,
          topP: 0.95,
          topK: 64,
          apiId: null,
          codeFileIds: [],
        });
      } else if (itemType === 'apis') {
        // Validate nested JSON in definition
        try {
          JSON.parse(item.definition);
          addApi(item);
        } catch (e) {
          console.warn('Skipping API with invalid definition JSON:', item.name, e);
        }
      } else if (itemType === 'code') {
        addCodeFile(item);
      }
    });
    
    set(state => { state.isBulkCreating = false; });
    return { success: true, count: parsedData.length };
  } catch (e) {
    console.error('Bulk creation failed:', e);
    set(state => { state.isBulkCreating = false; });
    return { success: false, message: e.message };
  }
};

init()