'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Check, ShieldAlert, CornerDownLeft, Trash2 } from 'lucide-react';

export default function AssistantPanel({ 
  messages, 
  onSendMessage, 
  isGenerating, 
  activeToolCall, 
  confirmAction, 
  cancelAction, 
  pendingSendAction,
  onReopenCompose,
  onClearHistory
}) {
  const [input, setInput] = useState('');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, activeToolCall, pendingSendAction]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input, requireConfirmation);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
    }
  };

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

  const suggestions = [
    "Compose email to adarsh@processity.ai with subject 'Task Demo'",
    "Show me only unread emails",
    "Open the latest email from Sarah",
    "Reply saying I will review the spec today",
  ];

  return (
    <div className="assistant-sidebar">
      
      {/* Header */}
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
          {/* Clear history button */}
          {messages.length > 0 && (
            <button 
              onClick={onClearHistory}
              className="btn-clear-chat"
              title="Clear chat history"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Human-in-the-loop flag */}
          <label className="hitl-toggle-label" title="Intercepts send requests for approval">
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

      {/* Message History */}
      <div className="chat-history">
        {messages.length === 0 && (
          <div className="empty-chat-state">
            <Sparkles className="w-8 h-8 text-cyan-500/50 animate-pulse" />
            <div>
              <p className="empty-chat-title">Ask the AI Agent anything</p>
              <p className="empty-chat-desc">
                Tell the assistant to compose emails, apply inbox filters, reply, or open emails.
              </p>
            </div>
            {/* Quick chips */}
            <div className="chat-suggestions-stack">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(sug)}
                  className="suggestion-btn"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`chat-bubble-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="chat-bubble">
              {msg.content && <p>{msg.content}</p>}

              {/* Display AI actions visually if present */}
              {msg.actions && msg.actions.map((act, actIdx) => {
                const isReopenable = act.name === 'openComposeView' || act.name === 'replyToEmail';
                return (
                  <div 
                    key={actIdx} 
                    className={`chat-action-card ${isReopenable ? 'clickable-action-card' : ''}`}
                    onClick={() => {
                      if (isReopenable && onReopenCompose) {
                        onReopenCompose(act);
                      }
                    }}
                    title={isReopenable ? "Click to reopen composer with this draft" : undefined}
                  >
                    {act.name === 'openComposeView' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Action: Compose Email {isReopenable && <span style={{fontSize: '9px', textTransform: 'none', marginLeft: 'auto', opacity: 0.7}}>(Click to reopen)</span>}</span>
                        </div>
                        {act.args.to && (
                          <div className="chat-action-row">
                            <span className="chat-action-label">To:</span>
                            <span className="chat-action-value" style={{ color: 'var(--accent-cyan)' }}>{act.args.to}</span>
                          </div>
                        )}
                        {act.args.subject && (
                          <div className="chat-action-row">
                            <span className="chat-action-label">Subject:</span>
                            <span className="chat-action-value" style={{ fontWeight: 500 }}>{act.args.subject}</span>
                          </div>
                        )}
                        {act.args.body && (
                          <div className="chat-action-row" style={{ flexDirection: 'column', gap: '4px' }}>
                            <span className="chat-action-label">Body:</span>
                            <div className="chat-action-body-preview">{act.args.body}</div>
                          </div>
                        )}
                      </>
                    )}

                    {act.name === 'replyToEmail' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Action: Draft Reply {isReopenable && <span style={{fontSize: '9px', textTransform: 'none', marginLeft: 'auto', opacity: 0.7}}>(Click to reopen)</span>}</span>
                        </div>
                        {act.args.replyBody && (
                          <div className="chat-action-row" style={{ flexDirection: 'column', gap: '4px' }}>
                            <span className="chat-action-label">Reply Message:</span>
                            <div className="chat-action-body-preview">{act.args.replyBody}</div>
                          </div>
                        )}
                      </>
                    )}

                    {act.name === 'filterInbox' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Action: Filter Inbox</span>
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          {act.args.query && <span className="chat-action-badge">Search: "{act.args.query}"</span>}
                          {act.args.sender && <span className="chat-action-badge">From: {act.args.sender}</span>}
                          {act.args.unreadOnly && <span className="chat-action-badge">Unread Only</span>}
                          {act.args.daysAgo && <span className="chat-action-badge">Last {act.args.daysAgo} Days</span>}
                          {!act.args.query && !act.args.sender && !act.args.unreadOnly && !act.args.daysAgo && (
                            <span className="chat-action-badge">Reset Filters</span>
                          )}
                        </div>
                      </>
                    )}

                    {act.name === 'openEmail' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Action: Open Email</span>
                        </div>
                        <div className="chat-action-row">
                          <span className="chat-action-label">Keyword:</span>
                          <span className="chat-action-value" style={{ fontStyle: 'italic' }}>"{act.args.keyword}"</span>
                        </div>
                      </>
                    )}

                    {act.name === 'sendEmail' && (
                      <>
                        <div className="chat-action-header">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Action: Send Email</span>
                        </div>
                        <div className="chat-action-row">
                          <span className="chat-action-value" style={{ color: 'var(--text-muted)' }}>Triggering email dispatch...</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Backward compatibility fallback for string actions */}
              {!msg.actions && msg.action && (
                <div className="chat-bubble-action">
                  <span style={{ fontWeight: 600, color: 'white' }}>Action Executed:</span>
                  <p style={{ marginTop: '2px', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{msg.action}</p>
                </div>
              )}
            </div>
            <span className="bubble-sender-label">
              {msg.role === 'user' ? 'You' : 'AI Agent'}
            </span>
          </div>
        ))}

        {/* Pending Send Confirmation Action Panel (Human-in-the-loop) */}
        {pendingSendAction && (
          <div className="pending-send-panel">
            <div className="panel-header-block">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" style={{ marginTop: '2px' }} />
              <div>
                <span className="panel-header-title">Send Confirmation</span>
                <p className="panel-header-desc">
                  The AI assistant drafted an email and wants to send it. Do you approve?
                </p>
              </div>
            </div>
            
            {/* Draft Details */}
            <div className="draft-preview-box">
              <p><strong>To:</strong> {pendingSendAction.to}</p>
              <p><strong>Subject:</strong> {pendingSendAction.subject}</p>
              <p><strong>Body:</strong> {pendingSendAction.body}</p>
            </div>

            {/* Actions */}
            <div className="panel-actions-row">
              <button
                onClick={cancelAction}
                className="btn-panel-cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="btn-panel-approve"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Send</span>
              </button>
            </div>
          </div>
        )}

        {/* Tool activity overlay */}
        {activeToolCall && (
          <div className="executing-tool-panel">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <div>
              <span className="tool-panel-title">Executing UI Command:</span>
              <p className="tool-panel-desc">{activeToolCall}</p>
            </div>
          </div>
        )}

        {/* Standard generative model loading */}
        {isGenerating && !activeToolCall && (
          <div className="executing-tool-panel" style={{ background: 'transparent', borderColor: 'transparent' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thinking...</span>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-row">
          
          <textarea 
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Send an email to John..."
            className="chat-text-input"
            rows={1}
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="btn-chat-send"
          >
            <CornerDownLeft className="w-4.5 h-4.5" />
          </button>

        </div>

        <div className="chat-input-footnote">
          <span>AI driving requires speech or typing. Try: "Reply to this"</span>
        </div>
      </form>

    </div>
  );
}
