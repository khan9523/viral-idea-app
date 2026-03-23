import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://viral-idea-app.onrender.com'

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ history, activeChatId, onSelectChat, onNewChat, darkMode, onToggleDark, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🔥 ViralAI</span>
        <button className="icon-btn" title="New chat" onClick={onNewChat}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <div className="sidebar-section-label">Recent chats</div>

      <nav className="chat-list">
        {history.length === 0 && (
          <p className="sidebar-empty">No chats yet</p>
        )}
        {history.map((chat) => (
          <button
            key={chat._id}
            className={`chat-item${activeChatId === chat._id ? ' active' : ''}`}
            onClick={() => onSelectChat(chat)}
            title={chat.prompt}
          >
            <svg className="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="chat-item-text">{chat.prompt}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="icon-btn footer-btn" onClick={onToggleDark} title="Toggle dark mode">
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button className="icon-btn footer-btn logout-btn" onClick={onLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Logout
        </button>
      </div>
    </aside>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Message({ msg, index, copiedId, onCopy }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      {!isUser && (
        <div className="avatar assistant-avatar" aria-label="Assistant">
          🤖
        </div>
      )}
      <div className={`bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
        <p className="bubble-text">{msg.content}</p>
        {!isUser && (
          <button
            className={`copy-btn${copiedId === index ? ' copied' : ''}`}
            onClick={() => onCopy(msg.content, index)}
            title="Copy"
          >
            {copiedId === index ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy
              </>
            )}
          </button>
        )}
      </div>
      {isUser && (
        <div className="avatar user-avatar" aria-label="You">
          🧑
        </div>
      )}
    </div>
  )
}

// ── Thinking indicator ────────────────────────────────────────────────────────
function ThinkingBubble() {
  return (
    <div className="message-row assistant-row">
      <div className="avatar assistant-avatar">🤖</div>
      <div className="bubble assistant-bubble thinking-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  )
}

// ── Login / Auth screen ───────────────────────────────────────────────────────
function AuthScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'login') onLogin(email, password)
    else onSignup(email, password)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">🔥</div>
        <h1 className="auth-title">ViralAI</h1>
        <p className="auth-subtitle">Your viral ideas generator</p>

        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="auth-submit" type="submit">
            {mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [input, setInput] = useState('')
  const [activeChatId, setActiveChatId] = useState(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Persist dark mode ──
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    setDarkMode(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // ── Auth check ──
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
      fetchHistory()
    }
    setCheckingAuth(false)
  }, [])

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── API helpers ──
  const fetchHistory = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      const data = await res.json()
      if (Array.isArray(data)) setHistory(data)
    } catch (err) {
      console.error('History error:', err)
    }
  }

  const handleLogin = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('token', data.token)
        setIsLoggedIn(true)
        fetchHistory()
      } else {
        alert(data.error || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      alert('Login error. Please try again.')
    }
  }

  const handleSignup = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Account created! Please log in.')
      } else {
        alert(data.error || 'Signup failed')
      }
    } catch (err) {
      console.error('Signup error:', err)
      alert('Network error')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
    setMessages([])
    setHistory([])
    setActiveChatId(null)
  }

  // ── Send message ──
  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
        body: JSON.stringify({ prompt: text }),
      })
      const data = await res.json()
      const reply = data.result || data.error || 'Something went wrong.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      fetchHistory()
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSelectChat = (chat) => {
    setActiveChatId(chat._id)
    setMessages([
      { role: 'user', content: chat.prompt },
      { role: 'assistant', content: chat.response },
    ])
  }

  const handleNewChat = () => {
    setMessages([])
    setActiveChatId(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Renders ──
  if (checkingAuth) {
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />
  }

  return (
    <div className={`app-shell ${darkMode ? 'dark' : 'light'}`}>
      <Sidebar
        history={history}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onLogout={handleLogout}
      />

      <main className="chat-main">
        {/* ── Messages area ── */}
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <div className="welcome-icon">🔥</div>
              <h2 className="welcome-title">What viral idea can I spark today?</h2>
              <p className="welcome-sub">Type your niche or topic and get scroll-stopping content ideas instantly.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={msg}
              index={i}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          ))}

          {loading && <ThinkingBubble />}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="input-bar">
          <form className="input-form" onSubmit={handleSend}>
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder="Message ViralAI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className={`send-btn${input.trim() ? ' active' : ''}`}
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </main>
    </div>
  )
}

export default App