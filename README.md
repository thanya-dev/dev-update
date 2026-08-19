# Executive Release Dashboard

An interactive executive-level dashboard for tracking product releases, delivery effort (mandays), and feature usage metrics. Built with React, Vite, Tailwind CSS, and Chart.js.

## Features

- **Monthly Release Cadence:** View all product releases grouped horizontally by month.
- **Filtering:** Quickly filter releases by **Year** and **Type** (Feature, Improvement, Bug Fix).
- **Release Details:** Click on any release card to view in-depth details in a modal.
  - **Implementation Timeline:** A Gantt-like timeline chart showing Requirement, Design, Development, and Test/UAT phases.
  - **Effort Breakdown:** Detailed view of mandays (MD) spent per phase and owner.
- **Usage Tracking:** Integrated with Sheety APIs to pull real-time usage reports for specific features (e.g., *Search by Brief*, *Draft Submissions*, *Buddy Ranks*, *Content Idea Co-pilot*, and *Campaign Reports*). Usage data is displayed as stacked bar charts (aggregatable by Day, Month, or Year) with an automatic release date marker.

## Tech Stack

- **Framework:** [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Charting:** [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Date Parsing:** [date-fns](https://date-fns.org/)
- **Icons:** [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:5173`).

### Build for Production

To create a production build:
```bash
npm run build
```
The optimized files will be generated in the `dist` folder.
