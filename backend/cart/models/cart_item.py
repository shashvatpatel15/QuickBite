from django.db import models
from django.db.models import UniqueConstraint
from menu.models.menu import Menu
from cart.models.cart import Cart

class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items"
    )

    menu = models.ForeignKey(
        Menu,
        on_delete=models.CASCADE
    )

    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
                models.UniqueConstraint(
                    fields=["cart", "menu"],
                    name="unique_cart_menu"
                )
            ]