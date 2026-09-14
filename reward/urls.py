from django.urls import path

from .views import (
    BindWalletView,
    ExperienceVoucherView,
    GreencardStatusView,
    GreencardVoucherView,
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
        "greencard/status/<str:session_key>/",
        GreencardStatusView.as_view(),
        name="greencard-status",
    ),
    path(
        "greencard/voucher/",
        GreencardVoucherView.as_view(),
        name="greencard-voucher",
    ),
    path(
        "progress/<str:session_key>/vouchers/",
        ProgressVouchersView.as_view(),
        name="progress-vouchers",
    ),
]
