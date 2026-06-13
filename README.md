# SPACEYA

A comprehensive space and property lifecycle management application. SPACEYA provides an end-to-end digital workflow for real estate agents, property administrators, and tenants. It features role-based dashboards, wallet and payment management, maintenance ticketing, and screening processes in a sleek, modern UI.

## Features

- **Role-Based Access**: Dedicated workflows and dashboards for Admin, Agent, and Tenant users.
- **Wallet & Payments**: Secure integrated wallet system for rent and fee settlements.
- **Property Management**: Complete lifecycle tracking for properties from vacant listing to active tenancy.
- **Screenings & Applications**: Manage prospective tenant applications and screening checks.
- **Maintenance Ticketing**: Integrated ticket system for property maintenance requests.
- **Reporting & Notifications**: Real-time notifications and detailed metric reporting for agents and admins.

## Tech Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **Animations**: Motion (Framer Motion)
- **Database / Backend**: Firebase (Firestore)
- **Charts**: Recharts
- **Language**: TypeScript

## Getting Started

### Prerequisites

Make sure you have Node.js installed.

### Installation

1. Install all required dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Configuration

You need to connect this app to a Firebase project. Make sure you set up exactly:

1. A Firebase project with Firestore and Authentication enabled.
2. Configure the necessary Firebase environment variables (or rely on the `firebase-applet-config.json` generated in the AI Studio platform).
3. Deploy the provided `firestore.rules` to secure your collections.

### Project Structure

- `pages/`: Contains the main application views (e.g., Dashboard, Properties, Maintenance, Login, Profile).
- `store.ts`: Global application state manager (syncs securely with Firestore in real time).
- `services/`: Specialized services, such as the `simulationEngine` used to mock payment processing logic.
- `lib/`: Helper libraries such as notification push system or loggers.
- `App.tsx`: Main router handling authorization rendering for different pages.

## License

This project is tailored for operations inside and outside the AI Studio environment.
