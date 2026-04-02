# NeoAi Frontend

NeoAi is a React frontend for an AI-assisted clinical workflow, currently focused on ultrasound review and frame selection for a Spring Boot backend.

## Current stack

- React 18
- Vite
- React Router
- MUI
- Plain CSS split under `src/styles/`

## Current workflow

- Login for doctor and admin users
- Main menu with accessible AI assistants
- Patient query by patient id
- Examination list with filtering, sorting, pagination, and expandable video rows
- Data Selection workspace for region-based ultrasound frame selection
- Placeholder pages for:
  - Data Preprocessing
  - AI Module Selection
  - AI Results
  - Reporting
- Admin panel

## Run locally

Install dependencies:

```bash
npm.cmd install
```

Start the development server:

```bash
npm.cmd run dev
```

Create a production build:

```bash
npm.cmd run build
```

## Demo accounts

- Doctor: `doctor` / `doctor123`
- Admin: `admin` / `admin123`

## Project structure

- `src/components/AppLayout.jsx`: top app shell, brand link, profile menu
- `src/components/ProtectedRoute.jsx`: route protection
- `src/components/WorkflowSteps.jsx`: workflow navigation memory between steps
- `src/context/AuthContext.jsx`: authentication/session state
- `src/pages/DashboardPage.jsx`: main assistant selection page
- `src/pages/PatientQueryWorkflowPage.jsx`: patient query and examination selection
- `src/pages/DataSelectionPage.jsx`: ultrasound frame selection workspace
- `src/pages/AdminPanelPage.jsx`: admin actions
- `src/services/mockApi.js`: mock backend service layer
- `src/data/mockData.js`: sample patient, examination, video, thumbnail, and video asset data
- `src/utils/workflowState.js`: workflow context and visited-step persistence
- `src/styles/`: active stylesheet directory
- `src/theme.js`: MUI theme

## Notes

- The frontend currently uses mock data and sample media for development.
- The selection page is custom UI  full yet.
- Styling now comes from the files in `src/styles/`. The old root `src/styles.css` has been removed.
