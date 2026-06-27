from django.db import models
from restaurants.models.restaurant import Restaurant

class RestaurantTiming(models.Model):

    DAYS = (
        ("monday", "Monday"),
        ("tuesday", "Tuesday"),
        ("wednesday", "Wednesday"),
        ("thursday", "Thursday"),
        ("friday", "Friday"),
        ("saturday", "Saturday"),
        ("sunday", "Sunday"),
    )

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="timings"
    )

    day = models.CharField(
        max_length=10,
        choices=DAYS
    )

    opening_time = models.TimeField()

    closing_time = models.TimeField()

    class Meta:
        unique_together = ("restaurant", "day")

    def __str__(self):
        return f"{self.restaurant.name} - {self.day}"