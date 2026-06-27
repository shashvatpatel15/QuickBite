from django.db import models
from users.models.user import User


class Address(models.Model):
    class AddressType(models.TextChoices):
        HOME = "home", "Home"
        WORK = "work", "Work"
        OTHER = "other", "Other"

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="addresses"
    )

    address_type = models.CharField(
        max_length=20,
        choices=AddressType.choices,
        default=AddressType.HOME
    )
    house_no = models.CharField(max_length=100)
    building_name = models.CharField(max_length=255, blank=True)

    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(
        max_length=255,
        blank=True
    )

    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)

    pincode = models.CharField(max_length=10)

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.customer.email} - {self.address_type}"