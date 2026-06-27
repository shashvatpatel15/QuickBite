from django.urls import path
from rest_framework.routers import DefaultRouter
from restaurants.views.my_restaurants import MyRestaurantsAPIView
from restaurants.views.restaurants import RestaurantViewSet
router = DefaultRouter()
from menu.views.customer_menu import CustomerMenuViewSet

router.register(
    r"",
    RestaurantViewSet,
    basename="restaurants"
)

urlpatterns = [
    
    # Customer
    path(
        "<int:restaurant_id>/menu/",
        CustomerMenuViewSet.as_view({
            "get": "list"
        })
    ),
    path(
        "<int:restaurant_id>/menu/<int:pk>/",
        CustomerMenuViewSet.as_view({
            "get": "retrieve"
        })
    ),
    path(
        "my-restaurants/",
        MyRestaurantsAPIView.as_view()
    ),
] + router.urls
   
