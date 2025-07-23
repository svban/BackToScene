document.addEventListener("DOMContentLoaded", async () => {
  // Exclude
  const excludeInput = document.getElementById("excludeInput");
  const addExclude = document.getElementById("addExclude");
  const excludeList = document.getElementById("excludeList");
  const autoResumeCheckbox = document.getElementById("autoResume");
  const { excludedSites = [], autoResume = true } =
    await browser.storage.local.get(["excludedSites", "autoResume"]);
  autoResumeCheckbox.checked = autoResume;
  function renderExclusions() {
    excludeList.innerHTML = "";
    excludedSites.forEach((site, index) => {
      const li = document.createElement("li");
      li.textContent = site;
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.onclick = () => {
        excludedSites.splice(index, 1);
        browser.storage.local.set({ excludedSites });
        renderExclusions();
      };
      li.appendChild(btn);
      excludeList.appendChild(li);
    });
  }
  addExclude.onclick = () => {
    const val = excludeInput.value.trim();
    if (val && !excludedSites.includes(val)) {
      excludedSites.push(val);
      browser.storage.local.set({ excludedSites });
      renderExclusions();
      excludeInput.value = "";
    }
  };
  renderExclusions();

  // Include
  const includeInput = document.getElementById("includeInput");
  const addInclude = document.getElementById("addInclude");
  const includeList = document.getElementById("includeList");
  const { includedSites = [] } =
    await browser.storage.local.get("includedSites");
  function renderIncludes() {
    includeList.innerHTML = "";
    includedSites.forEach((site, index) => {
      const li = document.createElement("li");
      li.textContent = site;
      const btn = document.createElement("button");
      btn.textContent = "Remove";
      btn.onclick = () => {
        includedSites.splice(index, 1);
        browser.storage.local.set({ includedSites });
        renderIncludes();
      };
      li.appendChild(btn);
      includeList.appendChild(li);
    });
  }
  addInclude.onclick = () => {
    const val = includeInput.value.trim();
    if (val && !includedSites.includes(val)) {
      includedSites.push(val);
      browser.storage.local.set({ includedSites });
      renderIncludes();
      includeInput.value = "";
    }
  };
  renderIncludes();

  autoResumeCheckbox.onchange = () => {
    browser.storage.local.set({ autoResume: autoResumeCheckbox.checked });
  };

  document.getElementById("clearAll").onclick = async () => {
    const all = await browser.storage.local.get(null);
    const keys = Object.keys(all).filter(
      (k) => k.startsWith("video-time:") || k.startsWith("video-title:"),
    );
    await browser.storage.local.remove(keys);
    loadVideos();
  };

  async function loadVideos() {
    const all = await browser.storage.local.get(null);
    const tableBody = document.querySelector("#savedVideos tbody");
    tableBody.innerHTML = "";

    const entries = Object.entries(all).filter(([k]) =>
      k.startsWith("video-time:"),
    );

    // Always sort by most recently updated
    entries.sort((a, b) => {
      const aUpdated = a[1]?.updated || 0;
      const bUpdated = b[1]?.updated || 0;
      return bUpdated - aUpdated;
    });

    for (const [key, { time, updated }] of entries) {
      const url = key.replace("video-time:", "");
      const titleKey = `video-title:${url}`;
      const { [titleKey]: title = "Untitled" } =
        await browser.storage.local.get(titleKey);

      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${title}</td>
      <td class="video-link"><a href="${url}" target="_blank">${url}</a></td>
      <td>${formatTime(time)}</td>
      <td><button data-url="${url}">Delete</button></td>
    `;
      tableBody.appendChild(row);
    }

    document.querySelectorAll("button[data-url]").forEach((btn) => {
      btn.onclick = async () => {
        const url = btn.dataset.url;
        await browser.storage.local.remove([
          `video-time:${url}`,
          `video-title:${url}`,
        ]);
        loadVideos();
      };
    });
  }

  function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
  }

  loadVideos();
});
