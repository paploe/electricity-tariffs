from helpers import *
import json
import argparse
import os


def parse_args():
    parser = argparse.ArgumentParser(
        description="Run the pipeline with a specific JSON input file"
    )
    parser.add_argument(
        "--input_json",
        "-i",
        type=str,
        required=True,
        help="Absolut path to the input JSON file containing the calculated tariffs",
    )
    parser.add_argument(
        "--input_elcom",
        "-e",
        type=str,
        required=True,
        help="Absolut path to the elcom validation .csv file containing the elcom 2024 tariffs",
    )
    parser.add_argument(
        "--output_json",
        "-o",
        type=str,
        required=True,
        help="Absolut path to the output JSON file",
    )
    return parser.parse_args()


# Main function containing the validation steps
def main():
    args = parse_args()
    input_file_path = os.path.abspath(args.input_json)
    elcom_file_path = os.path.abspath(args.input_elcom)
    output_file_path = os.path.abspath(args.output_json)

    with open(input_file_path, "r", encoding="utf-8") as file:
        input_json_val = json.load(file)
    min_input_tarif = input_json_val["output"]["tiefster Preis [exkl. MWST]"]
    max_input_tarif = input_json_val["output"]["höchster Preis [exkl. MWST]"]
    nr_elcom = get_number_from_json(input_file_path)
    min_validated, max_validated = compare_data_elcom(
        min_input_tarif, max_input_tarif, nr_elcom, elcom_file_path
    )
    write_output_validation(
        input_file_path, [min_validated, max_validated], output_file_path
    )


if __name__ == "__main__":
    main()
