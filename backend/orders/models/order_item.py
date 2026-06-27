from django.db import models
from menu.models.menu import Menu
from orders.models.order import Order 

class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )

    menu = models.ForeignKey(
        Menu,
        on_delete=models.SET_NULL,
        null=True
    )

    item_name = models.CharField(
        max_length=255
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    quantity = models.PositiveIntegerField()

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )