from django.urls import path
from rest_framework.routers import DefaultRouter

from orders.views.customer_orders import CustomerOrderViewSet
from orders.views.restuarant_orders import RestaurantOrderViewSet
router = DefaultRouter()

router.register(
    "",
    CustomerOrderViewSet,
    basename="orders"
)

urlpatterns = router.urls + [
    path(
    "restaurants/<int:restaurant_id>/",
    RestaurantOrderViewSet.as_view(
        {"get": "list"}
    )
    ),

path(
    "restaurants/<int:restaurant_id>/<int:pk>/",
    RestaurantOrderViewSet.as_view(
        {
            "get": "retrieve",
            "patch": "partial_update"
        }
    )
),

path(
    "restaurants/<int:restaurant_id>/<int:pk>/nearby-riders/",
    RestaurantOrderViewSet.as_view(
        {"get": "nearby_riders"}
    )
),

path(
    "restaurants/<int:restaurant_id>/<int:pk>/assign-rider/",
    RestaurantOrderViewSet.as_view(
        {"post": "assign_rider"}
    )
),
]
