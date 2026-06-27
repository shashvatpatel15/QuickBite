from rest_framework.routers import (
    DefaultRouter
)
from delivery.views.delivery_order import DeliveryOrderViewSet
from delivery.views.delivery_partner import DeliveryPartnerViewSet

router = DefaultRouter()

router.register(
    "profile",
    DeliveryPartnerViewSet,
    basename="delivery-profile"
)

router.register(
    "orders",
    DeliveryOrderViewSet,
    basename="delivery-orders"
)

urlpatterns = router.urls