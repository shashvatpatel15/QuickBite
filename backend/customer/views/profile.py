from rest_framework.permissions import IsAuthenticated
from customer.serializers.profile import CustomerProfileSerializer
from rest_framework.generics import RetrieveUpdateAPIView
from users.models.user import User


class CustomerProfileView(RetrieveUpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Prefetch related customer_details and addresses to avoid N+1 database queries
        return User.objects.select_related("customer_details").prefetch_related("addresses").get(id=self.request.user.id)