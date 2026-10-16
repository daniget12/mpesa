# TirfMarket

M-Pesa cash-on-demand discount marketplace platform for Ethiopia, featuring a Telegram bot and Next.js web application.

> [!NOTE]
> **Mock Mode Testing**: In `mock` mode, an STK push payment completes after ~4 seconds automatically (`status: "paid"`).
> Any phone number ending in `0000` (e.g. `0711220000`, `0911220000`, or `+251700000000`) intentionally fails on purpose (`status: "failed"`, `failureReason: "System internal error."`) to simulate declined payments and test error recovery.
