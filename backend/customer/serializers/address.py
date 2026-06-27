from rest_framework import serializers
from customer.models.address import Address

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        exclude = ["customer"]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in ['latitude', 'longitude']:
            if field in data and data[field] not in (None, ''):
                try:
                    val = float(data[field])
                    data[field] = f"{val:.6f}"
                except (ValueError, TypeError):
                    pass
        return super().to_internal_value(data)

