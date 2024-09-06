from helpers import*
import json
import argparse

def parse_args():
    parser = argparse.ArgumentParser(description="Run the pipeline with a specific JSON input file")
    parser.add_argument('input_file', type=str, help='Path to the input JSON file')
    return parser.parse_args()


# Main function containing the analysis steps
def main():
    args = parse_args()
    with open(args.input_file, 'r', encoding='utf-8') as file:
        input_json = json.load(file)
    raw_tarif_df = extract_df_seasonal_tariffs(input_json)
    h4_verbrauch_df = pd.read_csv("elcom-calculator/data/hourly_verbrauch_h4.csv")
    merged_tarif_df = average_price(raw_tarif_df, h4_verbrauch_df)
    durchschnitt_df = extract_df_durchschnitt(input_json)
    lower_price, higher_price = durchschnitt_calculation(durchschnitt_df, merged_tarif_df)
    write_output(input_json, [lower_price, higher_price])


if __name__ == "__main__":
    main()