'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EmailList from '../components/EmailList';
import EmailDetail from '../components/EmailDetail';
import AssistantPanel from '../components/AssistantPanel';
import ComposeModal from '../components/ComposeModal';
import ConfigPanel from '../components/ConfigPanel';
import { CheckCircle, ShieldAlert } from 'lucide-react';

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.hostname}:8000/ws`;
  }
  return 'ws://localhost:8000/ws';
};

const BACKEND_URL = getBackendUrl();
const WS_URL = getWsUrl();

export default function App() {
  // Config & Connection States
  const [config, setConfig] = useState({ email: '', password: '', smtpHost: '', smtpPort: 465, imapHost: '', imapPort: 993, geminiApiKey: '' });
  const [connectionMode, setConnectionMode] = useState('mock'); // 'mock' or 'real'
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [configTestResult, setConfigTestResult] = useState(null);

  // Email client views and states
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('inbox'); // 'inbox' or 'sent'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unread', 'recent'
  
  // Compose modal states
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState(null);
  const [composeAutoFillData, setComposeAutoFillData] = useState(null);

  // Assistant states
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [isAssistantGenerating, setIsAssistantGenerating] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState(null);
  const [pendingSendAction, setPendingSendAction] = useState(null);

  // Notification Toast state
  const [toast, setToast] = useState(null);
  const [isSimulatingMail, setIsSimulatingMail] = useState(false);

  // Show dynamic custom toasts
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial config and email list on mount
  useEffect(() => {
    fetchConfig();
    fetchEmails();
    
    // WebSockets Setup
    let socket;
    const connectWS = () => {
      console.log('App: Connecting to WebSocket...');
      socket = new WebSocket(WS_URL);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'STATUS') {
          console.log('App: Connection status from server:', data.mode);
          setConnectionMode(data.mode);
        } else if (data.type === 'NEW_EMAIL') {
          console.log('App: Received new email via WebSocket push:', data.email.subject);
          setEmails((prev) => {
            // Check if email already exists in list to avoid duplicates
            if (prev.some(e => e.id === data.email.id)) return prev;
            return [data.email, ...prev];
          });
          showToast(`New email received: "${data.email.subject}"`, 'email');
        }
      };

      socket.onclose = () => {
        console.log('App: WebSocket disconnected. Retrying in 5s...');
        setTimeout(connectWS, 5000);
      };

      socket.onerror = (err) => {
        console.error('App: WebSocket error:', err);
      };
    };

    connectWS();
    return () => socket?.close();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/config`);
      const data = await res.json();
      setConfig(prev => ({
        ...prev,
        email: data.email || '',
        geminiApiKey: data.hasApiKey ? '********' : '' // Mask key if present
      }));
      setConnectionMode(data.mode);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/emails`);
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    }
  };

  // Save Settings Config
  const handleSaveConfig = async (newConfig) => {
    setIsTestingConfig(true);
    setConfigTestResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      
      setIsTestingConfig(false);
      if (data.success) {
        setConfigTestResult({ success: true, message: `Connected in ${data.mode.toUpperCase()} mode.` });
        setConnectionMode(data.mode);
        setConfig(prev => ({
          ...prev,
          email: newConfig.email || '',
          geminiApiKey: newConfig.geminiApiKey ? '********' : ''
        }));
        setTimeout(() => {
          setIsConfigOpen(false);
          setConfigTestResult(null);
        }, 1500);
        // Refresh email list
        fetchEmails();
      } else {
        setConfigTestResult({ success: false, message: data.error || 'Failed to authenticate connections.' });
      }
    } catch (err) {
      setIsTestingConfig(false);
      setConfigTestResult({ success: false, message: 'Server connection error.' });
    }
  };

  // Send email via UI
  const handleSendEmail = async (emailData) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Email sent successfully!', 'success');
        setIsComposeOpen(false);
        setComposeInitialData(null);
        setComposeAutoFillData(null);
        fetchEmails();
      } else {
        showToast(`Send failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Error communicating with mail server.', 'error');
    }
  };

  // Send reply
  const handleSendReply = async (emailId, body) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/emails/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, body })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reply sent successfully!', 'success');
        setIsComposeOpen(false);
        setComposeInitialData(null);
        setComposeAutoFillData(null);
        fetchEmails();
      } else {
        showToast(`Reply failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Error communicating with mail server.', 'error');
    }
  };

  // Toggle Mark Read/Unread flag
  const handleMarkReadToggle = async (emailId, unread) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/emails/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, unread })
      });
      const data = await res.json();
      if (data.success) {
        setEmails(prev => prev.map(e => e.id === emailId ? { ...e, unread } : e));
        if (selectedEmail && selectedEmail.id === emailId) {
          setSelectedEmail(prev => ({ ...prev, unread }));
        }
      }
    } catch (err) {
      console.error('Failed to toggle read state:', err);
    }
  };

  // Open single email
  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    if (email.unread) {
      handleMarkReadToggle(email.id, false);
    }
  };

  // Simulate Incoming Email
  const handleSimulateIncoming = async () => {
    setIsSimulatingMail(true);
    try {
      await fetch(`${BACKEND_URL}/api/emails/simulate-receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'sarah.j@company.com',
          subject: 'Project Spec Review Needed',
          body: 'Hello! I updated the specifications document on the drive. Please read it and let me know your thoughts.\n\nSarah'
        })
      });
    } catch (err) {
      console.error('Failed to trigger mock simulation:', err);
    } finally {
      setIsSimulatingMail(false);
    }
  };

  // --- AI ASSISTANT DRIVER (UI CONTROLLER) ---
  const handleSendAssistantMessage = async (messageText, isHumanInTheLoop) => {
    if (!messageText.trim()) return;

    const newUserMsg = { role: 'user', content: messageText };
    setAssistantMessages(prev => [...prev, newUserMsg]);
    setIsAssistantGenerating(true);

    try {
      const chatContext = {
        currentView: selectedEmail ? 'detail' : currentFolder,
        openEmail: selectedEmail
      };

      const res = await fetch(`${BACKEND_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: assistantMessages.map(m => ({ role: m.role, content: m.content })),
          context: chatContext
        })
      });
      const data = await res.json();

      setIsAssistantGenerating(false);

      if (data.success) {
        const assistantReply = { role: 'assistant', content: data.reply };
        
        if (data.actions && data.actions.length > 0) {
          executeAIActions(data.actions, isHumanInTheLoop);
          assistantReply.action = data.actions.map(a => `${a.name}(${JSON.stringify(a.args)})`).join(', ');
        }

        setAssistantMessages(prev => [...prev, assistantReply]);
      } else {
        setAssistantMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }

    } catch (err) {
      setIsAssistantGenerating(false);
      setAssistantMessages(prev => [...prev, { role: 'assistant', content: 'Connection to assistant service failed.' }]);
    }
  };

  const executeAIActions = async (actions, isHumanInTheLoop) => {
    for (const action of actions) {
      const { name, args } = action;
      console.log(`App: Executing AI action "${name}" with args:`, args);

      if (name === 'openComposeView') {
        setActiveToolCall(`Opening composer and autofilling draft...`);
        setIsComposeOpen(true);
        setComposeInitialData(null);
        setComposeAutoFillData({
          to: args.to || '',
          subject: args.subject || '',
          body: args.body || ''
        });
      }

      else if (name === 'replyToEmail') {
        if (!selectedEmail) {
          const inboxEmails = emails.filter(e => !e.sent);
          if (inboxEmails.length > 0) {
            setSelectedEmail(inboxEmails[0]);
            showToast(`Auto-opened latest email: "${inboxEmails[0].subject}"`, 'info');
          } else {
            setAssistantMessages(prev => [...prev, { role: 'assistant', content: "No email is open to reply to." }]);
            continue;
          }
        }

        setActiveToolCall(`Drafting reply composer...`);
        setIsComposeOpen(true);
        const replyTo = selectedEmail.fromAddress || selectedEmail.from;
        const replySubject = selectedEmail.subject.toLowerCase().startsWith('re:') 
          ? selectedEmail.subject 
          : `Re: ${selectedEmail.subject}`;

        setComposeInitialData({
          id: selectedEmail.id,
          to: replyTo,
          subject: replySubject
        });
        
        setComposeAutoFillData({
          to: replyTo,
          subject: replySubject,
          body: args.replyBody || ''
        });
      }

      else if (name === 'filterInbox') {
        setActiveToolCall(`Applying inbox filters...`);
        if (args.unreadOnly !== undefined) {
          setActiveFilter(args.unreadOnly ? 'unread' : 'all');
        }
        if (args.query !== undefined) {
          setSearchQuery(args.query);
        }
        showToast('Inbox filters updated by Copilot', 'info');
        setTimeout(() => setActiveToolCall(null), 1000);
      }

      else if (name === 'openEmail') {
        setActiveToolCall(`Searching and opening email...`);
        const keyword = args.keyword.toLowerCase();
        
        const match = emails.find(e => 
          e.subject.toLowerCase().includes(keyword) || 
          (e.fromName && e.fromName.toLowerCase().includes(keyword)) ||
          e.from.toLowerCase().includes(keyword)
        );

        if (match) {
          handleSelectEmail(match);
          showToast(`Opened email: "${match.subject}"`, 'success');
        } else {
          showToast(`No email matched "${keyword}"`, 'error');
        }
        setTimeout(() => setActiveToolCall(null), 1000);
      }

      else if (name === 'sendEmail') {
        if (isHumanInTheLoop) {
          setActiveToolCall('Intercepted send action. Awaiting approval.');
          if (composeAutoFillData) {
            setPendingSendAction({
              to: composeAutoFillData.to,
              subject: composeAutoFillData.subject,
              body: composeAutoFillData.body,
              isReply: !!composeInitialData?.id,
              replyEmailId: composeInitialData?.id
            });
            setIsComposeOpen(false);
          } else {
            showToast('No active compose draft to send.', 'error');
          }
          setTimeout(() => setActiveToolCall(null), 1000);
        } else {
          setActiveToolCall('Sending email draft...');
          if (composeAutoFillData) {
            if (composeInitialData?.id) {
              await handleSendReply(composeInitialData.id, composeAutoFillData.body);
            } else {
              await handleSendEmail({
                to: composeAutoFillData.to,
                subject: composeAutoFillData.subject,
                body: composeAutoFillData.body
              });
            }
          }
          setTimeout(() => setActiveToolCall(null), 1000);
        }
      }
    }
  };

  const handleApproveSend = async () => {
    if (!pendingSendAction) return;
    
    setActiveToolCall('Approved! Sending now...');
    const { to, subject, body, isReply, replyEmailId } = pendingSendAction;
    
    if (isReply && replyEmailId) {
      await handleSendReply(replyEmailId, body);
    } else {
      await handleSendEmail({ to, subject, body });
    }
    
    setPendingSendAction(null);
    setComposeAutoFillData(null);
    setComposeInitialData(null);
    setActiveToolCall(null);
    
    setAssistantMessages(prev => [...prev, { role: 'assistant', content: 'Email sent successfully upon your confirmation!' }]);
  };

  const handleCancelSend = () => {
    setPendingSendAction(null);
    setAssistantMessages(prev => [...prev, { role: 'assistant', content: 'Email send cancelled. Draft discarded.' }]);
  };

  // Filter processing for rendering
  const filteredEmails = emails.filter((email) => {
    if (currentFolder === 'inbox' && email.sent) return false;
    if (currentFolder === 'sent' && !email.sent) return false;

    if (activeFilter === 'unread' && !email.unread) return false;
    if (activeFilter === 'recent') {
      const emailDate = new Date(email.date);
      const limit = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      if (emailDate < limit) return false;
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchSubject = email.subject.toLowerCase().includes(query);
      const matchBody = email.body.toLowerCase().includes(query);
      const matchSender = email.from.toLowerCase().includes(query) || (email.fromName && email.fromName.toLowerCase().includes(query));
      return matchSubject || matchBody || matchSender;
    }

    return true;
  });

  const unreadCount = emails.filter(e => e.unread && !e.sent).length;

  return (
    <div className="app-container">
      
      {/* Dynamic Overlay Toasts */}
      {toast && (
        <div className={`toast-float toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {toast.type === 'error' && <ShieldAlert className="w-4 h-4" />}
          <p>{toast.message}</p>
        </div>
      )}

      {/* Main Mail App Window */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar */}
        <Sidebar 
          currentFolder={currentFolder} 
          setCurrentFolder={(f) => {
            setCurrentFolder(f);
            setSelectedEmail(null);
          }}
          unreadCount={unreadCount}
          connectionMode={connectionMode}
          onOpenConfig={() => setIsConfigOpen(true)}
          onOpenCompose={() => {
            setComposeInitialData(null);
            setComposeAutoFillData(null);
            setIsComposeOpen(true);
          }}
          onSimulateIncoming={handleSimulateIncoming}
          isSimulating={isSimulatingMail}
        />

        {/* Email Cards List */}
        <EmailList 
          emails={filteredEmails}
          selectedEmailId={selectedEmail?.id}
          onSelectEmail={handleSelectEmail}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onMarkReadToggle={handleMarkReadToggle}
        />

        {/* Email Details View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <EmailDetail 
            email={selectedEmail}
            allEmails={emails}
            onReplyClick={(originalMsg) => {
              setComposeInitialData({
                id: originalMsg.id,
                to: originalMsg.fromAddress || originalMsg.from,
                subject: originalMsg.subject.toLowerCase().startsWith('re:') ? originalMsg.subject : `Re: ${originalMsg.subject}`
              });
              setComposeAutoFillData(null);
              setIsComposeOpen(true);
            }}
          />
        </div>

      </div>

      {/* AI Assistant Sidebar */}
      <AssistantPanel 
        messages={assistantMessages}
        onSendMessage={handleSendAssistantMessage}
        isGenerating={isAssistantGenerating}
        activeToolCall={activeToolCall}
        confirmAction={handleApproveSend}
        cancelAction={handleCancelSend}
        pendingSendAction={pendingSendAction}
      />

      {/* Dynamic Popups */}
      <ComposeModal 
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setComposeInitialData(null);
          setComposeAutoFillData(null);
        }}
        onSend={(draftData) => {
          if (composeInitialData?.id) {
            handleSendReply(composeInitialData.id, draftData.body);
          } else {
            handleSendEmail(draftData);
          }
        }}
        initialData={composeInitialData}
        autoFillData={composeAutoFillData}
        onAutoFillComplete={() => {
          setActiveToolCall(null);
          showToast('Draft autofill completed', 'success');
        }}
      />

      <ConfigPanel 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentConfig={config}
        onSave={handleSaveConfig}
        isTesting={isTestingConfig}
        testResult={configTestResult}
      />

    </div>
  );
}
