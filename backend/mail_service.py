import uuid
import datetime
import asyncio
import imaplib
import email
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import EmailRecord, EmailConfig

class MailService:
    def __init__(self):
        self.mode = "mock"  # "mock" or "real"
        self.config = None
        self.smtp_transporter = None
        self.on_new_email_callback = None
        self.idle_listener_task = None
        self.idle_listener_active = False

        # Initialize mock database records if empty
        self.seed_mock_emails()

    def set_on_new_email(self, callback):
        self.on_new_email_callback = callback

    def seed_mock_emails(self):
        db = SessionLocal()
        try:
            count = db.query(EmailRecord).count()
            if count == 0:
                print("MailService: Seeding default mock emails in DB...")
                now = datetime.datetime.utcnow()
                mock_list = [
                    EmailRecord(
                        id="mock-1",
                        from_str="Sarah Jenkins <sarah.j@company.com>",
                        from_name="Sarah Jenkins",
                        from_address="sarah.j@company.com",
                        to_str="you@domain.com",
                        subject="Project Update & Deliverables",
                        body="Hi team,\n\nI have uploaded the latest design specs and API documentation to the shared drive. Please review it before our sync tomorrow at 10 AM. Let me know if you have any questions.\n\nBest,\nSarah",
                        html_body="<p>Hi team,</p><p>I have uploaded the latest design specs and API documentation to the shared drive. Please review it before our sync tomorrow at 10 AM. Let me know if you have any questions.</p><br><p>Best,<br>Sarah</p>",
                        date=now - datetime.timedelta(hours=2),
                        is_unread=True,
                        is_sent=False,
                        thread_id="thread-sarah-1"
                    ),
                    EmailRecord(
                        id="mock-2",
                        from_str="David Miller <david.m@company.com>",
                        from_name="David Miller",
                        from_address="david.m@company.com",
                        to_str="you@domain.com",
                        subject="Lunch tomorrow?",
                        body="Hey! Are you free for lunch tomorrow? There's a new sushi place near the office that I've been wanting to try out. Let me know!",
                        html_body="<p>Hey!</p><p>Are you free for lunch tomorrow? There's a new sushi place near the office that I've been wanting to try out. Let me know!</p>",
                        date=now - datetime.timedelta(hours=5),
                        is_unread=False,
                        is_sent=False,
                        thread_id="thread-david-1"
                    ),
                    EmailRecord(
                        id="mock-3",
                        from_str="John Doe <john@example.com>",
                        from_name="John Doe",
                        from_address="john@example.com",
                        to_str="you@domain.com",
                        subject="Meeting Tomorrow",
                        body="Hi, let's meet tomorrow at 3pm to discuss the Q3 roadmap. Let me know if that works for you.",
                        html_body="<p>Hi, let's meet tomorrow at 3pm to discuss the Q3 roadmap. Let me know if that works for you.</p>",
                        date=now - datetime.timedelta(days=1),
                        is_unread=True,
                        is_sent=False,
                        thread_id="thread-john-1"
                    ),
                    EmailRecord(
                        id="mock-4",
                        from_str="Processity Team <hiring@processity.ai>",
                        from_name="Processity Team",
                        from_address="hiring@processity.ai",
                        to_str="you@domain.com",
                        subject="Welcome to Processity Mail App",
                        body="Hello!\n\nWelcome to your new AI-Powered Mail web application. You can chat with the AI assistant on the right panel to help you compose emails, search, or navigate the UI.\n\nTry typing: 'Compose email to hiring@processity.ai with subject App Feedback'.\n\nEnjoy!\nProcessity Team",
                        html_body="<p>Hello!</p><p>Welcome to your new AI-Powered Mail web application. You can chat with the AI assistant on the right panel to help you compose emails, search, or navigate the UI.</p><br><p>Try typing: <i>'Compose email to hiring@processity.ai with subject App Feedback'</i>.</p><br><p>Enjoy!<br>Processity Team</p>",
                        date=now - datetime.timedelta(days=2),
                        is_unread=False,
                        is_sent=False,
                        thread_id="thread-welcome"
                    )
                ]
                db.add_all(mock_list)
                db.commit()
        except Exception as e:
            print(f"Error seeding DB: {e}")
            db.rollback()
        finally:
            db.close()

    async def configure(self, config_dict: dict = None):
        db = SessionLocal()
        try:
            if not config_dict or not config_dict.get("email") or not config_dict.get("password"):
                print("MailService: No credentials. Operating in MOCK mode.")
                self.mode = "mock"
                self.config = None
                await self.close_real_connections()
                
                # Mark active config in DB as inactive
                db.query(EmailConfig).update({EmailConfig.is_active: False})
                db.commit()
                return {"success": True, "mode": "mock"}

            # Auto-detect ports and hosts
            email_addr = config_dict.get("email")
            password = config_dict.get("password")
            smtp_host = config_dict.get("smtpHost") or ""
            smtp_port = int(config_dict.get("smtpPort")) if config_dict.get("smtpPort") else 465
            imap_host = config_dict.get("imapHost") or ""
            imap_port = int(config_dict.get("imapPort")) if config_dict.get("imapPort") else 993

            if email_addr.endswith("@gmail.com"):
                smtp_host = smtp_host or "smtp.gmail.com"
                imap_host = imap_host or "imap.gmail.com"
            elif email_addr.endswith("@outlook.com") or email_addr.endswith("@hotmail.com"):
                smtp_host = smtp_host or "smtp.office365.com"
                smtp_port = 587
                imap_host = imap_host or "outlook.office365.com"

            if not smtp_host or not imap_host:
                raise ValueError("Could not auto-detect SMTP/IMAP servers. Please specify them.")

            # Test IMAP connection
            print(f"MailService: Attempting IMAP connect to {imap_host}:{imap_port}...")
            
            def test_imap():
                client = imaplib.IMAP4_SSL(imap_host, imap_port)
                client.login(email_addr, password)
                client.logout()
            
            await asyncio.to_thread(test_imap)
            print("MailService: IMAP verification successful.")

            # Configure transporter properties
            self.config = {
                "email": email_addr,
                "password": password,
                "smtp_host": smtp_host,
                "smtp_port": smtp_port,
                "imap_host": imap_host,
                "imap_port": imap_port
            }
            self.mode = "real"

            # Upsert into PostgreSQL Database
            existing_config = db.query(EmailConfig).filter_by(email=email_addr).first()
            db.query(EmailConfig).update({EmailConfig.is_active: False}) # de-activate all
            if existing_config:
                existing_config.password = password
                existing_config.smtp_host = smtp_host
                existing_config.smtp_port = smtp_port
                existing_config.imap_host = imap_host
                existing_config.imap_port = imap_port
                existing_config.is_active = True
            else:
                new_conf = EmailConfig(
                    email=email_addr,
                    password=password,
                    smtp_host=smtp_host,
                    smtp_port=smtp_port,
                    imap_host=imap_host,
                    imap_port=imap_port,
                    is_active=True
                )
                db.add(new_conf)
            db.commit()

            # Start real-time IMAP email sync monitoring task
            self.start_idle_listener()

            return {"success": True, "mode": "real"}

        except Exception as error:
            print(f"MailService: Failed to connect to real services. Falling back to MOCK. Error: {str(error)}")
            self.mode = "mock"
            self.config = None
            await self.close_real_connections()
            return {"success": False, "mode": "mock", "error": str(error)}
        finally:
            db.close()

    async def close_real_connections(self):
        self.idle_listener_active = False
        if self.idle_listener_task:
            self.idle_listener_task.cancel()
            self.idle_listener_task = None

    def start_idle_listener(self):
        if self.mode != "real" or self.idle_listener_active:
            return
        
        self.idle_listener_active = True
        loop = asyncio.get_event_loop()
        self.idle_listener_task = loop.create_task(self._monitor_imap_idle())

    async def _monitor_imap_idle(self):
        print("MailService: Monitoring INBOX for real-time changes via IMAP...")
        while self.idle_listener_active and self.config:
            try:
                # We perform short-polling of the INBOX folder every 30 seconds as a reliable cross-platform IMAP idle fallback
                await asyncio.sleep(30)
                if not self.idle_listener_active:
                    break
                
                print("MailService: Syncing/Checking IMAP inbox...")
                await self.fetch_emails(force_sync=True)
                
                # Check if there are new unread emails relative to what was already cached
                # Trigger callback if a new one is received.
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"MailService error in sync loop: {e}")
                await asyncio.sleep(10)

    async def fetch_emails(self, force_sync: bool = False):
        db = SessionLocal()
        try:
            if self.mode == "mock":
                records = db.query(EmailRecord).all()
                # Convert DB objects to serializable dictionaries
                return self._serialize_records(records)

            if not self.config:
                # Fallback to local db cache
                records = db.query(EmailRecord).all()
                return self._serialize_records(records)

            # Sync from IMAP if real mode is active and we want to sync
            if force_sync or db.query(EmailRecord).filter_by(is_sent=False).count() == 0:
                await self._sync_imap_emails(db)

            records = db.query(EmailRecord).all()
            return self._serialize_records(records)
        except Exception as e:
            print(f"MailService: Error fetching emails: {e}")
            # Fallback to DB contents
            records = db.query(EmailRecord).all()
            return self._serialize_records(records)
        finally:
            db.close()

    def _serialize_records(self, records):
        serialized = []
        for r in records:
            serialized.append({
                "id": r.id,
                "from": r.from_str,
                "fromName": r.from_name or "Unknown",
                "fromAddress": r.from_address or "",
                "to": r.to_str,
                "subject": r.subject or "(No Subject)",
                "body": r.body or "",
                "html": r.html_body or f"<p>{r.body or ''}</p>",
                "date": r.date.isoformat() + "Z" if r.date else datetime.datetime.utcnow().isoformat() + "Z",
                "unread": r.is_unread,
                "sent": r.is_sent,
                "threadId": r.thread_id or f"thread-{r.id}"
            })
        # Sort by date desc
        return sorted(serialized, key=lambda x: x["date"], reverse=True)

    async def _sync_imap_emails(self, db: Session):
        try:
            email_addr = self.config["email"]
            password = self.config["password"]
            imap_host = self.config["imap_host"]
            imap_port = self.config["imap_port"]

            def fetch_imap_raw():
                client = imaplib.IMAP4_SSL(imap_host, imap_port)
                client.login(email_addr, password)
                client.select("INBOX")
                # Search for all emails
                status, messages = client.search(None, "ALL")
                if status != "OK":
                    return []
                
                mail_ids = messages[0].split()
                # Get the last 20 emails
                recent_ids = mail_ids[-20:]
                fetched_emails = []

                for m_id in reversed(recent_ids):
                    status, msg_data = client.fetch(m_id, "(RFC822)")
                    if status != "OK" or not msg_data:
                        continue
                    
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    
                    # Parse subject
                    subject, encoding = decode_header(msg["Subject"] or "")[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding or "utf-8", errors="ignore")
                    
                    # Parse from
                    from_str, encoding = decode_header(msg["From"] or "")[0]
                    if isinstance(from_str, bytes):
                        from_str = from_str.decode(encoding or "utf-8", errors="ignore")
                    
                    # Parse parts to get body and html
                    body = ""
                    html_body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            try:
                                part_body = part.get_payload(decode=True).decode(errors="ignore")
                            except Exception:
                                continue
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body += part_body
                            elif content_type == "text/html" and "attachment" not in content_disposition:
                                html_body += part_body
                    else:
                        content_type = msg.get_content_type()
                        try:
                            part_body = msg.get_payload(decode=True).decode(errors="ignore")
                        except Exception:
                            part_body = ""
                        if content_type == "text/plain":
                            body = part_body
                        elif content_type == "text/html":
                            html_body = part_body

                    if not html_body:
                        html_body = f"<p>{body.replace(chr(10), '<br>')}</p>"

                    # Parse date
                    date_str = msg["Date"]
                    parsed_date = datetime.datetime.utcnow()
                    if date_str:
                        try:
                            parsed_date = email.utils.parsedate_to_datetime(date_str)
                            # Convert to naive UTC
                            parsed_date = parsed_date.astimezone(datetime.timezone.utc).replace(tzinfo=None)
                        except Exception:
                            pass

                    # Parse message ID
                    message_id = msg["Message-ID"] or str(uuid.uuid4())
                    
                    # Read status flags
                    status, flags_data = client.fetch(m_id, "FLAGS")
                    is_unread = True
                    if status == "OK" and flags_data:
                        flags_str = str(flags_data[0])
                        if "\\Seen" in flags_str:
                            is_unread = False

                    # Parse from address details
                    parsed_from = email.utils.parseaddr(from_str)
                    from_name = parsed_from[0] or parsed_from[1].split("@")[0]
                    from_address = parsed_from[1]

                    fetched_emails.append({
                        "uid": m_id.decode(),
                        "from_str": from_str,
                        "from_name": from_name,
                        "from_address": from_address,
                        "subject": subject,
                        "body": body,
                        "html_body": html_body,
                        "date": parsed_date,
                        "is_unread": is_unread,
                        "message_id": message_id
                    })

                client.logout()
                return fetched_emails

            fetched_list = await asyncio.to_thread(fetch_imap_raw)
            
            # Upsert into PostgreSQL DB
            for mail_data in fetched_list:
                db_id = f"real-{mail_data['uid']}"
                existing = db.query(EmailRecord).filter_by(id=db_id).first()
                if existing:
                    existing.is_unread = mail_data["is_unread"]
                else:
                    new_rec = EmailRecord(
                        id=db_id,
                        from_str=mail_data["from_str"],
                        from_name=mail_data["from_name"],
                        from_address=mail_data["from_address"],
                        to_str=email_addr,
                        subject=mail_data["subject"],
                        body=mail_data["body"],
                        html_body=mail_data["html_body"],
                        date=mail_data["date"],
                        is_unread=mail_data["is_unread"],
                        is_sent=False,
                        thread_id=mail_data["message_id"]
                    )
                    db.add(new_rec)
                    
                    # Notify WebSocket client of new incoming email!
                    if self.on_new_email_callback:
                        serialized_single = {
                            "id": db_id,
                            "from": mail_data["from_str"],
                            "fromName": mail_data["from_name"],
                            "fromAddress": mail_data["from_address"],
                            "to": email_addr,
                            "subject": mail_data["subject"],
                            "body": mail_data["body"],
                            "html": mail_data["html_body"],
                            "date": mail_data["date"].isoformat() + "Z",
                            "unread": mail_data["is_unread"],
                            "sent": False,
                            "threadId": mail_data["message_id"]
                        }
                        self.on_new_email_callback(serialized_single)
            db.commit()

        except Exception as e:
            print(f"MailService: Error syncing raw emails from IMAP: {e}")

    async def send_email(self, to: str, subject: str, body: str):
        db = SessionLocal()
        try:
            if self.mode == "mock":
                print("MailService (MOCK): Sending email to", to)
                new_id = f"mock-sent-{uuid.uuid4()}"
                new_email = EmailRecord(
                    id=new_id,
                    from_str="You <you@domain.com>",
                    from_name="You",
                    from_address="you@domain.com",
                    to_str=to,
                    subject=subject,
                    body=body,
                    html_body=f"<p>{body.replace(chr(10), '<br>')}</p>",
                    date=datetime.datetime.utcnow(),
                    is_unread=False,
                    is_sent=True,
                    thread_id=f"thread-sent-{uuid.uuid4()}"
                )
                db.add(new_email)
                db.commit()

                return {
                    "success": True, 
                    "email": {
                        "id": new_id,
                        "from": "You <you@domain.com>",
                        "fromName": "You",
                        "fromAddress": "you@domain.com",
                        "to": to,
                        "subject": subject,
                        "body": body,
                        "html": f"<p>{body.replace(chr(10), '<br>')}</p>",
                        "date": new_email.date.isoformat() + "Z",
                        "unread": False,
                        "sent": True,
                        "threadId": new_email.thread_id
                    }
                }

            # Real Mode: Send via SMTP
            if not self.config:
                raise ValueError("SMTP config is not loaded.")

            print("MailService: Sending real email to", to)
            
            # Construct Email
            message = MIMEMultipart("alternative")
            message["From"] = self.config["email"]
            message["To"] = to
            message["Subject"] = subject

            text_part = MIMEText(body, "plain")
            html_part = MIMEText(f"<p>{body.replace(chr(10), '<br>')}</p>", "html")
            message.attach(text_part)
            message.attach(html_part)

            # Send asynchronously
            use_tls = self.config["smtp_port"] == 465
            smtp_client = aiosmtplib.SMTP(
                hostname=self.config["smtp_host"],
                port=self.config["smtp_port"],
                use_tls=use_tls
            )

            await smtp_client.connect()
            await smtp_client.login(self.config["email"], self.config["password"])
            await smtp_client.send_message(message)
            await smtp_client.quit()

            msg_id = str(uuid.uuid4())
            new_id = f"real-sent-{msg_id}"
            
            # Save sent email in PostgreSQL DB
            new_email = EmailRecord(
                id=new_id,
                from_str=f"You <{self.config['email']}>",
                from_name="You",
                from_address=self.config["email"],
                to_str=to,
                subject=subject,
                body=body,
                html_body=f"<p>{body.replace(chr(10), '<br>')}</p>",
                date=datetime.datetime.utcnow(),
                is_unread=False,
                is_sent=True,
                thread_id=msg_id
            )
            db.add(new_email)
            db.commit()

            return {
                "success": True, 
                "email": {
                    "id": new_id,
                    "from": f"You <{self.config['email']}>",
                    "fromName": "You",
                    "fromAddress": self.config["email"],
                    "to": to,
                    "subject": subject,
                    "body": body,
                    "html": f"<p>{body.replace(chr(10), '<br>')}</p>",
                    "date": new_email.date.isoformat() + "Z",
                    "unread": False,
                    "sent": True,
                    "threadId": new_email.thread_id
                }
            }

        except Exception as error:
            print("MailService: Error sending email via SMTP:", error)
            raise error
        finally:
            db.close()

    async def reply_email(self, email_id: str, body: str):
        db = SessionLocal()
        try:
            original = db.query(EmailRecord).filter_by(id=email_id).first()
            if not original:
                raise ValueError("Original email not found to reply.")

            reply_subject = original.subject
            if not reply_subject.lower().startswith("re:"):
                reply_subject = f"Re: {reply_subject}"

            to_address = original.from_address or original.from_str

            if self.mode == "mock":
                new_id = f"mock-sent-{uuid.uuid4()}"
                new_email = EmailRecord(
                    id=new_id,
                    from_str="You <you@domain.com>",
                    from_name="You",
                    from_address="you@domain.com",
                    to_str=to_address,
                    subject=reply_subject,
                    body=body,
                    html_body=f"<p>{body.replace(chr(10), '<br>')}</p>",
                    date=datetime.datetime.utcnow(),
                    is_unread=False,
                    is_sent=True,
                    thread_id=original.thread_id
                )
                db.add(new_email)
                db.commit()

                return {
                    "success": True,
                    "email": {
                        "id": new_id,
                        "from": "You <you@domain.com>",
                        "fromName": "You",
                        "fromAddress": "you@domain.com",
                        "to": to_address,
                        "subject": reply_subject,
                        "body": body,
                        "html": f"<p>{body.replace(chr(10), '<br>')}</p>",
                        "date": new_email.date.isoformat() + "Z",
                        "unread": False,
                        "sent": True,
                        "threadId": original.thread_id
                    }
                }

            # Real Mode: Send reply
            if not self.config:
                raise ValueError("SMTP configuration not loaded.")

            message = MIMEMultipart("alternative")
            message["From"] = self.config["email"]
            message["To"] = to_address
            message["Subject"] = reply_subject
            
            # Thread Headers
            message["In-Reply-To"] = original.thread_id
            message["References"] = original.thread_id

            text_part = MIMEText(body, "plain")
            html_part = MIMEText(f"<p>{body.replace(chr(10), '<br>')}</p>", "html")
            message.attach(text_part)
            message.attach(html_part)

            use_tls = self.config["smtp_port"] == 465
            smtp_client = aiosmtplib.SMTP(
                hostname=self.config["smtp_host"],
                port=self.config["smtp_port"],
                use_tls=use_tls
            )

            await smtp_client.connect()
            await smtp_client.login(self.config["email"], self.config["password"])
            await smtp_client.send_message(message)
            await smtp_client.quit()

            new_id = f"real-reply-{uuid.uuid4()}"
            new_email = EmailRecord(
                id=new_id,
                from_str=f"You <{self.config['email']}>",
                from_name="You",
                from_address=self.config["email"],
                to_str=to_address,
                subject=reply_subject,
                body=body,
                html_body=f"<p>{body.replace(chr(10), '<br>')}</p>",
                date=datetime.datetime.utcnow(),
                is_unread=False,
                is_sent=True,
                thread_id=original.thread_id
            )
            db.add(new_email)
            db.commit()

            return {
                "success": True,
                "email": {
                    "id": new_id,
                    "from": f"You <{self.config['email']}>",
                    "fromName": "You",
                    "fromAddress": self.config["email"],
                    "to": to_address,
                    "subject": reply_subject,
                    "body": body,
                    "html": f"<p>{body.replace(chr(10), '<br>')}</p>",
                    "date": new_email.date.isoformat() + "Z",
                    "unread": False,
                    "sent": True,
                    "threadId": original.thread_id
                }
            }

        except Exception as error:
            print("MailService: Error sending reply:", error)
            raise error
        finally:
            db.close()

    async def mark_as_read(self, email_id: str, unread: bool):
        db = SessionLocal()
        try:
            record = db.query(EmailRecord).filter_by(id=email_id).first()
            if not record:
                raise ValueError("Email not found.")

            record.is_unread = unread
            db.commit()

            # Optional: sync flag to IMAP server in background
            if self.mode == "real" and self.config and not email_id.startswith("mock-"):
                # Real IMAP flag updates can be done here asynchronously
                pass

            return {"success": True}
        except Exception as e:
            print(f"Error marking read state: {e}")
            raise e
        finally:
            db.close()

    def simulate_incoming_email(self, from_addr: str, subject: str, body: str):
        db = SessionLocal()
        try:
            simulated_id = f"mock-received-{uuid.uuid4()}"
            parsed_from = email.utils.parseaddr(from_addr)
            from_name = parsed_from[0] or parsed_from[1].split("@")[0] or "Simulated Sender"
            from_address = parsed_from[1] or from_addr

            new_email = EmailRecord(
                id=simulated_id,
                from_str=from_addr,
                from_name=from_name,
                from_address=from_address,
                to_str="you@domain.com",
                subject=subject,
                body=body,
                html_body=f"<p>{body.replace(chr(10), '<br>')}</p>",
                date=datetime.datetime.utcnow(),
                is_unread=True,
                is_sent=False,
                thread_id=f"thread-simulated-{uuid.uuid4()}"
            )
            db.add(new_email)
            db.commit()

            serialized = {
                "id": simulated_id,
                "from": from_addr,
                "fromName": from_name,
                "fromAddress": from_address,
                "to": "you@domain.com",
                "subject": subject,
                "body": body,
                "html": f"<p>{body.replace(chr(10), '<br>')}</p>",
                "date": new_email.date.isoformat() + "Z",
                "unread": True,
                "sent": False,
                "threadId": new_email.thread_id
            }

            if self.on_new_email_callback:
                print("MailService: Dispatching new simulated email...")
                self.on_new_email_callback(serialized)

            return serialized
        except Exception as e:
            print(f"Error simulating incoming email: {e}")
            db.rollback()
            raise e
        finally:
            db.close()

# Single global instance
mail_service = MailService()
