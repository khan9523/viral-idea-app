import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://viral-idea-app.onrender.com'

const CATEGORIES = ['All', 'Funny', 'Educational', 'Viral']

const tryParseIdeas = (content) => {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item?.title && item?.description && item?.category)
  } catch {
    return []
  }
}

const ideaKey = (idea) => `${idea.title}__${idea.category}`

function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, darkMode, onToggleDark, onLogout, usage, onUpgrade, paymentLoading, open, onClose }) {
  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">ViralAI</span>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">&#x2715;</button>
      </div>

      <div className="plan-card">
        <span className={`plan-badge ${usage?.plan === 'premium' ? 'premium' : 'free'}`}>
          {usage?.plan === 'premium' ? 'Premium' : 'Free'}
        </span>

        <div className="usage-meta">
          {usage?.plan === 'premium' ? (
            <p>Unlimited generations</p>
          ) : (
            <p>{usage?.remaining ?? 0} / {usage?.dailyLimit ?? 5} generations left today</p>
          )}
        </div>

        {usage?.plan !== 'premium' && (
          <button className="upgrade-btn" onClick={onUpgrade} disabled={paymentLoading}>
            {paymentLoading ? 'Redirecting...' : 'Upgrade to Premium'}
          </button>
        )}
      </div>

      <div className="sidebar-new-chat-wrap">
        <button className="sidebar-new-chat" title="New chat" onClick={onNewChat}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>
      </div>

      <div className="sidebar-section-label">Recent chats</div>

      <nav className="chat-list">
        {chats.length === 0 && <p className="sidebar-empty">No chats yet</p>}
        {chats.map((chat) => (
          <button
            key={chat._id}
            className={`chat-item${currentChatId === chat._id ? ' active' : ''}`}
            onClick={() => onSelectChat(chat._id)}
            title={chat.title || 'New Chat'}
          >
            <svg className="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="chat-item-text">{chat.title || 'New Chat'}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="icon-btn footer-btn" onClick={onToggleDark} title="Toggle dark mode">
          {darkMode ? 'Light' : 'Dark'}
        </button>
        <button className="icon-btn footer-btn logout-btn" onClick={onLogout} title="Logout">
          Logout
        </button>
      </div>
    </aside>
  )
}

function IdeasGrid({ ideas, filterCategory, onCopyIdea, onSaveIdea, copiedIdeaId, savedIdeaKeys, onGenerateScript, scriptLoadingKey }) {
  const filteredIdeas = useMemo(() => {
    if (filterCategory === 'All') return ideas
    return ideas.filter((idea) => idea.category === filterCategory)
  }, [ideas, filterCategory])

  if (!filteredIdeas.length) {
    return <p className="no-ideas">No ideas in this category yet.</p>
  }

  return (
    <div className="ideas-grid">
      {filteredIdeas.map((idea, idx) => {
        const key = `${ideaKey(idea)}-${idx}`
        const isSaved = savedIdeaKeys.has(ideaKey(idea))

        return (
          <article className="idea-card" key={key}>
            <h4 className="idea-title">{idea.title}</h4>
            <p className="idea-description">{idea.description}</p>

            <div className="idea-footer">
              <div className="idea-footer-top">
                <span className="category-tag">{idea.category}</span>
                <div className="idea-actions">
                  <button className="idea-action-btn" onClick={() => onCopyIdea(idea, key)}>
                    {copiedIdeaId === key ? 'Copied' : 'Copy'}
                  </button>
                  <button className="idea-action-btn save" onClick={() => onSaveIdea(idea)}>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
              <button
                className="idea-action-btn script-btn idea-script-full"
                onClick={() => onGenerateScript(idea, key)}
                disabled={scriptLoadingKey === key}
              >
                {scriptLoadingKey === key ? 'Generating script...' : '🎬 Generate Script'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function Message({ msg, filterCategory, onCopyIdea, onSaveIdea, copiedIdeaId, savedIdeaKeys, onGenerateScript, scriptLoadingKey }) {
  const isUser = msg.role === 'user'
  const ideas = !isUser ? (Array.isArray(msg.ideas) ? msg.ideas : tryParseIdeas(msg.content)) : []

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
      {!isUser && <div className="avatar assistant-avatar" aria-label="Assistant">AI</div>}

      <div className={`bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
        {isUser && <p className="bubble-text">{msg.content}</p>}

        {!isUser && ideas.length > 0 && (
          <IdeasGrid
            ideas={ideas}
            filterCategory={filterCategory}
            onCopyIdea={onCopyIdea}
            onSaveIdea={onSaveIdea}
            copiedIdeaId={copiedIdeaId}
            savedIdeaKeys={savedIdeaKeys}
            onGenerateScript={onGenerateScript}
            scriptLoadingKey={scriptLoadingKey}
          />
        )}

        {!isUser && ideas.length === 0 && <p className="bubble-text">{msg.content}</p>}
      </div>

      {isUser && <div className="avatar user-avatar" aria-label="You">YOU</div>}
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="message-row assistant-row">
      <div className="avatar assistant-avatar">AI</div>
      <div className="bubble assistant-bubble thinking-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  )
}

function AuthScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'login') onLogin(email, password)
    else onSignup(email, password)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">ViralAI</h1>
        <p className="auth-subtitle">Generate structured content ideas</p>

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

function UpgradeModal({ open, onClose, onUpgrade, paymentLoading }) {
  if (!open) return null

  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Daily limit reached</h3>
        <p>Free plan includes 5 generations per day. Upgrade for unlimited generations.</p>

        <div className="upgrade-modal-actions">
          <button className="idea-action-btn" onClick={onClose}>Maybe later</button>
          <button className="upgrade-btn" onClick={onUpgrade} disabled={paymentLoading}>
            {paymentLoading ? 'Processing...' : 'Upgrade to Premium'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScriptModal({ script, idea, open, onClose, onCopy, copied }) {
  if (!open || !script) return null

  return (
    <div className="script-modal-overlay" onClick={onClose}>
      <div className="script-modal" onClick={(e) => e.stopPropagation()}>
        <div className="script-modal-header">
          <h3 className="script-modal-title">Video Script</h3>
          <button className="script-modal-close" onClick={onClose} aria-label="Close">&#x2715;</button>
        </div>

        {idea && <p className="script-idea-label">{idea.title}</p>}

        <div className="script-section">
          <label className="script-label">Hook</label>
          <p className="script-hook">{script.hook}</p>
        </div>

        <div className="script-section">
          <label className="script-label">Script</label>
          <p className="script-body">{script.script}</p>
        </div>

        <div className="script-section">
          <label className="script-label">Call to Action</label>
          <p className="script-cta">{script.cta}</p>
        </div>

        <div className="script-section">
          <label className="script-label">Hashtags</label>
          <div className="script-hashtags">
            {script.hashtags.map((tag, i) => (
              <span key={i} className="script-hashtag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="script-modal-footer">
          <button className="idea-action-btn" onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy Script'}
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [currentChatId, setCurrentChatId] = useState(null)
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [input, setInput] = useState('')
  const [copiedIdeaId, setCopiedIdeaId] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [savedIdeas, setSavedIdeas] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeScript, setActiveScript] = useState(null)
  const [activeScriptIdea, setActiveScriptIdea] = useState(null)
  const [scriptLoadingKey, setScriptLoadingKey] = useState(null)
  const [scriptCopied, setScriptCopied] = useState(false)

  const [usage, setUsage] = useState({ plan: 'free', usageCount: 0, remaining: 5, dailyLimit: 5 })
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState('')

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const savedIdeaKeys = useMemo(() => new Set(savedIdeas.map(ideaKey)), [savedIdeas])

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    setDarkMode(saved === null ? true : saved === 'true')

    const savedIdeasRaw = localStorage.getItem('savedIdeas')
    if (savedIdeasRaw) {
      try {
        setSavedIdeas(JSON.parse(savedIdeasRaw))
      } catch {
        setSavedIdeas([])
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('savedIdeas', JSON.stringify(savedIdeas))
  }, [savedIdeas])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
      fetchChats()
      fetchUsage()
    }
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return

    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')

    if (sessionId) {
      verifyPayment(sessionId)
    }
  }, [isLoggedIn])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('token'),
  })

  const fetchUsage = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/usage`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) return
      const data = await res.json()
      setUsage(data)
    } catch (err) {
      console.error('Usage error:', err)
    }
  }

  const fetchChats = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/chats`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) return

      const data = await res.json()
      if (Array.isArray(data)) setChats(data)
    } catch (err) {
      console.error('Chats error:', err)
    }
  }

  const createChat = async () => {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: authHeaders(),
    })

    if (!res.ok) throw new Error('Failed to create chat')

    const data = await res.json()
    return data.chat
  }

  const loadChat = async (chatId) => {
    try {
      const res = await fetch(`${API_URL}/chat/${chatId}`, {
        headers: authHeaders(),
      })

      if (!res.ok) return

      const data = await res.json()
      setCurrentChatId(data.chat._id)
      setMessages(Array.isArray(data.chat.messages) ? data.chat.messages : [])
    } catch (err) {
      console.error('Load chat error:', err)
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
        fetchChats()
        fetchUsage()
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
    setCurrentChatId(null)
    setChats([])
    setMessages([])
    setUsage({ plan: 'free', usageCount: 0, remaining: 5, dailyLimit: 5 })
  }

  const verifyPayment = async (sessionId) => {
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API_URL}/billing/verify-session`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sessionId }),
      })

      const data = await res.json()

      if (res.ok) {
        setPaymentSuccess('Payment successful. You are now Premium.')
        fetchUsage()
        const url = new URL(window.location.href)
        url.searchParams.delete('session_id')
        window.history.replaceState({}, '', url)
      } else {
        setPaymentSuccess(data.error || 'Payment verification failed')
      }
    } catch {
      setPaymentSuccess('Payment verification failed')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Could not start payment')
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Upgrade error:', err)
      alert('Payment initialization failed')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const optimisticUserMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, optimisticUserMsg])
    setInput('')
    setLoading(true)

    try {
      let chatId = currentChatId
      if (!chatId) {
        const createdChat = await createChat()
        chatId = createdChat._id
        setCurrentChatId(chatId)
      }

      const res = await fetch(`${API_URL}/chat/${chatId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'LIMIT_EXCEEDED') {
          setShowUpgradePopup(true)
          setUsage((prev) => ({ ...prev, ...data }))
          setMessages((prev) => prev.slice(0, -1))
          setInput(text)
          return
        }
        throw new Error(data.error || 'Failed to send message')
      }

      const nextMessages = Array.isArray(data.chat?.messages) ? data.chat.messages : []
      setMessages(nextMessages)
      setCurrentChatId(data.chat?._id || chatId)
      if (data.usage) setUsage(data.usage)
      fetchChats()
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSelectChat = (chatId) => {
    loadChat(chatId)
  }

  const handleNewChat = async () => {
    try {
      const createdChat = await createChat()
      setCurrentChatId(createdChat._id)
      setMessages([])
      fetchChats()
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (err) {
      console.error('Create chat error:', err)
    }
  }

  const handleCopyIdea = (idea, key) => {
    const text = `${idea.title}\n${idea.description}\nCategory: ${idea.category}`
    navigator.clipboard.writeText(text)
    setCopiedIdeaId(key)
    setTimeout(() => setCopiedIdeaId(''), 1500)
  }

  const handleSaveIdea = (idea) => {
    setSavedIdeas((prev) => {
      const exists = prev.some((item) => ideaKey(item) === ideaKey(idea))
      if (exists) return prev
      return [idea, ...prev]
    })
  }

  const handleGenerateScript = async (idea, key) => {
    setScriptLoadingKey(key)
    try {
      const res = await fetch(`${API_URL}/generate-script`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ idea: `${idea.title}: ${idea.description}` }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Script generation failed')
        return
      }
      setActiveScript(data.script)
      setActiveScriptIdea(idea)
    } catch {
      alert('Network error. Could not generate script.')
    } finally {
      setScriptLoadingKey(null)
    }
  }

  const handleCopyScript = () => {
    if (!activeScript) return
    const text = [
      `Hook: ${activeScript.hook}`,
      `Script: ${activeScript.script}`,
      `CTA: ${activeScript.cta}`,
      `Hashtags: ${activeScript.hashtags.join(' ')}`,
    ].join('\n\n')
    navigator.clipboard.writeText(text)
    setScriptCopied(true)
    setTimeout(() => setScriptCopied(false), 1500)
  }

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
      {paymentLoading && (
        <div className="payment-loader-overlay">
          <div className="payment-loader-card">
            <div className="spinner" />
            <p>Processing payment...</p>
          </div>
        </div>
      )}

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={(id) => { handleSelectChat(id); setSidebarOpen(false) }}
        onNewChat={() => { handleNewChat(); setSidebarOpen(false) }}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onLogout={handleLogout}
        usage={usage}
        onUpgrade={handleUpgrade}
        paymentLoading={paymentLoading}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="chat-main">
        <header className="chat-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="chat-topbar-title">AI Ideas Studio</span>

          <div className="topbar-actions">
            <div className="category-pills">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`category-pill${filterCategory === cat ? ' active' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {paymentSuccess && <div className="payment-success-banner">{paymentSuccess}</div>}

        <div className="messages-area">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <div className="welcome-icon">✦</div>
              <h2 className="welcome-title">What idea should go viral?</h2>
              <p className="welcome-sub">Ask any topic — AI returns structured idea cards with category, copy, save, and a ready-to-use video script.</p>
              <div className="welcome-chips">
                {['Funny pet videos', 'Budget cooking tips', 'Morning routine hacks', 'Tech life hacks'].map((prompt) => (
                  <button
                    key={prompt}
                    className="welcome-chip"
                    onClick={() => { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 0) }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={msg}
              filterCategory={filterCategory}
              onCopyIdea={handleCopyIdea}
              onSaveIdea={handleSaveIdea}
              copiedIdeaId={copiedIdeaId}
              savedIdeaKeys={savedIdeaKeys}
              onGenerateScript={handleGenerateScript}
              scriptLoadingKey={scriptLoadingKey}
            />
          ))}

          {loading && <ThinkingBubble />}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-bar">
          <form className="input-form" onSubmit={handleSend}>
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder="Describe a niche or content idea..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={loading}
            />
            <button
              className={`send-btn${input.trim() ? ' active' : ''}`}
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
          <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </main>

      <UpgradeModal
        open={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        onUpgrade={handleUpgrade}
        paymentLoading={paymentLoading}
      />

      <ScriptModal
        script={activeScript}
        idea={activeScriptIdea}
        open={activeScript !== null}
        onClose={() => { setActiveScript(null); setActiveScriptIdea(null) }}
        onCopy={handleCopyScript}
        copied={scriptCopied}
      />
    </div>
  )
}

export default App
