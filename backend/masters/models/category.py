from django.db import models
from cloudinary.models import CloudinaryField

class Category(models.Model):
    name=models.CharField(max_length=50)
    image = CloudinaryField(
        "category_image",
        blank=True,
        null=True
    )
    is_active=models.BooleanField(default=True)
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )