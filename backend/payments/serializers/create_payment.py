from rest_framework import serializers
from customer.models.address import Address


class CreatePaymentSerializer(serializers.Serializer):

    address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(),
        source="address"
    )

    notes = serializers.CharField(
        required=False,
        allow_blank=True
    )

    def validate_address(self, value):

        request = self.context["request"]

        if value.customer != request.user:
            raise serializers.ValidationError(
                "Invalid address."
            )

        return value