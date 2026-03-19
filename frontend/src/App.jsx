import { useState, useEffect } from 'react'
import './App.css'

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://viral-idea-app.onrender.com'

function App() {
  const [niche, setNiche] = useState('')
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
  }, [])

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: niche }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      if (data.success && data.idea) {
        // Split ideas cleanly
        const ideasArray = data.idea.split("\n\n")

        const formattedIdeas = ideasArray.map((idea, index) => ({
          id: index,
          content: idea,
        }))

        setIdeas(formattedIdeas)
      } else {
        setError('Failed to generate ideas')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    await handleGenerate({ preventDefault: () => {} })
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="app-wrapper">

        {/* Dark Mode */}
        <button
          className="dark-mode-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Header */}
        <header className="header">
          <h1 className="title">🔥 Viral Shorts Idea Generator</h1>
          <p className="subtitle">
            Generate clean and powerful short video ideas
          </p>
        </header>

        {/* Input */}
        <form onSubmit={handleGenerate} className="input-wrapper">
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. travel, motivation, Hyderabad food"
            className="niche-input"
            disabled={loading}
          />

          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {/* Results */}
        {ideas.length > 0 && (
          <div className="results">

            {/* User query */}
            <div className="user-box">
              💭 {niche}
            </div>

            {/* Ideas */}
            <div className="ai-response-box">
              <pre className="ai-text">
              {ideas.map((item) => item.content).join("\n\n")}
              </pre>

              <button
                onClick={() =>
                  copyToClipboard(
                  ideas.map((item) => item.content).join("\n\n"),
                  0
                )
              }
              className={`copy-btn ${copiedId === 0 ? 'copied' : ''}`}
            >
              {copiedId === 0 ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>

            {/* Regenerate */}
            <button
              onClick={handleRegenerate}
              className="btn btn-secondary"
              disabled={loading}
            >
              🔄 Regenerate
            </button>

          </div>
        )}

        {/* Empty */}
        {!loading && ideas.length === 0 && !error && (
          <div className="empty">
            <h2>Start generating viral ideas 🚀</h2>
            <p>Enter a niche and get clean, usable ideas instantly</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
