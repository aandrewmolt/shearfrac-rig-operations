# ShearFrac Operations Platform

## Overview

ShearFrac Operations Platform is an internal tool for managing oil & gas field operations, including:
- **Equipment Inventory Management** - Track and manage all equipment across locations
- **Contacts Database** - Manage clients, personnel, and vendor contacts
- **Rig Visualization** - Visual deployment and configuration of well equipment

## Technology Stack

- **Frontend**: React with TypeScript
- **Database**: Turso (SQLite at the edge)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Local Development

```sh
# Clone the repository
git clone git@github.com:aandrewmolt/well-rig-visualizer.git

# Navigate to the project directory
cd well-rig-visualizer

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the root directory with:

```
VITE_TURSO_DATABASE_URL=your-turso-database-url
VITE_TURSO_AUTH_TOKEN=your-turso-auth-token
```

## Features

### Equipment Inventory
- Track individual and bulk equipment
- Manage equipment status (available, deployed, maintenance, red-tagged, retired)
- Equipment transfer between locations
- Deployment history and tracking

### Contacts Management
- Client and personnel database
- Custom contact types
- Advanced search and filtering
- Full audit trail with Turso database

### Rig Visualization
- Visual diagram of well equipment setup
- Drag-and-drop equipment configuration
- Cable connection management
- Real-time equipment allocation

## Database

The application uses Turso (distributed SQLite) for data storage:
- Contacts are stored in Turso tables
- Equipment inventory in Turso
- Job configurations and diagrams

## Security

This is an internal tool with basic authentication. For production use, implement:
- Proper authentication (OAuth, SSO)
- Role-based access control
- HTTPS only
- IP restrictions
- Audit logging

## Deployment

The application is configured for Vercel deployment. See `vercel.json` for configuration.

## Repository Structure

- **Main Repository**: https://github.com/aandrewmolt/well-rig-visualizer
- **Data Repository**: https://github.com/aandrewmolt/shearfrac-data (legacy - now using Turso)

## Support

For issues or questions, contact the ShearFrac IT team.