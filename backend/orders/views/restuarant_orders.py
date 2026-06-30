import logging
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

logger = logging.getLogger(__name__)
from rest_framework.exceptions import (
    NotFound,
    ValidationError
)
from rest_framework.permissions import (
    IsAuthenticated
)

from restaurants.models.restaurant import Restaurant
from orders.models.order import Order

from users.permissions import (
    IsRestaurantOwner
)
from orders.filters import RestaurantOrderFilter
from common.pagination import CommonPagination

from orders.serializers.order_detail_serializer import (
    OrderDetailSerializer
)
from orders.services.order_status import (
    handle_order_status_change
)

class RestaurantOrderViewSet(
    viewsets.ModelViewSet
):

    permission_classes = [
        IsAuthenticated,
        IsRestaurantOwner
    ]
    
    filterset_class = RestaurantOrderFilter
    pagination_class = CommonPagination

    search_fields = [
        "customer__first_name",
        "customer__last_name",
        "customer__email",
    ]

    ordering_fields = [
        "created_at",
        "total_amount",
    ]

    ordering = ["-created_at"]

    http_method_names = [
        "get",
        "post",
        "patch"
    ]

    def get_queryset(self):

        restaurant_id = self.kwargs[
            "restaurant_id"
        ]

        restaurant = (
            Restaurant.objects
            .filter(
                id=restaurant_id,
                owner=self.request.user
            )
            .first()
        )

        if not restaurant:
            raise NotFound(
                "Restaurant not found."
            )

        return (
            Order.objects
            .filter(
                restaurant=restaurant
            )
            .select_related(
                "customer",
                "restaurant",
                "delivery_partner",
                "delivery_partner__user"
            )
            .prefetch_related(
                "items"
            )
        )

    def get_serializer_class(self):
        return OrderDetailSerializer

    def partial_update(
        self,
        request,
        *args,
        **kwargs
    ):

        order = self.get_object()

        new_status = request.data.get(
            "status"
        )

        STATUS_TRANSITIONS = {

            Order.Status.PENDING: [
                Order.Status.CONFIRMED,
                Order.Status.CANCELLED
            ],

            Order.Status.CONFIRMED: [
                Order.Status.PREPARING
            ],

            Order.Status.PREPARING: [
                Order.Status.READY
            ],
            Order.Status.READY: [], # Must go through /assign-rider/ action to assign rider and transition to ASSIGNED
            Order.Status.ASSIGNED: [
                Order.Status.OUT_FOR_DELIVERY
            ],

            Order.Status.OUT_FOR_DELIVERY: [
                Order.Status.DELIVERED
            ]
        }

        allowed_statuses = (
            STATUS_TRANSITIONS.get(
                order.status,
                []
            )
        )

        logger.info(
            f"Status change transition - Current: {order.status}, Requested: {new_status}, Allowed: {allowed_statuses}"
        )

        if new_status not in allowed_statuses:

            raise ValidationError(
                {
                    "status":
                    (
                        f"Cannot change "
                        f"from {order.status} "
                        f"to {new_status}"
                    )
                }
            )

        order.status = new_status

        order.save(
            update_fields=[
                "status"
            ]
        )

        handle_order_status_change(order)

        return Response(
            OrderDetailSerializer(
                order,
                context=
                self.get_serializer_context()
            ).data
        )

    @action(detail=True, methods=["get"], url_path="nearby-riders")
    def nearby_riders(self, request, restaurant_id=None, pk=None):
        order = self.get_object()
        restaurant = order.restaurant

        if restaurant.latitude is None or restaurant.longitude is None:
            city_lower = (restaurant.city or "").lower()
            if "del" in city_lower:
                restaurant.latitude = 28.6139
                restaurant.longitude = 77.2090
            else:
                restaurant.latitude = 12.9716
                restaurant.longitude = 77.5946
            restaurant.save(update_fields=["latitude", "longitude"])

        from delivery.models.delivery_partner import DeliveryPartner
        from delivery.services.distance_calculator import haversine_distance

        riders = (
            DeliveryPartner.objects
            .filter(
                is_online=True,
                is_available=True
            )
            .select_related("user")
        )

        nearby_list = []
        for rider in riders:
            if rider.current_latitude is None or rider.current_longitude is None:
                continue

            distance = haversine_distance(
                restaurant.latitude,
                restaurant.longitude,
                rider.current_latitude,
                rider.current_longitude
            )

            name = f"{rider.user.first_name} {rider.user.last_name}".strip()
            if not name:
                name = rider.user.email.split('@')[0]

            nearby_list.append({
                "id": rider.id,
                "name": name,
                "phone_number": rider.user.phone_number or "No phone number",
                "distance": round(distance, 2),
                "vehicle_number": rider.vehicle_number,
                "latitude": float(rider.current_latitude),
                "longitude": float(rider.current_longitude)
            })

        nearby_list.sort(key=lambda x: x["distance"])
        return Response(nearby_list)

    @action(detail=True, methods=["post"], url_path="assign-rider")
    def assign_rider(self, request, restaurant_id=None, pk=None):
        order = self.get_object()

        if order.status != Order.Status.READY:
            raise ValidationError(
                {"error": f"Cannot assign rider to an order in {order.status} state. Order must be READY."}
            )

        rider_id = request.data.get("rider_id")
        auto_assign = request.data.get("auto_assign", False)

        from delivery.models.delivery_partner import DeliveryPartner

        if auto_assign:
            from delivery.services.rider import assign_rider as auto_assign_rider
            assigned_rider = auto_assign_rider(order)
            if not assigned_rider:
                raise ValidationError({"error": "No available online riders nearby."})

            handle_order_status_change(order)

            return Response({
                "status": "success",
                "message": "Rider auto-assigned successfully.",
                "rider": {
                    "id": assigned_rider.id,
                    "name": f"{assigned_rider.user.first_name} {assigned_rider.user.last_name}".strip() or assigned_rider.user.email.split('@')[0],
                    "phone_number": assigned_rider.user.phone_number or "No phone number",
                }
            })

        if not rider_id:
            raise ValidationError({"rider_id": "This field is required for manual assignment."})

        rider = DeliveryPartner.objects.filter(id=rider_id).select_related("user").first()
        if not rider:
            raise NotFound("Selected rider not found.")

        if not rider.is_online or not rider.is_available:
            raise ValidationError({"error": "Selected rider is no longer online or available."})

        order.delivery_partner = rider
        order.status = Order.Status.ASSIGNED
        order.save(update_fields=["delivery_partner", "status"])

        rider.is_available = False
        rider.save(update_fields=["is_available"])

        handle_order_status_change(order)

        return Response({
            "status": "success",
            "message": "Rider assigned successfully.",
            "rider": {
                "id": rider.id,
                "name": f"{rider.user.first_name} {rider.user.last_name}".strip() or rider.user.email.split('@')[0],
                "phone_number": rider.user.phone_number or "No phone number",
            }
        })
