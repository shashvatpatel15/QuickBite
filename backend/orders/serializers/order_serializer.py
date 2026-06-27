from rest_framework import serializers

from orders.models.order import Order
from customer.models.address import Address


class OrderSerializer(serializers.ModelSerializer):

    address = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.none(),
        write_only=True
    )

    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True
    )

    invoice_url = serializers.SerializerMethodField()

    class Meta:
        model = Order

        fields = [
            "id",
            "address",
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

        read_only_fields = [
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

    def get_invoice_url(self, obj):
        if hasattr(obj, "invoice") and obj.invoice.pdf:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.invoice.pdf.url)
            return obj.invoice.pdf.url
        return None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        request = self.context.get("request")

        if request:
            self.fields["address"].queryset = (
                Address.objects.filter(
                    customer=request.user
                )
            )

    def validate_address(self, value):
        if value.customer != self.context["request"].user:
            raise serializers.ValidationError(
                "Invalid address."
            )

        return value