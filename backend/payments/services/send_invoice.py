import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

def send_invoice_email(user, invoice):
    order = invoice.order
    items_html = ""

    for item in order.items.all():
        items_html += f"""
        <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 12px 0; color: #333333; font-size: 14px;">{item.item_name}</td>
            <td align="center" style="padding: 12px 0; color: #666666; font-size: 14px;">{item.quantity}</td>
            <td align="right" style="padding: 12px 0; color: #333333; font-weight: 600; font-size: 14px;">
                ₹{item.total_price}
            </td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>QuickBite Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 24px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                        
                        <!-- Header Bar -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #ff5722 0%, #f4511e 100%); padding: 32px; text-align: center; color: #ffffff;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">QuickBite</h1>
                                <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 500; opacity: 0.9;">Order Confirmed 🎉</p>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 32px;">
                                <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 20px; font-weight: 700;">Hello {user.email.split('@')[0]},</h2>
                                <p style="margin: 0 0 24px 0; color: #555555; font-size: 15px; line-height: 1.6;">
                                    Thank you for ordering from <strong style="color: #ff5722;">{order.restaurant.name}</strong>. Your payment was processed successfully.
                                </p>

                                <!-- Metadata Table -->
                                <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 28px; border: 1px solid #eaeaea;">
                                    <tr>
                                        <td style="color: #666666; font-size: 13px;">Invoice Number</td>
                                        <td align="right" style="color: #1a1a1a; font-weight: 700; font-size: 13px;">{invoice.invoice_number}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666666; font-size: 13px;">Order ID</td>
                                        <td align="right" style="color: #1a1a1a; font-size: 13px;">#{order.id}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666666; font-size: 13px;">Payment ID</td>
                                        <td align="right" style="color: #1a1a1a; font-size: 13px; font-family: monospace;">{order.payment.razorpay_payment_id}</td>
                                    </tr>
                                </table>

                                <!-- Order Summary Header -->
                                <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Order Summary</h3>
                                
                                <!-- Items List -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 24px;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid #eaeaea;">
                                            <th align="left" style="padding-bottom: 8px; color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700;">Item</th>
                                            <th align="center" style="padding-bottom: 8px; color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; width: 60px;">Qty</th>
                                            <th align="right" style="padding-bottom: 8px; color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; width: 100px;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items_html}
                                    </tbody>
                                </table>

                                <!-- Totals Table -->
                                <table width="100%" cellpadding="6" cellspacing="0" style="margin-top: 16px; border-top: 1px solid #eaeaea; padding-top: 16px;">
                                    <tr>
                                        <td style="color: #666666; font-size: 14px;">Subtotal</td>
                                        <td align="right" style="color: #333333; font-size: 14px;">₹{order.subtotal}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666666; font-size: 14px;">GST & Charges</td>
                                        <td align="right" style="color: #333333; font-size: 14px;">₹{order.tax}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #666666; font-size: 14px;">Delivery Fee</td>
                                        <td align="right" style="color: #333333; font-size: 14px;">₹{order.delivery_fee}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 12px; color: #1a1a1a; font-size: 16px; font-weight: 700;">Total Amount Paid</td>
                                        <td align="right" style="padding-top: 12px; color: #ff5722; font-size: 18px; font-weight: 800;">₹{order.total_amount}</td>
                                    </tr>
                                </table>

                                <!-- Shipping Address -->
                                <h3 style="margin: 28px 0 8px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Delivery Address</h3>
                                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5; background-color: #f8f9fa; padding: 16px; border-radius: 12px; border: 1px dashed #eaeaea;">
                                    {order.delivery_address}
                                </p>

                                <p style="margin: 28px 0 0 0; color: #888888; font-size: 13px; text-align: center;">
                                    Your official billing receipt PDF is attached to this email.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eaeaea;">
                                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Thank you for ordering with QuickBite! ❤️</p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #999999;">If you have any questions, reach out to us at <a href="mailto:support@quickbite.com" style="color: #ff5722; text-decoration: none;">support@quickbite.com</a></p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    email = EmailMultiAlternatives(
        subject=f"QuickBite Order Confirmation - {invoice.invoice_number}",
        body=f"Thank you for your order of ₹{order.total_amount} from {order.restaurant.name}. Your invoice is attached.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email]
    )

    email.attach_alternative(
        html_content,
        "text/html"
    )

    if invoice.pdf:
        try:
            import urllib.request
            
            # If invoice.pdf is still a string, refresh to get the CloudinaryResource
            if isinstance(invoice.pdf, str):
                invoice.refresh_from_db()
                
            url = getattr(invoice.pdf, "url", None)
            if url:
                req = urllib.request.Request(
                    url,
                    headers={'User-Agent': 'QuickBite/1.0'}
                )
                with urllib.request.urlopen(req) as response:
                    pdf_data = response.read()
                
                email.attach(
                    f"{invoice.invoice_number}.pdf",
                    pdf_data,
                    "application/pdf"
                )
                logger.info(f"Successfully attached PDF from Cloudinary URL for {invoice.invoice_number}")
            else:
                logger.error("Invoice PDF has no URL attribute.")
        except Exception as e:
            logger.error(f"Failed to attach PDF to email: {e}")

    try:
        email.send()
        logger.info(f"Invoice email sent successfully to {user.email} for order #{order.id}")
    except Exception as e:
        logger.exception(f"Failed to send invoice email to {user.email}: {e}")