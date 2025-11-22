# 📡 Modem Analysis Web Application

A modern web application for analyzing modem performance data from CSV files.

## Features

✨ **Drag & Drop File Upload** - Easy CSV file upload with drag-and-drop support  
📊 **Interactive Dashboard** - Beautiful, responsive data tables  
🎨 **Modern UI** - Dark mode with glassmorphism effects and smooth animations  
📈 **Comprehensive Analysis** - Top 10 AMP, Top 10 ON Nodes, and Top 20 DSS analysis  

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Application

```bash
python app.py
```

### 3. Open in Browser

Navigate to: `http://localhost:5000`

## Usage

1. **Upload CSV File**: Drag and drop your CSV file or click to browse
2. **View Results**: The application will automatically analyze the data and display:
   - Summary statistics (Total Modems, USP+DSP count, USP+DSP+DSS count)
   - Top 10 AMP with most issues
   - Top 10 ON Nodes with most issues
   - Top 20 ON Nodes by DSS issues

## CSV File Format

The application expects a CSV file with the following columns:
- `USP` - Upstream Power
- `DSP` - Downstream Power
- `dpath` - Data path containing ON node information
- `AMP_NAME` - Amplifier name
- Column F (index 5) - DSS values
- Column N (index 13) - ON node names

## Analysis Criteria

**USP/DSP Issues:**
- USP > 50.9 or USP < 33
- DSP > 14.9 or DSP < -6.9

**DSS Issues:**
- DSS < 36

## Docker Deployment (Optional)

If you have a Dockerfile, you can build and run the application in Docker:

```bash
docker build -t modem-analysis .
docker run -p 5000:5000 modem-analysis
```

## Project Structure

```
Analiza_modema_web/
├── app.py                      # Flask application
├── modem_analysis.py           # Analysis logic
├── requirements.txt            # Python dependencies
├── templates/
│   └── index.html             # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css          # Styling
│   └── js/
│       └── script.js          # JavaScript functionality
└── Dnevna analiza bad modema.py  # Original script (reference)
```

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Data Processing**: Pandas
- **Styling**: Custom CSS with glassmorphism and gradients

## Notes

- Maximum file upload size: 50MB
- Only CSV files are accepted
- Files are processed in memory for security
- No data is stored on the server

---

Created with ❤️ for modem performance analysis
