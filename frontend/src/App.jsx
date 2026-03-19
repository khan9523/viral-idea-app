import { useState, useEffect } from 'react'
import './App.css'

// API URL - Production: Render backend, Local: localhost
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://viral-idea-app.onrender.com'

function App() {
  const [niche, setNiche] = useState('')
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
  }, [])

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!niche.trim()) {
      setError('Please enter your niche')
      return
    }
    
    setLoading(true)
    setError(null)
    setIdeas([])

    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `Generate 5 creative viral YouTube Shorts ideas for "${niche.trim()}". For each idea include: What to film, Hook, and Hashtags. Make them actionable and viral-worthy.`,
          category: 'Viral Shorts'
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      
      if (data.success && data.idea) {
        // Use the AI-generated idea directly
        setIdeas([{
          id: 1,
          content: data.idea,
          timestamp: new Date().toLocaleTimeString()
        }])
      } else {
        setError('Failed to generate ideas. Make sure your backend has valid OpenAI API key.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while generating ideas')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    await handleGenerate({ preventDefault: () => {} })
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(1)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="app-wrapper">
        {/* Dark Mode Toggle */}
        <button 
          className="dark-mode-toggle"
          onClick={() => setDarkMode(!darkMode)}
          title="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Header */}
        <header className="header">
          <h1 className="title">🔥 Viral Shorts Idea Generator</h1>
          <p className="subtitle">Generate creative ideas for your next viral short</p>
        </header>

        {/* Main Content */}
        <main className="main">
          {/* Input Section */}
          <section className="input-section">
            <form onSubmit={handleGenerate} className="input-form">
              <div className="input-wrapper">
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Enter your niche (e.g. travel, motivation, Hyderabad food)"
                  className="niche-input"
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? '⏳ Generating...' : '✨ Generate Ideas'}
                </button>
              </div>
            </form>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
          </section>

          {/* Results Section - Chat Style */}
          {ideas.length > 0 && (
            <section className="results-section">
              <div className="chat-container">
                {/* User message */}
                <div className="message message-user">
                  <div className="message-content">💭 {niche}</div>
                </div>

                {/* AI response */}
                <div className="message message-ai">
                  <div className="message-content">
                    <div className="ai-response-text">
                      {ideas[0].content.split('\n').map((line, idx) => (
                        line.trim() && (
                          <p key={idx} className="response-line">
                            {line}
                          </p>
                        )
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(ideas[0].content)}
                    className={`copy-btn ${copiedId === 1 ? 'copied' : ''}`}
                  >
                    {copiedId === 1 ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>

                {/* Regenerate button */}
                <button 
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="btn btn-secondary regenerate-btn"
                >
                  {loading ? '⏳ Generating...' : '🔄 Regenerate'}
                </button>
              </div>
            </section>
          )}

          {/* Empty State */}
          {!loading && ideas.length === 0 && !error && (
            <section className="empty-state">
              <div className="empty-icon">🎬</div>
              <h2>Ready to Create Viral Content?</h2>
              <p>Enter your niche above and let the AI generate amazing short video ideas for you</p>
            </section>
          )}

          {/* Loading State */}
          {loading && (
            <section className="loading-state">
              <div className="spinner"></div>
              <p>Generating amazing ideas for you...</p>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>✨ Create amazing viral shorts with data-driven ideas</p>
        </footer>
      </div>
    </div>
  )
}

export default App
