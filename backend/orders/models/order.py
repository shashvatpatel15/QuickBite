from django.db import models
from  restaurants.models.restaurant import Restaurant
from users.models.user import User
from payments.models.payment import Payment
from delivery.models.delivery_partner import DeliveryPartner

class Order(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        ASSIGNED = "assigned","ASSIGNED",
        OUT_FOR_DELIVERY = "out_for_delivery", "Out For Delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    payment = models.OneToOneField(
        Payment,
        on_delete=models.PROTECT,
        related_name="order",
        null=True,
        blank=True
    )

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders"
    )

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    delivery_partner = models.ForeignKey(
        DeliveryPartner,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )

    rider_accepted = models.BooleanField(
        default=False
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=40
    )

    tax = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    delivery_address = models.TextField()

    notes = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)