// Fungsi untuk membuat elemen log kecil di kiri bawah
function createLogElement() {
  const log = document.createElement("div");
  log.id = "tracking-log";
  log.style.cssText = `
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 5px;
    z-index: 1000;
  `;
  document.body.appendChild(log);
  return log;
}

// Fungsi untuk mengupdate log
function updateLog(logElement, message) {
  if (logElement) {
    logElement.textContent = message;
  }
}

// Fungsi untuk menghapus log
function removeLog(logElement) {
  if (logElement) {
    logElement.remove();
  }
}

// Fungsi untuk mengambil detail aktivitas dengan Promise.all
async function fetchAllActivities(activityItems, logElement) {
  const fetchPromises = activityItems.map(async (item, index) => {
    const activityLink = item.querySelector("a")?.href;
    if (!activityLink) return null;

    const cacheKey = `activity_${activityLink}`;

    // Cek apakah data sudah ada di localStorage
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      updateLog(
        logElement,
        `Menggunakan cache untuk aktivitas ${index + 1}...`
      );
      return { item, data: JSON.parse(cachedData) };
    }

    try {
      updateLog(logElement, `Fetching aktivitas ${index + 1}...`);
      const response = await fetch(activityLink);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const breadcrumbItems = doc.querySelectorAll(".breadcrumb-item");
      const breadcrumbData = {
        courseName:
          breadcrumbItems[0]?.querySelector("a")?.textContent.trim() || "",
        meetingName:
          breadcrumbItems[1]?.querySelector("a")?.textContent.trim() || "",
        forumName: breadcrumbItems[2]?.textContent.trim() || "",
        meetingLink: breadcrumbItems[1]?.querySelector("a")?.href || "",
      };

      const discussions = Array.from(doc.querySelectorAll(".discussion"))
        .map((discussion) => ({
          title: discussion.querySelector(".topic a")?.textContent.trim() || "",
          link: discussion.querySelector(".topic a")?.href || "",
        }))
        .filter((discussion) => discussion.title);

      const status =
        item.querySelector(".dropdown-toggle")?.textContent.trim() || "To Do";

      const data = { breadcrumbData, discussions, status };

      // Simpan data ke localStorage
      localStorage.setItem(cacheKey, JSON.stringify(data));

      return { item, data };
    } catch (error) {
      console.error("Error fetching activity details:", error);
      return null;
    }
  });

  // Tunggu semua fetch selesai
  return Promise.all(fetchPromises);
}

// Fungsi untuk menampilkan semua informasi aktivitas
async function tampilkanSemuaActivity() {
  const activityItems = Array.from(
    document.querySelectorAll(".activity-item")
  ).filter((item) =>
    item
      .querySelector(".activityname .instancename")
      ?.textContent.trim()
      .includes("FORUM DISKUSI")
  );

  // Buat log kecil di kiri bawah
  const logElement = createLogElement();

  // Ambil semua aktivitas sekaligus
  const allActivities = await fetchAllActivities(activityItems, logElement);

  allActivities.forEach((result) => {
    if (result) {
      const { item, data } = result;
      const { breadcrumbData, discussions, status } = data;

      // Hanya tampilkan jika ada diskusi dan status bukan "Done"
      if (discussions.length > 0 && status !== "Done") {
        tampilkanActivityInfo(item, breadcrumbData, discussions, status);
      }
    }
  });

  // Hapus log setelah selesai
  updateLog(logElement, "Proses selesai!");
  setTimeout(() => removeLog(logElement), 2000);
}

// Fungsi untuk menampilkan informasi aktivitas
function tampilkanActivityInfo(
  activityItem,
  breadcrumbData,
  discussions,
  status
) {
  const activityName = activityItem
    .querySelector(".activityname .instancename")
    ?.textContent.trim();
  const forumLink = activityItem.querySelector("a")?.href || "#";

  const card = document.createElement("div");
  card.className = "card m-2 shadow-sm";
  card.style.cssText = "transition: transform 0.2s, box-shadow 0.2s;";

  card.innerHTML = `
      <div class="card-header bg-white border-bottom">
        <h3 class="h5 mb-0">
          <a href="${forumLink}" target="_blank" class="text-decoration-none text-dark">
            ${activityName || breadcrumbData.forumName}
          </a>
        </h3>
        <div class="d-flex align-items-center mt-2 gap-3">
          <span class="badge ${
            status === "Done"
              ? "bg-success text-light"
              : "bg-warning text-light"
          }">
            ${status}
          </span>
          <span class="text-muted small">&nbsp${
            breadcrumbData.courseName
          }</span>
        </div>
      </div>
      <div class="card-body">
        ${
          discussions.length
            ? `
          <div class="list-group border-0">
            ${discussions
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

  const topOfScroll = document.getElementById("topofscroll");
  if (topOfScroll) {
    topOfScroll.parentNode.insertBefore(card, topOfScroll);
  } else {
    document.body.insertBefore(card, document.body.firstChild);
  }
}

// Jalankan fungsi utama
tampilkanSemuaActivity();
