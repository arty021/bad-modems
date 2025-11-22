from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime
from modem_analysis import analyze_modem_data

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['DATA_FOLDER'] = 'data'

# List of cities to analyze
CITIES = ['novi_sad', 'sombor', 'vrsac', 'zrenjanin', 'vrbas', 'kikinda']

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['DATA_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_city_results(city, results):
    """Save analysis results for a city to JSON file"""
    filepath = os.path.join(app.config['DATA_FOLDER'], f'{city}_latest.json')
    results['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    results['city'] = city
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

def load_city_results(city):
    """Load latest analysis results for a city from JSON file"""
    filepath = os.path.join(app.config['DATA_FOLDER'], f'{city}_latest.json')
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

@app.route('/')
def index():
    return render_template('index.html', cities=CITIES)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    if 'city' not in request.form:
        return jsonify({'success': False, 'error': 'No city specified'}), 400
    
    file = request.files['file']
    city = request.form['city'].lower()
    
    # Validate city
    if city not in CITIES:
        return jsonify({'success': False, 'error': f'Invalid city: {city}'}), 400
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type. Please upload a CSV file.'}), 400
    
    try:
        # Analyze the file directly from memory
        results = analyze_modem_data(file)
        
        if results['success']:
            # Save results for this city
            save_city_results(city, results)
            return jsonify(results), 200
        else:
            return jsonify(results), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error processing file: {str(e)}'}), 500

@app.route('/get_latest/<city>', methods=['GET'])
def get_latest(city):
    """Get the latest analysis results for a city"""
    city = city.lower()
    
    if city not in CITIES:
        return jsonify({'success': False, 'error': f'Invalid city: {city}'}), 400
    
    results = load_city_results(city)
    
    if results:
        return jsonify(results), 200
    else:
        return jsonify({'success': False, 'error': 'No data available for this city'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
