from django.db import models
from users.models.user import User
from cloudinary.models import CloudinaryField


class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_details"
    )

    # profile_picture = CloudinaryField(
    #     "profile_image",
    #     blank=True,
    #     null=True,
    # )
    profile_picture = CloudinaryField(
        "profile_image",
        blank=True,
        null=True)

    date_of_birth = models.DateField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
