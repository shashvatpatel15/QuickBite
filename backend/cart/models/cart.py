from django.db import models
from users.models.user import User

class Cart(models.Model):
    customer = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="cart"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
