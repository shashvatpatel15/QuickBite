from django.db import models
from users.models.user import User

class OTP(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="otp"
    )

    otp = models.CharField(
        max_length=6
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.user.email}"