# Module: Server Actions

## Description
This directory contains Next.js Server Actions. These are asynchronous functions that are executed on the server but can be called directly from Client Components. They are often used for form submissions and mutations.

## Capabilities
- **Internal Products Management** (`internal-products.ts`):
  - Logic for handling inventory/products within the `internal-warehouse` module.
- **Authentication Support**:
  - `reset-password.ts`: Handles the password reset flow securely on the server.
- **File Uploads**:
  - `upload-cv.ts`: Specialized action for uploading Curriculum Vitae files, likely linked to the `hr` or `users` module.

## Agent Context
- **Usage**: Use these actions in Client Components (`use client`) to perform server-side logic without creating a full API route.
- **Security**: Server Actions must strictly validate inputs and user authentication/authorization, as they are public endpoints under the hood.
- **Pattern**: If a task is simple (like a form submit), prefer a Server Action over a new API route.
