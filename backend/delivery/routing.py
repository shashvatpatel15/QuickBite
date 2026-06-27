from django.urls import path

from delivery.consumer import (
    DeliveryTrackingConsumer
)

websocket_urlpatterns = [

    path(
        "ws/delivery-tracking/",
        DeliveryTrackingConsumer.as_asgi()
    ),
]