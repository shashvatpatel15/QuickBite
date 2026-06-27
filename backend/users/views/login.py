from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from users.serializers.login import LoginSerializer
from users.models.user import User
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import update_last_login

class LoginView(APIView):

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            "email"
        ]

        password = serializer.validated_data[
            "password"
        ]

        try:

            user = User.objects.get(
                email=email
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error":
                    "Invalid credentials"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.check_password(
            password
        ):

            return Response(
                {
                    "error":
                    "Invalid credentials"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_verified:

            return Response(
                {
                    "error":
                    "Verify your email first"
                },
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(
            user
        )

        update_last_login(
            None,
            user
        )

        return Response(
            {
                "refresh":
                str(refresh),

                "access":
                str(
                    refresh.access_token
                )
            },
            status=status.HTTP_200_OK
        )