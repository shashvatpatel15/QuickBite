from django.contrib import admin
from restaurants.models.restaurant import Restaurant
from restaurants.models.restaurant_timing import RestaurantTiming

admin.site.register([Restaurant, RestaurantTiming])
