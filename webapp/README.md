This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### M-PESA Payment Testing & Mock Failure Mode
- **Success testing**: Use any standard Safaricom number (e.g. `0711223344`, `0911223344`, or `+2517...`). In mock mode, payment confirms after ~4 seconds.
- **Intentional failure testing**: Any phone ending in `0000` (e.g. `0711220000` or `0911220000`) intentionally fails on purpose (`status: "failed"`, `failureReason: "System internal error."`) to test decline messaging and the retry flow.
- **Pitch demo override**: Append `?demo=1` to the URL when connected to a mock backend to reveal the instant confirmation override shortcut.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
