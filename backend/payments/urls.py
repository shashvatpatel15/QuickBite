from django.urls import path
from rest_framework.routers import DefaultRouter

from payments.views.create_payment import CreatePaymentView
from payments.views.verify_payment import VerifyPaymentView
from payments.views.razorpay_webhook import RazorpayWebhookView
from payments.views.invoice import InvoiceViewSet

router = DefaultRouter()
router.register(r"invoices", InvoiceViewSet, basename="invoice")

urlpatterns = [

    path(
        "create/",
        CreatePaymentView.as_view()
    ),
    path(
        "verify/",
        VerifyPaymentView.as_view()
    ),
    path(
        "webhook/",
        RazorpayWebhookView.as_view(),
        name="payment-webhook"
    )

] + router.urls