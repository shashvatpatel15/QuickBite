from rest_framework import serializers
from delivery.models.delivery_partner import DeliveryPartner


class DeliveryPartnerSerializer(serializers.ModelSerializer):

    class Meta:

        model = DeliveryPartner

        fields = [
            "id",
            "vehicle_number",
            "is_online",
            "is_available",
            "current_latitude",
            "current_longitude",
        ]

        read_only_fields = [
            "id",
            "is_available",
        ]

