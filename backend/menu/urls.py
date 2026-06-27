from django.urls import path
from menu.views.owner_menu import OwnerMenuViewSet 


urlpatterns = [
    # Owner
    path(
        "owner/restaurants/<int:restaurant_id>/",
        OwnerMenuViewSet.as_view({
            "get": "list",
            "post": "create"
        })
    ),

    path(
        "owner/restaurants/<int:restaurant_id>/<int:pk>/",
        OwnerMenuViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "delete": "destroy"
        })
    ),
]