from rest_framework import serializers
from payments.models.invoice import Invoice


class InvoiceSerializer(serializers.ModelSerializer):

    order_id = serializers.IntegerField(
        source="order.id",
        read_only=True
    )

    restaurant_name = serializers.CharField(
        source="order.restaurant.name",
        read_only=True
    )

    customer_email = serializers.CharField(
        source="order.customer.email",
        read_only=True
    )

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "order_id",
            "restaurant_name",
            "customer_email",
            "pdf",
            "generated_at"
        ]