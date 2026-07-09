'use client';

import React from 'react';
import { Mail, Send, PenTool, Settings, Sparkles, RefreshCw, Layers, X, Sun, Moon, FileText } from 'lucide-react';

/**
 * Sidebar — main navigation rail.
 *
 * Desktop: Fixed left column (260px).
 * Mobile:  Hidden by default. Slides in LEFT → RIGHT as a drawer
 *          when `isMobileOpen` is true.
 *
 * Theme:   Renders a Sun/Moon toggle button in the footer.
 *          `theme` prop drives the icon; `onToggleTheme` fires the switch.
 */
export default function Sidebar({
  currentFolder,
  setCurrentFolder,
  unreadCount,
  connectionMode,
  onOpenConfig,
  onOpenCompose,
  onSimulateIncoming,
  isSimulating,
  // Mobile drawer props
  isMobileOpen  = false,
  onMobileClose = () => {},
  // Theme props
  theme           = 'dark',
  onToggleTheme   = () => {},
  // Drafts props
  draftsCount     = 0,
}) {
  const isLight = theme === 'light';

  return (
    <div className={`app-sidebar ${isMobileOpen ? 'drawer-open' : ''}`}>

      {/* ---- Mobile Close Button (×) — only visible inside drawer ---- */}
      <button
        className="drawer-close-btn"
        onClick={onMobileClose}
        title="Close menu"
      >
        <X className="w-4 h-4" />
      </button>

      {/* ---- Brand Header ---- */}
      <div className="sidebar-header">
        <div className="brand-icon-wrapper">
          <Sparkles className="w-5 h-5" style={{ color: 'white' }} />
        </div>
        <div>
          <h1 className="brand-title">Processity AI</h1>
          <span className="brand-subtitle">Mail Client</span>
        </div>
      </div>

      {/* ---- Compose Button ---- */}
      <div className="sidebar-action">
        <button
          onClick={onOpenCompose}
          className="btn-compose"
        >
          <PenTool className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* ---- Folder Navigation ---- */}
      <nav className="sidebar-nav">

        {/* Inbox */}
        <button
          onClick={() => setCurrentFolder('inbox')}
          className={`nav-item ${currentFolder === 'inbox' ? 'active' : ''}`}
        >
          <div className="nav-item-inner">
            <Mail className="w-4 h-4" />
            <span>Inbox</span>
          </div>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </button>

        {/* Sent */}
        <button
          onClick={() => setCurrentFolder('sent')}
          className={`nav-item ${currentFolder === 'sent' ? 'active' : ''}`}
        >
          <div className="nav-item-inner">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </div>
        </button>

        {/* Drafts */}
        <button
          onClick={() => setCurrentFolder('drafts')}
          className={`nav-item ${currentFolder === 'drafts' ? 'active' : ''}`}
        >
          <div className="nav-item-inner">
            <FileText className="w-4 h-4" />
            <span>Drafts</span>
          </div>
          {draftsCount > 0 && (
            <span className="unread-badge" style={{ background: 'var(--accent-cyan)' }}>
              {draftsCount}
            </span>
          )}
        </button>

      </nav>

      {/* ---- Footer: Theme + Simulation + Settings ---- */}
      <div className="sidebar-footer">

        {/* Dark / Light mode toggle */}
        <button
          onClick={onToggleTheme}
          className="btn-theme-toggle"
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight
            ? <Moon className="w-3\.5 h-3\.5 icon-moon" />
            : <Sun  className="w-3\.5 h-3\.5 icon-sun"  />
          }
          <span>
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* Simulate incoming email button */}
        <button
          onClick={onSimulateIncoming}
          disabled={isSimulating}
          className="btn-simulate"
          title="Trigger a simulated incoming email"
        >
          {isSimulating ? (
            <RefreshCw className="w-3\.5 h-3\.5 animate-spin" />
          ) : (
            <Layers className="w-3\.5 h-3\.5" />
          )}
          <span>Simulate Incoming Email</span>
        </button>

        {/* Connection status card */}
        <div className="connection-card">
          <div className="status-row">
            <span className="status-label">Status</span>
            <div className="status-value">
              <span
                className={`status-pulse ${connectionMode === 'real' ? 'status-online' : 'status-mock'}`}
              />
              <span style={{ textTransform: 'capitalize' }}>
                {connectionMode === 'real' ? 'Real Mail' : 'Mock Mode'}
              </span>
            </div>
          </div>

          {/* Settings button */}
          <button
            onClick={onOpenConfig}
            className="btn-settings"
          >
            <Settings className="w-3\.5 h-3\.5" />
            <span>Connection Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
}
