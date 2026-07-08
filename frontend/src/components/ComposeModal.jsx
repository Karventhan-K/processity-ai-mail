'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

export default function ComposeModal({ 
  isOpen, 
  onClose, 
  onSend, 
  initialData = null, 
  autoFillData = null, 
  onAutoFillComplete = null 
}) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // Track which fields are actively being typed by AI
  const [activeTypingField, setActiveTypingField] = useState(null);

  // Keep references to inputs for selection/focus effects
  const toRef = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  // Reset fields when opening/closing or changing initialData (for replies)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTo(initialData.to || '');
        setSubject(initialData.subject || '');
        setBody(initialData.body || '');
      } else {
        setTo('');
        setSubject('');
        setBody('');
      }
      setActiveTypingField(null);
    }
  }, [isOpen, initialData]);

  // AI Auto-Typing Simulation Effect
  useEffect(() => {
    if (!isOpen || !autoFillData) return;

    const { to: targetTo, subject: targetSubject, body: targetBody } = autoFillData;
    
    // Clear fields to start animation fresh
    setTo('');
    setSubject('');
    setBody('');

    let currentField = 'to';
    let charIndex = 0;
    
    setActiveTypingField('to');

    const typingSpeed = 12; // Snappy typing speed

    const interval = setInterval(() => {
      if (currentField === 'to') {
        if (targetTo && charIndex < targetTo.length) {
          const chunk = targetTo.slice(charIndex, charIndex + 2);
          setTo(prev => prev + chunk);
          charIndex += 2;
        } else {
          currentField = 'subject';
          charIndex = 0;
          setActiveTypingField('subject');
        }
      } else if (currentField === 'subject') {
        if (targetSubject && charIndex < targetSubject.length) {
          const chunk = targetSubject.slice(charIndex, charIndex + 2);
          setSubject(prev => prev + chunk);
          charIndex += 2;
        } else {
          currentField = 'body';
          charIndex = 0;
          setActiveTypingField('body');
        }
      } else if (currentField === 'body') {
        if (targetBody && charIndex < targetBody.length) {
          const chunk = targetBody.slice(charIndex, charIndex + 6);
          setBody(prev => prev + chunk);
          charIndex += 6;
        } else {
          clearInterval(interval);
          setActiveTypingField(null);
          if (onAutoFillComplete) {
            onAutoFillComplete();
          }
        }
      }
    }, typingSpeed);

    return () => clearInterval(interval);

  }, [isOpen, autoFillData]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!to || !subject || !body) return;
    onSend({ to, subject, body });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-large">
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <Sparkles className="w-5 h-5" style={{ color: activeTypingField ? 'var(--accent-cyan)' : 'var(--accent-purple)' }} />
            <h2 className="modal-title">
              {activeTypingField ? 'AI Assistant is composing...' : initialData?.id ? 'Reply Email' : 'New Message'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          
          {/* To Field */}
          <div className={`compose-row-border ${activeTypingField === 'to' ? 'ai-filling-field' : ''}`}>
            <span className="compose-label">To:</span>
            <input 
              ref={toRef}
              type="text" 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@domain.com"
              disabled={!!initialData || activeTypingField !== null}
              className="compose-field-input"
            />
            {activeTypingField === 'to' && (
              <span className="unread-badge" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Autofilling...</span>
            )}
          </div>

          {/* Subject Field */}
          <div className={`compose-row-border ${activeTypingField === 'subject' ? 'ai-filling-field' : ''}`}>
            <span className="compose-label">Subject:</span>
            <input 
              ref={subjectRef}
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject line"
              disabled={activeTypingField !== null}
              className="compose-field-input"
            />
            {activeTypingField === 'subject' && (
              <span className="unread-badge" style={{ fontSize: '9px', textTransform: 'uppercase' }}>Autofilling...</span>
            )}
          </div>

          {/* Body Field */}
          <div className={`compose-textarea-wrapper ${activeTypingField === 'body' ? 'ai-filling-field' : ''}`} style={{ minHeight: '260px' }}>
            <textarea 
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={12}
              disabled={activeTypingField !== null}
              className="compose-body-textarea"
            />
            {activeTypingField === 'body' && (
              <div className="compose-indicator-badge">
                <Sparkles className="w-3 h-3" />
                <span>AI Autofilling body...</span>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="modal-actions-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span className="compose-footer-note">
              {activeTypingField ? 'Wait for AI to complete autofill...' : 'Press Send to deliver.'}
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={activeTypingField !== null}
                className="btn-panel-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activeTypingField !== null || !to || !subject || !body}
                className="btn-compose-send"
              >
                <Send className="w-4 h-4" />
                <span>Send Email</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
