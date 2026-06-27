from restaurants.models.restaurant import Restaurant
from masters.serializers.base import CloudinaryModelSerializer

class RestaurantSerializer(CloudinaryModelSerializer):
    class Meta:
        model = Restaurant
        fields = "__all__"

        read_only_fields = (
                "id",
                "owner",
                "created_at",
                "updated_at",
            )

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

        