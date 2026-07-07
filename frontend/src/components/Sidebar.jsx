'use client';
import React from 'react';
import { Mail, Send, PenTool, Settings, Sparkles, RefreshCw, Layers } from 'lucide-react';

export default function Sidebar({ 
  currentFolder, 
  setCurrentFolder, 
  unreadCount, 
  connectionMode, 
  onOpenConfig, 
  onOpenCompose, 
  onSimulateIncoming,
  isSimulating
}) {
  return (
    <div className="app-sidebar">
      
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-wrapper">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="brand-title">Processity AI</h1>
          <span className="brand-subtitle">Mail Client</span>
        </div>
      </div>

      {/* Compose Button */}
      <div className="sidebar-action">
        <button
          onClick={() => onOpenCompose()}
          className="btn-compose"
        >
          <PenTool className="w-4 h-4" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Folders */}
      <nav className="sidebar-nav">
        <button
          onClick={() => setCurrentFolder('inbox')}
          className={`nav-item ${currentFolder === 'inbox' ? 'active' : ''}`}
        >
          <div className="nav-item-inner">
            <Mail className="w-4.5 h-4.5" />
            <span>Inbox</span>
          </div>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentFolder('sent')}
          className={`nav-item ${currentFolder === 'sent' ? 'active' : ''}`}
        >
          <div className="nav-item-inner">
            <Send className="w-4.5 h-4.5" />
            <span>Sent</span>
          </div>
        </button>
      </nav>

      {/* Footer Settings & Simulation Controls */}
      <div className="sidebar-footer">
        
        {/* Simulation trigger */}
        <button
          onClick={onSimulateIncoming}
          disabled={isSimulating}
          className="btn-simulate"
        >
          {isSimulating ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Layers className="w-3.5 h-3.5" />
          )}
          <span>Simulate Incoming Email</span>
        </button>

        {/* Connection status card */}
        <div className="connection-card">
          <div className="status-row">
            <span className="status-label">Status</span>
            <div className="status-value">
              <span className={`status-pulse ${connectionMode === 'real' ? 'status-online' : 'status-mock'}`} />
              <span style={{ textTransform: 'capitalize' }}>
                {connectionMode === 'real' ? 'Real Mail' : 'Mock Mode'}
              </span>
            </div>
          </div>
          
          <button
            onClick={onOpenConfig}
            className="btn-settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Connection Settings</span>
          </button>
        </div>
      </div>

    </div>
  );
}
