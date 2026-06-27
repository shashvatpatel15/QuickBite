import hmac
import hashlib

from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response

from payments.models.payment import Payment

from payments.services.payment_processor import (
    process_successful_payment
)


class RazorpayWebhookView(APIView):

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        received_signature = (
            request.headers.get(
                "X-Razorpay-Signature"
            )
        )

        generated_signature = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            request.body,
            hashlib.sha256
        ).hexdigest()

        if generated_signature != received_signature:

            return Response(
                {"detail": "Invalid signature"},
                status=400
            )

        event = request.data.get("event")

        if event != "payment.captured":

            return Response(
                {"message": "Ignored"}
            )

        entity = request.data[
            "payload"
        ]["payment"]["entity"]

        razorpay_order_id = entity[
            "order_id"
        ]

        payment = Payment.objects.filter(
            razorpay_order_id=razorpay_order_id
        ).first()

        if not payment:

            return Response(
                {"message": "Payment not found"}
            )

        if payment.status == Payment.Status.SUCCESS:

            return Response(
                {"message": "Already processed"}
            )

        payment.status = Payment.Status.SUCCESS

        payment.razorpay_payment_id = (
            entity["id"]
        )

        payment.save()

        process_successful_payment(
            payment
        )

        return Response(
            {
                "message":
                "Webhook processed"
            }
        )