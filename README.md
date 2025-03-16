# Font Downloader Node.js Script

This project is a Node.js script that automates the downloading of fonts from Type Network. It uses Puppeteer for web scraping, HTTPS requests for downloading, and a progress bar to track the download process efficiently. The script also detects already downloaded fonts to prevent redundant downloads.

## Features

- **Automated Font Downloading**: Retrieves fonts from Type Network using Puppeteer.
- **Supports Multiple Font Types and Weights**: Allows downloading specific or all font types and weights.
- **Progress Tracking**: Displays a progress bar with estimated time and completion percentage.
- **Skips Already Downloaded Fonts**: Prevents unnecessary downloads by checking existing files.
- **Formatted Logging**: Provides clear logs for each step of the process.

## Technologies Used

- **Node.js**: JavaScript runtime for executing the script.
- **Puppeteer**: Headless browser automation for scraping font download links.
- **HTTPS**: Handles file downloads via secure requests.
- **cli-progress**: Displays a progress bar for better visualization.
- **FS (File System)**: Manages file creation and directory structure.

## Installation

Ensure you have [Node.js](https://nodejs.org/) installed on your system.

Clone the repository and install dependencies:

```sh
npm install
```

## Usage

Run the script with the following command:

```sh
node index.js "Font Name" "Font Type" "Font Weight"
```

### Example

To download all font types and weights for "Joie Grotesk":

```sh
node index.js "Joie Grotesk" "*" "*"
```

To download only "Condensed Bold" for "Joie Grotesk":

```sh
node index.js "Joie Grotesk" "Condensed" "Bold"
```

## Project Structure

```
.
├── fonts/                 # Stores downloaded fonts
├── index.js               # Main script file
├── package.json           # Project metadata and dependencies
└── README.md              # Documentation
```

## Output

Downloaded fonts are stored in structured directories:

```
fonts/
  Joie Grotesk/
    Condensed/
      joie-grotesk-condensed-bold.woff2
      joie-grotesk-condensed-light.woff2
```

## Contributing

Feel free to fork and submit pull requests to improve functionality.

## License

This project is open-source and available under the MIT License.

