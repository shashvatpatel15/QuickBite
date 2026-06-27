from rest_framework.permissions import BasePermission
from users.models.user import User


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and request.user.role == User.Role.CUSTOMER )

class IsRestaurantOwner(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and request.user.role == User.Role.RESTAURANT_OWNER)

class IsDeliveryPartner(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and request.user.role == User.Role.DELIVERY_PARTNER)
    
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and request.user.role == User.Role.ADMIN
        )

class IsRestaurantOwnerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.RESTAURANT_OWNER,
                User.Role.ADMIN
            ]
        )

class IsCustomerOrRestaurantOwner(BasePermission):

    def has_permission(self, request, view):

        return (
            request.user.is_authenticated
            and request.user.role in [
                User.Role.CUSTOMER,
                User.Role.RESTAURANT_OWNER
            ]
        )