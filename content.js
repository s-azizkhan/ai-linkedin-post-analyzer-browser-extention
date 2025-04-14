// Function to add "Check Intention" button to posts
function addIntentionButton() {
  const posts = document.querySelectorAll('div.feed-shared-update-v2');
  if (!posts) return console.log('AZ: No posts found')
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


      console.log('AZ: Button created');
      const cleanedText = getPostText(post);
      // console.log(cleanedText);

      // add text to the button custom attribute
      button.setAttribute('post-text', cleanedText);

      button.addEventListener('click', () => analyzePost(post));

      const actionsContainer = post.querySelector('div.feed-shared-social-action-bar');
      if (actionsContainer) {
        actionsContainer.appendChild(button);
      } else {
        console.log('AZ: No actions container found for post');
        post.appendChild(button);
      }
    } else {
      // console.log('Intention button already exists for post');
    }
  });
}

// Function to extract post text
function getPostText(post) {
  const cleanedText = post.querySelector('div.update-components-text')?.textContent.trim()?.replaceAll("hashtag#", "#");
  return cleanedText;
}

function extractHashtags(text) {
  // Use a regular expression to match hashtags starting with "hashtag#"
  const hashtagPattern = /hashtag#\w+/g;
  const hashtags = text.match(hashtagPattern);

  // then remove hashtag# from the hashtags
  hashtags.forEach((hashtag, index) => {
    hashtags[index] = hashtag.replace('hashtag#', '');
  });

  // Remove the matched hashtags from the original text
  const textWithoutHashtags = text.replace(hashtagPattern, '').trim();

  return {
    textWithoutHashtags,
    hashtags
  };
}

// Function to analyze post
async function analyzePost(post) {
  const postText = getPostText(post);
  if (!postText) {
    alert('No text found in post');
    return;
  }

  alert(postText);

  // const { textWithoutHashtags, hashtags } = extractHashtags(postText);
  // alert(textWithoutHashtags);
  // alert(hashtags);

  // Send message to background script for analysis
  chrome.runtime.sendMessage({
    action: 'analyzePost',
    text: postText
  }, response => {
    if (response.error) {
      alert('Error analyzing post: ' + response.error);
      return;
    }

    // Display results
    showResultsAlert(post, response.results);
  });
}

// Function to display analysis results
function showResultsAlert(post, results) {
  let message = 'Intention Analysis:\n';
  for (const [intention, score] of Object.entries(results.intentions)) {
    message += `${intention}: ${(score * 100).toFixed(0)}%\n`;
  }
  message += `AI-Generated: ${results.isAIGenerated ? 'Yes' : 'No'}`;

  alert(message);
  return;
}

// Function to display analysis results
function showResults(post, results) {
  // Remove existing results if any
  const existingResults = post.querySelector('.intention-results');
  if (existingResults) {
    existingResults.remove();
  }

  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'intention-results';
  resultsDiv.style.margin = '10px';
  resultsDiv.style.padding = '10px';
  resultsDiv.style.backgroundColor = '#f3f2f1';
  resultsDiv.style.borderRadius = '4px';

  let html = '<h3>Intention Analysis:</h3><ul>';
  for (const [intention, score] of Object.entries(results.intentions)) {

    html += `<li>${intention}: ${(score * 100).toFixed(0)}%</li>`;
  }
  html += '</ul>';
  html += `<p>AI-Generated: ${results.isAIGenerated ? 'Yes' : 'No'}</p>`;

  resultsDiv.innerHTML = html;

  const actionsContainer = post.querySelector('div.feed-shared-social-action-bar');
  if (actionsContainer) {
    actionsContainer.appendChild(resultsDiv);
  }
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