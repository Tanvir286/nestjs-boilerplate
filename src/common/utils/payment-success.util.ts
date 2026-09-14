export function getPaymentSuccessHtml(sessionId: string): string {
  return `
    <!doctype html>

    <html lang="en">

    <head>
      <meta charset="utf-8" />

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      />

      <title>Payment Successful</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f4faf7;
          color: #163126;
        }

        .card {
          background: #fff;
          border: 1px solid #d8efe1;
          border-radius: 16px;
          padding: 32px;
          max-width: 520px;
          width: calc(100% - 32px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        h1 {
          margin: 0 0 12px;
          color: #11824d;
        }

        p {
          margin: 8px 0;
          line-height: 1.5;
        }

        .session {
          word-break: break-all;
          font-size: 12px;
          background: #eef7f1;
          padding: 10px 12px;
          border-radius: 10px;
        }
      </style>
    </head>

    <body>

      <div class="card">

        <h1>Payment successful</h1>

        <p>
          Your deposit has been completed successfully.
        </p>

        <p class="session">
          Session ID: ${sessionId || 'N/A'}
        </p>

      </div>

    </body>

    </html>
  `;
}