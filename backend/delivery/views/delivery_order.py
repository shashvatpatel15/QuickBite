from users.permissions import IsDeliveryPartner
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from orders.models.order import Order
from orders.services.order_status import handle_order_status_change
from delivery.serializers.delivery_order_list import DeliveryOrderListSerializer
from delivery.serializers.delivery_order_update import DeliveryOrderUpdateSerializer
from delivery.filters import RiderOrderFilter
from common.pagination import CommonPagination

class DeliveryOrderViewSet(viewsets.ModelViewSet):

    permission_classes = [
        IsDeliveryPartner
    ]
    pagination_class = CommonPagination

    filterset_class = RiderOrderFilter

    ordering_fields = [
        "created_at",
    ]

    ordering = [
        "-created_at",
    ]

    http_method_names = [ 
        "get",
        "patch",
        "post",
    ]

    def get_queryset(
        self
    ):

        return (
            Order.objects.filter(
                delivery_partner=
                self.request.user
                .delivery_profile
            )
            .select_related(
                "customer",
                "restaurant"
            )
        )
    def get_serializer_class(self):

        if self.action in [
            "partial_update",
            "update",
        ]:

            return (
                DeliveryOrderUpdateSerializer
            )

        return (
            DeliveryOrderListSerializer
        )
    
    def perform_update(
        self,
        serializer
    ):
        order = serializer.save()
        handle_order_status_change(order)

        if (order.status == Order.Status.DELIVERED):

            rider = (
                order.delivery_partner
            )

            rider.is_available = True

            rider.save(
                update_fields=[
                    "is_available"
                ]
            )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        order = self.get_object()
        
        if order.status != Order.Status.ASSIGNED:
            return Response(
                {"error": f"Cannot accept order in {order.status} state. It must be ASSIGNED."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        order.rider_accepted = True
        order.save(update_fields=["rider_accepted"])
        
        handle_order_status_change(order)
        
        return Response({"status": "accepted", "message": "Order accepted successfully."})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        order = self.get_object()
        
        if order.status != Order.Status.ASSIGNED:
            return Response(
                {"error": f"Cannot reject order in {order.status} state. It must be ASSIGNED."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from delivery.services.rider import reject_delivery
        reject_delivery(order)
        
        return Response({"status": "rejected", "message": "Order rejected successfully."})