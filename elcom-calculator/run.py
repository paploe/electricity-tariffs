from helpers import *
import json
import argparse
import os

current_directory = os.path.dirname(os.path.abspath(__file__))

def parse_args():
    parser = argparse.ArgumentParser(
        description="Run the pipeline with a specific JSON input file"
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        required=True,
        help="Absolut path to the input JSON file",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        required=True,
        help="Absolut path to the output JSON file",
    )
    return parser.parse_args()


# Main function containing the analysis steps
def main():
    args = parse_args()
    input_file_path = os.path.abspath(args.input)
    output_file_path = os.path.abspath(args.output)

    with open(input_file_path, "r", encoding="utf-8") as file:
        input_json = json.load(file)
    raw_tarif_df = extract_df_seasonal_tariffs(input_json)
    h4_verbrauch_df = pd.read_csv(os.path.abspath(current_directory+"/data/hourly_verbrauch_h4.csv"))
    merged_tarif_df = average_price(raw_tarif_df, h4_verbrauch_df)
    durchschnitt_df = extract_df_durchschnitt(input_json)
    lower_price, higher_price = durchschnitt_calculation(
        durchschnitt_df, merged_tarif_df
    )
    write_output_tarif(input_json, [lower_price, higher_price], output_file_path)


if __name__ == "__main__":
    main()
