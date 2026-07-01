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

        rider_lat = rider.current_latitude
        rider_lng = rider.current_longitude

        # If rider has no GPS coordinates, assign fallback near the restaurant
        # so they can still be discovered (critical for development/testing)
        if rider_lat is None or rider_lng is None:
            rider_lat = float(restaurant.latitude) + 0.005
            rider_lng = float(restaurant.longitude) + 0.005
            rider.current_latitude = rider_lat
            rider.current_longitude = rider_lng
            rider.save(update_fields=["current_latitude", "current_longitude"])

        distance = (
            haversine_distance(
                restaurant.latitude,
                restaurant.longitude,
                rider_lat,
                rider_lng
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

    # Mark rider as unavailable AND offline so they don't appear
    # for other restaurants while on this delivery
    rider.is_available = False
    rider.is_online = False

    rider.save(
        update_fields=[
            "is_available",
            "is_online"
        ]
    )

    return rider


def reject_delivery(order):

    rider = (order.delivery_partner)
    if rider:
        # Restore rider availability and online status
        rider.is_available = True
        rider.is_online = True
        rider.save(
            update_fields=[
                "is_available",
                "is_online"
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