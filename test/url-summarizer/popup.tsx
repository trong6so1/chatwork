import { GoogleGenerativeAI } from "@google/generative-ai"
import { useState, useEffect } from "react"
import "./popup.css"

function IndexPopup() {
  const [summary, setSummary] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [selectedAI, setSelectedAI] = useState("gemini") // "gemini" | "huggingface"
  const [geminiToken, setGeminiToken] = useState("")
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash")
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  
  const [hfToken, setHfToken] = useState("")
  const [showSettings, setShowSettings] = useState(false)

  // Load Settings from localStorage on mount
  useEffect(() => {
    const savedHF = localStorage.getItem("hf_token")
    if (savedHF) setHfToken(savedHF)
    
    const savedGemini = localStorage.getItem("gemini_token")
    if (savedGemini) {
      setGeminiToken(savedGemini)
      fetchGeminiModels(savedGemini)
    }

    const savedModel = localStorage.getItem("gemini_model")
    if (savedModel) setGeminiModel(savedModel)
    
    const savedAI = localStorage.getItem("selected_ai")
    if (savedAI) setSelectedAI(savedAI)
  }, [])

  // Auto-fetch models when token changes
  useEffect(() => {
    if (geminiToken && geminiToken.length > 20) {
      fetchGeminiModels(geminiToken)
    }
  }, [geminiToken])

  const fetchGeminiModels = async (key: string) => {
    if (!key || key.length < 10) {
      setAvailableModels([])
      return
    }
    setFetchingModels(true)
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      const data = await resp.json()
      if (data.models) {
        const filtered = data.models
          .filter(m => m.supportedGenerationMethods.includes("generateContent"))
          .map(m => ({ id: m.name.split('/').pop(), name: m.displayName }))
        setAvailableModels(filtered)
      } else if (data.error) {
        console.error("Fetch models error:", data.error.message)
        setAvailableModels([]) // Clear if key is invalid
      }
    } catch (err) {
      console.error("Network error fetching models:", err)
      setAvailableModels([])
    } finally {
      setFetchingModels(false)
    }
  }

  const saveSettings = () => {
    localStorage.setItem("hf_token", hfToken)
    localStorage.setItem("gemini_token", geminiToken)
    localStorage.setItem("gemini_model", geminiModel)
    localStorage.setItem("selected_ai", selectedAI)
    setShowSettings(false)
  }

  const queryGemini = async (prompt: string) => {
    if (!geminiToken) throw new Error("Vui lòng thiết lập Gemini API Key.")
    const genAI = new GoogleGenerativeAI(geminiToken)
    const model = genAI.getGenerativeModel({ model: geminiModel })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  }

  const queryHF = async (model: string, prompt: string) => {
    if (!hfToken) throw new Error("Vui lòng thiết lập Hugging Face Token.")
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: { 
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 600,
          stream: false
        })
      }
    )

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text()
      if (response.status === 410) throw new Error("API HF cũ đã ngừng hoạt động.")
      if (response.status === 401) throw new Error("HF Token không hợp lệ.")
      throw new Error(`HF Server Error (${response.status})`)
    }

    const result = await response.json()
    if (result.error) throw new Error(result.error?.message || JSON.stringify(result.error))
    return result.choices?.[0]?.message?.content || ""
  }

  const handleSummarize = async () => {
    setLoading(true)
    setError("")
    setSummary("")
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab) throw new Error("Không tìm thấy tab đang hoạt động")

      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
        throw new Error("Không thể tóm tắt các trang hệ thống của trình duyệt.")
      }

      let resp;
      try {
        resp = await chrome.tabs.sendMessage(tab.id!, { action: "extract_content" })
      } catch (msgErr) {
        throw new Error("Không thể kết nối với trang. Hãy nhấn F5 trang web và thử lại.")
      }

      if (!resp || !resp.content) throw new Error("Không thể trích xuất nội dung từ trang này.")

      const { title, content } = resp
      const prompt = `Please summarize the following web page precisely in Vietnamese.
Title: ${title}
Content: ${content}

Highlight the key findings and provide a professional, structured overview in Vietnamese. Provide ONLY the summary text.`

      let viSummary = ""
      if (selectedAI === "gemini") {
        console.log("Đang tóm tắt bằng Gemini...")
        viSummary = await queryGemini(prompt)
      } else {
        console.log("Đang tóm tắt bằng Hugging Face...")
        viSummary = await queryHF("Qwen/Qwen2.5-7B-Instruct", prompt)
      }

      if (!viSummary) throw new Error("Không thể tạo tóm tắt.")
      setSummary(viSummary.trim())
    } catch (err: any) {
      console.error(err)
      let errMsg = err?.message || (typeof err === "string" ? err : JSON.stringify(err))
      
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        errMsg = "Bạn đã hết hạn mức (Quota) của Gemini. Hãy vào Cài đặt ⚙️ để đổi Model khác hoặc chuyển sang dùng Hugging Face."
      }
      
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="popup-container">
      <header>
        <div className="header-top">
          <h1>Universal Summarizer</h1>
          <button className="settings-icon" onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
        </div>
        <p className="tagline">Hỗ trợ Gemini & Hugging Face</p>
      </header>

      <main>
        {showSettings ? (
          <div className="settings-panel">
            <h3>Cài đặt AI</h3>
            
            <div className="setting-group">
              <label>Sử dụng NCC:</label>
              <select value={selectedAI} onChange={(e) => setSelectedAI(e.target.value)}>
                <option value="gemini">Google Gemini (Khuyên dùng)</option>
                <option value="huggingface">Hugging Face (Free)</option>
              </select>
            </div>

            {selectedAI === "gemini" ? (
              <div className="setting-group">
                <label>Gemini API Key:</label>
                <div className="input-with-button">
                  <input 
                    type="password" 
                    value={geminiToken} 
                    onChange={(e) => setGeminiToken(e.target.value)}
                    placeholder="AIza..."
                  />
                  <button 
                    className="fetch-btn" 
                    onClick={() => fetchGeminiModels(geminiToken)}
                    disabled={fetchingModels}
                  >
                    {fetchingModels ? "..." : "Check"}
                  </button>
                </div>
                <p className="hint-link">Lấy Key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a></p>

                <label>Model Gemini:</label>
                <select 
                  value={geminiModel} 
                  onChange={(e) => setGeminiModel(e.target.value)}
                >
                  {fetchingModels ? (
                    <option value="loading" disabled>Đang tải danh sách...</option>
                  ) : availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  ) : (
                    <option value="none" disabled>Không có model nào được hỗ trợ</option>
                  )}
                </select>
              </div>
            ) : (
              <div className="setting-group">
                <label>HF Access Token:</label>
                <input 
                  type="password" 
                  value={hfToken} 
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..."
                />
                <p className="hint">Lấy tại: <a href="https://huggingface.co/settings/tokens" target="_blank">HF Settings</a></p>
              </div>
            )}
            
            <div className="settings-footer">
              <button className="save-btn" onClick={saveSettings}>Lưu cài đặt</button>
            </div>
          </div>
        ) : loading ? (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Đang xử lý bằng {selectedAI === "gemini" ? "Gemini" : "Hugging Face"}...</p>
          </div>
        ) : error ? (
          <div className="error-message">⚠️ {error}</div>
        ) : summary ? (
          <div className="summary-result">
            <h3>Kết quả:</h3>
            <div className="summary-content">{summary}</div>
          </div>
        ) : (
          <div className="welcome">
            <p>Chọn AI của bạn trong phần cài đặt và bắt đầu tóm tắt nội dung trang này.</p>
          </div>
        )}
      </main>

      <footer>
        {!showSettings && (
          <button onClick={handleSummarize} disabled={loading} className="summarize-btn">
            {loading ? "Đang xử lý..." : "Bắt đầu tóm tắt"}
          </button>
        )}
      </footer>
    </div>
  )
}

export default IndexPopup
