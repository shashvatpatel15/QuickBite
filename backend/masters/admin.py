from django.contrib import admin
from masters.models.category import Category
from masters.models.food_type import FoodType

admin.site.register([Category,FoodType])