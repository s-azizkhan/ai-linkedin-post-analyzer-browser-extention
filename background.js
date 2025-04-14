chrome.runtime.onInstalled.addListener(() => {
    // console.log("AZ: LinkedIn Intention Analyzer installed");
});

// replace with your AI config
const AI_CONFIG = {
    model: 'gemma3:1b',
    temperature: 0.5,
    max_tokens: 150,
    top_p: 1,
    base_url: "http://127.0.0.1:11434",
    api_key: "ollama",
    system_prompt: "You are an AI assistant by 'Aziz' that analyzes LinkedIn posts to identify user intentions, returning results according to the provided schema. Output an array of intentions (e.g., professionalUpdates, networking, etc.) with confidence scores (0 to 1), a boolean indicating if the post is AI-generated, and a reason for the analysis.",
    full_url: "http://127.0.0.1:11434/api/chat"
};

// Function to analyze text using Ollama API
async function analyzeText(text) {
    // console.log("Analyzing text:", text);

    // const resultSchema = {
    //     type: "object",
    //     properties: {
    //         intentions: {
    //             type: "object",
    //             properties: {
    //                 "selfPromotion": {
    //                     "type": "integer"
    //                 },
    //                 "advertisement": {
    //                     "type": "integer"
    //                 },
    //                 "teaching": {
    //                     "type": "integer"
    //                 },
    //                 "networking": {
    //                     "type": "integer"
    //                 }
    //             },
    //             required: [
    //                 "selfPromotion",
    //                 "advertisement",
    //                 "teaching",
    //                 "networking"
    //             ]
    //         },
    //         isAIGenerated: {
    //             "type": "boolean"
    //         },
    //         reason: {
    //             "type": "string"
    //         }
    //     },
    //     required: [
    //         "intentions",
    //         "isAIGenerated",
    //         "reason"
    //     ]
    // };

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
                                "communityBuilding"
                            ]
                        },
                        confidence: {
                            type: "number",
                            minimum: 0,
                            maximum: 1
                        }
                    },
                    required: ["intention", "confidence"]
                },
                minItems: 1
            },
            isAIGenerated: {
                type: "boolean"
            },
            reason: {
                type: "string"
            }
        },
        required: ["intentions", "isAIGenerated", "reason"],
        additionalProperties: false
    };

    const messages = [
        {
            "role": "system",
            "content": AI_CONFIG.system_prompt
        },
        {
            "role": "user",
            "content": text
        }
    ];

    // console.log("AZ: AI_CONFIG:", AI_CONFIG);

    try {
        const response = await fetch(AI_CONFIG.full_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.api_key}`
            },
            body: JSON.stringify({
                messages,
                model: AI_CONFIG.model,
                format: resultSchemaV2,
                stream: false
            })
        });

        // console.log("AZ: API response:", response);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        const resp = JSON.parse(data.message.content);
        // console.log("API response:", resp);

        // const { advertisement, teaching, networking, selfPromotion } = resp.intentions;
        const intentions = resp.intentions;
        // convert the resp.intention to capitalized & sapced string (selfPromotion -> Self Promotion)
        for (let i = 0; i < intentions.length; i++) {
            intentions[i].intention = intentions[i].intention.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
        }

        // Assuming the API response structure
        const result = {
            intentions,
            reason: resp.reason,
            isAIGenerated: resp.isAIGenerated
        };

        // console.log("Analysis result:", result);
        return result;
    } catch (error) {
        console.error("Error analyzing text:", error);
        sendResponse({ error: error.message });
    }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("Received message:", request);
    if (request.action === 'analyzePost') {
        analyzeText(request.text)
            .then(results => {
                sendResponse({ results });
            })
            .catch(error => {
                console.error("Error analyzing text:", error);
                sendResponse({ error: error.message });
            });
        // Return true to indicate you wish to send a response asynchronously
        return true;
    }
});
