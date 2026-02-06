console.log('Content script injected');

// Example: Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.type === 'GET_PAGE_TITLE') {
    sendResponse({ title: document.title });
  }
});
