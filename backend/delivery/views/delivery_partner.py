from rest_framework import viewsets
from delivery.serializers.delivery_partner import DeliveryPartnerSerializer
from users.permissions import IsDeliveryPartner
from delivery.models.delivery_partner import DeliveryPartner

class DeliveryPartnerViewSet(viewsets.ModelViewSet):

    serializer_class = (
        DeliveryPartnerSerializer
    )

    permission_classes = [
        IsDeliveryPartner
    ]

    http_method_names = [
        "get",
        "patch",
    ]

    def get_queryset(
        self
    ):

        return (
            DeliveryPartner.objects.filter(
                user=self.request.user
            )
        )