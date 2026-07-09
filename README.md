# Processity AI Mail - AI-Powered Email Client

Processity AI Mail is a premium, full-stack email client built around an **AI Agent UI-Controller**. Instead of acting as a simple text-based chatbot, the AI Agent programmatically drives the user interface—automatically typing out drafts letter-by-letter, applying search filters, switching folders, and opening emails in real-time.

Built with **Next.js 15 (App Router)** on the frontend, **Python FastAPI** on the backend, and powered by **OpenAI GPT-4o-mini** native tool-calling.

---

## ✦ Live Evaluation Guide (Fast Review)

To help the reviewers (**@giri-mt**, **@adarsh-processity**, and **@RUiNtheExtinct**) quickly test the core capabilities:

1.  **AI Compose & Send:**
    *   *Prompt:* `"Compose a leave application to manager@company.com asking for annual leave from July 10th to July 15th"`
    *   *Visual Effect:* The Compose Modal will slide open, and you will see the AI agent type the values into the fields dynamically.
2.  **Search & Display:**
    *   *Prompt:* `"Show me emails about leave"` or `"Show emails from Ben"`
    *   *Visual Effect:* The email list immediately filters.
3.  **Navigate & Open:**
    *   *Prompt:* `"Open the email about Leave Request"`
    *   *Visual Effect:* The client automatically selects and displays that message in the detail pane.
4.  **Human-in-the-Loop Interception:**
    *   Toggle **"Confirm Send"** in the AI header, then say: `"Send an email to john@example.com with subject 'Meeting' and body 'Hey'"`
    *   *Visual Effect:* Instead of sending it immediately, the AI panel intercepts the command and renders a confirmation preview widget with **Approve & Send** and **Cancel** buttons.

---

## 🚀 Key Features Implemented

1.  **AI UI-Controller (Function Calling):**
    *   Utilizes OpenAI's official Tools API to parse natural language instructions and map them to reactive state operations on the frontend.
2.  **Visual Accelerated Typing Animation:**
    *   Auto-fills email forms using a Snappy character-by-character typing layout, styled with glowing cyan focus rings to indicate AI focus.
3.  **Dual-Mode Backend Architecture:**
    *   **Mock Mode:** Instantly runs without API keys or credentials, falling back to a local regex parser.
    *   **Real Mode:** Connects to real mail servers via **IMAP over SSL** for sync/reads and **SMTP** for delivery.
4.  **Local Drafts System:**
    *   A dedicated **Drafts** folder in the sidebar nav with live count badges.
    *   Allows manual saving via **"Save Draft"** button in Compose modal.
    *   Drafts are persisted to `localStorage` and can be clicked to re-open and continue writing.
5.  **WebSocket Push Synchronization:**
    *   Real-time notifications of incoming mail pushed from the FastAPI backend using standard WebSocket connections.
6.  **Polished Dark & Light Theme System:**
    *   Smooth CSS variable transitions.
    *   Features a sun/moon switch in the sidebar and mobile topbar.
    *   Theme preference is saved to `localStorage` so it survives page reloads.
7.  **Responsive Mobile Drawer Layout:**
    *   On screens $\le$ 768px, the layout adapts:
        *   Left menu button (☰) slides in the Sidebar drawer (left $\to$ right).
        *   Right Sparkles button slides in the AI Agent drawer (right $\to$ left).
        *   Tapping the blurred backdrop closes the active drawer automatically.

---

## 🛠️ Setup & Running Locally

### 1. Backend Setup (FastAPI)
Navigate to the `backend` directory:
1.  Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On Unix/macOS:
    source venv/bin/activate
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure your environment in `.env`:
    ```env
    OPENAI_API_KEY=your-openai-key
    DATABASE_URL=sqlite:///./processity.db
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASSWORD=your-app-password
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=465
    IMAP_HOST=imap.gmail.com
    IMAP_PORT=993
    ```
4.  Start backend server:
    ```bash
    uvicorn backend.main:app --reload --port 8000
    ```

### 2. Frontend Setup (Next.js)
Navigate to the `frontend` directory:
1.  Install packages:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

---

## 📐 Architecture & Engineering Trade-Offs

### 1. Lightweight State Bridge over Complex Agent Frameworks
*   **Decision:** Instead of embedding bulky third-party agent UI libraries, we built a native state bridge via WebSocket events and reactive hooks in Next.js.
*   **Trade-off:** Requires writing custom schema mappings, but yields absolute control over animations, form focus simulation, and layout rendering speed.

### 2. Client-Side Optimistic Closing & Background Dispatch
*   **Decision:** The Compose Modal immediately triggers a success visual indicator and closes after ~900ms, while the actual mail API call is fired-and-forgotten in the background.
*   **Trade-off:** If the mail server has a major delay, the UI remains perfectly responsive and snappy. Errors are gracefully reported back via system toasts.

### 3. Local Storage Thread Cache & Sync
*   **Decision:** Chat histories and drafts are cached locally in `localStorage`.
*   **Trade-off:** Removes the database load for ephemeral session state, while keeping load times instant.

---

## 🔮 Next Development Steps (What I'd Improve Next)

1.  **Google OAuth 2.0 Flow:** Upgrade connection credentials from SMTP/IMAP App Passwords to an OAuth 2.0 single-sign-on consent screen.
2.  **Server-Side Draft Syncing:** Sync local drafts with the server (SQLite/Postgres) so drafts are accessible across multiple devices.
3.  **Sub-thread Nesting:** Render conversation threads in a visual tree view for easier tracking of long replies.
