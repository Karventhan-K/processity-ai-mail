'use client';

import React, { useState } from 'react';
import { Settings, X, Shield, Mail, Key, Activity, CheckCircle } from 'lucide-react';

/**
 * ConfigPanel — connection settings modal.
 * Handles email credentials, SMTP/IMAP config, and AI key.
 * Submit button shows loading spinner → success flash.
 */
export default function ConfigPanel({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  isTesting,
  testResult,
}) {
  const [email,       setEmail]       = useState(currentConfig.email       || '');
  const [password,    setPassword]    = useState('');
  const [smtpHost,    setSmtpHost]    = useState(currentConfig.smtpHost    || '');
  const [smtpPort,    setSmtpPort]    = useState(currentConfig.smtpPort    || '465');
  const [imapHost,    setImapHost]    = useState(currentConfig.imapHost    || '');
  const [imapPort,    setImapPort]    = useState(currentConfig.imapPort    || '993');
  const [geminiApiKey, setGeminiApiKey] = useState(currentConfig.geminiApiKey || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      email,
      password,
      smtpHost:     smtpHost  || undefined,
      smtpPort:     smtpPort  ? parseInt(smtpPort, 10)  : undefined,
      imapHost:     imapHost  || undefined,
      imapPort:     imapPort  ? parseInt(imapPort, 10)  : undefined,
      geminiApiKey: geminiApiKey || undefined,
    });
  };

  const handleResetToMock = () => {
    onSave({
      email:        '',
      password:     '',
      smtpHost:     '',
      smtpPort:     465,
      imapHost:     '',
      imapPort:     993,
      geminiApiKey: geminiApiKey || undefined,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-medium">

        {/* ---- Header ---- */}
        <div className="modal-header">
          <div className="modal-header-left">
            <Settings
              className="w-5 h-5"
              style={{ color: 'var(--accent-purple)', animationDuration: '6s' }}
            />
            <h2 className="modal-title">Connection Settings</h2>
          </div>
          <button onClick={onClose} className="btn-modal-close" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---- Form ---- */}
        <form
          onSubmit={handleSubmit}
          className="modal-form-content"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >

          {/* Info callout */}
          <div className="info-alert-box">
            <Shield className="w-5 h-5 shrink-0" style={{ color: '#60a5fa', marginTop: '2px' }} />
            <p className="info-alert-text">
              To send/receive real emails, configure your mail provider settings.
              For Gmail, use an <strong>App Password</strong> instead of your main password.
              Leave fields empty to run in <strong>Mock Mode</strong>.
            </p>
          </div>

          {/* AI API Key */}
          <div className="form-label-block">
            <label className="form-label-text">
              <Key className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              <span>AI API Key</span>
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="API key (required for the AI assistant)"
              className="form-input"
            />
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-glass)' }} />

          {/* Email Credentials Section */}
          <div className="form-label-block">
            <h3 className="form-label-text" style={{ color: 'var(--accent-purple)' }}>
              <Mail className="w-4 h-4" />
              <span>Email Credentials</span>
            </h3>

            <div className="grid-2-col">
              <div className="form-label-block">
                <label className="sub-label-text">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="form-input"
                />
              </div>

              <div className="form-label-block">
                <label className="sub-label-text">App Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="abcd efgh ijkl mnop"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Advanced SMTP/IMAP toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-purple)',
                fontSize: '12px',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {showAdvanced
                ? 'Hide Advanced Server Settings'
                : 'Show Advanced Server Settings (SMTP / IMAP Hosts)'
              }
            </button>
          </div>

          {/* Advanced settings block */}
          {showAdvanced && (
            <div className="advanced-settings-block">
              <div className="grid-2-col">
                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com (auto-detected)"
                    className="form-input"
                  />
                </div>

                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                    className="form-input"
                  />
                </div>

                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>
                    IMAP Host
                  </label>
                  <input
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.gmail.com (auto-detected)"
                    className="form-input"
                  />
                </div>

                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>
                    IMAP Port
                  </label>
                  <input
                    type="text"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    placeholder="993"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Connection test result banner */}
          {testResult && (
            <div className={`status-test-result ${testResult.success ? 'success' : 'error'}`}>
              <Activity className="w-4 h-4 shrink-0" />
              <div>
                <strong>
                  {testResult.success ? 'Connected Successfully!' : 'Connection Failed:'}
                </strong>
                <p style={{ marginTop: '2px' }}>{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="modal-actions-row">
            {/* Reset to mock mode */}
            <button
              type="button"
              onClick={handleResetToMock}
              className="btn-modal-action-reset"
            >
              Reset to Mock Mode
            </button>

            {/* Save & Connect — shows spinner while testing */}
            <button
              type="submit"
              disabled={isTesting}
              className="btn-modal-action-submit"
            >
              {isTesting ? (
                <>
                  <span className="spinner" />
                  <span>Connecting...</span>
                </>
              ) : testResult?.success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Connected!</span>
                </>
              ) : (
                <span>Save &amp; Connect</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
