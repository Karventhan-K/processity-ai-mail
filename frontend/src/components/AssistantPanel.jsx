'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, RefreshCw, Check, ShieldAlert,
  CornerDownLeft, Trash2, X,
} from 'lucide-react';

/**
 * AssistantPanel — the AI chat sidebar.
 * Features:
 *   - Message history with user/assistant bubbles
 *   - Human-in-the-loop send confirmation
 *   - Suggestion chips when chat is empty
 *   - Animated send button (loading state while AI is generating)
 */
export default function AssistantPanel({
  messages,
  onSendMessage,
  isGenerating,
  activeToolCall,
  confirmAction,
  cancelAction,
  pendingSendAction,
  onReopenCompose,
  onClearHistory,
  // Mobile drawer props
  isMobileOpen  = false,
  onMobileClose = () => {},
}) {
  const [input, setInput] = useState('');
  const [requireConfirmation, setRequireConfirmation] = useState(true);

  const chatEndRef  = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to the bottom whenever a new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, activeToolCall, pendingSendAction]);

  // Auto-resize the textarea height as the user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    onSendMessage(trimmed, requireConfirmation);
    setInput('');

    // Reset textarea height after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Allow Enter to submit, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (text) => {
    if (isGenerating) return;
    onSendMessage(text, requireConfirmation);
  };

  // Quick starter suggestions shown when chat is empty
  const suggestions = [
    "Compose an email to adarsh@processity.ai about Task Demo",
    "Show me only unread emails",
    "Open the latest email from Sarah",
    "Reply saying I will review the spec today",
  ];

  return (
    <div className={`assistant-sidebar ${isMobileOpen ? 'drawer-open' : ''}`}>

      {/* ---- Mobile Close Button (×) ---- */}
      <button
        className="drawer-close-btn"
        onClick={onMobileClose}
        title="Close AI Agent"
      >
        <X className="w-4 h-4" />
      </button>

      {/* ---- Header ---- */}
      <div className="assistant-header">
        <div className="assistant-title-block">
          <div className="assistant-icon-box">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="assistant-title-text">AI Agent</h3>
            <p className="assistant-subtitle-text">UI Controller Mode</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Clear history button — only shown when there are messages */}
          {messages.length > 0 && (
            <button
              onClick={onClearHistory}
              title="Clear chat history"
              style={{
                background:      'transparent',
                border:          'none',
                color:           'var(--text-muted)',
                cursor:          'pointer',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                padding:         '4px',
                borderRadius:    '6px',
                transition:      'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Human-in-the-loop toggle — intercepts AI send requests */}
          <label className="hitl-toggle-label" title="When ON, AI must ask before sending">
            <input
              type="checkbox"
              checked={requireConfirmation}
              onChange={(e) => setRequireConfirmation(e.target.checked)}
              className="hitl-checkbox"
            />
            <span className="hitl-label-text">Confirm Send</span>
          </label>
        </div>
      </div>

      {/* ---- Chat Message History ---- */}
      <div className="chat-history">

        {/* Empty state with suggestion chips */}
        {messages.length === 0 && (
          <div className="empty-chat-state">
            <Sparkles className="w-8 h-8" style={{ color: 'rgba(6,182,212,0.45)' }} />
            <div>
              <p className="empty-chat-title">Ask the AI Agent anything</p>
              <p className="empty-chat-desc">
                Tell the assistant to compose emails, apply inbox filters,
                reply to threads, or open a specific email.
              </p>
            </div>

            {/* Quick suggestion buttons */}
            <div className="chat-suggestions-stack">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-btn"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render chat messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="chat-bubble">
              {/* Message text */}
              {msg.content && <p>{msg.content}</p>}

              {/* AI action cards — structured display of what the AI did */}
              {msg.actions && msg.actions.map((action, actionIdx) => {
                const canReopen = action.name === 'openComposeView' || action.name === 'replyToEmail';

                return (
                  <div
                    key={actionIdx}
                    className={`chat-action-card ${canReopen ? 'clickable-action-card' : ''}`}
                    onClick={() => canReopen && onReopenCompose?.(action)}
                    title={canReopen ? 'Click to reopen this composer draft' : undefined}
                  >
                    {/* Compose Email action */}
                    {action.name === 'openComposeView' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3\.5 h-3\.5" style={{ color: 'var(--accent-cyan)' }} />
                          <span>
                            Action: Compose Email
                            {canReopen && (
                              <span style={{ fontSize: '9px', textTransform: 'none', marginLeft: 'auto', opacity: 0.65 }}>
                                {' '}(click to reopen)
                              </span>
                            )}
                          </span>
                        </div>
                        {action.args.to && (
                          <div className="chat-action-row">
                            <span className="chat-action-label">To:</span>
                            <span className="chat-action-value" style={{ color: 'var(--accent-cyan)' }}>
                              {action.args.to}
                            </span>
                          </div>
                        )}
                        {action.args.subject && (
                          <div className="chat-action-row">
                            <span className="chat-action-label">Subject:</span>
                            <span className="chat-action-value" style={{ fontWeight: 500 }}>
                              {action.args.subject}
                            </span>
                          </div>
                        )}
                        {action.args.body && (
                          <div className="chat-action-row" style={{ flexDirection: 'column', gap: '4px' }}>
                            <span className="chat-action-label">Body:</span>
                            <div className="chat-action-body-preview">{action.args.body}</div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Reply Email action */}
                    {action.name === 'replyToEmail' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3\.5 h-3\.5" style={{ color: 'var(--accent-cyan)' }} />
                          <span>
                            Action: Draft Reply
                            {canReopen && (
                              <span style={{ fontSize: '9px', textTransform: 'none', marginLeft: 'auto', opacity: 0.65 }}>
                                {' '}(click to reopen)
                              </span>
                            )}
                          </span>
                        </div>
                        {action.args.replyBody && (
                          <div className="chat-action-row" style={{ flexDirection: 'column', gap: '4px' }}>
                            <span className="chat-action-label">Reply:</span>
                            <div className="chat-action-body-preview">{action.args.replyBody}</div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Filter inbox action */}
                    {action.name === 'filterInbox' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3\.5 h-3\.5" style={{ color: 'var(--accent-cyan)' }} />
                          <span>Action: Filter Inbox</span>
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          {action.args.query     && <span className="chat-action-badge">Search: "{action.args.query}"</span>}
                          {action.args.sender    && <span className="chat-action-badge">From: {action.args.sender}</span>}
                          {action.args.unreadOnly && <span className="chat-action-badge">Unread Only</span>}
                          {action.args.daysAgo   && <span className="chat-action-badge">Last {action.args.daysAgo} Days</span>}
                          {!action.args.query && !action.args.sender && !action.args.unreadOnly && !action.args.daysAgo && (
                            <span className="chat-action-badge">Reset Filters</span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Open email action */}
                    {action.name === 'openEmail' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3\.5 h-3\.5" style={{ color: 'var(--accent-cyan)' }} />
                          <span>Action: Open Email</span>
                        </div>
                        <div className="chat-action-row">
                          <span className="chat-action-label">Keyword:</span>
                          <span className="chat-action-value" style={{ fontStyle: 'italic' }}>
                            "{action.args.keyword}"
                          </span>
                        </div>
                      </>
                    )}

                    {/* Send email action */}
                    {action.name === 'sendEmail' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3\.5 h-3\.5" style={{ color: 'var(--accent-cyan)' }} />
                          <span>Action: Send Email</span>
                        </div>
                        <div className="chat-action-row">
                          <span className="chat-action-value" style={{ color: 'var(--text-muted)' }}>
                            Triggering email dispatch...
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Legacy fallback for old string-format action logs */}
              {!msg.actions && msg.action && (
                <div className="chat-bubble-action">
                  <span style={{ fontWeight: 600, color: 'white' }}>Action Executed:</span>
                  <p style={{ marginTop: '2px', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {msg.action}
                  </p>
                </div>
              )}
            </div>

            {/* Sender label below bubble */}
            <span className="bubble-sender-label">
              {msg.role === 'user' ? 'You' : 'AI Agent'}
            </span>
          </div>
        ))}

        {/* ---- Human-in-the-loop: pending send confirmation ---- */}
        {pendingSendAction && (
          <div className="pending-send-panel">
            <div className="panel-header-block">
              <ShieldAlert
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--accent-amber)', marginTop: '2px' }}
              />
              <div>
                <span className="panel-header-title">Send Confirmation Required</span>
                <p className="panel-header-desc">
                  The AI drafted an email and wants to send it. Do you approve?
                </p>
              </div>
            </div>

            {/* Draft preview */}
            <div className="draft-preview-box">
              <p><strong>To:</strong> {pendingSendAction.to}</p>
              <p><strong>Subject:</strong> {pendingSendAction.subject}</p>
              <p><strong>Body:</strong> {pendingSendAction.body}</p>
            </div>

            {/* Approve / Cancel */}
            <div className="panel-actions-row">
              <button onClick={cancelAction} className="btn-panel-cancel">
                Cancel
              </button>
              <button onClick={confirmAction} className="btn-panel-approve">
                <Check className="w-3\.5 h-3\.5" />
                <span>Approve &amp; Send</span>
              </button>
            </div>
          </div>
        )}

        {/* ---- Tool executing indicator ---- */}
        {activeToolCall && (
          <div className="executing-tool-panel">
            <RefreshCw
              className="w-3\.5 h-3\.5 animate-spin"
              style={{ color: 'var(--accent-cyan)', flexShrink: 0 }}
            />
            <div>
              <span className="tool-panel-title">Executing UI Command</span>
              <p className="tool-panel-desc">{activeToolCall}</p>
            </div>
          </div>
        )}

        {/* ---- Standard "thinking" loader ---- */}
        {isGenerating && !activeToolCall && (
          <div className="executing-tool-panel" style={{ background: 'transparent', borderColor: 'transparent' }}>
            <RefreshCw
              className="w-3\.5 h-3\.5 animate-spin"
              style={{ color: 'var(--text-muted)', flexShrink: 0 }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AI is thinking...</span>
          </div>
        )}

        {/* Invisible scroll target */}
        <div ref={chatEndRef} />
      </div>

      {/* ---- Chat Input Form ---- */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-row">

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Ask the AI to compose, reply, filter..."
            className="chat-text-input"
            rows={1}
          />

          {/* Send button — spinning when AI is generating */}
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="btn-chat-send"
            title={isGenerating ? 'AI is generating a response...' : 'Send message (Enter)'}
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CornerDownLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="chat-input-footnote">
          <span>Press Enter to send · Shift+Enter for new line</span>
        </div>
      </form>

    </div>
  );
}
