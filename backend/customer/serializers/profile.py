from masters.serializers.base import CloudinaryModelSerializer
from rest_framework import serializers
from users.models.user import User
from customer.models.profile import Profile
from customer.serializers.address import AddressSerializer

class ProfileSerializer(CloudinaryModelSerializer):
    class Meta:
        model = Profile
        exclude = ["user"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    customer_details = ProfileSerializer(read_only=True)
    addresses = AddressSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone_number",
            "role",
            "is_verified",
            "customer_details",
            "addresses",
        ]