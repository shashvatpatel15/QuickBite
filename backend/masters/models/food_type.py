from django.db import models

class FoodType(models.Model):
    name=models.CharField(max_length=25)
    is_active=models.BooleanField(default=True)
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )