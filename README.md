# Processity AI Mail - AI-Powered Email Client

Processity AI Mail is a premium, full-stack email client designed around an **AI Agent UI-Controller**. Users can control the email interface using natural language (e.g. dictating drafts, searching, filtering, and opening emails), which the AI Agent executes in real-time.

Built with **Next.js 15** on the frontend, **Python FastAPI** on the backend, and powered by **OpenAI GPT-4o-mini**.

---

## Key Features

1. **AI UI-Controller (OpenAI GPT-4o-mini)**:
   - Uses OpenAI's official Tools (Function Calling) API to map natural language prompts to frontend state changes.
   - Executes UI actions like composing, replying, filtering inbox emails, and opening mail details.
2. **Accelerated Typing Simulation**:
   - When the AI Agent drafts an email, fields are filled out character-by-character using an **accelerated visual typing animation** featuring active cyan-glowing focus borders.
3. **Persistent Chat Sessions**:
   - Saves conversations to the browser's `localStorage` so active chat histories survive page refreshes.
   - Includes a **Trash** icon in the sidebar header to clear history and start fresh.
4. **Dual-Mode Backend Architecture**:
   - **Mock Mode**: Runs instantly out of the box with zero configuration using a local offline rule parser.
   - **Real Mode**: Connects directly to real email servers (via **IMAP** over SSL for reading/syncing and **SMTP** for sending).
5. **Human-in-the-Loop Safeguards**:
   - Features a "Confirm Send" toggle that intercepts outbound emails, forcing the assistant to present an approval card in the chat panel before sending.
6. **Real-time Synchronization**:
   - Syncs incoming mail in real-time via **WebSockets** push updates, instantly notifying the UI.
7. **Threaded Conversation Routing**:
   - Automatically groups replies and original messages into clean discussion threads using standard mail headers.

---

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, Lucide Icons, CSS Variables (Custom Dark Theme)
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy (ORM), Uvicorn
- **Database**: PostgreSQL (Production) / SQLite (Local Fallback)
- **AI Integration**: OpenAI Python SDK (`gpt-4o-mini` with native Tool Calling)

---

## Setup & Local Run Instructions

### 1. Backend Setup
Navigate to the `backend` directory:
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file inside the `backend` directory:
   ```env
   OPENAI_API_KEY=your-openai-key
   DATABASE_URL=sqlite:///./processity.db  # SQLite local database
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

### 2. Frontend Setup
Navigate to the `frontend` directory:
1. Install node dependencies:
   ```bash
   npm install
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

---

## Engineering Decisions & Trade-Offs

### Custom WebSocket State Bridge
- **Decision**: Rather than using heavy pre-built agent UI frameworks, we engineered a custom lightweight WebSocket bridge between the FastAPI backend and Next.js page state.
- **Rationale**: This gives us fine-grained control over typing animations, local state fallbacks, and the Human-in-the-Loop approval interception panel without overhead.

### Resilient Local Fallback
- **Decision**: The backend detects if API keys or server credentials are missing and falls back to a regex-based local parser.
- **Rationale**: Ensures the project remains fully browsable and interactive immediately after cloning, even before setting up environment keys.

---

## Next Development Steps

1. **Google OAuth 2.0 Flow**: Migrate from SMTP/IMAP App Passwords to an OAuth 2.0 consent loop for Gmail/Outlook accounts.
2. **Draft Autosave**: Periodically save composer states to the local database to prevent losing drafts if the tab is closed.
3. **Advanced Thread Nesting**: Render threaded conversations in a tree visualizer displaying multi-reply branching.
