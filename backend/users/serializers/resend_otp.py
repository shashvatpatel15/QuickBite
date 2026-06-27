from rest_framework import serializers

class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

