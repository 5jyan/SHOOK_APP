# Gemini Code Assistant Context

## Project Overview

This is a [React Native](https://reactnative.dev/) mobile application built using the [Expo](https://expo.dev/) framework. The project is written in [TypeScript](https://www.typescriptlang.org/) and utilizes [Tailwind CSS](https://tailwindcss.com/) for styling via [NativeWind](https://www.nativewind.dev/).

**Key Technologies:**

*   **Framework:** Expo SDK 53
*   **Language:** TypeScript
*   **UI:** React Native, NativeWind, Tailwind CSS
*   **Navigation:** Expo Router (file-based routing)
*   **State Management:** Zustand
*   **Data Fetching:** TanStack Query
*   **Authentication:** Google OAuth (with `expo-auth-session`)

The application structure follows a standard React Native pattern with a clear separation of concerns. The `src` directory contains the core application logic, including components, hooks, services, and state management stores. The `app` directory defines the routes for the application using Expo's file-based routing system.

## Building and Running

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run the Application:**
    *   **Development Server:**
        ```bash
        npx expo start
        ```
    *   **Android:**
        ```bash
        npm run android
        ```
    *   **iOS:**
        ```bash
        npm run ios
        ```
    *   **Web:**
        ```bash
        npm run web
        ```

3.  **Linting:**
    To check for code quality and style issues, run:
    ```bash
    npm run lint
    ```

## Development Conventions

*   **Styling:** Use Tailwind CSS classes for styling components.
*   **State Management:** Use Zustand for managing global application state.
*   **Data Fetching:** Use TanStack Query for fetching and caching data from APIs.
*   **Routing:** Use file-based routing with Expo Router.
*   **Code Quality:** Adhere to the ESLint rules defined in `eslint.config.js`.
