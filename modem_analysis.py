import pandas as pd

def analyze_modem_data(csv_file):
    """
    Analyze modem data from uploaded CSV file.
    Returns a dictionary with analysis results.
    """
    try:
        # Read CSV file
        df = pd.read_csv(csv_file)
        
        # Convert numeric columns
        df['USP'] = pd.to_numeric(df['USP'], errors='coerce')
        df['DSP'] = pd.to_numeric(df['DSP'], errors='coerce')
        
        # Extract ON node from dpath column
        df['ON_NODE'] = df['dpath'].str.extract(r'(ON-\d+-\d+)')
        
        # Get column N and F names
        on_names_col = df.columns[13]  # Column N is index 13 (0-based)
        dss_col = df.columns[5]  # Column F is index 5 (0-based)
        
        # Convert column F to numeric
        df[dss_col] = pd.to_numeric(df[dss_col], errors='coerce')
        
        # Create a mapping of ON_NODE to the text in column N
        def get_valid_on_name(on_node):
            rows_with_on = df[df['ON_NODE'] == on_node]
            valid_names = rows_with_on[on_names_col]
            valid_names = valid_names[valid_names.notna() & (valid_names != '-') & (valid_names != '')]
            
            names_with_code = valid_names[valid_names.str.contains(on_node, regex=False, na=False)]
            
            if len(names_with_code) > 0:
                return names_with_code.iloc[0]
            elif len(valid_names) > 0:
                return valid_names.iloc[0]
            return 'Unknown'
        
        on_node_to_name = {}
        for on_node in df['ON_NODE'].dropna().unique():
            on_node_to_name[on_node] = get_valid_on_name(on_node)
        
        # Count total modems with valid USP/DSP/DSS values
        count_total_modems = df[(df['USP'].notna()) & (df['DSP'].notna()) & (df[dss_col].notna())].shape[0]
        
        # Count rows that meet USP/DSP conditions
        count_usp_dsp = ((df['USP'] > 50.9) | (df['USP'] < 33) | (df['DSP'] > 14.9) | (df['DSP'] < -6.9)).sum()
        
        # Count rows that meet USP/DSP/DSS conditions
        count_usp_dsp_dss = ((df['USP'] > 50.9) | (df['USP'] < 33) | (df['DSP'] > 14.9) | (df['DSP'] < -6.9) | (df[dss_col] < 36)).sum()
        
        # Filter rows that meet the conditions
        filtered_df = df[(df['USP'] > 50.9) | (df['USP'] < 33) | (df['DSP'] > 14.9) | (df['DSP'] < -6.9)]
        
        # TOP 10 AMP ANALYSIS
        top_10_amp = filtered_df['AMP_NAME'].value_counts().head(10)
        results_amp = []
        for i, amp_name in enumerate(top_10_amp.index, 1):
            amp_data = filtered_df[filtered_df['AMP_NAME'] == amp_name]
            
            usp_count = ((amp_data['USP'] > 50.9) | (amp_data['USP'] < 33)).sum()
            dsp_count = ((amp_data['DSP'] > 14.9) | (amp_data['DSP'] < -6.9)).sum()
            
            results_amp.append({
                'rank': i,
                'amp_name': amp_name,
                'total_count': int(top_10_amp[amp_name]),
                'usp_count': int(usp_count),
                'dsp_count': int(dsp_count)
            })
        
        # TOP 10 ON NODES ANALYSIS
        top_10_on = filtered_df['ON_NODE'].value_counts().head(10)
        results_on = []
        for i, on_node in enumerate(top_10_on.index, 1):
            on_data = filtered_df[filtered_df['ON_NODE'] == on_node]
            
            usp_count = ((on_data['USP'] > 50.9) | (on_data['USP'] < 33)).sum()
            dsp_count = ((on_data['DSP'] > 14.9) | (on_data['DSP'] < -6.9)).sum()
            
            column_n_text = on_node_to_name.get(on_node, 'Unknown')
            
            results_on.append({
                'rank': i,
                'on_node': on_node,
                'on_name': column_n_text,
                'total_count': int(top_10_on[on_node]),
                'usp_count': int(usp_count),
                'dsp_count': int(dsp_count)
            })
        
        # TOP 20 DSS ANALYSIS
        filtered_dss = df[df[dss_col] < 36]
        top_20_dss = filtered_dss['ON_NODE'].value_counts().head(20)
        results_dss = []
        for i, on_node in enumerate(top_20_dss.index, 1):
            column_n_text = on_node_to_name.get(on_node, 'Unknown')
            
            results_dss.append({
                'rank': i,
                'on_node': on_node,
                'on_name': column_n_text,
                'dss_count': int(top_20_dss[on_node])
            })
        
        # Return all results
        return {
            'success': True,
            'summary': {
                'total_modems': int(count_total_modems),
                'usp_dsp_count': int(count_usp_dsp),
                'usp_dsp_dss_count': int(count_usp_dsp_dss)
            },
            'top_10_amp': results_amp,
            'top_10_on': results_on,
            'top_20_dss': results_dss
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
