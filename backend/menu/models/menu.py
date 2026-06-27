from django.db import models
from restaurants.models.restaurant import Restaurant
from masters.models.category import Category
from masters.models.food_type import FoodType
from cloudinary.models import CloudinaryField

class Menu(models.Model):

    name = models.CharField(
        max_length=100
    )

    description = models.TextField(
        blank=True
    )

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menus"
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="menus"
    )

    food_type = models.ForeignKey(
        FoodType,
        on_delete=models.CASCADE,
        related_name="menus"
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    image = CloudinaryField(
        "menu_image",
        blank=True,
        null=True
    )

    is_available = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.name