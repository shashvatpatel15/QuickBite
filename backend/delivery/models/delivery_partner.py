from django.db import models
from users.models.user import User


class DeliveryPartner(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="delivery_profile"
    )

    vehicle_number = models.CharField(
        max_length=20,
        blank=True
    )

    is_online = models.BooleanField(
        default=False
    )

    is_available = models.BooleanField(
        default=True
    )

    current_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    current_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.user.email