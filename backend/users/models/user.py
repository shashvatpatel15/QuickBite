from django.db import models
from django.contrib.auth.models import AbstractUser
from users.managers import UserManager

class User(AbstractUser):
    username = None

    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        RESTAURANT_OWNER = "restaurant_owner", "Restaurant Owner"
        DELIVERY_PARTNER = "delivery_partner", "Delivery Partner"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.CUSTOMER
    )
    phone_number=models.CharField(max_length=15,unique=True)

    is_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
    
