import re
from rest_framework import serializers
from users.models.user import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = ("email", "phone_number", "role", "password", "latitude", "longitude")

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

    def validate_phone_number(self, value):
        """Validate phone number format and length"""
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        
        # Remove any non-digit characters for validation
        digits_only = re.sub(r'\D', '', value)
        
        if len(digits_only) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        
        if len(digits_only) > 15:
            raise serializers.ValidationError("Phone number must not exceed 15 digits.")
        
        # Check for uniqueness
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        
        return value

    def validate_email(self, value):
        """Validate that email is not already registered"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def create(self, validated_data):
        latitude = validated_data.pop("latitude", None)
        longitude = validated_data.pop("longitude", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if user.role == User.Role.DELIVERY_PARTNER:
            from delivery.models.delivery_partner import DeliveryPartner
            partner, created = DeliveryPartner.objects.get_or_create(user=user)
            if latitude is not None:
                partner.current_latitude = latitude
            if longitude is not None:
                partner.current_longitude = longitude
            partner.save()

        return user

