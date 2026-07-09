import unittest
from fastapi.testclient import TestClient
from .main import app
from .ai_service import ai_service
from .mail_service import mail_service

class TestMailApp(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_config(self):
        """Test configuration retrieval endpoint"""
        response = self.client.get("/api/config")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("mode", data)
        self.assertIn("hasApiKey", data)

    def test_get_emails(self):
        """Test email retrieval endpoint"""
        response = self.client.get("/api/emails")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIsInstance(data.get("emails"), list)

    def test_ai_local_fallback_compose(self):
        """Test local fallback regex parsing for Compose commands"""
        res = ai_service.process_local_fallback("compose an email to test@example.com about meeting", {})
        self.assertTrue(any(a["name"] == "openComposeView" for a in res["actions"]))
        
        compose_action = [a for a in res["actions"] if a["name"] == "openComposeView"][0]
        self.assertEqual(compose_action["args"]["to"], "test@example.com")
        self.assertEqual(compose_action["args"]["subject"], "meeting")

    def test_ai_local_fallback_filter(self):
        """Test local fallback regex parsing for filter commands"""
        res = ai_service.process_local_fallback("show me only unread emails", {})
        self.assertTrue(any(a["name"] == "filterInbox" for a in res["actions"]))
        
        filter_action = [a for a in res["actions"] if a["name"] == "filterInbox"][0]
        self.assertTrue(filter_action["args"]["unreadOnly"])

    def test_ai_local_fallback_open(self):
        """Test local fallback regex parsing for navigate/open commands"""
        res = ai_service.process_local_fallback("open the email from david", {})
        self.assertTrue(any(a["name"] == "openEmail" for a in res["actions"]))
        
        open_action = [a for a in res["actions"] if a["name"] == "openEmail"][0]
        self.assertEqual(open_action["args"]["keyword"], "david")

    def test_get_api_logs(self):
        """Test api logs endpoint works and logs correctly"""
        # Call config endpoint to trigger middleware log
        self.client.get("/api/config")
        
        # Verify log retrieval returns successfully
        response = self.client.get("/api/logs")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertIsInstance(data.get("logs"), list)
        self.assertTrue(len(data.get("logs")) > 0)

if __name__ == "__main__":
    unittest.main()
