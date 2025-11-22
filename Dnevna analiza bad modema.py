import pandas as pd
from datetime import datetime

df = pd.read_csv(r'C:\Users\dukin\Downloads\Test\Vrsac.csv')
df['USP'] = pd.to_numeric(df['USP'], errors='coerce')
df['DSP'] = pd.to_numeric(df['DSP'], errors='coerce')

# Extract ON node from dpath column B (e.g., "ON-05-0001" from "005-002;ON-05-0001;AMP-05-01270")
df['ON_NODE'] = df['dpath'].str.extract(r'(ON-\d+-\d+)')

# Get column N and F names
on_names_col = df.columns[13]  # Column N is index 13 (0-based)
dss_col = df.columns[5]  # Column F is index 5 (0-based)

# Convert column F to numeric
df[dss_col] = pd.to_numeric(df[dss_col], errors='coerce')

# Create a mapping of ON_NODE to the text in column N (skip dashes and empty values)
def get_valid_on_name(on_node):
    # Get rows where this ON_NODE appears in the dpath column
    rows_with_on = df[df['ON_NODE'] == on_node]
    # Get column N values from these rows, filter out dashes, empty strings, and NaN
    valid_names = rows_with_on[on_names_col]
    valid_names = valid_names[valid_names.notna() & (valid_names != '-') & (valid_names != '')]
    
    # Filter to only names that contain the specific ON_NODE code in the text
    names_with_code = valid_names[valid_names.str.contains(on_node, regex=False, na=False)]
    
    if len(names_with_code) > 0:
        return names_with_code.iloc[0]
    elif len(valid_names) > 0:
        # Fallback to first valid name if no exact match found
        return valid_names.iloc[0]
    return 'Unknown'

on_node_to_name = {}
for on_node in df['ON_NODE'].dropna().unique():
    on_node_to_name[on_node] = get_valid_on_name(on_node)

# Count total modems with valid USP/DSP/DSS values (not empty, not dash)
count_total_modems = df[(df['USP'].notna()) & (df['DSP'].notna()) & (df[dss_col].notna())].shape[0]

# Count rows that meet USP/DSP conditions
count_usp_dsp = ((df['USP'] > 50.9) | (df['USP'] < 33) | (df['DSP'] > 14.9) | (df['DSP'] < -6.9)).sum()

# Count rows that meet USP/DSP/DSS conditions
count_usp_dsp_dss = ((df['USP'] > 50.9) | (df['USP'] < 33) | (df['DSP'] > 14.9) | (df['DSP'] < -6.9) | (df[dss_col] < 36)).sum()

print("Top 10 AMP_NAME with most occurrences:")

# Filter rows that meet the conditions
filtered_df = df[(df['USP'] > 50.9) | (df['USP'] < 33) | (df['DSP'] > 14.9) | (df['DSP'] < -6.9)]

# Count occurrences by AMP_NAME and get top 10
top_10_amp = filtered_df['AMP_NAME'].value_counts().head(10)

# Prepare data for AMP export
results_amp = []
for i, amp_name in enumerate(top_10_amp.index, 1):
    amp_data = filtered_df[filtered_df['AMP_NAME'] == amp_name]
    
    usp_count = ((amp_data['USP'] > 50.9) | (amp_data['USP'] < 33)).sum()
    dsp_count = ((amp_data['DSP'] > 14.9) | (amp_data['DSP'] < -6.9)).sum()
    
    print(f"{i}. {amp_name}: {top_10_amp[amp_name]} (USP: {usp_count}, DSP: {dsp_count})")
    
    results_amp.append({
        'Rank': i,
        'AMP_NAME': amp_name,
        'Total_Count': top_10_amp[amp_name],
        'USP_Count': usp_count,
        'DSP_Count': dsp_count
    })

# Ukupan broj bad modema na cvoru - Top 10 ON nodes
print("\n" + "="*60)
print("Ukupan broj bad modema na cvoru - Top 10 ON:")

top_10_on = filtered_df['ON_NODE'].value_counts().head(10)

results_on = []
for i, on_node in enumerate(top_10_on.index, 1):
    on_data = filtered_df[filtered_df['ON_NODE'] == on_node]
    
    usp_count = ((on_data['USP'] > 50.9) | (on_data['USP'] < 33)).sum()
    dsp_count = ((on_data['DSP'] > 14.9) | (on_data['DSP'] < -6.9)).sum()
    
    column_n_text = on_node_to_name.get(on_node, 'Unknown')
    
    print(f"{i}. {on_node} - {column_n_text}: {top_10_on[on_node]} (USP: {usp_count}, DSP: {dsp_count})")
    
    results_on.append({
        'Rank': i,
        'ON_NODE': on_node,
        'ON_NAME': column_n_text,
        'Total_Count': top_10_on[on_node],
        'USP_Count': usp_count,
        'DSP_Count': dsp_count
    })

# Broj losih modema po DSS - Top 20 ON nodes (column F < 35)
print("\n" + "="*60)
print("Broj losih modema po DSS - Top 20 ON:")

filtered_dss = df[df[dss_col] < 36]
top_20_dss = filtered_dss['ON_NODE'].value_counts().head(20)

results_dss = []
for i, on_node in enumerate(top_20_dss.index, 1):
    column_n_text = on_node_to_name.get(on_node, 'Unknown')
    
    print(f"{i}. {on_node} - {column_n_text}: {top_20_dss[on_node]}")
    
    results_dss.append({
        'Rank': i,
        'ON_NODE': on_node,
        'ON_NAME': column_n_text,
        'DSS_Count': top_20_dss[on_node]
    })

print(f"\nUkupan broj modema: {count_total_modems}")
print(f"Total Count USP+DSP: {count_usp_dsp}")
print(f"Total Count USP+DSP+DSS: {count_usp_dsp_dss}")

# Export to Excel with three sheets
current_time = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
filename = f"Bad modemi na dan {current_time}.xlsx"

with pd.ExcelWriter(filename, engine='openpyxl') as writer:
    # Write AMP data
    results_amp_df = pd.DataFrame(results_amp)
    results_amp_df.to_excel(writer, sheet_name='Top 10 AMP', index=False)
    
    # Add total counts to the first sheet
    workbook = writer.book
    worksheet = writer.sheets['Top 10 AMP']
    
    # Write totals below the data
    total_row = len(results_amp) + 3
    worksheet.cell(row=total_row, column=1, value='Ukupan broj modema:')
    worksheet.cell(row=total_row, column=2, value=count_total_modems)
    
    worksheet.cell(row=total_row + 1, column=1, value='Total Count USP+DSP:')
    worksheet.cell(row=total_row + 1, column=2, value=count_usp_dsp)
    
    worksheet.cell(row=total_row + 2, column=1, value='Total Count USP+DSP+DSS:')
    worksheet.cell(row=total_row + 2, column=2, value=count_usp_dsp_dss)
    
    # Write other sheets
    pd.DataFrame(results_on).to_excel(writer, sheet_name='Top 10 ON', index=False)
    pd.DataFrame(results_dss).to_excel(writer, sheet_name='Top 20 DSS', index=False)

print(f"\n✓ Results exported to '{filename}'")