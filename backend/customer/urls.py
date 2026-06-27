from django.urls import path
from rest_framework.routers import DefaultRouter
from customer.views.address import AddressViewSet
from customer.views.profile import CustomerProfileView


router = DefaultRouter()
router.register(
    r"addresses",
    AddressViewSet,
    basename="addresses"
)

urlpatterns = [
    path(
        "profile/",
        CustomerProfileView.as_view(),
        name="customer-profile"
    ),
] + router.urls