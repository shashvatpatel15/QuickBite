from django.db import models 
from orders.models.order import Order
from cloudinary.models import CloudinaryField


class Invoice(models.Model):

    order = models.OneToOneField(
        Order,
        on_delete=models.PROTECT,
        related_name="invoice"
    )

    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True
    )

    pdf = CloudinaryField(
        resource_type="raw",
        blank=True,
        null=True
    )

    invoice_snapshot = models.JSONField(
        default=dict
    )
    
    generated_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-generated_at"]
        
        def __str__(self):
            return self.invoice_number