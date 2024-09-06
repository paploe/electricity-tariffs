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
    with open(args.input_file, 'r') as file:
        input_json = json.load(file)

    input_df = get_df_from_json(input_json)



if __name__ == "__main__":