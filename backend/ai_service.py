import re
import os
import google.generativeai as genai

# Define tool schemas using Python function definitions with docstrings.
# The google-generativeai SDK automatically converts these into Gemini tool specifications.

def openComposeView(to: str, subject: str = "", body: str = ""):
    """
    Opens the compose mail modal and fills in the fields. Visibly fills the fields.
    
    Args:
        to: Recipient email address (e.g. john@example.com)
        subject: The subject line of the email
        body: The main body text of the email
    """
    pass

def filterInbox(query: str = "", sender: str = "", unreadOnly: bool = False, daysAgo: int = 0):
    """
    Filters the list of emails in the main inbox UI based on criteria.
    
    Args:
        query: Text search query for subject, body, or sender
        sender: Filter by specific sender name or email
        unreadOnly: If true, shows only unread emails
        daysAgo: Filter emails from the last N days (e.g., 10)
    """
    pass

def openEmail(keyword: str):
    """
    Navigates to and displays a specific email in detail view based on a search keyword.
    
    Args:
        keyword: Search keyword matching sender name, subject, or contents
    """
    pass

def replyToEmail(replyBody: str):
    """
    Replies to the currently open email. Pre-fills a reply composition form.
    
    Args:
        replyBody: The content of the reply message
    """
    pass

def sendEmail():
    """
    Triggers the sending of the currently open compose draft or reply draft.
    """
    pass


class AIService:
    def __init__(self):
        self.api_key = None
        self.model = None
        self.system_instruction = (
            "You are an AI assistant for a modern mail web application. "
            "Your goal is to help the user manage their email box. You have tools that can control the UI of the mail client. "
            "Whenever the user asks you to perform an action (like compose, reply, search, filter, or open an email), you MUST use the appropriate tool to execute it. "
            "If the user's request is a general question, just reply with text. "
            "If the user wants to send an email, first compose/fill it in, then ask for confirmation if the Human-in-the-loop is active, or trigger the send tool if requested. "
            "Maintain context. Use the provided active view and open email details to assist when the user says 'reply to this' or similar."
        )
        self.tools = [openComposeView, filterInbox, openEmail, replyToEmail, sendEmail]

    def configure(self, api_key: str = ""):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        if self.api_key:
            print("AIService: LLM configured successfully with Gemini API Key.")
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=self.system_instruction,
                tools=self.tools
            )
        else:
            print("AIService: No Gemini API Key. Running in LOCAL fallback mode (regex).")
            self.model = None

    async def process_message(self, user_message: str, chat_history: list = None, context: dict = None):
        if chat_history is None:
            chat_history = []
        if context is None:
            context = {}

        if not self.model:
            return self.process_local_fallback(user_message, context)

        try:
            # Construct chat conversation with the system context injected
            # Format the context block
            context_prefix = (
                f"[System Context: Active View=\"{context.get('currentView', 'inbox')}\", "
                f"Open Email Subject=\"{context.get('openEmail', {}).get('subject') if context.get('openEmail') else 'None'}\", "
                f"Open Email Sender=\"{context.get('openEmail', {}).get('from') if context.get('openEmail') else 'None'}\", "
                f"Open Email ID=\"{context.get('openEmail', {}).get('id') if context.get('openEmail') else 'None'}\"]\n\n"
            )

            # Build history list in Gemini's expected format
            contents = []
            for msg in chat_history:
                role = "model" if msg.get("role") == "assistant" else "user"
                contents.append({
                    "role": role,
                    "parts": [msg.get("content", "")]
                })

            # Add current message
            contents.append({
                "role": "user",
                "parts": [context_prefix + user_message]
            })

            print("AIService: Sending request to Gemini API...")
            response = self.model.generate_content(contents)
            
            actions = []
            reply_text = ""
            
            if response.candidates:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        # Extract text
                        if part.text:
                            reply_text += part.text
                        # Extract function calls
                        if part.function_call:
                            actions.append({
                                "type": "tool_call",
                                "name": part.function_call.name,
                                "args": dict(part.function_call.args)
                            })

            return {
                "success": True,
                "reply": reply_text.strip(),
                "actions": actions
            }

        except Exception as e:
            print(f"AIService: Gemini API failed, falling back to local processing: {str(e)}")
            return self.process_local_fallback(user_message, context)

    def process_local_fallback(self, message: str, context: dict):
        text = message.lower()
        actions = []
        reply = ""

        # 1. Compose / Send Email
        if any(w in text for w in ["compose", "write", "generate", "send", "new email"]):
            email_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", message)
            to = email_match.group(1) if email_match else ""
            if not to and any(w in text for w in ["processity", "hiring", "task"]):
                to = "hiring@processity.ai"

            subject = ""
            subject_match = re.search(r"subject\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"subject\s+(\w+)", message, re.IGNORECASE)
            if subject_match:
                subject = subject_match.group(1)
            elif any(w in text for w in ["processity", "hiring", "task"]):
                subject = "Question regarding Processity Take-Home Task - Fullstack AI Applied Engineer"
            else:
                about_match = re.search(r"(?:about|regarding)\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"(?:about|regarding)\s+([a-zA-Z0-9\s]+)", message, re.IGNORECASE)
                if about_match:
                    subject = about_match.group(1).strip()

            body = ""
            body_match = re.search(r"body\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"body\s+([a-zA-Z0-9\s.,!'-]+)$", message, re.IGNORECASE)
            if body_match:
                body = body_match.group(1)
            elif any(w in text for w in ["processity", "hiring", "task"]):
                body = "Hi Processity Team,\n\nI hope you are doing well.\n\nI am currently working on the take-home task for the Fullstack AI Applied Engineer role. I wanted to ask regarding...\n\nBest regards,\nKarventhan K"
            elif "asking" in text:
                ask_match = re.search(r"asking\s+(?:about\s+)?(.*)$", message, re.IGNORECASE)
                if ask_match:
                    body = f"Hi, I wanted to ask: {ask_match.group(1)}."

            actions.append({
                "type": "tool_call",
                "name": "openComposeView",
                "args": {"to": to, "subject": subject, "body": body}
            })
            reply = "I've opened the composer to draft an email for you."

        # 2. Reply to Email
        elif "reply" in text or "respond" in text:
            reply_body = ""
            body_match = re.search(r"(?:reply|respond)\s+with\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"(?:reply|respond)\s+saying\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE)
            if body_match:
                reply_body = body_match.group(1)
            else:
                body_match = re.search(r"(?:reply|respond)\s+saying\s+(.*)$", message, re.IGNORECASE)
                if body_match:
                    reply_body = body_match.group(1).strip()

            if not reply_body:
                reply_body = "Hi, thank you for your email. I will review this shortly."

            actions.append({
                "type": "tool_call",
                "name": "replyToEmail",
                "args": {"replyBody": reply_body}
            })
            reply = "I've drafted a reply to the open email."

        # 3. Navigate & Open
        elif any(w in text for w in ["open", "read", "show email", "view email"]):
            keyword = ""
            open_match = re.search(r"(?:open|read|view)\s+(?:the\s+)?(?:email\s+)?(?:from|about|with\s+subject\s+)?['\"]([^'\"]+)['\"]", message, re.IGNORECASE)
            if open_match:
                keyword = open_match.group(1)
            else:
                words = text.split()
                if len(words) > 1:
                    keyword = words[-1]

            actions.append({
                "type": "tool_call",
                "name": "openEmail",
                "args": {"keyword": keyword}
            })
            reply = f"Opening email matching '{keyword}'."

        # 4. Filters & Search
        elif any(w in text for w in ["filter", "search", "find", "show me", "list"]):
            query = ""
            sender = ""
            unread_only = "unread" in text
            days_ago = 0

            # Extract search keyword
            query_match = re.search(r"(?:search|find|for|query)\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"(?:search|find)\s+(\w+)", message, re.IGNORECASE)
            if query_match:
                query = query_match.group(1)

            # Sender filter
            sender_match = re.search(r"from\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", message, re.IGNORECASE) or re.search(r"from\s+(\w+)", message, re.IGNORECASE)
            if sender_match:
                sender = sender_match.group(1)

            # Days ago filter
            days_match = re.search(r"last\s+(\d+)\s+days", message, re.IGNORECASE)
            if days_match:
                days_ago = int(days_match.group(1))

            actions.append({
                "type": "tool_call",
                "name": "filterInbox",
                "args": {
                    "query": query,
                    "sender": sender,
                    "unreadOnly": unread_only,
                    "daysAgo": days_ago
                }
            })
            reply = "I've applied filters to your inbox."

        else:
            reply = (
                "I am running in local mode. I can help you compose, reply, "
                "open, or search emails if you use commands like: "
                "'compose to hiring@processity.ai', 'reply saying yes', or 'filter unread'."
            )

        return {
            "success": True,
            "reply": reply,
            "actions": actions
        }


# Single global instance
ai_service = AIService()
