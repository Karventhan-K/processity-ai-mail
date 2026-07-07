'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, RefreshCw, Check, ShieldAlert, CornerDownLeft } from 'lucide-react';

export default function AssistantPanel({ 
  messages, 
  onSendMessage, 
  isGenerating, 
  activeToolCall, 
  confirmAction, 
  cancelAction, 
  pendingSendAction 
}) {
  const [input, setInput] = useState('');
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, activeToolCall, pendingSendAction]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setInput(text);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input, requireConfirmation);
    setInput('');
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
            <h3 className="assistant-title-text">AI Copilot</h3>
            <p className="assistant-subtitle-text">UI Controller Mode</p>
          </div>
        </div>

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

      {/* Message History */}
      <div className="chat-history">
        {messages.length === 0 && (
          <div className="empty-chat-state">
            <Sparkles className="w-8 h-8 text-cyan-500/50 animate-pulse" />
            <div>
              <p className="empty-chat-title">Ask the Copilot anything</p>
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
              <p>{msg.content}</p>

              {/* Display AI actions inside message bubble if present */}
              {msg.action && (
                <div className="chat-bubble-action">
                  <span style={{ fontWeight: 600, color: 'white' }}>Action Executed:</span>
                  <p style={{ marginTop: '2px' }}>{msg.action}</p>
                </div>
              )}
            </div>
            <span className="bubble-sender-label">
              {msg.role === 'user' ? 'You' : 'Copilot'}
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
          
          {/* Audio input button */}
          <button
            type="button"
            onClick={handleMicToggle}
            className={`btn-mic ${isListening ? 'listening' : ''}`}
            title={isListening ? "Listening... Click to Stop" : "Voice Command"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <div className="text-input-wrapper">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating}
              placeholder={isListening ? "Listening..." : "Send an email to John..."}
              className="chat-text-input"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="btn-chat-send"
            >
              <CornerDownLeft className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>

        <div className="chat-input-footnote">
          <span>AI driving requires speech or typing. Try: "Reply to this"</span>
        </div>
      </form>

    </div>
  );
}
