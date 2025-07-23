(async function () {
  const STORAGE_PREFIX = "video-time:";
  const TITLE_PREFIX = "video-title:";

  const {
    excludedSites = [],
    includedSites = [],
    autoResume = false,
  } = await browser.storage.local.get(["excludedSites", "autoResume"]);
  const currentURL = location.href;

  // Only run if includedSites is empty OR matches current URL
  if (includedSites.length > 0 && !isIncluded(currentURL, includedSites)) {
    console.log(
      `[BackToScene] Skipped due to not being included: "${currentURL}"`,
    );
    return;
  }

  if (isExcluded(currentURL, excludedSites)) {
    console.log(`[BackToScene] Skipped due to exclusion: "${currentURL}"`);
    return;
  }

  function getKey() {
    return `${STORAGE_PREFIX}${location.href}`;
  }

  function getTitleKey() {
    return `${TITLE_PREFIX}${location.href}`;
  }

  function save(video) {
    const key = getKey();
    const titleKey = getTitleKey();
    const now = Date.now();
    const time = video.currentTime;

    browser.storage.local.set({
      [key]: { time, updated: now },
      [titleKey]: document.title,
    });
  }

  function offerResume(video, savedTime) {
    if (autoResume) {
      video.currentTime = savedTime;
      return;
    }

    const formatted = formatTime(savedTime);
    let countdown = 5;

    const overlay = document.createElement("div");
    overlay.innerHTML = `<span style="font-weight: 500;"> Press Enter</span> to resume at <strong>${formatted}</strong> <span style="opacity: 0.7;" id="resume-countdown">(${countdown}s)</span> `;

    overlay.style.position = "absolute";
    overlay.style.bottom = "60px";
    overlay.style.right = "10px";
    overlay.style.background = "rgba(33, 33, 33, 0.85)";
    overlay.style.color = "#fff";
    overlay.style.padding = "8px 14px";
    overlay.style.borderRadius = "8px";
    overlay.style.fontSize = "13.5px";
    overlay.style.fontFamily = "Segoe UI, sans-serif";
    overlay.style.zIndex = "999999";
    overlay.style.pointerEvents = "none";
    overlay.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
    overlay.style.transition = "opacity 0.3s ease";
    overlay.style.border = "1px solid rgba(255, 255, 255, 0.15)";

    // ✅ Find proper container
    let container = video.parentElement;
    const isYouTube = location.hostname.includes("youtube.com");

    if (isYouTube) {
      // YouTube puts controls inside #movie_player
      const player = document.getElementById("movie_player");
      if (player) {
        container = player;
      }
    }

    // Ensure container is positioned correctly
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    container.appendChild(overlay);

    let removed = false;
    const spanCountdown = () => overlay.querySelector("span:last-child");

    function updateCountdown() {
      countdown--;
      if (spanCountdown()) {
        spanCountdown().textContent = `(${countdown}s)`;
      }
      if (countdown <= 0) {
        overlay.style.opacity = "0";
        setTimeout(cleanup, 300);
        clearInterval(timer);
      }
    }

    function cleanup() {
      if (!removed && overlay.parentElement) {
        overlay.remove();
        removed = true;
      }
      window.removeEventListener("keydown", onKeydown);
      clearInterval(timer);
    }

    function onKeydown(e) {
      if (e.key === "Enter") {
        video.currentTime = savedTime;
        cleanup();
      }
    }

    window.addEventListener("keydown", onKeydown);
    const timer = setInterval(updateCountdown, 1000);
  }

  function setup(video) {
    // ✅ Skip videos that are likely NOT main content, like youtube search page
    if (video.dataset.hasResumer === "true") return;
    video.dataset.hasResumer = "true";
    const isInvisible = video.offsetHeight < 50 || video.offsetWidth < 50;
    const isTooShort = video.duration && video.duration < 30;
    const isMutedNoControls = video.muted && !video.controls;
    const isAdLike = video.autoplay && isMutedNoControls && isTooShort;
    if (isInvisible || isAdLike) {
      console.log("[BackToScene] Skipping background/ad video");
      return;
    }

    const key = getKey();
    browser.storage.local.get(key).then((res) => {
      const data = res[key];
      if (data && typeof data.time === "number" && data.time > 10) {
        offerResume(video, data.time);
      }
    });

    video.addEventListener("timeupdate", () => save(video));
  }

  function scanVideos() {
    document.querySelectorAll("video").forEach(setup);
  }

  const observer = new MutationObserver(scanVideos);
  observer.observe(document.body, { childList: true, subtree: true });
  scanVideos();

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

  function isExcluded(url, patterns) {
    return patterns.some((pattern) => wildcardMatch(url, pattern));
  }

  function isIncluded(url, patterns) {
    return patterns.some((pattern) => wildcardMatch(url, pattern));
  }

  function wildcardMatch(text, pattern) {
    // Don't force-add wildcards — let the user be explicit
    const regex = new RegExp(
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, "."),
      "i",
    );

    return regex.test(text);
  }
})();
