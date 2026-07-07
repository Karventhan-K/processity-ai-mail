'use client';
import React, { useState } from 'react';
import { MailOpen, Clock, Reply, ChevronDown, ChevronRight } from 'lucide-react';

export default function EmailDetail({ email, allEmails, onReplyClick }) {
  const [collapsedMessages, setCollapsedMessages] = useState({});

  if (!email) {
    return (
      <div className="detail-empty animate-fade-in">
        <MailOpen className="w-12 h-12 text-gray-700 mb-3" />
        <h3 className="text-lg font-medium text-gray-400">Select an email to read</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1">
          Click on any email in the list, or tell the AI assistant to open a specific email for you.
        </p>
      </div>
    );
  }

  // Group emails by threadId
  const threadEmails = allEmails
    .filter(e => e.threadId && e.threadId === email.threadId)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

  const toggleCollapse = (id) => {
    setCollapsedMessages(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getInitials = (fromText) => {
    if (!fromText) return 'U';
    const clean = fromText.split('<')[0].trim().replace(/['"]/g, '');
    if (!clean) return 'U';
    const parts = clean.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  return (
    <div className="email-detail">
      
      {/* Subject Line Header */}
      <div className="detail-header">
        <div>
          <h2 className="detail-subject">{email.subject}</h2>
          <div className="thread-tag-row">
            <span className="thread-badge">
              Thread: {email.threadId ? email.threadId.slice(0, 15) + '...' : 'Individual'}
            </span>
            {threadEmails.length > 1 && (
              <span className="thread-count">• {threadEmails.length} messages in conversation</span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => onReplyClick(email)}
          className="btn-reply-header"
        >
          <Reply className="w-4 h-4" />
          <span>Reply</span>
        </button>
      </div>

      {/* Conversation Thread / Messages Stack */}
      <div className="thread-scroll-container">
        {threadEmails.map((msg, index) => {
          const isCurrentMsg = msg.id === email.id;
          const isLastMsg = index === threadEmails.length - 1;
          const isCollapsed = collapsedMessages[msg.id] ?? (!isCurrentMsg && !isLastMsg);

          return (
            <div 
              key={msg.id}
              className={`thread-message-node ${isCurrentMsg ? 'active-msg' : ''}`}
            >
              {/* Message Header (clickable to collapse/expand) */}
              <div 
                onClick={() => toggleCollapse(msg.id)}
                className="message-node-header"
              >
                <div className="sender-avatar-block">
                  <div className="avatar-circle">
                    {getInitials(msg.from)}
                  </div>
                  <div className="sender-names">
                    <div>
                      <span className="sender-name-text">
                        {msg.fromName || msg.from}
                      </span>
                      <span className="sender-email-text">
                        &lt;{msg.fromAddress || msg.from}&gt;
                      </span>
                    </div>
                    <p className="recipient-line">
                      To: {msg.to}
                    </p>
                  </div>
                </div>
                
                <div className="header-right-meta">
                  <div className="meta-time">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(msg.date).toLocaleString()}</span>
                  </div>
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Message Body (only shown if not collapsed) */}
              {!isCollapsed && (
                <div className="message-node-body">
                  {msg.html ? (
                    <div 
                      className="email-html-content"
                      dangerouslySetInnerHTML={{ __html: msg.html }}
                    />
                  ) : (
                    <div className="email-raw-text">
                      {msg.body}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
