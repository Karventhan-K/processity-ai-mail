import re
import os
import json
import asyncio
from openai import OpenAI

class AIService:
    def __init__(self):
        self.api_key = None
        self.client = None
        self.system_instruction = (
            "You are an AI assistant for a modern mail web application. "
            "Your goal is to help the user manage their email box. You have tools that can control the UI of the mail client. "
            "Whenever the user asks you to perform an action (like compose, reply, search, filter, or open an email), you MUST use the appropriate tool to execute it. "
            "If the user's request is a general question, just reply with text. "
            "If the user wants to send an email, first compose/fill it in, then ask for confirmation if the Human-in-the-loop is active, or trigger the send tool if requested. "
            "Maintain context. Use the provided active view and open email details to assist when the user says 'reply to this' or similar."
        )
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "openComposeView",
                    "description": "Opens the compose mail modal and fills in the fields. Visibly fills the fields.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "to": {"type": "string", "description": "Recipient email address (e.g. john@example.com)"},
                            "subject": {"type": "string", "description": "The subject line of the email"},
                            "body": {"type": "string", "description": "The main body text of the email"},
                        },
                        "required": ["to"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "filterInbox",
                    "description": "Filters the list of emails in the main inbox UI based on criteria.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Text search query for subject, body, or sender"},
                            "sender": {"type": "string", "description": "Filter by specific sender name or email"},
                            "unreadOnly": {"type": "boolean", "description": "If true, shows only unread emails"},
                            "daysAgo": {"type": "integer", "description": "Filter emails from the last N days (e.g., 10)"},
                        },
                        "required": [],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "openEmail",
                    "description": "Navigates to and displays a specific email in detail view based on a search keyword.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "keyword": {"type": "string", "description": "Search keyword matching sender name, subject, or contents"},
                        },
                        "required": ["keyword"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "replyToEmail",
                    "description": "Replies to the currently open email. Pre-fills a reply composition form.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "replyBody": {"type": "string", "description": "The content of the reply message"},
                        },
                        "required": ["replyBody"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "sendEmail",
                    "description": "Triggers the sending of the currently open compose draft or reply draft.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": [],
                    },
                },
            }
        ]

    def configure(self, api_key: str = ""):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
        if self.api_key:
            if self.api_key.startswith("AIzaSy"):
                print("AIService: LLM configured successfully with Google Gemini API Key.")
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
                )
                # Use Gemini 1.5 Flash which has native OpenAI compatibility support
                self.model = "gemini-1.5-flash"
            else:
                print("AIService: LLM configured successfully with OpenAI API Key.")
                self.client = OpenAI(api_key=self.api_key)
                self.model = "gpt-4o-mini"
        else:
            print("AIService: No API Key found. Running in LOCAL fallback mode (regex).")
            self.client = None
            self.model = None



    async def process_message(self, user_message: str, chat_history: list = None, context: dict = None):
        if chat_history is None:
            chat_history = []
        if context is None:
            context = {}

        if not self.client:
            return self.process_local_fallback(user_message, context)

        try:
            # Format the context block
            context_prefix = (
                f"[System Context: Active View=\"{context.get('currentView', 'inbox')}\", "
                f"Open Email Subject=\"{context.get('openEmail', {}).get('subject') if context.get('openEmail') else 'None'}\", "
                f"Open Email Sender=\"{context.get('openEmail', {}).get('from') if context.get('openEmail') else 'None'}\", "
                f"Open Email ID=\"{context.get('openEmail', {}).get('id') if context.get('openEmail') else 'None'}\"]\n\n"
            )

            # Construct message payload
            messages = [
                {"role": "system", "content": self.system_instruction}
            ]
            
            # Build history list in OpenAI's expected format
            for msg in chat_history:
                role = "assistant" if msg.get("role") == "assistant" else "user"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })
                
            # Add current message with context
            messages.append({
                "role": "user",
                "content": context_prefix + user_message
            })

            print(f"AIService: Sending request to LLM using model {self.model}...")
            
            # Run the synchronous API call in an executor to avoid blocking the async event loop
            def call_openai():
                return self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=self.tools,
                    tool_choice="auto"
                )
            
            response = await asyncio.to_thread(call_openai)
            
            actions = []
            reply_text = ""
            
            message_response = response.choices[0].message
            if message_response.content:
                reply_text = message_response.content
                
            if message_response.tool_calls:
                for tool_call in message_response.tool_calls:
                    args = json.loads(tool_call.function.arguments)
                    actions.append({
                        "type": "tool_call",
                        "name": tool_call.function.name,
                        "args": args
                    })

            return {
                "success": True,
                "reply": reply_text.strip(),
                "actions": actions
            }

        except Exception as e:
            print(f"AIService: LLM API failed, falling back to local processing: {str(e)}")
            return self.process_local_fallback(user_message, context)

    def process_local_fallback(self, message: str, context: dict):
        text = message.lower()
        actions = []
        reply = ""

        # 1. Compose / Send Email
        if any(w in text for w in ["compose", "write", "generate", "send", "new email", "apply", "leave", "request", "draft", "sick", "vacation"]):
            email_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", message)
            to = email_match.group(1) if email_match else ""
            if not to:
                if any(w in text for w in ["leave", "sick", "vacation"]):
                    to = "manager@company.com"
                elif any(w in text for w in ["processity", "hiring", "task"]):
                    to = "hiring@processity.ai"
                else:
                    to = "manager@company.com"

            subject = ""
            subject_match = re.search(r"subject\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"subject\s+(\w+)", message, re.IGNORECASE)
            if subject_match:
                subject = subject_match.group(1)
            elif any(w in text for w in ["leave", "sick", "vacation"]):
                subject = "Leave Application"
                if "one day" in text:
                    subject = "Leave Application - One Day"
            elif any(w in text for w in ["processity", "hiring", "task"]):
                subject = "Question regarding Processity Take-Home Task - Fullstack AI Applied Engineer"
            else:
                about_match = re.search(r"(?:about|regarding)\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"(?:about|regarding)\s+([a-zA-Z0-9\s]+)", message, re.IGNORECASE)
                if about_match:
                    subject = about_match.group(1).strip()
                else:
                    subject = "Mail Draft"

            body = ""
            body_match = re.search(r"body\s+['\"]([^'\"]+)['\"]", message, re.IGNORECASE) or re.search(r"body\s+([a-zA-Z0-9\s.,!'-]+)$", message, re.IGNORECASE)
            if body_match:
                body = body_match.group(1)
            elif any(w in text for w in ["leave", "sick", "vacation"]):
                days = "one day" if "one day" in text else "leave"
                reason = "unwell" if "sick" in text or "unwell" in text or "fever" in text else "personal reasons"
                body = (
                    f"Hi Manager,\n\n"
                    f"I would like to apply for leave for {days} due to {reason}.\n"
                    f"I will keep you updated on my recovery. Please let me know if this is approved.\n\n"
                    f"Best regards,\nKarventhan"
                )
            elif any(w in text for w in ["processity", "hiring", "task"]):
                body = "Hi Processity Team,\n\nI hope you are doing well.\n\nI am currently working on the take-home task for the Fullstack AI Applied Engineer role. I wanted to ask regarding...\n\nBest regards,\nKarventhan K"
            elif "asking" in text:
                ask_match = re.search(r"asking\s+(?:about\s+)?(.*)$", message, re.IGNORECASE)
                if ask_match:
                    body = f"Hi, I wanted to ask: {ask_match.group(1)}."
            else:
                body = "Hi,\n\nHere is the drafted message.\n\nBest regards,\nKarventhan"

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
        elif any(w in text.split() for w in ["open", "read", "view"]) or "show email" in text or "view email" in text:
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
