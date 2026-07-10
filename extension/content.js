// Content script — listens for messages from the popup and returns page HTML.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageHTML') {
    sendResponse({
      html: document.documentElement.outerHTML,
      url: window.location.href,
      title: document.title
    });
  }
  return true; // keep channel open for async response
});
