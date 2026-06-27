from django.db import models
from users.models.user import User
from restaurants.models.restaurant import Restaurant


class Payment(models.Model):

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payments"
    )

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    tax = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    address_id = models.PositiveIntegerField()

    notes = models.TextField(
        blank=True
    )

    checkout_snapshot = models.JSONField()

    razorpay_order_id = models.CharField(
        max_length=255,
        unique=True
    )

    razorpay_payment_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )