/**
 * AI Client for interacting with various AI providers
 * @module ai-client
 */

/**
 * Message structure for AI requests
 * @typedef {Object} Message
 * @property {string} role - Role of the message (system, user, or assistant)
 * @property {string} content - Content of the message
 * @property {Array} [toolCalls] - Optional tool calls
 */

/**
 * Request structure for AI providers
 * @typedef {Object} Request
 * @property {string} provider - AI provider (ollama, openai, gemini, grok)
 * @property {string} apiKey - API key for authentication
 * @property {string} modelId - Model identifier
 * @property {Message[]} messages - Array of messages
 * @property {string} [responseType] - Response type (text or json)
 * @property {Object} [responseSchema] - Schema for JSON responses
 * @property {string} [customUrl] - Custom API URL
 * @property {Array} [tools] - Optional tools
 * @property {boolean} [stream] - Enable streaming
 */

/**
 * Validates a message object
 * @param {Message} message - Message to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
function validateMessage(message) {
  if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
    return 'Invalid message role';
  }
  if (!message.content) {
    return 'Message content is required';
  }
  return null;
}

/**
 * Converts Gemini response to standardized format
 * @param {Object} geminiResponse - Gemini API response
 * @returns {Object} Standardized AI response
 */
function parseGeminiResponse(geminiResponse) {
  if (!geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid Gemini response structure');
  }

  const candidate = geminiResponse.candidates[0];
  return {
    created_at: new Date().toISOString(),
    done: true,
    done_reason: candidate.finishReason,
    eval_count: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
    prompt_eval_count: geminiResponse.usageMetadata?.promptTokenCount || 0,
    eval_duration: 0,
    load_duration: 0,
    prompt_eval_duration: 0,
    total_duration: 0,
    message: {
      content: candidate.content.parts[0].text,
      role: 'assistant'
    },
    model: geminiResponse.modelVersion || ''
  };
}

/**
 * Makes an HTTP request to the AI provider
 * @param {string} url - API endpoint URL
 * @param {string} apiKey - API key
 * @param {Object} body - Request body
 * @param {string} provider - AI provider
 * @returns {Promise<Object>} API response
 */
async function makeRequest(url, apiKey, body, provider) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (provider !== 'gemini') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Provider error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Builds Gemini contents array
 * @param {Message[]} messages - Input messages
 * @returns {Object[]} Gemini contents
 */
function buildGeminiContents(messages) {
  return messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));
}

/**
 * Extracts Gemini system instruction
 * @param {Message[]} messages - Input messages
 * @returns {Object[]|null} System instruction parts
 */
function extractGeminiSystemInstruction(messages) {
  const systemMsg = messages.find(msg => msg.role === 'system');
  return systemMsg ? [{ text: systemMsg.content }] : null;
}

/**
 * Main AI client class
 */
class AIClient {
  /**
   * Calls Ollama provider
   * @param {Request} request - Request configuration
   * @returns {Promise<Object>} Provider response
   */
  async callOllama(request) {
    const url = request.customUrl || 'http://127.0.0.1:11434/api/chat';
    const body = {
      model: request.modelId,
      messages: request.messages,
      stream: request.stream || false
    };

    if (request.responseType === 'json' && request.responseSchema) {
      body.format = request.responseSchema;
      body.stream = false;
    }
    if (request.tools?.length) {
      body.tools = request.tools;
    }

    return makeRequest(url, request.apiKey, body, request.provider);
  }

  /**
   * Calls OpenAI provider
   * @param {Request} request - Request configuration
   * @returns {Promise<Object>} Provider response
   */
  async callOpenAI(request) {
    const url = request.customUrl || 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: request.modelId,
      messages: request.messages,
      stream: request.stream || false
    };

    if (request.responseType === 'json' && request.responseSchema) {
      body.response_format = { type: 'json_object' };
    }
    if (request.tools?.length) {
      body.tools = request.tools;
    }

    return makeRequest(url, request.apiKey, body, request.provider);
  }

  /**
   * Calls Gemini provider
   * @param {Request} request - Request configuration
   * @returns {Promise<Object>} Standardized response
   */
  async callGemini(request) {
    const url = request.customUrl ||
      `https://generativelanguage.googleapis.com/v1beta/models/${request.modelId}:generateContent?key=${request.apiKey}`;

    const body = {
      contents: buildGeminiContents(request.messages)
    };

    const systemParts = extractGeminiSystemInstruction(request.messages);
    if (systemParts) {
      body.systemInstruction = { parts: systemParts };
    }

    if (request.tools?.length) {
      body.tools = request.tools;
    }

    if (request.responseType) {
      const config = { responseMimeType: 'text/plain' };
      if (request.responseType === 'json') {
        config.responseMimeType = 'application/json';
        config.responseSchema = request.responseSchema;
      }
      body.generationConfig = config;
    }

    const response = await makeRequest(url, request.apiKey, body, request.provider);
    return parseGeminiResponse(response);
  }

  /**
   * Calls Grok provider
   * @param {Request} request - Request configuration
   * @returns {Promise<Object>} Provider response
   */
  async callGrok(request) {
    const url = request.customUrl || 'https://api.x.ai/v1/grok';
    const body = {
      model: request.modelId,
      messages: request.messages,
      stream: request.stream || false
    };

    if (request.tools?.length) {
      body.tools = request.tools;
    }

    return makeRequest(url, request.apiKey, body, request.provider);
  }

  /**
   * Main method to handle AI provider calls
   * @param {Request} request - Request configuration
   * @returns {Promise<Object>} Provider response
   */
  async chat(request) {
    if (!request.provider || !['ollama', 'openai', 'gemini', 'grok'].includes(request.provider.toLowerCase())) {
      throw new Error('Invalid or unsupported provider');
    }
    if (!request.apiKey) {
      throw new Error('API key is required');
    }
    if (!request.modelId) {
      throw new Error('Model ID is required');
    }
    if (!request.messages?.length) {
      throw new Error('At least one message is required');
    }

    for (const msg of request.messages) {
      const error = validateMessage(msg);
      if (error) {
        throw new Error(error);
      }
    }

    if (request.responseType === 'json' && !request.responseSchema) {
      throw new Error('Response schema required for JSON response type');
    }

    if (request.customUrl) {
      try {
        new URL(request.customUrl);
      } catch {
        throw new Error('Invalid custom URL');
      }
    }

    switch (request.provider.toLowerCase()) {
      case 'ollama':
        return this.callOllama(request);
      case 'openai':
        return this.callOpenAI(request);
      case 'gemini':
        return this.callGemini(request);
      case 'grok':
        return this.callGrok(request);
      default:
        throw new Error('Unsupported provider');
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  // console.log("AZ: LinkedIn Intention Analyzer installed");
});

// Default system prompt if not found in storage
const DEFAULT_SYSTEM_PROMPT = "You are an AI assistant by 'Aziz' that analyzes LinkedIn posts to identify user intentions, returning results according to the provided schema. Output an array of intentions (e.g., professionalUpdates, networking, etc.) with confidence scores (0 to 1), also indicate if the post is AI-generated, and a reason for the analysis";

// Function to get AI config from storage
async function getAIConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['aiConfig'], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      if (!result.aiConfig || !result.aiConfig.provider || !result.aiConfig.model || !result.aiConfig.apiKey) {
        return reject(new Error('AI configuration not found or incomplete. Please configure the extension options.'));
      }
      resolve(result.aiConfig);
    });
  });
}

// Function to analyze text using the configured AI provider
async function analyzeText(text) {
  // console.log("Analyzing text:", text);

  const aiConfig = await getAIConfig(); // Get config from storage

  const resultSchemaV2 = {
    type: "object",
    properties: {
      intentions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            intention: {
              type: "string",
              enum: [
                "professionalUpdates",
                "networking",
                "industryInsights",
                "selfPromotion",
                "jobSearching",
                "thoughtLeadership",
                "companyPromotion",
                "seekingAdvice",
                "eventPromotion",
                "personalBranding",
                "engagement",
                "mentorship",
                "recruitment",
                "educationalContent",
                "communityBuilding",
              ],
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          required: ["intention", "confidence"],
        },
        minItems: 1,
      },
      isAIGenerated: {
        type: "boolean",
      },
      reason: {
        type: "string",
      },
    },
    required: ["intentions", "isAIGenerated", "reason"],
  };

  const messages = [
    {
      role: "system",
      content: DEFAULT_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: text,
    },
  ];

  // console.log("AZ: Using AI Config:", aiConfig);

  try {
    const body = {
      provider: aiConfig.provider,
      messages,
      modelId: aiConfig.model,
      responseType: "json",
      responseSchema: resultSchemaV2,
      stream: false,
      apiKey: aiConfig.apiKey, // Use API key from storage
      customUrl: aiConfig.baseUrl // Use custom URL if provided
    };

    // Provider specific adjustments (keep if needed, adapt based on stored provider)

    const aiClient = new AIClient();
    const data = await aiClient.chat(body);


    const resp = JSON.parse(data.message.content);
    console.log("AZ: API response:", resp);

    // const { advertisement, teaching, networking, selfPromotion } = resp.intentions;
    const intentions = resp.intentions;
    // convert the resp.intention to capitalized & sapced string (selfPromotion -> Self Promotion)
    for (let i = 0; i < intentions.length; i++) {
      intentions[i].intention = intentions[i].intention
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
    }

    // Assuming the API response structure
    const result = {
      intentions,
      reason: resp.reason,
      isAIGenerated: resp.isAIGenerated,
      provider: aiConfig.provider, // Reflect the provider used
    };

    // console.log("Analysis result:", result);
    return result;
  } catch (error) {
    console.error("Error analyzing text:", error);
    // sendResponse({ error: error.message });
    throw error;
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log("Received message:", request);
  if (request.action === "analyzePost") {
    analyzeText(request.text)
      .then((results) => {
        sendResponse({ results });
      })
      .catch((error) => {
        console.error("Error analyzing text:", error);
        sendResponse({ error: error.message });
      });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
});
