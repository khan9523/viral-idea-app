import { useState, useEffect } from 'react'
import './App.css'

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://viral-idea-app.onrender.com'

function App() {
  const [niche, setNiche] = useState('')
  const [ideas, setIdeas] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Dark mode
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem("token")

    if (token) {
      setIsLoggedIn(true)
      fetchHistory()
    }

    setCheckingAuth(false)
  }, [])

  // Fetch history
  const fetchHistory = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/history`, {
        headers: {
          Authorization: "Bearer " + token,
        },
      })

      const data = await res.json()
      setHistory(data)

    } catch (err) {
      console.log("History error:", err)
    }
  }

  // Login
  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        console.log("RAW LOGIN RESPONSE:", text)
        throw new Error("Server not returning JSON")
      }

      if (data.token) {
        localStorage.setItem("token", data.token)
        setIsLoggedIn(true)
        fetchHistory()
      } else {
        alert(data.error || "Login failed")
      }

    } catch (err) {
      console.log("LOGIN ERROR:", err)
      alert("Login error")
    }
  }

  // Signup
  const handleSignup = async () => {
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        console.log("RAW SIGNUP RESPONSE:", text)
        throw new Error("Server not returning JSON")
      }

      if (res.ok) {
        alert(data.message || "Signup success")
      } else {
        alert(data.error || "Signup failed")
      }

    } catch (err) {
      console.log("SIGNUP ERROR:", err)
      alert("Network error")
    }
  }

  // Generate ideas
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
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: JSON.stringify({ prompt: niche }),
      })

      const data = await res.json()

      if (data.result) {
        const ideasArray = data.result.split("\n\n")

        const formattedIdeas = ideasArray.map((idea, index) => ({
          id: index,
          content: idea,
        }))

        setIdeas(formattedIdeas)
        fetchHistory()
      } else {
        setError(data.error || 'Failed to generate ideas')
      }

    } catch (err) {
      setError('Network error')
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

  const handleLogout = () => {
    localStorage.removeItem("token")
    setIsLoggedIn(false)
  }

  // Loading state
  if (checkingAuth) {
    return <div>Loading...</div>
  }

  // Login UI
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <h2>Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Login</button>
        </form>

        <button onClick={handleSignup}>Signup</button>
      </div>
    )
  }

  // Main UI
  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="layout">

        {/* Sidebar */}
        <div className="sidebar">
          <h3>Chats</h3>

          {history.length === 0 && <p>No chats yet</p>}

          {history.map((chat) => (
            <div
              key={chat._id}
              className="history-item"
              onClick={() =>
                setIdeas([{ content: chat.response }])
              }
            >
              {chat.prompt}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="main-content">

          <button onClick={handleLogout}>Logout</button>

          <button
            className="dark-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <h1>🔥 Viral Shorts Idea Generator</h1>

          <form onSubmit={handleGenerate}>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Enter your niche"
              disabled={loading}
            />
            <button type="submit">
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {ideas.length > 0 && (
            <div className="ai-response-box">
              <pre>
                {ideas.map((item) => item.content).join("\n\n")}
              </pre>

              <button
                onClick={() =>
                  copyToClipboard(
                    ideas.map((item) => item.content).join("\n\n"),
                    0
                  )
                }
              >
                {copiedId === 0 ? 'Copied' : 'Copy'}
              </button>

              <button onClick={handleRegenerate}>
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App