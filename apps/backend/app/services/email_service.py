"""
Email service for sending notifications
"""
import logging
from typing import Optional
from app.core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


_logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        from_email: Optional[str] = None
    ):
        """Send email via SMTP"""
        
        if not from_email:
            from_email = self.smtp_username
        
        # Create message
        message = MIMEMultipart()
        message['From'] = from_email
        message['To'] = to_email
        message['Subject'] = subject
        
        # Add body
        message.attach(MIMEText(body, 'plain'))
        
        try:
            # Connect to SMTP server
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            return True
        except Exception as e:
            _logger.warning("Failed to send email to %s: %s", to_email, e)
            return False
    
    async def send_html_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        from_email: Optional[str] = None
    ):
        """Send HTML email"""
        
        if not from_email:
            from_email = self.smtp_username
        
        message = MIMEMultipart('alternative')
        message['From'] = from_email
        message['To'] = to_email
        message['Subject'] = subject
        
        # Add HTML body
        html_part = MIMEText(html_body, 'html')
        message.attach(html_part)
        
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            return True
        except Exception as e:
            _logger.warning("Failed to send email to %s: %s", to_email, e)
            return False
