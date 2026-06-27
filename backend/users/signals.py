from django.db.models.signals import post_save
from django.dispatch import receiver
from users.models.user import User
from customer.models.profile import Profile
from delivery.models.delivery_partner import DeliveryPartner

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.role == User.Role.CUSTOMER:
            Profile.objects.get_or_create(user=instance)
        elif instance.role == User.Role.DELIVERY_PARTNER:
            DeliveryPartner.objects.get_or_create(user=instance)

