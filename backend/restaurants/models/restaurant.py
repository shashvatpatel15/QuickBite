from django.db import models
from users.models.user import User
from cloudinary.models import CloudinaryField

class Restaurant(models.Model):

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )
    
    name = models.CharField(max_length=255)

    description = models.TextField(
        blank=True
    )

    image = CloudinaryField(
        "restaurant_image",
        blank=True,
        null=True
    )

    email = models.EmailField(
        unique=True
    )

    phone_number = models.CharField(
        max_length=15
    )

    address = models.TextField()

    city = models.CharField(
        max_length=100
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True
    )

    is_open = models.BooleanField(
        default=True
    )

    is_active = models.BooleanField(
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

    def save(self, *args, **kwargs):
        from config.geocoding import geocode_address
        # Geocode if coordinates are empty or address/city changed
        if self.pk:
            try:
                orig = Restaurant.objects.get(pk=self.pk)
                if orig.address != self.address or orig.city != self.city:
                    lat, lon = geocode_address(f"{self.address}, {self.city}")
                    if lat is not None and lon is not None:
                        self.latitude = lat
                        self.longitude = lon
            except Restaurant.DoesNotExist:
                pass
        else:
            if not self.latitude or not self.longitude:
                lat, lon = geocode_address(f"{self.address}, {self.city}")
                if lat is not None and lon is not None:
                    self.latitude = lat
                    self.longitude = lon
        super().save(*args, **kwargs)

