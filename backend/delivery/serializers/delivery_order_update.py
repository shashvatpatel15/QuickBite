from orders.models.order import Order
from rest_framework import serializers

class DeliveryOrderUpdateSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = Order

        fields = [
            "status"
        ]

    def validate_status(
        self,
        value
    ):

        allowed_statuses = [
            "out_for_delivery",
            "delivered",
        ]

        if value not in allowed_statuses:

            raise serializers.ValidationError(
                "Invalid status."
            )

        return value