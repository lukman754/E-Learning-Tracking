const processedCourses = new Map();
const processedForums = new Set();
const cache = new Map();
let batchSize = 3;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function saveForumData(forumData) {
  const data = {
    forumLink: forumData.forumLink,
    courseName: forumData.courseName,
    forumName: forumData.forumName,
    status: forumData.status,
    activityName: forumData.activityName,
    discussions: forumData.discussions,
    timestamp: Date.now(),
  };

  let forums = JSON.parse(localStorage.getItem("forumData") || "[]");
  const existingIndex = forums.findIndex(
    (f) => f.forumLink === forumData.forumLink
  );

  if (existingIndex >= 0) {
    forums[existingIndex] = data;
  } else {
    forums.push(data);
  }

  localStorage.setItem("forumData", JSON.stringify(forums));
}

function loadForumData() {
  return JSON.parse(localStorage.getItem("forumData") || "[]");
}

async function fetchWithCache(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  const data = await response.text();
  cache.set(url, data);
  return data;
}

function createLogger() {
  const logger = document.createElement("div");
  logger.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.74);
    color: #fff;
    padding: 2px 5px;
    border-radius: 3px;
    font-family: monospace;
    z-index: 9999;
    max-width: 60%;
    font-size: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  document.body.appendChild(logger);
  return logger;
}

function createHeaderButtons(container) {
  const headerContainer = document.createElement("div");
  headerContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  `;

  const title = document.createElement("h4");
  title.textContent = "Daftar Forum Diskusi";
  title.style.margin = "0";

  const refreshButton = document.createElement("button");
  refreshButton.innerHTML = "🔄 Lacak Ulang";
  refreshButton.classList.add("btn", "btn-warning", "btn-sm", "fw-bold");

  const copyButton = document.createElement("button");
  copyButton.innerHTML = "📋 Salin Semua Link";
  copyButton.classList.add("btn", "btn-primary", "btn-sm", "fw-bold");

  refreshButton.addEventListener("click", async () => {
    localStorage.removeItem("forumData");
    const activitiesContainer = container.querySelector(
      ".activities-container"
    );
    if (activitiesContainer) {
      activitiesContainer.remove();
    }
    startTracking();
  });

  copyButton.addEventListener("click", () => {
    const forums = Array.from(document.querySelectorAll(".forum-card"));
    let forumData = "";

    forums.forEach((forum) => {
      const activityName = forum
        .querySelector(".card-header h3 a")
        .textContent.trim();
      const courseName = forum.querySelector(".text-muted").textContent.trim();
      const discussions = Array.from(
        forum.querySelectorAll(".list-group-item")
      );

      const forumNumber = activityName.match(/Forum (?:Diskusi )?(\d+)/i);
      forumData += `\nForum Diskusi: ${forumNumber ? forumNumber[1] : "?"}\n`;
      forumData += `Mata Kuliah: ${courseName}\n`;
      forumData += "Topik:\n";

      discussions.forEach((discussion, index) => {
        forumData += `  ${index + 1}. ${discussion.textContent.trim()}: ${
          discussion.href
        }\n`;
      });
      forumData += "\n";
    });

    navigator.clipboard.writeText(forumData);
    copyButton.innerHTML = "✅ Tersalin!";
    setTimeout(() => {
      copyButton.innerHTML = "📋 Salin Semua Link";
    }, 2000);
  });

  headerContainer.appendChild(title);
  headerContainer.appendChild(refreshButton);
  headerContainer.appendChild(copyButton);

  return headerContainer;
}

function createWatermark() {
  const watermark = document.createElement("div");
  watermark.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    font-size: 10px;
    color: rgba(0, 0, 0, 0.5);
    font-family: Arial, sans-serif;
    z-index: 9999;
    background: #f8f9fa;
    padding: 5px;
    border-radius: 3px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
  `;

  watermark.innerHTML = `
    Extension by: <a href="https://github.com/Lukman754" target="_blank" style="color: black; text-decoration: none;">Lukman754</a>
  `;

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.cssText = `
    margin-left: 10px;
    background: none;
    border: none;
    color: rgba(0, 0, 0, 0.5);
    font-size: 14px;
    cursor: pointer;
  `;

  closeButton.addEventListener("click", () => {
    watermark.remove();
  });

  watermark.appendChild(closeButton);
  document.body.appendChild(watermark);
}

function updateStatus(logger, message) {
  logger.textContent = `🔍 ${message}`;
}

function extractForumInfo(forumElement) {
  const courseName =
    forumElement
      .closest("section")
      ?.querySelector(".sectionname")
      ?.textContent.trim() ||
    forumElement
      .closest(".course-content")
      ?.querySelector(".page-header-headings h1")
      ?.textContent.trim() ||
    "Unknown Course";

  const sectionMatch = courseName.match(/Pertemuan (\d+)/i);
  const forumMatch = forumElement.textContent.match(
    /Forum (?:Diskusi )?(\d+)/i
  );

  const meeting = sectionMatch ? sectionMatch[1] : "?";
  const forumNum = forumMatch ? forumMatch[1] : "?";

  return {
    courseName: courseName.replace(/Pertemuan \d+/i, "").trim(),
    meeting,
    forumNum,
  };
}

function findContainer() {
  return [
    document.getElementById("page-content"),
    document.querySelector(".course-content"),
    document.querySelector("#region-main"),
    document.querySelector('[role="main"]'),
    document.querySelector(".main-content"),
    document.body,
  ].find((container) => container !== null);
}

async function checkStatus(forumUrl, forumElement, logger) {
  const info = extractForumInfo(forumElement);
  updateStatus(
    logger,
    `Memeriksa: ${info.courseName} - Pertemuan ${info.meeting} Forum ${info.forumNum}`
  );

  try {
    const html = await fetchWithCache(forumUrl);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const badge = doc.querySelector(".badge.rounded-pill.alert-success strong");
    return badge?.textContent.trim() === "Done:" ? "Done" : "To do";
  } catch {
    return "To do";
  }
}

function extractInfo(doc) {
  const breadcrumbs = doc.querySelectorAll(".breadcrumb-item, .breadcrumb li");
  return {
    courseName: breadcrumbs[0]?.querySelector("a")?.textContent.trim() || "",
    forumName: breadcrumbs[breadcrumbs.length - 1]?.textContent.trim() || "",
  };
}

function extractDiscussions(doc) {
  return Array.from(doc.querySelectorAll(".discussion, .forum-post"))
    .map((discussion) => {
      const titleEl = discussion.querySelector(".topic a, .subject a");
      return titleEl
        ? {
            title: titleEl.textContent.trim(),
            link: titleEl.href,
          }
        : null;
    })
    .filter(Boolean);
}

function displayForum(container, info) {
  if (document.querySelector(`.forum-card[data-forum-url="${info.forumLink}"]`))
    return;

  saveForumData(info);

  const card = document.createElement("div");
  card.classList.add("forum-card");
  card.dataset.forumUrl = info.forumLink;

  card.innerHTML = `
    <div class="card mb-3 shadow-sm" style="margin: 1rem auto; transition: transform 0.2s, box-shadow 0.2s;">
      <div class="card-header bg-white border-bottom">
        <h3 class="h5 mb-0">
          <a href="${
            info.forumLink
          }" target="_blank" class="text-decoration-none text-dark">
            ${info.activityName || info.forumName}
          </a>
        </h3>
        <div class="d-flex align-items-center mt-2 gap-3">
          <span class="badge ${
            info.status === "Done"
              ? "bg-success text-light"
              : "bg-warning text-light"
          }">
            ${info.status}
          </span>
          <span class="text-muted small">&nbsp${info.courseName}</span>
        </div>
      </div>
      <div class="card-body">
        ${
          info.discussions.length
            ? `
          <div class="list-group border-0">
            ${info.discussions
              .map(
                (d) => `
              <a href="${d.link}" target="_blank" class="list-group-item list-group-item-action d-flex align-items-center text-primary gap-2">
               📃 ${d.title}
              </a>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;

  container.appendChild(card);
}

async function processForum(item, container, logger) {
  const link = item.querySelector('a[href*="forum"]')?.href;
  if (!link || processedForums.has(link)) return;
  processedForums.add(link);

  try {
    const status = await checkStatus(link, item, logger);
    if (status === "Done") return;

    const html = await fetchWithCache(link);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const discussions = extractDiscussions(doc);

    if (discussions.length) {
      displayForum(container, {
        ...extractInfo(doc),
        discussions,
        status,
        activityName: item
          .querySelector(".instancename, .name")
          ?.textContent.trim(),
        forumLink: link,
      });
    }
  } catch (error) {
    console.error(`Error processing forum ${link}:`, error);
  }
}

async function processBatch(forums, container, logger) {
  const batch = forums.splice(0, batchSize);
  if (batch.length === 0) return;

  await Promise.all(
    batch.map((forum) => processForum(forum, container, logger))
  );
  if (forums.length > 0) {
    await processBatch(forums, container, logger);
  }
}

async function processCourse(url, container, logger) {
  if (processedCourses.has(url)) return;
  processedCourses.set(url, true);

  try {
    const html = await fetchWithCache(url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const forums = Array.from(
      doc.querySelectorAll(".modtype_forum, .activity.forum")
    );
    await processBatch(forums, container, logger);
  } catch (error) {
    console.error(`Error processing course ${url}:`, error);
  }
}

async function init() {
  const logger = createLogger();
  logger.className = "status-logger";
  createWatermark();

  updateStatus(logger, "Memuat data tersimpan...");

  const container = findContainer();
  if (!container) {
    console.log("Container not found, retrying in 5 seconds...");
    await delay(5000);
    const retryContainer = findContainer();
    if (!retryContainer) {
      console.error("Container not found after retry");
      return;
    }
    container = retryContainer;
  }

  const activitiesContainer = document.createElement("div");
  activitiesContainer.className = "activities-container";

  // Add header with buttons
  const headerButtons = createHeaderButtons(container);
  activitiesContainer.appendChild(headerButtons);

  container.insertBefore(activitiesContainer, container.firstChild);

  const cachedForums = loadForumData();
  cachedForums.forEach((forumInfo) => {
    displayForum(activitiesContainer, forumInfo);
  });

  updateStatus(logger, "Menunggu 5 detik sebelum memulai pencarian baru...");
  await delay(5000);

  const courseLinks = Array.from(document.querySelectorAll("a")).filter(
    (link) => {
      const href = link.href.toLowerCase();
      return (
        href.includes("/course/view.php?id=") ||
        href.includes("/course/") ||
        link.closest(".coursebox") !== null
      );
    }
  );

  if (courseLinks.length === 0) {
    updateStatus(
      logger,
      "Tidak ditemukan link course, mencoba ulang dalam 5 detik..."
    );
    await delay(5000);
    location.reload();
    return;
  }

  await Promise.all(
    courseLinks.map((link) =>
      processCourse(link.href, activitiesContainer, logger)
    )
  );

  updateStatus(logger, "Selesai memproses semua forum.");
  setTimeout(() => logger.remove(), 3000);
}

function startTracking() {
  processedCourses.clear();
  processedForums.clear();
  cache.clear();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      init().catch(console.error)
    );
  } else {
    init().catch(console.error);
  }
}

startTracking();
