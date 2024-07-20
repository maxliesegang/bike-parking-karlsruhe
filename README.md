# Fahrrad-Abstellanlagen in Karlsruhe

## Overview

This project provides a web application to explore and analyze bicycle parking facilities (Fahrrad-Abstellanlagen) in Karlsruhe and surrounding areas. It offers an intuitive interface to view data about parking spots, their locations, and associated information across different municipalities and districts.

## Live Demo

Visit the live application: [Fahrrad-Abstellanlagen in Karlsruhe](https://maxliesegang.github.io/bike-parking-karlsruhe/)

## Features

- Overview of all bicycle parking facilities
- Detailed view of facilities by municipality (Gemeinde)
- Information about Bike+Ride (B+R) stations
- Interactive tables with sorting capabilities
- Responsive design for desktop and mobile devices

## Technology Stack

- [Next.js](https://nextjs.org/) - React framework for server-side rendering and static site generation
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [Material-UI](https://mui.com/) - React UI framework
- [React](https://reactjs.org/) - JavaScript library for building user interfaces

## Getting Started

### Prerequisites

- Node.js (version 14 or later)
- npm (usually comes with Node.js)

### Installation

1. Clone the repository:
   `git clone https://github.com/maxliesegang/bike-parking-karlsruhe.git`
2. Navigate to the project directory:
   ```cd bike-parking-karlsruhe````
3. Install dependencies:
   `npm install`

### Running the Development Server

`npm run dev`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

`npm run build`

### Running the Production Server

`npm start`

## Project Structure

- `src/pages/` - Next.js pages
- `src/components/` - React components
- `src/models/` - TypeScript interfaces
- `src/lib/` - Utility functions and data processing
- `src/styles/` - Global styles and theme

## Data Source

The data for this project comes from the City of Karlsruhe's open data portal. For more information, visit the [About page](/about) of the application.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Data provided by the City of Karlsruhe under CC-BY 4.0 license
- Interactive map provided by Mobilitätsportal Technologie Region Karlsruhe
