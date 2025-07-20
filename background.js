// Open settings page on clicking the toolbar icon
browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});

// Only inject on sites accordingly to includeSites and excludeSites
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url.startsWith("http")) return;

  const { includedSites = [], excludedSites = [] } =
    await browser.storage.local.get(["includedSites", "excludedSites"]);

  const isIncluded = matchList(tab.url, includedSites);
  const isExcluded = matchList(tab.url, excludedSites);

  if ((includedSites.length === 0 || isIncluded) && !isExcluded) {
    browser.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  }
});
function matchList(url, patterns) {
  return patterns.some((pattern) => wildcardMatch(url, pattern));
}
function wildcardMatch(text, pattern) {
  const regex = new RegExp(
    pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, "."),
    "i",
  );
  return regex.test(text);
}
