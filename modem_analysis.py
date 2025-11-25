import pandas as pd
import numpy as np

def analyze_modem_data(csv_file):
    """
    Analyze modem data from uploaded CSV file.
    Returns a dictionary with analysis results.
    """
    try:
        # Read CSV file
        df = pd.read_csv(csv_file)
        
        # Get column F name (DSS column - index 5)
        dss_col = df.columns[5]
        
        # Get column N name (ON names - index 13)
        on_names_col = df.columns[13]
        
        # Function to check if value is a valid number (including negatives)
        # Returns True for valid numbers, False for '-', blank, or non-numeric
        def is_valid_number(val):
            if pd.isna(val):
                return False
            if isinstance(val, (int, float)):
                return not np.isnan(val)
            # String check - exclude literal dash '-' but allow negative numbers like '-5.2'
            str_val = str(val).strip()
            if str_val == '-' or str_val == '' or str_val.lower() == 'nan':
                return False
            try:
                float(str_val)
                return True
            except ValueError:
                return False
        
        # Create masks for valid values in each column
        usp_valid = df['USP'].apply(is_valid_number)
        dsp_valid = df['DSP'].apply(is_valid_number)
        dss_valid = df[dss_col].apply(is_valid_number)
        
        # Filter dataframe to only include rows with valid values in ALL three columns
        valid_mask = usp_valid & dsp_valid & dss_valid
        df_valid = df[valid_mask].copy()
        
        # Now convert to numeric (this will work properly since we filtered valid values)
        df_valid['USP'] = pd.to_numeric(df_valid['USP'], errors='coerce')
        df_valid['DSP'] = pd.to_numeric(df_valid['DSP'], errors='coerce')
        df_valid[dss_col] = pd.to_numeric(df_valid[dss_col], errors='coerce')
        
        # Extract ON node from dpath column
        df_valid['ON_NODE'] = df_valid['dpath'].str.extract(r'(ON-\d+-\d+)')
        
        # Extract AMP code from dpath column (last AMP-XX-XXXXX pattern)
        def extract_amp_code(dpath):
            if pd.isna(dpath):
                return None
            import re
            matches = re.findall(r'(AMP-\d+-\d+)', str(dpath))
            return matches[-1] if matches else None
        
        df_valid['AMP_CODE'] = df_valid['dpath'].apply(extract_amp_code)
        
        # Create a mapping of ON_NODE to the text in column N
        def get_valid_on_name(on_node):
            rows_with_on = df_valid[df_valid['ON_NODE'] == on_node]
            valid_names = rows_with_on[on_names_col]
            valid_names = valid_names[valid_names.notna() & (valid_names != '-') & (valid_names != '')]
            
            names_with_code = valid_names[valid_names.str.contains(str(on_node), regex=False, na=False)]
            
            if len(names_with_code) > 0:
                return names_with_code.iloc[0]
            elif len(valid_names) > 0:
                return valid_names.iloc[0]
            return 'Unknown'
        
        on_node_to_name = {}
        for on_node in df_valid['ON_NODE'].dropna().unique():
            on_node_to_name[on_node] = get_valid_on_name(on_node)
        
        # Create mapping of AMP_NAME to AMP_CODE
        amp_name_to_code = {}
        for amp_name in df_valid['AMP_NAME'].dropna().unique():
            amp_rows = df_valid[df_valid['AMP_NAME'] == amp_name]
            codes = amp_rows['AMP_CODE'].dropna().unique()
            amp_name_to_code[amp_name] = codes[-1] if len(codes) > 0 else 'N/A'
        
        # Count total valid modems (only those with valid USP, DSP, and DSS values)
        count_total_modems = len(df_valid)
        
        # Count rows that meet USP/DSP conditions (PWR issues)
        pwr_condition = ((df_valid['USP'] > 50.9) | (df_valid['USP'] < 33) | 
                         (df_valid['DSP'] > 15.9) | (df_valid['DSP'] < -8.9))
        count_usp_dsp = pwr_condition.sum()
        
        # Count rows that meet DSS condition only (SNR issues, not already counted in PWR)
        dss_condition = df_valid[dss_col] < 36
        dss_only_condition = dss_condition & ~pwr_condition
        count_dss_only = dss_only_condition.sum()
        
        # Count rows that meet ANY condition (total bad modems)
        any_bad_condition = pwr_condition | dss_condition
        count_usp_dsp_dss = any_bad_condition.sum()
        
        # Filter rows that meet the PWR conditions for AMP and ON analysis
        filtered_df = df_valid[pwr_condition]
        
        # TOP 10 AMP ANALYSIS
        top_10_amp = filtered_df['AMP_NAME'].value_counts().head(10)
        results_amp = []
        for i, amp_name in enumerate(top_10_amp.index, 1):
            amp_data = filtered_df[filtered_df['AMP_NAME'] == amp_name]
            
            # Total modems for this AMP (from valid data)
            total_amp_modems = len(df_valid[df_valid['AMP_NAME'] == amp_name])
            bad_amp_modems = len(amp_data)
            
            usp_count = ((amp_data['USP'] > 50.9) | (amp_data['USP'] < 33)).sum()
            dsp_count = ((amp_data['DSP'] > 15.9) | (amp_data['DSP'] < -8.9)).sum()
            
            # Calculate percentage of bad modems for this AMP
            percentage = round((bad_amp_modems / total_amp_modems * 100), 2) if total_amp_modems > 0 else 0
            
            results_amp.append({
                'rank': i,
                'amp_name': amp_name,
                'amp_code': amp_name_to_code.get(amp_name, 'N/A'),
                'bad_count': int(bad_amp_modems),
                'total_count': int(total_amp_modems),
                'percentage': percentage,
                'usp_count': int(usp_count),
                'dsp_count': int(dsp_count)
            })
        
        # TOP 10 ON NODES ANALYSIS
        top_10_on = filtered_df['ON_NODE'].value_counts().head(10)
        results_on = []
        for i, on_node in enumerate(top_10_on.index, 1):
            on_data = filtered_df[filtered_df['ON_NODE'] == on_node]
            
            # Total modems for this ON node (from valid data)
            total_on_modems = len(df_valid[df_valid['ON_NODE'] == on_node])
            bad_on_modems = len(on_data)
            
            usp_count = ((on_data['USP'] > 50.9) | (on_data['USP'] < 33)).sum()
            dsp_count = ((on_data['DSP'] > 15.9) | (on_data['DSP'] < -8.9)).sum()
            
            column_n_text = on_node_to_name.get(on_node, 'Unknown')
            
            # Calculate percentage of bad modems for this ON node
            percentage = round((bad_on_modems / total_on_modems * 100), 2) if total_on_modems > 0 else 0
            
            results_on.append({
                'rank': i,
                'on_node': on_node,
                'on_name': column_n_text,
                'bad_count': int(bad_on_modems),
                'total_count': int(total_on_modems),
                'percentage': percentage,
                'usp_count': int(usp_count),
                'dsp_count': int(dsp_count)
            })
        
        # TOP 20 DSS ANALYSIS
        filtered_dss = df_valid[df_valid[dss_col] < 36]
        top_20_dss = filtered_dss['ON_NODE'].value_counts().head(20)
        results_dss = []
        for i, on_node in enumerate(top_20_dss.index, 1):
            column_n_text = on_node_to_name.get(on_node, 'Unknown')
            
            # Total modems for this ON node (from valid data)
            total_on_modems = len(df_valid[df_valid['ON_NODE'] == on_node])
            bad_dss_modems = int(top_20_dss[on_node])
            
            # Calculate percentage of bad modems for this ON node
            percentage = round((bad_dss_modems / total_on_modems * 100), 2) if total_on_modems > 0 else 0
            
            results_dss.append({
                'rank': i,
                'on_node': on_node,
                'on_name': column_n_text,
                'bad_count': bad_dss_modems,
                'total_count': int(total_on_modems),
                'percentage': percentage
            })
        
        # Return all results
        return {
            'success': True,
            'summary': {
                'total_modems': int(count_total_modems),
                'usp_dsp_count': int(count_usp_dsp),
                'usp_dsp_dss_count': int(count_usp_dsp_dss),
                'dss_only_count': int(count_dss_only),
                'healthy_count': int(count_total_modems - count_usp_dsp_dss)
            },
            'top_10_amp': results_amp,
            'top_10_on': results_on,
            'top_20_dss': results_dss
        }
        
    except Exception as e:
        import traceback
        return {
            'success': False,
            'error': f'{str(e)}\n{traceback.format_exc()}'
        }