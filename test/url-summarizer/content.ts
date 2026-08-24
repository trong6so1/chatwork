import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

window.addEventListener("load", () => {
  console.log("Content script loaded")
})

// Function to extract page content cleanly
export const getPageData = () => {
  // 1. Try to find the most relevant container
  const mainContent = document.querySelector('article, main, .post-content, .article-content, #main-content')
  const root = mainContent || document.body

  // 2. Clone to avoid modifying the actual DOM
  let tempDiv = document.createElement('div')
  tempDiv.innerHTML = root.innerHTML

  // 3. Remove noise
  const noiseSelectors = 'script, style, nav, footer, header, .ads, .sidebar, .comments'
  tempDiv.querySelectorAll(noiseSelectors).forEach(el => el.remove())

  // 4. Extract and clean text
  const text = tempDiv.innerText
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000) // Gemini can handle more

  return {
    title: document.title,
    content: text
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_content") {
    const data = getPageData()
    sendResponse(data)
  }
  return true
})
