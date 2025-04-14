function addIntentionButton() {
  const posts = document.querySelectorAll('div.feed-shared-update-v2');
  if (!posts) {
    // console.log('AZ: No posts found');
    return;
  }
  posts.forEach(post => {
    if (!post.querySelector('.intention-button')) {
      const button = document.createElement('button');
      button.className = 'intention-button';
      button.textContent = 'Check Intention';
      button.style.margin = '10px';
      button.style.padding = '5px 10px';
      button.style.backgroundColor = '#030505';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.borderRadius = '4px';
      button.style.cursor = 'pointer';

      // console.log('AZ: Button created');
      const cleanedText = getPostText(post);
      button.setAttribute('post-text', cleanedText);

      button.addEventListener('click', () => analyzePost(post));

      const actionsContainer = post.querySelector('div.feed-shared-social-action-bar');
      if (actionsContainer) {
        actionsContainer.appendChild(button);
      } else {
        // console.log('AZ: No actions container found for post');
        post.appendChild(button);
      }
    }
  });
}

function getPostText(post) {
  const cleanedText = post.querySelector('div.update-components-text')?.textContent.trim()?.replaceAll("hashtag#", "#");
  return cleanedText || '';
}

async function analyzePost(post) {
  const postText = getPostText(post);
  if (!postText) {
    alert('No text found in post');
    return;
  }

  const intentionButton = post.querySelector('.intention-button');
  intentionButton.disabled = true;
  intentionButton.textContent = 'Analyzing...';

  chrome.runtime.sendMessage({
    action: 'analyzePost',
    text: postText
  }, response => {
    if (response.error) {
      alert('Error analyzing post: ' + response.error);
      intentionButton.disabled = false;
      intentionButton.textContent = 'Check Intention';
      return;
    }

    showResultsAlert(post, response.results);
    intentionButton.disabled = false;
    intentionButton.textContent = 'Check Intention';
  });
}

function showResultsAlert(post, results) {
  let message = 'Intention Analysis:\n';
  results.intentions.forEach(({ intention, confidence }) => {
    message += `${intention}: ${(confidence * 100).toFixed(0)}%\n`;
  });
  message += `Reason: ${results.reason}\n`;
  message += `AI-Generated: ${results.isAIGenerated ? 'Yes' : 'No'}`;

  alert(message);
}

// Observe DOM changes to handle dynamic content
const observer = new MutationObserver(() => {
  addIntentionButton();
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial button addition
addIntentionButton();