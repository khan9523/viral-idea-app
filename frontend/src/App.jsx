import { useState, useEffect } from 'react'
import './App.css'

// API URL - Auto-detects production vs local
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
console.log('API_URL:', API_URL)
console.log('VITE_API_URL env:', import.meta.env.VITE_API_URL)

function App() {
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('General')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [showFavorites, setShowFavorites] = useState(false)

  const CATEGORIES = ['General', 'Comedy', 'Educational', 'Inspirational', 'Trending', 'Lifestyle', 'Tech', 'Business']

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('favoriteIdeas')
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading favorites:', e)
      }
    }
  }, [])

  // Save favorites to localStorage
  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites)
    localStorage.setItem('favoriteIdeas', JSON.stringify(newFavorites))
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }
    
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          category: category
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    await handleGenerate({ preventDefault: () => {} })
  }

  const handleSaveFavorite = () => {
    if (!response) return
    
    const favorite = {
      id: Date.now(),
      prompt: response.prompt,
      category: response.category,
      idea: response.idea,
      model: response.model,
      saved: new Date().toLocaleString()
    }

    const newFavorites = [...favorites, favorite]
    saveFavorites(newFavorites)
    alert('✅ Idea saved to favorites!')
  }

  const handleRemoveFavorite = (id) => {
    const newFavorites = favorites.filter(fav => fav.id !== id)
    saveFavorites(newFavorites)
  }

  const handleExport = (format = 'json') => {
    if (!response && favorites.length === 0) {
      alert('Nothing to export')
      return
    }

    const dataToExport = response ? [response] : favorites

    if (format === 'json') {
      const json = JSON.stringify(dataToExport, null, 2)
      downloadFile(json, 'viral-ideas.json', 'application/json')
    } else if (format === 'txt') {
      const text = dataToExport.map(item => {
        return `PROMPT: ${item.prompt}\nCATEGORY: ${item.category}\n\nIDEA:\n${item.idea}\n${'='.repeat(80)}\n\n`
      }).join('')
      downloadFile(text, 'viral-ideas.txt', 'text/plain')
    }
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>💡 Viral Idea App</h1>
        <p>Generate amazing ideas with AI</p>
      </header>

      <main className="app-main">
        <div className="tabs">
          <button 
            className={`tab-btn ${!showFavorites ? 'active' : ''}`}
            onClick={() => setShowFavorites(false)}
          >
            ✨ Generate Ideas
          </button>
          <button 
            className={`tab-btn ${showFavorites ? 'active' : ''}`}
            onClick={() => setShowFavorites(true)}
          >
            ❤️ Favorites ({favorites.length})
          </button>
        </div>

        {!showFavorites ? (
          <div className="form-section">
            <form onSubmit={handleGenerate} className="generate-form">
              <div className="input-group">
                <label htmlFor="category">Category:</label>
                <select 
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="category-select"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="prompt">Your Prompt:</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your idea or prompt here... e.g., YouTube Shorts for tech channel"
                  rows="4"
                />
              </div>

              <div className="button-group">
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? '⏳ Generating...' : '🚀 Generate Idea'}
                </button>
                {response && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="btn btn-secondary"
                  >
                    🔄 Regenerate
                  </button>
                )}
              </div>
            </form>

            {error && (
              <div className="error-message">
                ❌ Error: {error}
              </div>
            )}

            {response && (
              <div className="response-section">
                {response.success ? (
                  <>
                    <div className="response-header">
                      <h2>✨ Your Generated Idea:</h2>
                      <div className="action-buttons">
                        <button 
                          className="icon-btn"
                          onClick={handleSaveFavorite}
                          title="Save to favorites"
                        >
                          ❤️
                        </button>
                        <button 
                          className="icon-btn"
                          onClick={() => handleExport('txt')}
                          title="Export as text"
                        >
                          📄
                        </button>
                        <button 
                          className="icon-btn"
                          onClick={() => handleExport('json')}
                          title="Export as JSON"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {response.isDemoMode && (
                      <div className="demo-banner">
                        ⚠️ Demo Mode - Using sample ideas (OpenAI API unavailable)
                      </div>
                    )}
                    <div className="idea-box">
                      {response.idea}
                    </div>
                    <div className="idea-metadata">
                      <p><strong>📝 Prompt:</strong> {response.prompt}</p>
                      <p><strong>🏷️ Category:</strong> {response.category}</p>
                      <p><strong>🤖 Model:</strong> {response.model}</p>
                      {response.apiError && <p><strong>ℹ️ Note:</strong> {response.apiError}</p>}
                      <p><strong>⏰ Generated:</strong> {new Date(response.timestamp).toLocaleString()}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>Response from Backend:</h2>
                    <pre className="response-box">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )}

            {!response && !error && !loading && (
              <div className="info-message">
                👉 Select a category, enter your prompt, and click "Generate Idea" to get started!
              </div>
            )}
          </div>
        ) : (
          <div className="favorites-section">
            {favorites.length === 0 ? (
              <div className="empty-state">
                <p>🎯 No favorite ideas yet</p>
                <p>Save ideas to your favorites using the ❤️ button!</p>
              </div>
            ) : (
              <>
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    if (confirm('Clear all favorites?')) {
                      saveFavorites([])
                    }
                  }}
                >
                  🗑️ Clear All
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleExport('txt')}
                >
                  📄 Export All as Text
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleExport('json')}
                >
                  📋 Export All as JSON
                </button>

                <div className="favorites-list">
                  {favorites.map((fav, idx) => (
                    <div key={fav.id} className="favorite-card">
                      <div className="favorite-header">
                        <h3>Idea #{idx + 1}</h3>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveFavorite(fav.id)}
                          title="Remove from favorites"
                        >
                          ✕
                        </button>
                      </div>
                      <p><strong>📝 Prompt:</strong> {fav.prompt}</p>
                      <p><strong>🏷️ Category:</strong> {fav.category}</p>
                      <div className="favorite-idea">
                        {fav.idea}
                      </div>
                      <p className="saved-date">💾 Saved: {fav.saved}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>🌐 Viral Idea App | Backend: {API_URL}</p>
      </footer>
    </div>
  )
}

export default App
