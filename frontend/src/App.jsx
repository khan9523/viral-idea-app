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

const sortMessagesByCreatedAt = (items = []) => {
  return [...items].sort((a, b) => {
    const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0
    return aTime - bTime
  })
}

const formatMessageTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Sidebar({ chats, currentChatId, onSelectChat, onNewChat, onOpenProfile, onOpenPricing, onOpenBilling, activePage, darkMode, onToggleDark, onLogout, usage, onUpgrade, paymentLoading, open, onClose }) {
  const used = usage?.usageCount ?? 0
  const limit = usage?.dailyLimit ?? 5
  const remaining = usage?.remaining ?? Math.max(0, limit - used)
  const isPremium = usage?.plan === 'premium'
  const progressPercent = isPremium ? 100 : Math.min(100, Math.round((used / limit) * 100))
  const nearLimit = !isPremium && remaining <= 1

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">ViralAI</span>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">&#x2715;</button>
      </div>

      <div className="plan-card">
        <span className={`plan-badge ${isPremium ? 'premium' : 'free'}`}>
          {isPremium ? 'Premium' : 'Free'}
        </span>

        <div className="usage-meta">
          {isPremium ? (
            <p>Unlimited generations</p>
          ) : (
            <>
              <p>{used} / {limit} requests used</p>
              <p className="usage-remaining">{remaining} requests remaining today</p>
              {nearLimit && <p className="usage-warning">You are close to your daily limit.</p>}
            </>
          )}
        </div>

        {!isPremium && (
          <div className="usage-progress" aria-label="Usage progress">
            <div className="usage-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        {!isPremium && (
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

        <button className={`sidebar-profile-btn${activePage === 'profile' ? ' active' : ''}`} title="Profile" onClick={onOpenProfile}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </button>

        <button className={`sidebar-profile-btn${activePage === 'pricing' ? ' active' : ''}`} title="Pricing" onClick={onOpenPricing}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Pricing
        </button>
          <button className={`sidebar-profile-btn${activePage === 'billing' ? ' active' : ''}`} title="Billing" onClick={onOpenBilling}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Billing
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

function ProfilePage({ profile, profileLoading, profileError, onRefresh, onUpgrade, onCancelSubscription, onLogout, paymentLoading, cancelLoading }) {
  const planLabel = profile?.plan === 'premium' ? 'Premium' : 'Free'
  const used = profile?.usageCount ?? 0
  const remaining = profile?.remainingUsage
  const isUnlimited = profile?.plan === 'premium' || (typeof remaining === 'number' && remaining < 0)
  const freeLimit = used + (typeof remaining === 'number' && remaining >= 0 ? remaining : 0)
  const nextBillingDate = profile?.currentPeriodEnd
    ? new Date(profile.currentPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'
  const billingStatusLabel = profile?.billingStatus ? profile.billingStatus.replace('_', ' ') : 'inactive'
  const hasSubscription = Boolean(profile?.subscriptionId)

  if (profileLoading) {
    return (
      <div className="profile-wrap">
        <div className="profile-card profile-loading-card">
          <div className="spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="profile-wrap">
        <div className="profile-card">
          <h3 className="profile-title">Profile</h3>
          <p className="profile-error">{profileError}</p>
          <button className="idea-action-btn" onClick={onRefresh}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-wrap">
      <section className="profile-card">
        <div className="profile-header">
          <h3 className="profile-title">User Profile</h3>
          <button className="idea-action-btn" onClick={onRefresh}>Refresh</button>
        </div>

        <div className="profile-grid">
          <article className="profile-section">
            <h4>Account Info</h4>
            <div className="profile-row"><span>Email</span><strong>{profile?.email || 'N/A'}</strong></div>
          </article>

          <article className="profile-section">
            <h4>Usage Stats</h4>
            <div className="profile-row"><span>Used today</span><strong>{used}</strong></div>
            <div className="profile-row"><span>Remaining</span><strong>{isUnlimited ? 'Unlimited' : (remaining ?? 0)}</strong></div>
            {profile?.plan !== 'premium' && (
              <div className="profile-row"><span>Daily limit</span><strong>{freeLimit}</strong></div>
            )}
          </article>

          <article className="profile-section">
            <h4>Plan Details</h4>
            <div className="profile-row"><span>Current plan</span><strong>{planLabel}</strong></div>
            <div className="profile-row"><span>Billing status</span><strong className="profile-status-copy">{billingStatusLabel}</strong></div>
            <div className="profile-row"><span>Next billing date</span><strong>{hasSubscription ? nextBillingDate : '—'}</strong></div>
            <p className="profile-plan-copy">
              {profile?.plan === 'premium'
                ? 'Your monthly premium subscription is active.'
                : 'Start the monthly premium subscription for unlimited generations and no daily limit.'}
            </p>

            <div className="profile-actions">
              {profile?.plan !== 'premium' && (
                <button className="upgrade-btn profile-upgrade" onClick={onUpgrade} disabled={paymentLoading}>
                  {paymentLoading ? 'Redirecting...' : 'Start Monthly Plan'}
                </button>
              )}
              {profile?.plan === 'premium' && hasSubscription && (
                <button className="idea-action-btn profile-cancel-btn" onClick={onCancelSubscription} disabled={cancelLoading}>
                  {cancelLoading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              )}
              <button className="idea-action-btn" onClick={onLogout}>Logout</button>
              <button className="idea-action-btn" disabled title="Coming soon">Edit Profile (Coming Soon)</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

function BillingDashboard({ stats, history, loading, error, onRefresh, onUpgrade, onCancelSubscription, paymentLoading, cancelLoading }) {
  const isPremium = stats?.plan === 'premium'
  const used = stats?.usageCount ?? 0
  const limit = stats?.dailyLimit ?? 5
  const remaining = stats?.remaining ?? 0
  const progressPercent = isPremium ? 100 : Math.min(100, Math.round((used / limit) * 100))
  const totalSpentRaw = stats?.totalSpent ?? 0
  // Convert from smallest unit (paise) to readable rupees
  const totalSpentDisplay = totalSpentRaw > 0
    ? `₹${(totalSpentRaw / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
    : '₹0'

  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
    : '—'
  const nextBillingDate = stats?.currentPeriodEnd
    ? new Date(stats.currentPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'
  const billingStatus = stats?.billingStatus ? stats.billingStatus.replace('_', ' ') : 'inactive'
  const hasSubscription = Boolean(stats?.subscriptionId)

  const formatAmount = (amt, currency) => {
    if (!amt) return '—'
    const sym = (currency || 'inr').toLowerCase() === 'inr' ? '₹' : '$'
    return `${sym}${(amt / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="billing-wrap">
        <div className="billing-loading">
          <div className="spinner" />
          <p>Loading billing info...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="billing-wrap">
        <div className="billing-error-card">
          <p className="profile-error">{error}</p>
          <button className="idea-action-btn" onClick={onRefresh}>Try again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="billing-wrap">
      {/* Page header */}
      <div className="billing-page-header">
        <div>
          <h2 className="billing-title">Billing &amp; Usage</h2>
          <p className="billing-sub">Manage your plan and view payment history</p>
        </div>
        <button className="idea-action-btn" onClick={onRefresh}>Refresh</button>
      </div>

      {/* Stats row */}
      <div className="billing-stats-row">
        <div className="billing-stat-card">
          <span className="billing-stat-label">Plan Type</span>
          <span className={`plan-badge ${isPremium ? 'premium' : 'free'} billing-plan-badge`}>
            {isPremium ? 'Premium Monthly' : 'Free'}
          </span>
          <span className="billing-stat-hint">Member since {memberSince}</span>
        </div>

        <div className="billing-stat-card">
          <span className="billing-stat-label">Billing Status</span>
          <span className={`billing-status billing-status--${stats?.billingStatus || 'pending'}`}>{billingStatus}</span>
          <span className="billing-stat-hint">Next billing: {hasSubscription ? nextBillingDate : '—'}</span>
        </div>

        <div className="billing-stat-card">
          <span className="billing-stat-label">Today&apos;s Usage</span>
          <span className="billing-stat-value">{used} <span className="billing-stat-dim">/ {isPremium ? '∞' : limit}</span></span>
          {!isPremium && (
            <div className="usage-progress billing-usage-bar" aria-label="Usage progress">
              <div className="usage-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
          <span className="billing-stat-hint">
            {isPremium ? 'Unlimited requests' : `${remaining} remaining today`}
          </span>
        </div>

        <div className="billing-stat-card">
          <span className="billing-stat-label">Total Payments</span>
          <span className="billing-stat-value">{stats?.totalPayments ?? 0}</span>
          <span className="billing-stat-hint">Total spent: {totalSpentDisplay}</span>
        </div>
      </div>

      {/* Upgrade CTA for free users */}
      {!isPremium && (
        <div className="billing-upgrade-banner">
          <div>
            <strong>Upgrade to Premium</strong>
            <p>Get unlimited generations, script generation, and priority response.</p>
          </div>
          <button className="upgrade-btn billing-upgrade-btn" onClick={onUpgrade} disabled={paymentLoading}>
            {paymentLoading ? 'Redirecting...' : 'Start Monthly Plan'}
          </button>
        </div>
      )}

      {isPremium && hasSubscription && (
        <div className="billing-action-row">
          <button className="idea-action-btn billing-cancel-btn" onClick={onCancelSubscription} disabled={cancelLoading}>
            {cancelLoading ? 'Canceling...' : 'Cancel Subscription'}
          </button>
        </div>
      )}

      {/* Payment history */}
      <div className="billing-history-section">
        <h3 className="billing-section-title">Payment History</h3>

        {(!history || history.length === 0) ? (
          <div className="billing-empty">
            <span className="billing-empty-icon">🧾</span>
            <p>No payment history yet.</p>
            {!isPremium && <p className="billing-empty-hint">Upgrade to Premium to start your billing history.</p>}
          </div>
        ) : (
          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p._id || p.paymentId}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td className="billing-plan-cell">
                      <span className="billing-plan-pill">
                        {p.plan === 'yearly' ? 'Yearly' : p.plan === 'monthly' ? 'Monthly' : 'Premium'}
                      </span>
                    </td>
                    <td className="billing-amount-cell">{formatAmount(p.amount, p.currency)}</td>
                    <td>
                      <span className={`billing-status billing-status--${p.status}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PricingPage({ plan, billingStatus, currentPeriodEnd, onUpgrade, paymentLoading }) {
  const [billing, setBilling] = useState('monthly')
  const isPremium = plan === 'premium'
  const nextBillingDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  const PLANS = [
    {
      id: 'free',
      name: 'Free',
      amount: '₹0',
      period: '/month',
      equiv: null,
      badge: null,
      features: ['5 generations/day', 'Basic idea generation', 'Category filtering', 'Copy & save ideas'],
    },
    {
      id: 'monthly',
      name: 'Monthly',
      amount: '₹249',
      period: '/month',
      equiv: null,
      badge: null,
      features: ['Unlimited generations', 'Script generation', 'Priority response', 'All Free features'],
    },
    {
      id: 'yearly',
      name: 'Yearly',
      amount: '₹1,999',
      period: '/year',
      equiv: '≈ ₹167/month',
      badge: '🔥 Best Value',
      features: ['Unlimited generations', 'Script generation', 'Priority response', 'All Free features', 'Lowest price per month'],
    },
  ]

  return (
    <div className="pricing-wrap">
      <div className="pricing-header">
        <h2 className="pricing-title">Simple, transparent pricing</h2>
        <p className="pricing-sub">Start free. Upgrade to the monthly premium subscription when you&apos;re ready.</p>

        {isPremium && (
          <div className="pricing-subscription-note">
            <span className={`billing-status billing-status--${billingStatus || 'active'}`}>{(billingStatus || 'active').replace('_', ' ')}</span>
            <span>{nextBillingDate ? `Next billing date: ${nextBillingDate}` : 'Subscription active'}</span>
          </div>
        )}

        <div className="billing-toggle">
          <button
            className={`billing-opt${billing === 'monthly' ? ' billing-opt--active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            className={`billing-opt${billing === 'yearly' ? ' billing-opt--active' : ''}`}
            onClick={() => setBilling('yearly')}
            disabled
          >
            Yearly <span className="billing-save">Soon</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {PLANS.map((p) => {
          const isHighlight = p.id === 'yearly' && billing === 'yearly'
          const isCurrent = p.id === 'free' ? !isPremium : (isPremium && p.id === 'monthly')
          const isHidden = (p.id === 'monthly' && billing === 'yearly') || (p.id === 'yearly' && billing === 'monthly')

          if (isHidden) return null

          return (
            <div
              key={p.id}
              className={`pc${isHighlight ? ' pc--highlight' : ''}${p.id === 'free' ? ' pc--free' : ''}`}
            >
              {p.badge && <span className="pc-badge">{p.badge}</span>}

              <div className="pc-top">
                <span className="pc-name">{p.name}</span>
                <div className="pc-price-row">
                  <span className="pc-amount">{p.amount}</span>
                  <span className="pc-period">{p.period}</span>
                </div>
                {p.equiv && <span className="pc-equiv">{p.equiv}</span>}
              </div>

              <ul className="pc-features">
                {p.features.map((f) => (
                  <li key={f}>
                    <span className="pc-check">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button
                className={`pc-btn${isCurrent ? ' pc-btn--current' : ' pc-btn--upgrade'}`}
                onClick={p.id === 'monthly' && !isCurrent ? onUpgrade : undefined}
                disabled={isCurrent || p.id === 'yearly' || (p.id !== 'free' && paymentLoading)}
              >
                {isCurrent
                  ? 'Current Plan'
                  : p.id === 'free'
                  ? 'Free Plan'
                  : paymentLoading
                  ? 'Redirecting...'
                  : p.id === 'yearly'
                  ? 'Coming Soon'
                  : 'Start Monthly Plan'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
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
  const sentAt = formatMessageTime(msg.createdAt)

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

        {sentAt && <p className="message-time">{sentAt}</p>}
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
          <button className={`auth-submit ${mode === 'login' ? 'auth-submit-login' : 'auth-submit-signup'}`} type="submit">
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

function PaymentSuccessModal({ open, onClose }) {
  if (!open) return null

  return (
    <div className="pay-success-overlay" onClick={onClose}>
      <div className="pay-success-card" onClick={(e) => e.stopPropagation()}>
        <div className="pay-success-icon" aria-hidden="true">🎉</div>
        <h2 className="pay-success-title">You are now Premium!</h2>
        <p className="pay-success-sub">
          Your premium plan is now active.<br />Enjoy unlimited generations every day.
        </p>
        <span className="plan-badge premium pay-success-badge">Premium</span>
        <div className="pay-success-features">
          <span>✓ Unlimited generations</span>
          <span>✓ Script generation</span>
          <span>✓ Priority response</span>
        </div>
        <button className="pay-success-btn" onClick={onClose}>
          Go to Dashboard →
        </button>
      </div>
    </div>
  )
}

function App() {
  const [activePage, setActivePage] = useState('chat')
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
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [billingStats, setBillingStats] = useState(null)
  const [billingHistory, setBillingHistory] = useState([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState('')

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
      fetchProfile()
    }
    setCheckingAuth(false)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return

    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')

    if (paymentStatus === 'success') {
      confirmPremiumAfterCheckout()
    }

    if (paymentStatus) {
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      window.history.replaceState({}, '', url)
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

  const fetchProfile = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setProfileLoading(true)
    setProfileError('')
    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: 'Bearer ' + token },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load profile')
      }

      setProfile(data)
      setUsage((prev) => ({ ...prev, plan: data.plan, usageCount: data.usageCount, remaining: data.remainingUsage ?? prev.remaining }))
    } catch (err) {
      setProfileError(err.message || 'Could not load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const fetchBillingData = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setBillingLoading(true)
    setBillingError('')
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/billing/stats`, { headers: { Authorization: 'Bearer ' + token } }),
        fetch(`${API_URL}/billing/history`, { headers: { Authorization: 'Bearer ' + token } }),
      ])

      const statsData = await statsRes.json()
      const historyData = historyRes.ok ? await historyRes.json() : { payments: [] }

      if (!statsRes.ok) {
        throw new Error(statsData.error || 'Failed to load billing data')
      }

      setBillingStats(statsData)
      setBillingHistory(historyData.payments || [])
      setUsage({
        plan: statsData.plan,
        usageCount: statsData.usageCount,
        remaining: statsData.remaining,
        dailyLimit: statsData.dailyLimit,
      })
    } catch (err) {
      setBillingError(err.message || 'Failed to load billing data')
    } finally {
      setBillingLoading(false)
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
      const loadedMessages = Array.isArray(data.chat.messages) ? data.chat.messages : []
      setMessages(sortMessagesByCreatedAt(loadedMessages))
    } catch (err) {
      console.error('Load chat error:', err)
    }
  }

  const handleClearChat = async () => {
    if (!currentChatId || loading) return

    const confirmed = window.confirm('Clear all messages in this chat?')
    if (!confirmed) return

    try {
      const res = await fetch(`${API_URL}/chat/${currentChatId}/messages`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clear chat')
      }

      setMessages([])
      if (data.chat?._id) setCurrentChatId(data.chat._id)
      fetchChats()
    } catch (err) {
      console.error('Clear chat error:', err)
      alert(err.message || 'Could not clear chat')
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
        fetchProfile()
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
    setActivePage('chat')
    setCurrentChatId(null)
    setChats([])
    setMessages([])
    setProfile(null)
    setProfileError('')
    setUsage({ plan: 'free', usageCount: 0, remaining: 5, dailyLimit: 5 })
  }

  const confirmPremiumAfterCheckout = async () => {
    setPaymentLoading(true)
    try {
      // Webhook may take a moment after redirect — retry usage checks briefly.
      let premiumActivated = false
      const maxAttempts = 8

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const res = await fetch(`${API_URL}/usage`, {
          headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
        })

        if (res.ok) {
          const data = await res.json()
          setUsage(data)

          if (data.plan === 'premium') {
            premiumActivated = true
            break
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1200))
      }

      if (premiumActivated) {
        setShowPaymentSuccess(true)
        await Promise.all([fetchProfile(), fetchBillingData()])
      } else {
        setPaymentSuccess('Payment received. Premium activation may take a minute.')
      }
    } catch {
      setPaymentSuccess('Payment completed, but status refresh failed. Please reload shortly.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePaymentSuccessDismiss = () => {
    setShowPaymentSuccess(false)
    setActivePage('billing')
  }

  const handleUpgrade = async () => {
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API_URL}/create-subscription`, {
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

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm('Cancel your monthly subscription and return to the Free plan?')
    if (!confirmed) return

    setCancelLoading(true)
    try {
      const res = await fetch(`${API_URL}/billing/cancel-subscription`, {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      setPaymentSuccess('Subscription canceled. Your account is now on the Free plan.')
      await Promise.all([fetchUsage(), fetchProfile(), fetchBillingData()])
    } catch (err) {
      alert(err.message || 'Failed to cancel subscription')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const optimisticUserMsg = { role: 'user', content: text, createdAt: new Date().toISOString() }
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
        body: JSON.stringify({ message: text, chatId }),
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
      setMessages(sortMessagesByCreatedAt(nextMessages))
      setCurrentChatId(data.chat?._id || chatId)
      if (data.usage) setUsage(data.usage)
      fetchChats()
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please try again.', createdAt: new Date().toISOString() }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSelectChat = (chatId) => {
    setActivePage('chat')
    loadChat(chatId)
  }

  const handleNewChat = async () => {
    try {
      setActivePage('chat')
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

  const handleOpenProfile = async () => {
    setActivePage('profile')
    await fetchProfile()
  }

  const handleOpenPricing = async () => {
    setActivePage('pricing')
    await fetchProfile()
  }

  const handleOpenBilling = async () => {
    setActivePage('billing')
    await fetchBillingData()
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
        onOpenProfile={() => { handleOpenProfile(); setSidebarOpen(false) }}
        onOpenPricing={() => { handleOpenPricing(); setSidebarOpen(false) }}
        activePage={activePage}
          onOpenBilling={() => { handleOpenBilling(); setSidebarOpen(false) }}
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
          <span className="chat-topbar-title">{activePage === 'profile' ? 'Profile' : activePage === 'pricing' ? 'Pricing' : activePage === 'billing' ? 'Billing & Usage' : 'AI Ideas Studio'}</span>

          <div className="topbar-actions">
            <button className="topbar-profile-btn" onClick={handleOpenProfile}>Profile</button>
            <button className="topbar-profile-btn" onClick={handleOpenPricing}>Pricing</button>
            <button className="topbar-profile-btn" onClick={handleOpenBilling}>Billing</button>
            {activePage === 'chat' && (
              <>
                <button className="clear-chat-btn" onClick={handleClearChat} disabled={!currentChatId || loading || messages.length === 0}>
                  Clear chat
                </button>
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
              </>
            )}
          </div>
        </header>

        {paymentSuccess && <div className="payment-success-banner">{paymentSuccess}</div>}

        {activePage === 'profile' ? (
          <ProfilePage
            profile={profile}
            profileLoading={profileLoading}
            profileError={profileError}
            onRefresh={fetchProfile}
            onUpgrade={handleUpgrade}
            onCancelSubscription={handleCancelSubscription}
            onLogout={handleLogout}
            paymentLoading={paymentLoading}
            cancelLoading={cancelLoading}
          />
        ) : activePage === 'pricing' ? (
          <PricingPage
            plan={usage?.plan ?? 'free'}
            billingStatus={profile?.billingStatus}
            currentPeriodEnd={profile?.currentPeriodEnd}
            onUpgrade={handleUpgrade}
            paymentLoading={paymentLoading}
          />
          ) : activePage === 'billing' ? (
            <BillingDashboard
              stats={billingStats}
              history={billingHistory}
              loading={billingLoading}
              error={billingError}
              onRefresh={fetchBillingData}
              onUpgrade={handleUpgrade}
              onCancelSubscription={handleCancelSubscription}
              paymentLoading={paymentLoading}
              cancelLoading={cancelLoading}
            />
        ) : (
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
        )}

        {activePage === 'chat' && <div className="input-bar">
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
        </div>}
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

      <PaymentSuccessModal
        open={showPaymentSuccess}
        onClose={handlePaymentSuccessDismiss}
      />
    </div>
  )
}

export default App
