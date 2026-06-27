from rest_framework.views import APIView
from users.models.user import User
from users.models.otp import OTP
from users.serializers.resend_otp import ResendOTPSerializer
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from users.services.send_otp_email import send_otp_email
from users.services.generate_otp import generate_otp
import logging
logger = logging.getLogger(__name__)


class ResendOTPView(APIView):

    def post(self, request):

        serializer = ResendOTPSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            "email"
        ]

        try:

            user = User.objects.get(
                email=email
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error":
                    "User not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if user.is_verified:

            return Response(
                {
                    "error":
                    "User already verified"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_obj = OTP.objects.filter(
            user=user
        ).first()

        if otp_obj:

            seconds_passed = (
                timezone.now() -
                otp_obj.created_at
            ).seconds

            if seconds_passed < 60:

                return Response(
                    {
                        "error":
                        f"Please wait {60 - seconds_passed} seconds before requesting another OTP."
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        otp = generate_otp()

        OTP.objects.update_or_create(
            user=user,
            defaults={
                "otp": otp
            }
        )

        try:

            send_otp_email(
                user.email,
                otp
            )

        except Exception:

            logger.exception(
                f"Failed to resend OTP to {user.email}"
            )

            return Response(
                {
                    "error":
                    "Failed to send OTP email"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                "message":
                "OTP resent successfully"
            },
            status=status.HTTP_200_OK
        )

