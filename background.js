chrome.runtime.onInstalled.addListener(() => {
    console.log("AZ: LinkedIn Intention Analyzer installed");
});

// Mock AI analysis function (replace with actual AI API call)
function analyzeText(text) {
    console.log("Analyzing text:", text);
    // This is a placeholder. In production, call an AI API here
    const result = {
        intentions: {
            advertisement: 0.8,
            teaching: 0.2,
            networking: 0.1
        },
        isAIGenerated: Math.random() > 0.7 // Random for demo
    };
    console.log("Analysis result:", result);
    return result;
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message:", request);
    if (request.action === 'analyzePost') {
        try {
            const results = analyzeText(request.text);
            sendResponse({ results });
        } catch (error) {
            console.error("Error analyzing text:", error);
            sendResponse({ error: error.message });
        }
        // Return true to indicate you wish to send a response asynchronously
        return true;
    }
});
