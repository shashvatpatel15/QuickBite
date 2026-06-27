from delivery.services.distance_calculator import haversine_distance
from delivery.models.delivery_partner import DeliveryPartner
from orders.models.order import Order

def find_nearest_rider(restaurant):

    if restaurant.latitude is None or restaurant.longitude is None:
        city_lower = (restaurant.city or "").lower()
        if "del" in city_lower:
            restaurant.latitude = 28.6139
            restaurant.longitude = 77.2090
        else:
            restaurant.latitude = 12.9716
            restaurant.longitude = 77.5946
        restaurant.save(update_fields=["latitude", "longitude"])

    riders = (
        DeliveryPartner.objects
        .filter(
            is_online=True,
            is_available=True
        )
        .select_related(
            "user"
        )
    )

    nearest_rider = None

    nearest_distance = (
        float("inf")
    )

    for rider in riders:

        if (
            rider.current_latitude is None
            or
            rider.current_longitude is None
        ):
            continue

        distance = (
            haversine_distance(
                restaurant.latitude,
                restaurant.longitude,
                rider.current_latitude,
                rider.current_longitude
            )
        )

        if distance < nearest_distance:

            nearest_distance = (
                distance
            )

            nearest_rider = (
                rider
            )

    return nearest_rider

def assign_rider(order):

    rider = (find_nearest_rider(order.restaurant))

    if rider is None:
        return None

    order.delivery_partner = rider

    order.status = (
        Order.Status.ASSIGNED
    )

    order.save(
        update_fields=[
            "delivery_partner",
            "status"
        ]
    )

    rider.is_available = False

    rider.save(
        update_fields=[
            "is_available"
        ]
    )

    return rider


def reject_delivery(order):

    rider = (order.delivery_partner)
    if rider:
        rider.is_available = True
        rider.save(
            update_fields=[
                "is_available"
            ]
        )
    order.delivery_partner = None
    order.rider_accepted = False

    order.status = (
        Order.Status.READY
    )

    order.save(
        update_fields=[
            "delivery_partner",
            "rider_accepted",
            "status"
        ]
    )
    
    from orders.services.order_status import handle_order_status_change
    handle_order_status_change(order)
    return None