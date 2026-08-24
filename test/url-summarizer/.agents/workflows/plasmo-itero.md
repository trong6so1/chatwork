---
description: Build and Deploy Chrome Extension with Plasmo
---

# Workflow: Plasmo Extension Development

This workflow guides you through developing and deploying a Chrome Extension using Plasmo and Itero.

1. **Initialize Project**
   - Run `npx create-plasmo@latest <project-name>` to start a new project.
   - Choose React/TypeScript for the best developer experience.

2. **Implement Logic**
   - Use `content.ts` for DOM manipulation and data extraction.
   - Use `popup.tsx` for the extension's user interface.
   - Communicate between them using `chrome.runtime.sendMessage`.

3. **Styling**
   - Create a `popup.css` file and import it into `popup.tsx`.
   - Use modern CSS features (gradients, glassmorphism) for a premium feel.

// turbo
4. **Deploy to Itero**
   - Create a GitHub Action in `.github/workflows/submit.yml`.
   - Add `ITERO_TOKEN` to GitHub Secrets.
   - Push to `main` to trigger the deployment.

5. **Verify**
   - Use `pnpm dev` for local testing.
   - Check the Itero dashboard for the deployed version.
