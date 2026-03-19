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
          prompt: niche.trim(),
          category: 'Viral Shorts'
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      
      // Parse the idea into multiple short ideas (simulate multiple cards)
      // In real scenario, API might return structured data
      if (data.success) {
        // Format niche for better display
        const nicheFormatted = niche.trim()
        const nicheWord = nicheFormatted.split(/\s+/)[0].toLowerCase() // First word for hashtags
        
        // Create diverse, practical viral short ideas
        const mockIdeas = [
          {
            id: 1,
            idea: `Top 3 tips beginners don't know about ${nicheFormatted}`,
            hook: 'Most people get this wrong...',
            title: `${nicheFormatted} Secrets Nobody Talks About`,
            hashtags: [`#${nicheWord}`, '#tips', '#shorts', '#viral']
          },
          {
            id: 2,
            idea: `Common mistake in ${nicheFormatted} and how to fix it in 60 seconds`,
            hook: 'If you\'re doing this, you\'re losing out...',
            title: `The Biggest ${nicheFormatted} Mistake`,
            hashtags: [`#${nicheWord}`, '#mistakes', '#shorts', '#howto']
          },
          {
            id: 3,
            idea: `"Then vs Now" - How ${nicheFormatted} has changed`,
            hook: 'You won\'t believe how different it was...',
            title: `Then vs Now: ${nicheFormatted} Evolution`,
            hashtags: [`#${nicheWord}`, '#evolution', '#trending', '#shorts']
          }
        ]
        setIdeas(mockIdeas)
      } else {
        setError('Failed to generate ideas')
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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
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

          {/* Results Section */}
          {ideas.length > 0 && (
            <section className="results-section">
              <div className="results-header">
                <h2>Your Viral Short Ideas</h2>
                <button 
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  🔄 Regenerate
                </button>
              </div>

              <div className="ideas-grid">
                {ideas.map((idea) => (
                  <div 
                    key={idea.id} 
                    className="idea-card"
                  >
                    <div className="card-content">
                      <div className="card-section">
                        <h3 className="card-label">💡 Idea</h3>
                        <p className="card-text">{idea.idea}</p>
                      </div>

                      <div className="card-section">
                        <h3 className="card-label">🎣 Hook</h3>
                        <p className="card-text">{idea.hook}</p>
                      </div>

                      <div className="card-section">
                        <h3 className="card-label">📝 Title</h3>
                        <p className="card-text">{idea.title}</p>
                      </div>

                      <div className="card-section">
                        <h3 className="card-label">🏷️ Hashtags</h3>
                        <p className="card-text">{idea.hashtags.join(' ')}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(
                        `💡 ${idea.idea}\n🎣 ${idea.hook}\n📝 ${idea.title}\n🏷️ ${idea.hashtags.join(' ')}`,
                        idea.id
                      )}
                      className={`copy-btn ${copiedId === idea.id ? 'copied' : ''}`}
                    >
                      {copiedId === idea.id ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                ))}
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
