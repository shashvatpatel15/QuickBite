from django.urls import path

from orders.consumers.customer import (
    CustomerOrderConsumer
)

from orders.consumers.restaurant_owner import (
    RestaurantOrderConsumer
)

websocket_urlpatterns = [

    path(
        "ws/orders/<int:order_id>/",
        CustomerOrderConsumer.as_asgi(),
    ),

    path(
        "ws/restaurants/<int:restaurant_id>/",
        RestaurantOrderConsumer.as_asgi(),
    ),
]