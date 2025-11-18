from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def analyze_modem_data(df):
    """
    Analyze modem data and return statistics about bad modems per amplifier
    Adjust column names based on your actual Excel structure
    """
    try:
        # Example analysis - modify based on your actual column names
        # Assuming columns like: 'Amplifier', 'Modem_Status', 'Modem_ID', etc.
        
        results = {
            'total_rows': len(df),
            'columns': list(df.columns),
            'summary': {},
            'detailed_data': []
        }
        
        # Example: Count bad modems per amplifier
        # You'll need to adjust this based on your actual data structure
        if 'Amplifier' in df.columns and 'Status' in df.columns:
            bad_modems = df[df['Status'].str.lower().str.contains('bad|faulty|error', na=False)]
            amplifier_counts = bad_modems.groupby('Amplifier').size().to_dict()
            results['summary'] = amplifier_counts
            results['detailed_data'] = bad_modems.to_dict('records')[:100]  # Limit to 100 rows
        else:
            # Return first few rows for inspection if columns don't match
            results['sample_data'] = df.head(10).to_dict('records')
        
        return results
    
    except Exception as e:
        return {'error': f'Analysis error: {str(e)}'}

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Read the file based on extension
            if filename.endswith('.csv'):
                df = pd.read_csv(filepath)
            else:
                df = pd.read_excel(filepath)
            
            # Analyze the data
            analysis_results = analyze_modem_data(df)
            
            # Clean up uploaded file
            os.remove(filepath)
            
            return jsonify({
                'success': True,
                'filename': filename,
                'results': analysis_results
            }), 200
            
        except Exception as e:
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)