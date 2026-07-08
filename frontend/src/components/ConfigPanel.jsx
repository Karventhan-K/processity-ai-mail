'use client';
import React, { useState } from 'react';
import { Settings, X, Shield, Mail, Key, Activity, RefreshCw } from 'lucide-react';

export default function ConfigPanel({ isOpen, onClose, currentConfig, onSave, isTesting, testResult }) {
  const [email, setEmail] = useState(currentConfig.email || '');
  const [password, setPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState(currentConfig.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(currentConfig.smtpPort || '465');
  const [imapHost, setImapHost] = useState(currentConfig.imapHost || '');
  const [imapPort, setImapPort] = useState(currentConfig.imapPort || '993');
  const [geminiApiKey, setGeminiApiKey] = useState(currentConfig.geminiApiKey || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      email,
      password,
      smtpHost: smtpHost || undefined,
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
      imapHost: imapHost || undefined,
      imapPort: imapPort ? parseInt(imapPort, 10) : undefined,
      geminiApiKey: geminiApiKey || undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-medium">
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <Settings className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
            <h2 className="modal-title">Connection Settings</h2>
          </div>
          <button onClick={onClose} className="btn-modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="modal-form-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          
          {/* Info Card */}
          <div className="info-alert-box">
            <Shield className="w-5 h-5 text-blue-400 shrink-0" style={{ marginTop: '2px' }} />
            <p className="info-alert-text">
              To send/receive real emails, configure your mail provider settings. For Gmail, use an <strong>App Password</strong> rather than your primary password. Leave fields empty to run in <strong>Mock Mode</strong>.
            </p>
          </div>

          {/* AI Credentials */}
          <div className="form-label-block">
            <label className="form-label-text">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>OpenAI API Key</span>
            </label>
            <input 
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AI API Key (Required for intelligent assistant)"
              className="form-input"
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)' }}></div>

          {/* Mail Credentials */}
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

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="sub-label-text"
              style={{ color: 'var(--accent-purple)', background: 'none', border: 'none', textDecoration: 'underline' }}
            >
              {showAdvanced ? "Hide Advanced Server Settings" : "Show Advanced Server Settings (SMTP/IMAP Hosts)"}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-settings-block">
              <div className="grid-2-col">
                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>SMTP Host</label>
                  <input 
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com (Auto-detected if blank)"
                    className="form-input"
                  />
                </div>
                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>SMTP Port</label>
                  <input 
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                    className="form-input"
                  />
                </div>
                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>IMAP Host</label>
                  <input 
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.gmail.com (Auto-detected if blank)"
                    className="form-input"
                  />
                </div>
                <div className="form-label-block">
                  <label className="sub-label-text" style={{ color: 'var(--text-muted)' }}>IMAP Port</label>
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

          {/* Test results */}
          {testResult && (
            <div className={`status-test-result ${testResult.success ? 'success' : 'error'}`}>
              <Activity className="w-4 h-4 shrink-0" />
              <div>
                <strong>{testResult.success ? 'Connected Successfully!' : 'Connection Failed:'}</strong>
                <p style={{ marginTop: '2px' }}>{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="modal-actions-row">
            <button
              type="button"
              onClick={() => {
                onSave({
                  email: '',
                  password: '',
                  smtpHost: '',
                  smtpPort: 465,
                  imapHost: '',
                  imapPort: 993,
                  geminiApiKey: geminiApiKey || undefined
                });
              }}
              className="btn-modal-action-reset"
            >
              Reset to Mock Mode
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="btn-modal-action-submit"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Save & Connect</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
