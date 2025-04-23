// Function to save options to chrome.storage.local
function saveOptions() {
  const provider = document.getElementById('provider').value;
  const model = document.getElementById('model').value;
  const apiKey = document.getElementById('apiKey').value;
  const baseUrl = document.getElementById('baseUrl').value; // Optional

  const aiConfig = {
    provider,
    model,
    apiKey,
    baseUrl, // Store even if empty
  };

  chrome.storage.local.set({ aiConfig }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => {
      status.textContent = '';
    }, 1500);
  });
}

// Function to restore options from chrome.storage.local
function restoreOptions() {
  chrome.storage.local.get(['aiConfig'], (result) => {
    if (result.aiConfig) {
      document.getElementById('provider').value = result.aiConfig.provider || 'ollama';
      document.getElementById('model').value = result.aiConfig.model || '';
      document.getElementById('apiKey').value = result.aiConfig.apiKey || '';
      document.getElementById('baseUrl').value = result.aiConfig.baseUrl || '';
    } else {
      // Set default values if nothing is stored
      document.getElementById('provider').value = 'ollama';
    }
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);