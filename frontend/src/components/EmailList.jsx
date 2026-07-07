'use client';
import React from 'react';
import { Search, Calendar, Inbox, Eye, EyeOff } from 'lucide-react';

export default function EmailList({ 
  emails, 
  selectedEmailId, 
  onSelectEmail, 
  searchQuery, 
  setSearchQuery, 
  activeFilter, 
  setActiveFilter,
  onMarkReadToggle
}) {
  
  // Format Date
  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="email-list">
      
      {/* Search Header */}
      <div className="search-header">
        <div className="search-input-wrapper">
          <Search className="search-icon w-4 h-4" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject, sender, body..."
            className="search-input"
          />
        </div>

        {/* Filter Pills */}
        <div className="filter-pills">
          <button
            onClick={() => setActiveFilter('all')}
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`filter-pill ${activeFilter === 'unread' ? 'active active-unread' : ''}`}
          >
            Unread
          </button>
          <button
            onClick={() => setActiveFilter('recent')}
            className={`filter-pill ${activeFilter === 'recent' ? 'active active-recent' : ''}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Last 10 Days</span>
          </button>
        </div>
      </div>

      {/* Email Cards Container */}
      <div className="cards-container">
        {emails.length === 0 ? (
          <div className="no-emails-card animate-fade-in">
            <Inbox className="w-8 h-8" />
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>No emails found</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Try clearing filters or search terms</p>
            </div>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`email-card ${isSelected ? 'selected' : ''} ${email.unread ? 'unread' : ''}`}
              >
                
                {/* Header: Sender & Date */}
                <div className="email-card-header">
                  <span className="card-sender">
                    {email.fromName || email.from}
                  </span>
                  <span className="card-date">
                    {formatDate(email.date)}
                  </span>
                </div>

                {/* Subject */}
                <h4 className="card-subject">
                  {email.subject}
                </h4>

                {/* Snippet */}
                <p className="card-snippet">
                  {email.body}
                </p>

                {/* Unread dot / Mark read toggle */}
                <div className="card-actions-overlay">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkReadToggle(email.id, !email.unread);
                    }}
                    title={email.unread ? "Mark as Read" : "Mark as Unread"}
                    className="btn-card-action"
                  >
                    {email.unread ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {email.unread && (
                  <span className="card-unread-indicator" />
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
