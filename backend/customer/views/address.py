from rest_framework.permissions import IsAuthenticated
from customer.models.address import Address
from rest_framework import viewsets
from users.permissions import IsCustomer
from customer.serializers.address import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return Address.objects.filter(
            customer=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(
            customer=self.request.user
        )
