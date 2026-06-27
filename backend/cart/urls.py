from django.urls import path
from rest_framework.routers import DefaultRouter

from cart.views.cart_items import CartItemViewSet

router = DefaultRouter()

router.register(
    r"items",
    CartItemViewSet,
    basename="cart-items"
)

urlpatterns = router.urls