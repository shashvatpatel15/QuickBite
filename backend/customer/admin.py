from django.contrib import admin
from customer.models.address import Address
from customer.models.profile import Profile

admin.site.register([Address, Profile])
