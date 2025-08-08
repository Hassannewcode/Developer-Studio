/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GoogleGenAI} from '@google/genai'
import {limitFunction} from 'p-limit'

const timeoutMs = 60_000
const maxRetries = 3
const baseDelay = 1_000
const ai = new GoogleGenAI({apiKey: process.env.API_KEY})

const safetySettings = [
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_HARASSMENT'
].map(category => ({category, threshold: 'BLOCK_NONE'}))

const generateWithRetry = async generationFn => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
      )
      const modelPromise = generationFn()
      return await Promise.race([modelPromise, timeoutPromise])
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed.`, error)
      if (attempt === maxRetries - 1) {
        throw error
      }
      const delay = baseDelay * 2 ** attempt
      await new Promise(res => setTimeout(res, delay))
    }
  }
}

export default limitFunction(
  async ({
    model,
    systemInstruction,
    prompt,
    promptImage,
    imageOutput,
    temperature,
    topP,
    topK,
    responseSchema,
    tools,
  }) => {
    if (imageOutput) {
      const res = await generateWithRetry(() =>
        ai.models.generateImages({
          model,
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '4:3'
          }
        })
      )
      const base64ImageBytes = res.generatedImages[0].image.imageBytes;
      // This is a special case where we can't return the full response object
      // because the response format for image generation is different.
      // We will create a mock response object that has a .text property
      // with the base64 string, so the rest of the app can handle it.
      return { text: `data:image/png;base64,${base64ImageBytes}` };
    } else {
      const contents = {
        parts: [
          ...(promptImage
            ? [
                {
                  inlineData: {
                    data: promptImage.split(',')[1],
                    mimeType: 'image/png'
                  }
                }
              ]
            : []),
          {text: prompt}
        ]
      }

      const config = {
        systemInstruction,
        safetySettings,
        temperature,
        topP,
        topK
      }

      if (tools) {
        config.tools = tools;
      } else if (responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = responseSchema;
      }

      const res = await generateWithRetry(() =>
        ai.models.generateContent({
          model,
          contents,
          config
        })
      )
      return res
    }
  },
  {concurrency: 8}
)
