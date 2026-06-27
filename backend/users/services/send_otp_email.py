from django.conf import settings
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives


def send_otp_email(email, otp):

    subject = "Verify Your Email"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; padding:30px;">

            <h2 style="color:#ff5722; text-align:center;">
                Welcome to QuickBite
            </h2>

            <p>Hello,</p>

            <p>Use the following OTP to verify your email address:</p>

            <div style="
                text-align:center;
                font-size:32px;
                font-weight:bold;
                letter-spacing:8px;
                background:#fff3e0;
                color:#ff5722;
                padding:20px;
                border-radius:8px;
                margin:20px 0;">
                {otp}
            </div>

            <p>This OTP is valid for <b>5 minutes</b>.</p>

            <p>If you didn't request this, please ignore this email.</p>

            <hr>

            <p style="color:gray; font-size:12px;">
                © 2026 QuickBite. All rights reserved.
            </p>

        </div>
    </body>
    </html>
    """

    email_message = EmailMultiAlternatives(
        subject=subject,
        body=f"Your OTP is {otp}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email]
    )

    email_message.attach_alternative(html_content, "text/html")
    email_message.send()