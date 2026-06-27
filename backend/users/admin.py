from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models.user import User
from users.models.otp import OTP

admin.site.register(OTP)

@admin.register(User)
class CustomUserAdmin(UserAdmin):

    model = User

    list_display = (
        "id",
        "email",
        "role",
        "is_verified",
        "is_staff"
    )

    ordering = ("date_joined",)

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password"
                )
            }
        ),
        (
            "Permissions",
            {
                "fields": (
                    "role",
                    "is_verified",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions"
                )
            }
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "role",
                    "is_staff",
                    "is_superuser"
                ),
            },
        ),
    )

    search_fields = ("email",)