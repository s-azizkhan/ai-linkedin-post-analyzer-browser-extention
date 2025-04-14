function addIntentionButton() {
  const posts = document.querySelectorAll("div.feed-shared-update-v2");
  if (!posts) {
    // console.log('AZ: No posts found');
    return;
  }
  posts.forEach((post) => {
    if (!post.querySelector(".intention-button")) {
      const button = document.createElement("button");
      button.className = "intention-button";
      button.textContent = "Check Intention";
      button.style.margin = "10px";
      button.style.padding = "5px 10px";
      button.style.backgroundColor = "#1a1a1a";
      button.style.color = "#ffffff";
      button.style.border = "1px solid #ffffff";
      button.style.borderRadius = "8px";
      button.style.fontSize = "1.2rem";
      button.style.cursor = "pointer";
      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";
      button.style.transition = "all 0.2s ease";

      button.addEventListener("mouseenter", () => {
        button.style.backgroundColor = "#333333";
        button.style.transform = "translateY(-1px)";
      });

      button.addEventListener("mouseleave", () => {
        button.style.backgroundColor = "#1a1a1a";
        button.style.transform = "translateY(0)";
      });

      const cleanedText = getPostText(post);
      button.setAttribute("post-text", cleanedText);

      button.addEventListener("click", () => analyzePost(post));

      const actionsContainer = post.querySelector(
        "div.feed-shared-social-action-bar",
      );
      if (actionsContainer) {
        actionsContainer.appendChild(button);
      } else {
        post.appendChild(button);
      }
    }
  });
}

function getPostText(post) {
  const cleanedText = post
    .querySelector("div.update-components-text")
    ?.textContent.trim()
    ?.replaceAll("hashtag#", "#");
  return cleanedText || "";
}

async function analyzePost(post) {
  const intentionButton = post.querySelector(".intention-button");
  try {
    const postText = getPostText(post);
    if (!postText) {
      alert("No text found in post");
      return;
    }

    intentionButton.disabled = true;
    intentionButton.textContent = "Analyzing...";

    chrome.runtime.sendMessage(
      {
        action: "analyzePost",
        text: postText,
      },
      (response) => {
        if (response.error) {
          alert("Error analyzing post: " + response.error);
          intentionButton.disabled = false;
          intentionButton.textContent = "Check Intention";
          return;
        }

        showResultsAlert(post, response.results);
        intentionButton.disabled = false;
        intentionButton.textContent = "Check Intention";
      },
    );
  } catch (error) {
    console.error("Error analyzing post:", error);
    alert(`Error analyzing post: ${error.message}`);
    intentionButton.disabled = false;
    intentionButton.textContent = "Check Intention";
  }
}

function showResultsAlert(post, results) {
  if (results.provider === "groq") {
    alert(results.content);
    return;
  }
  let message = "Intention Analysis:\n";
  results.intentions.forEach(({ intention, confidence }) => {
    message += `${intention}: ${(confidence * 100).toFixed(0)}%\n`;
  });
  message += `Reason: ${results.reason}\n`;
  message += `AI-Generated: ${results.isAIGenerated ? "Yes" : "No"}`;

  alert(message);
}

// Observe DOM changes to handle dynamic content
const observer = new MutationObserver(() => {
  addIntentionButton();
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial button addition
addIntentionButton();
