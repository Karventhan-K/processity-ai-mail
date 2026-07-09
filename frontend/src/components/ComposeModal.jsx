'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

/**
 * ComposeModal — email compose/reply popup with:
 *   - AI auto-type animation (letter-by-letter fill)
 *   - Send button loading state + success flash
 *   - Clean form layout with proper validation
 */
export default function ComposeModal({
  isOpen,
  onClose,
  onSend,
  initialData = null,
  autoFillData = null,
  onAutoFillComplete = null,
}) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Which field the AI is currently typing into
  const [activeTypingField, setActiveTypingField] = useState(null);

  // Track send button state: 'idle' | 'sending' | 'success'
  const [sendState, setSendState] = useState('idle');

  const toRef      = useRef(null);
  const subjectRef = useRef(null);
  const bodyRef    = useRef(null);

  // -------------------------------------------------------
  // Reset fields when modal opens / initialData changes
  // -------------------------------------------------------
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
      setSendState('idle');
    }
  }, [isOpen, initialData]);

  // -------------------------------------------------------
  // AI auto-typing simulation effect
  // Fills fields one character-chunk at a time to look like
  // the AI is actually typing into the form.
  // -------------------------------------------------------
  useEffect(() => {
    if (!isOpen || !autoFillData) return;

    const { to: targetTo, subject: targetSubject, body: targetBody } = autoFillData;

    // Clear all fields to restart
    setTo('');
    setSubject('');
    setBody('');
    setSendState('idle');

    let currentField = 'to';
    let charIndex    = 0;

    setActiveTypingField('to');

    // 12ms interval = ~80 chars/sec for a snappy feel
    const typingSpeed = 12;

    const interval = setInterval(() => {
      if (currentField === 'to') {
        if (targetTo && charIndex < targetTo.length) {
          // Type 2 characters at a time
          setTo(prev => prev + targetTo.slice(charIndex, charIndex + 2));
          charIndex += 2;
        } else {
          // Move to next field
          currentField = 'subject';
          charIndex    = 0;
          setActiveTypingField('subject');
        }

      } else if (currentField === 'subject') {
        if (targetSubject && charIndex < targetSubject.length) {
          setSubject(prev => prev + targetSubject.slice(charIndex, charIndex + 2));
          charIndex += 2;
        } else {
          currentField = 'body';
          charIndex    = 0;
          setActiveTypingField('body');
        }

      } else if (currentField === 'body') {
        if (targetBody && charIndex < targetBody.length) {
          // Type 6 chars at a time for the body (longer text)
          setBody(prev => prev + targetBody.slice(charIndex, charIndex + 6));
          charIndex += 6;
        } else {
          // Done typing — clean up
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

  // Don't render at all when closed
  if (!isOpen) return null;

  const isTyping    = activeTypingField !== null;
  const isFormReady = to.trim() && subject.trim() && body.trim();
  const isSending   = sendState === 'sending';
  const isSuccess   = sendState === 'success';

  // -------------------------------------------------------
  // Form submit with animated send button
  // -------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Guard: don't send while AI is typing or already sending
    if (!isFormReady || isTyping || isSending) return;

    // 1. Set loading state on the button
    setSendState('sending');

    try {
      // 2. Call the parent send handler (async)
      await onSend({ to, subject, body });

      // 3. Flash green success state briefly before closing
      setSendState('success');
      setTimeout(() => {
        setSendState('idle');
      }, 800);

    } catch {
      // If sending failed, reset back to idle
      setSendState('idle');
    }
  };

  // Determine what the send button should look like
  const getSendButtonContent = () => {
    if (isSending) {
      return (
        <>
          <span className="spinner" />
          <span>Sending...</span>
        </>
      );
    }
    if (isSuccess) {
      return (
        <>
          <CheckCircle className="w-4 h-4" />
          <span>Sent!</span>
        </>
      );
    }
    return (
      <>
        <Send className="w-4 h-4" />
        <span>Send Email</span>
      </>
    );
  };

  const sendButtonClass = [
    'btn-compose-send',
    isSending  ? 'is-sending'   : '',
    isSuccess  ? 'send-success' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-large">

        {/* ---- Header ---- */}
        <div className="modal-header">
          <div className="modal-header-left">
            <Sparkles
              className="w-5 h-5"
              style={{ color: isTyping ? 'var(--accent-cyan)' : 'var(--accent-purple)' }}
            />
            <h2 className="modal-title">
              {isTyping
                ? 'AI Assistant is composing...'
                : initialData?.id
                  ? 'Reply to Email'
                  : 'New Message'
              }
            </h2>
          </div>

          {/* Only allow close if not actively typing or sending */}
          <button
            onClick={onClose}
            className="btn-modal-close"
            disabled={isSending}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---- Compose Form ---- */}
        <form onSubmit={handleSubmit} className="modal-form-content">

          {/* To: field */}
          <div className={`compose-row-border ${activeTypingField === 'to' ? 'ai-filling-field' : ''}`}>
            <span className="compose-label">To:</span>
            <input
              ref={toRef}
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              disabled={!!initialData || isTyping}
              className="compose-field-input"
            />
            {activeTypingField === 'to' && (
              <span className="unread-badge" style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                Autofilling...
              </span>
            )}
          </div>

          {/* Subject: field */}
          <div className={`compose-row-border ${activeTypingField === 'subject' ? 'ai-filling-field' : ''}`}>
            <span className="compose-label">Subject:</span>
            <input
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject line"
              disabled={isTyping}
              className="compose-field-input"
            />
            {activeTypingField === 'subject' && (
              <span className="unread-badge" style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                Autofilling...
              </span>
            )}
          </div>

          {/* Body: textarea */}
          <div
            className={`compose-textarea-wrapper ${activeTypingField === 'body' ? 'ai-filling-field' : ''}`}
            style={{ minHeight: '260px' }}
          >
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={12}
              disabled={isTyping}
              className="compose-body-textarea"
            />
            {activeTypingField === 'body' && (
              <div className="compose-indicator-badge">
                <Sparkles className="w-3 h-3" />
                <span>AI is typing body...</span>
              </div>
            )}
          </div>

          {/* ---- Bottom Action Bar ---- */}
          <div
            className="modal-actions-row"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
          >
            <span className="compose-footer-note">
              {isTyping
                ? 'Please wait for AI to finish autofilling...'
                : isSending
                  ? 'Sending your email...'
                  : 'Press Send to deliver your message.'
              }
            </span>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Cancel — disabled while sending */}
              <button
                type="button"
                onClick={onClose}
                disabled={isTyping || isSending}
                className="btn-panel-cancel"
              >
                Cancel
              </button>

              {/* Send — full animated button */}
              <button
                type="submit"
                disabled={isTyping || !isFormReady || isSending}
                className={sendButtonClass}
              >
                {getSendButtonContent()}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
