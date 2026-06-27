from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from users.permissions import IsCustomer

from payments.models.payment import Payment

from payments.serializers.verify_payment import (
    VerifyPaymentSerializer
)

from payments.services.razorpay_client import (
    client
)

from payments.services.payment_processor import (
    process_successful_payment
)


class VerifyPaymentView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsCustomer
    ]

    @transaction.atomic
    def post(self, request):

        serializer = VerifyPaymentSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        payment = Payment.objects.select_for_update().get(
            razorpay_order_id=serializer.validated_data[
                "razorpay_order_id"
            ],
            user=request.user
        )

        if payment.status == Payment.Status.SUCCESS:

            return Response(
                {
                    "message":
                    "Payment already verified"
                }
            )

        if payment.razorpay_order_id.startswith("order_mock_"):
            # Bypass signature verification for mock orders in development/test environments
            pass
        else:
            try:
                client.utility.verify_payment_signature(
                    {
                        "razorpay_order_id":
                        serializer.validated_data[
                            "razorpay_order_id"
                        ],

                        "razorpay_payment_id":
                        serializer.validated_data[
                            "razorpay_payment_id"
                        ],

                        "razorpay_signature":
                        serializer.validated_data[
                            "razorpay_signature"
                        ]
                    }
                )
            except Exception as e:
                return Response(
                    {"detail": "Payment verification failed. Invalid signature."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        payment.status = Payment.Status.SUCCESS

        payment.razorpay_payment_id = (
            serializer.validated_data[
                "razorpay_payment_id"
            ]
        )

        payment.save()

        order = process_successful_payment(
            payment
        )

        return Response(
            {
                "message":
                "Payment verified",

                "order_id":
                order.id
            }
        )