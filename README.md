# Don Schedule Manager

A scheduling tool for residence dons to balance classes, don duties, and personal time.

![Don Schedule Manager](screenshot.png)

## Features

- **Class Schedule Import**
  - CSV upload with drag-and-drop support
  - Screenshot upload for reference
  - Manual class entry
  - Supports multiple time formats (9:30am, 14:00, 2pm)
  - Handles combined days (MWF, Mon/Wed/Fri)

- **RLM Calendar Upload**
  - Upload monthly RLM calendar photos for reference
  - Click to enlarge view

- **Community Connection Tracker**
  - Input community size and deadline
  - Calculates connections needed per week/day
  - Provides pacing recommendations

- **Auto-Generated Schedule**
  - 2 hours/day personal time
  - 15 hours/week don duties
  - 8 hours/week study time
  - Automatic meal blocks
  - Social/activities time

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/don-scheduler.git
cd don-scheduler
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## CSV Format

The app accepts CSV files with class schedules. Example format:

```csv
Class Name,Day,Start,End
PSYCH 101,Monday,9:00am,10:30am
MATH 200,MWF,14:00,15:00
BIO 301,Tuesday,2pm,4pm
CHEM 101,Mon/Wed,10:00,11:00
```

### Supported Day Formats
- Full names: Monday, Tuesday, etc.
- Abbreviations: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- Single letters: M, T, W, R (Thursday), F, S, U (Sunday)
- Combined: MWF, TR, Mon/Wed/Fri

### Supported Time Formats
- 12-hour: 9:00am, 2:30pm, 9am
- 24-hour: 14:00, 09:30

## Tech Stack

- React 18
- Lucide React (icons)
- CSS-in-JS styling

## Project Structure

```
don-scheduler/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.jsx
│   ├── index.js
│   └── index.css
├── package.json
├── README.md
├── .gitignore
└── LICENSE
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for residence life staff
- Designed to help dons balance academic and community responsibilities
