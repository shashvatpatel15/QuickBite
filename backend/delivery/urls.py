from rest_framework.routers import DefaultRouter
from delivery.views import DeliveryOrderViewSet, DeliveryPartnerViewSet

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