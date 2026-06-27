from rest_framework import serializers
from orders.models.order import Order
from customer.models.address import Address

class DeliveryOrderListSerializer(
    serializers.ModelSerializer
):

    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True
    )

    restaurant_address = serializers.CharField(
        source="restaurant.address",
        read_only=True
    )

    restaurant_latitude = serializers.DecimalField(
        source="restaurant.latitude",
        max_digits=9,
        decimal_places=6,
        read_only=True
    )

    restaurant_longitude = serializers.DecimalField(
        source="restaurant.longitude",
        max_digits=9,
        decimal_places=6,
        read_only=True
    )

    customer_email = serializers.EmailField(
        source="customer.email",
        read_only=True
    )

    customer_latitude = serializers.SerializerMethodField()
    customer_longitude = serializers.SerializerMethodField()

    class Meta:

        model = Order

        fields = [
            "id",
            "restaurant_name",
            "restaurant_address",
            "restaurant_latitude",
            "restaurant_longitude",
            "customer_email",
            "customer_latitude",
            "customer_longitude",
            "status",
            "total_amount",
            "delivery_address",
            "notes",
            "rider_accepted",
            "created_at",
        ]

        read_only_fields = fields

    def get_customer_latitude(self, obj):
        if obj.payment:
            try:
                address = Address.objects.get(id=obj.payment.address_id)
                return address.latitude
            except Address.DoesNotExist:
                pass
        return None

    def get_customer_longitude(self, obj):
        if obj.payment:
            try:
                address = Address.objects.get(id=obj.payment.address_id)
                return address.longitude
            except Address.DoesNotExist:
                pass
        return None
