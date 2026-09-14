
export function getPaymentFailedHtml(): string {
  return `
    <!doctype html>

    <html>

      <head>
        <meta charset="utf-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <title>Payment Failed</title>
      </head>

      <body
        style="
          font-family: Arial, sans-serif;
          padding: 40px;
        "
      >

        <h1>Payment failed</h1>

        <p>
          Your payment was not completed.
        </p>

      </body>

    </html>
  `;
}
