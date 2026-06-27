from rest_framework import serializers

class CloudinaryModelSerializer(serializers.ModelSerializer):
    """
    A base model serializer that automatically detects CloudinaryFields
    on the Django model and resolves them to their absolute URLs.
    """
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Check if the instance has django model metadata
        if hasattr(instance, '_meta'):
            for field in instance._meta.fields:
                field_name = field.name
                if field_name in representation:
                    # Match CloudinaryField by class name
                    if field.__class__.__name__ == 'CloudinaryField':
                        value = getattr(instance, field_name)
                        if value:
                            representation[field_name] = value.url
        return representation
