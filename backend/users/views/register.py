import logging
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models.otp import OTP
from users.serializers.register import RegisterSerializer
from users.services.generate_otp import generate_otp
from users.services.send_otp_email import send_otp_email

logger = logging.getLogger(__name__)


class RegisterView(APIView):

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            logger.warning("Registration validation failed: %s", serializer.errors)
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        otp = generate_otp()

        try:
            with transaction.atomic():
                user = serializer.save()

                OTP.objects.update_or_create(
                    user=user,
                    defaults={
                        "otp": otp
                    }
                )

        except Exception:
            logger.exception("Error creating user")
            return Response(
                {
                    "error": "Failed to create account. Please try again."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            send_otp_email(user.email, otp)

        except Exception:
            logger.exception("Failed to send OTP email to %s", user.email)

            return Response(
                {
                    "message": "Account created successfully, but OTP email could not be sent.",
                    "otp_sent": False,
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            {
                "message": "Account created successfully. OTP sent.",
                "otp_sent": True,
            },
            status=status.HTTP_201_CREATED
        )