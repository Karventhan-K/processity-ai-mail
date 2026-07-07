# Processity AI Mail - AI-Powered Mail Web Application

Processity AI Mail is a premium, full-stack email client built with **React (Vite)** on the frontend and **Node.js (Express)** on the backend. The core of this application is an integrated **AI Assistant** that programmatically drives the email client's user interface using natural language (e.g. typing out drafts, navigating views, and applying search filters). 

The app features a **vibrant, glassmorphic dark-mode UI** with responsive styling and real-time updates powered by WebSockets.

---

## Key Features

1. **Dual-Mode Backend Architecture (Pragmatic Engineering)**:
   - **Mock Mode (Default)**: Runs instantly out of the box with zero setup. Generates simulated incoming emails, logs mock sent receipts, and processes AI commands using a built-in local offline regex engine.
   - **Real Mail Mode**: Instantly activates when credentials and API keys are provided. Logs in directly to your real email account (via **SMTP** for sending, and **IMAP** for reading and syncing in real-time).
2. **AI UI-Controller (Gemini 1.5 Flash)**:
   - Uses structural tool calling (function declarations) to allow the LLM to control frontend state.
   - Assistant executes commands like: *“Compose to test@gmail.com”*, *“Show only unread emails”*, *“Open the email from David”*, or *“Reply saying I will review this specification”*.
3. **Visibly Autofilled Fields**:
   - When the AI assistant composes or replies, the composer window opens, and the fields are typed out character-by-character using a **simulated typing animation** with active cyan-glowing borders.
4. **Human-in-the-Loop Safeguards (Bonus)**:
   - Features a toggle to "Confirm Send". When active, the assistant drafts the message and asks for user confirmation via an approval card inside the chat sidebar before actually sending.
5. **Real-time Mail Sync**:
   - Listens to incoming mail in real-time using IMAP IDLE (Real Mode) or a simulated timer (Mock Mode) and pushes updates to the client via **WebSockets** without requiring page refreshes.
6. **Threaded Conversation View (Bonus)**:
   - Group emails under the same conversation using `threadId` headers.
7. **Voice Commands (Bonus)**:
   - Features web speech recognition (microphone button) in the chat panel to dictate commands.

---

## Technology Stack

- **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS (Custom Glassmorphic System)
- **Backend**: Node.js (Express), WebSockets (`ws`), Nodemailer (SMTP), `imap-simple` (IMAP Client), Google Generative AI Node SDK (`@google/generative-ai`)

---

## Setup & Local Run Instructions

### Prerequisites
- **Node.js** (v18 or higher recommended. Developed & tested on v22.19.0)
- **npm** (v10 or higher. Developed & tested on v11.6.0)

### 1. Installation
In the root directory of the project, run:
```bash
npm run install:all
```
This script automatically installs the root dependencies and then runs local installations in both `backend` and `frontend` folders.

### 2. Configure Environment Variables (Optional)
To test the real-world SMTP/IMAP integration and LLM capabilities, copy the example environment file inside the `backend` folder:
```bash
cp backend/.env.example backend/.env
```
Fill out the variables:
- `GEMINI_API_KEY`: Your Gemini API key.
- `EMAIL_USER`: Your email address (e.g. `your-address@gmail.com`).
- `EMAIL_PASSWORD`: An **App Password** generated from your email account settings.

*Note: You can also update these credentials dynamically inside the UI using the **Connection Settings** modal.*

### 3. Run the Application
Start both the backend and frontend servers in development mode:
```bash
npm run dev
```
- **Frontend** will be running at `http://localhost:5173/` (or next available port).
- **Backend** will be running at `http://localhost:3001/` (WebSockets bound here).

---

## Architecture Decisions & Trade-Offs

### Custom AI Agent UI-Controller Pattern
- **Decision**: We implemented a custom state-driven tool-calling connection between our Express backend and React state instead of third-party frameworks like CopilotKit.
- **Trade-off/Rationale**: Building a custom solution reduced the dependency size by ~100MB and eliminated potential runtime version conflicts with React 19. It gives us absolute, transparent control over form animations, filters, and intercepting the "Human-in-the-Loop" confirmations.

### Dynamic Settings & Dual-Mode Fallback
- **Decision**: Implemented a Mock mode that falls back to regular expression rules when no LLM key or email credentials are present.
- **Rationale**: Provides an instantly interactive developer experience. A "Simulate Incoming Email" button is provided to demonstrate WebSocket push updates.

---

## What I'd Improve With More Time

1. **SQLite Database Sync**: Store emails locally in a sqlite database on the backend instead of keeping it in memory. This would allow caching, offline search, and instant loads.
2. **Drafts Auto-save**: Save draft states to the server in real-time as the user or AI writes, allowing resumption on other sessions.
3. **Advanced Thread Nesting**: Render threads in a clean tree hierarchy showing branch points in long conversation threads.
4. **OAuth 2.0 Integration**: Build a full Google OAuth consent loop for Gmail rather than using App Passwords.
