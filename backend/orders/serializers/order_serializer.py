from rest_framework import serializers

from orders.models.order import Order


class OrderSerializer(serializers.ModelSerializer):

    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True
    )

    invoice_url = serializers.SerializerMethodField()

    class Meta:
        model = Order

        fields = [
            "id",
            "restaurant_name",
            "status",
            "subtotal",
            "delivery_fee",
            "tax",
            "total_amount",
            "delivery_address",
            "invoice_url",
            "created_at"
        ]

        read_only_fields = fields

    def get_invoice_url(self, obj):
        if hasattr(obj, "invoice") and obj.invoice.pdf:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.invoice.pdf.url)
            return obj.invoice.pdf.url
        return None