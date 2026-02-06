console.log('Background service worker initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
