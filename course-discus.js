// RateLimiter class with improved error handling and logging
class RateLimiter {
  constructor(tokensPerMinute) {
    this.maxTokens = tokensPerMinute;
    this.tokens = tokensPerMinute;
    this.lastRefill = Date.now();
    this.tokensPerMs = tokensPerMinute / (60 * 1000);
  }

  async waitForToken() {
    this.refillTokens();
    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.tokensPerMs);
      showToast(
        `Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`,
        "warning"
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refillTokens();
    }
    this.tokens -= 1;
    return true;
  }

  refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + timePassed * this.tokensPerMs
    );
    this.lastRefill = now;
  }
}

// Initialize rate limiter with 20 tokens per minute
const rateLimiter = new RateLimiter(20);

// Improved API interaction with better error handling
async function fetchAnswerFromGeminiAI(question, apiKey) {
  const apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  const maxRetries = 5;
  const baseDelay = 3000;

  const enhancedQuestion = `jawab dengan jawaban paling ringkas dan mudah dimengerti, gunakan bahasa sebagai seorang mahasiswa, gunakan referensi atau sumber jika diperlukan, dan jangan gunakan point-point jika tidak diperlukan. Berikut adalah konteks atau pertanyaan yang saling berhubungan, jangan menjawab menggunakan bold, garis miring atau text style yang lainnya, hanya memperbolehkan point, atau numbering, jadi semua jenis font normal, jawabannya harus panjang dan jelas, jangan pernah gunakan tanda bintang (*) untuk styling bold, jadi teks biasa saja: ${question}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimiter.waitForToken();

      const response = await fetch(`${apiUrl}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: enhancedQuestion }],
            },
          ],
        }),
      });

      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        showToast(
          `Rate limited. Retrying in ${delay / 1000} seconds... (${
            attempt + 1
          }/${maxRetries})`,
          "warning"
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();
      if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("Invalid API response structure");
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        showToast(`Failed to get response: ${error.message}`, "error");
        throw error;
      }
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelay * Math.pow(2, attempt))
      );
    }
  }

  throw new Error("Max retries exceeded");
}

// Improved post processing with progress tracking
async function processPost(post, waitForElement, apiKey) {
  const contentContainer = post.querySelector(".post-content-container");
  if (!contentContainer) {
    showToast("Content container not found", "error");
    return;
  }

  const allContent = Array.from(contentContainer.querySelectorAll("p, p span"))
    .map((el) => el.textContent.trim())
    .filter((text) => text.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!allContent) {
    showToast("No content found to process", "warning");
    return;
  }

  let textarea = post.querySelector('textarea[name="post"]');
  if (!textarea) {
    const replyButton = post.querySelector('a[data-action="collapsible-link"]');
    if (replyButton) {
      replyButton.click();
      textarea = await waitForElement('textarea[name="post"]', post);
    }
  }

  if (!textarea) {
    showToast("Reply textarea not found", "error");
    return;
  }

  try {
    textarea.value = "Sedang mengambil jawaban...";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const answer = await fetchAnswerFromGeminiAI(allContent, apiKey);
    textarea.value = answer;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    await delay(2000);

    const submitButton =
      post
        .querySelector('button[data-region="submit-text"]')
        ?.closest("button") ||
      Array.from(post.querySelectorAll("button")).find(
        (button) => button.textContent.trim().toLowerCase() === "post to forum"
      );

    if (submitButton) {
      submitButton.click();
      showToast("Answer posted successfully!", "success");
    } else {
      showToast("Submit button not found", "error");
    }
  } catch (error) {
    console.error("Error processing post:", error);
    textarea.value = `Error: ${error.message}`;
    showToast(`Failed to process post: ${error.message}`, "error");
  }
}

// Improved utility functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const waitForElement = (selector, parent, timeout = 5000) => {
  return new Promise((resolve) => {
    const element = parent.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver((mutations) => {
      const element = parent.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(parent, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
};

// Improved auto answer function with progress tracking
async function autoAnswerQuestions(apiKey) {
  if (!apiKey) {
    showToast("API key is required", "error");
    return;
  }

  const posts = document.querySelectorAll(".forumpost");
  if (posts.length === 0) {
    showToast("No forum posts found", "warning");
    return;
  }

  showToast(`Processing ${posts.length} posts...`, "info");

  for (let i = 0; i < posts.length; i++) {
    showToast(`Processing post ${i + 1}/${posts.length}`, "info");
    await processPost(posts[i], waitForElement, apiKey);
    await delay(3000);
  }

  showToast("All posts processed!", "success");
}

// Improved toast notification system
function showToast(message, type = "info") {
  const existingToast = document.querySelector(".custom-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `custom-toast alert alert-${type} alert-dismissible fade show position-fixed`;
  toast.style.cssText = `
    top: 20px;
    right: 20px;
    z-index: 9999;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;

  toast.innerHTML = `
    ${message}
    <button type="button" class="d-none" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Improved API key management
function handleApiKeyInput() {
  const apiKeyInput = document.getElementById("apikey-input");
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showToast("Please enter a valid API key", "error");
    return;
  }

  try {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    document.cookie = `apiKey=${encodeURIComponent(
      apiKey
    )}; path=/; expires=${expirationDate.toUTCString()}; secure; samesite=strict`;

    showToast("API Key saved successfully!", "success");
    document.getElementById("auto-answer-btn").disabled = false;
    apiKeyInput.value = apiKey;
  } catch (error) {
    console.error("Error saving API key:", error);
    showToast("Failed to save API key", "error");
  }
}

function getApiKeyFromCookies() {
  try {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("apiKey="));

    if (cookieValue) {
      return decodeURIComponent(cookieValue.split("=")[1]);
    }
  } catch (error) {
    console.error("Error reading API key:", error);
  }
  return "";
}

// Improved UI controls
function createAutoAnswerControls() {
  const container = document.createElement("div");
  container.className = "card mt-3 mb-3 shadow-sm";

  container.innerHTML = `
    <div class="card-body">
      <div class="row g-1 align-items-center">
        <div class="col-4 col-md-1 mb-2">
          <label for="apikey-input" class="col-form-label fw-bold w-100">Input API Key:</label>
        </div>
        <div class="col-8 col-md-6 mb-2">
          <input type="password" id="apikey-input" class="form-control w-100"
                 placeholder="Enter your API Key" aria-describedby="apiKeyHelp">
        </div>
        <div class="col-6 col-md-2 mb-2">
          <button id="save-apikey-btn" class="btn btn-primary w-100">
            <span class="small"><i class="fas fa-save"></i> Save API Key</span>
          </button>
        </div>
        <div class="col-6 col-md-3 mb-2">
          <button id="auto-answer-btn" class="btn btn-success w-100" disabled>
            <span class="small"><i class="fas fa-robot"></i> Jawab Otomatis</span>
          </button>
        </div>
      </div>
      <div class="mt-3">
        <small class="text-muted">
          <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-decoration-none me-3">
            <i class="fas fa-key"></i> Get API Key
          </a> |
          <a href="https://ai.google.dev/tutorials/setup" target="_blank" class="text-decoration-none ms-3">
            <i class="fas fa-question-circle"></i> How to get API Key
          </a>
        </small>
      </div>
    </div>
  `;

  return container;
}

// Improved initialization
function initializeAutoAnswerControls() {
  const targetHeading = document.querySelector("h3.discussionname");
  if (!targetHeading) {
    console.error("Target heading not found");
    return;
  }

  // Add Font Awesome CSS
  const fontAwesomeLink = document.createElement("link");
  fontAwesomeLink.rel = "stylesheet";
  fontAwesomeLink.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css";
  document.head.appendChild(fontAwesomeLink);

  const controls = createAutoAnswerControls();
  targetHeading.insertAdjacentElement("afterend", controls);

  const saveApiKeyBtn = document.getElementById("save-apikey-btn");
  const autoAnswerBtn = document.getElementById("auto-answer-btn");
  const apiKeyInput = document.getElementById("apikey-input");

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener("click", handleApiKeyInput);
  }

  if (autoAnswerBtn) {
    autoAnswerBtn.addEventListener("click", () => {
      const apiKey = getApiKeyFromCookies();
      if (apiKey) {
        autoAnswerQuestions(apiKey);
      } else {
        showToast("Please enter and save your API key first", "warning");
      }
    });
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        handleApiKeyInput();
      }
    });

    const existingApiKey = getApiKeyFromCookies();
    if (existingApiKey) {
      apiKeyInput.value = existingApiKey;
      autoAnswerBtn.disabled = false;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAutoAnswerControls);
} else {
  initializeAutoAnswerControls();
}

// Add custom styles
const styles = document.createElement("style");
styles.textContent = `
  .custom-toast {
    transition: opacity 0.3s ease-in-out;
  }
  .btn i {
    margin-right: 5px;
  }
  .card {
    border-radius: 8px;
  }
  .form-control:focus {
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
  }
`;
document.head.appendChild(styles);
