from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.models.user import User
from users.models.otp import OTP
from users.serializers.verify_otp import VerifyOTPSerializer
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta

class VerifyOTPView(APIView):

    def post(self, request):

        serializer = VerifyOTPSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        try:

            user = User.objects.get(
                email=email
            )

            otp_obj = OTP.objects.get(
                user=user
            )

        except (
            User.DoesNotExist,
            OTP.DoesNotExist
        ):

            return Response(
                {
                    "error": "Invalid OTP"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_obj.otp != otp:

            return Response(
                {
                    "error": "Incorrect OTP"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        expiry_time = (
            otp_obj.created_at +
            timedelta(minutes=5)
        )

        if timezone.now() > expiry_time:

            otp_obj.delete()

            return Response(
                {
                    "error": "OTP expired"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_verified = True

        user.save(
            update_fields=[
                "is_verified"
            ]
        )

        otp_obj.delete()

        refresh = RefreshToken.for_user(
            user
        )

        return Response(
            {
                "message":
                "Account verified successfully",

                "refresh":
                str(refresh),

                "access":
                str(
                    refresh.access_token
                )
            },
            status=status.HTTP_200_OK
        )

