from django.urls import path
from users.views.register import RegisterView
from users.views.login import LoginView
from users.views.resend_otp import ResendOTPView
from users.views.verify_otp import VerifyOTPView

urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register"
    ),

    path(
        "verify-otp/",
        VerifyOTPView.as_view(),
        name="verify-otp"
    ),

    path(
        "resend-otp/",
        ResendOTPView.as_view(),
        name="resend-otp"
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),
]