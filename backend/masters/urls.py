from django.urls import path
from masters.views.category import CategoryListView
from masters.views.food_type import FoodTypeListView

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("food-types/", FoodTypeListView.as_view(), name="food-type-list"),
]

