'use client';

import React from 'react';
import { Mail, Send, PenTool, Settings, Sparkles, RefreshCw, Layers } from 'lucide-react';

/**
 * Sidebar — main navigation rail.
 * Contains: brand logo, compose button, folder nav, and footer controls.
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
}) {
  return (
    <div className="app-sidebar">

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

      </nav>

      {/* ---- Footer: Simulation + Settings ---- */}
      <div className="sidebar-footer">

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
