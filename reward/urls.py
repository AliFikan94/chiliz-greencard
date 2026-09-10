from django.urls import path

from .views import (
    BindWalletView,
    ExperienceVoucherView,
    JourneyVoucherView,
    ProgressVouchersView,
)

urlpatterns = [
    path("wallet/", BindWalletView.as_view(), name="bind-wallet"),
    path(
        "experience/<int:experience_id>/voucher/",
        ExperienceVoucherView.as_view(),
        name="experience-voucher",
    ),
    path(
        "journey/<slug:slug>/voucher/",
        JourneyVoucherView.as_view(),
        name="journey-voucher",
    ),
    path(
        "progress/<str:session_key>/vouchers/",
        ProgressVouchersView.as_view(),
        name="progress-vouchers",
    ),
]
