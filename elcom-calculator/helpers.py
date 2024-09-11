import pandas as pd
import json
import os
import numpy as np
import warnings
import re

# Definition from Elcom H4 period consumption:
# "Wohnung mit einem Gesamtverbrauch pro Jahr von 4,500 kWh, aufgeteilt wie folgt"
h4_verbrauch_df = pd.read_csv(os.path.abspath("./data/hourly_verbrauch_h4.csv"))
TOT_VERBRAUCH_H4 = 4500


# Read the input .json and extracts the seasonal, weekly, hourly prices and returns them organized in a dataframe
def extract_df_seasonal_tariffs(input_json):
    tarif = {
        "Netznutzung": input_json["Netznutzung"],
        "Energielieferung": input_json["Energielieferung"],
    }
    data = []
    for category, seasons in tarif.items():
        for season, days in seasons.items():
            for day, hours in days.items():
                for hour, value in hours.items():
                    data.append(
                        {
                            "Category": category,
                            "Season": season,
                            "Day": day,
                            "Hour": hour,
                            "Value": value,
                        }
                    )
        df = pd.DataFrame(data)
        cleaned_df = clean_seasonal_data(df)
    return cleaned_df


# Read the input .json and extracts the prices of the product and returns them organized in a dataframe
def extract_df_durchschnitt(input_json):
    durchschnitt = input_json["Durschschnittspreis"]
    flattened_data = []
    for key, value in durchschnitt.items():
        if isinstance(value, dict):
            for sub_key, sub_value in value.items():
                flattened_data.append(
                    {"Category": key, "Type": sub_key, "Value": sub_value}
                )
        elif isinstance(value, list):
            for i, item in enumerate(value):
                flattened_data.append(
                    {"Category": key, "Type": f"value_{i+1}", "Value": item}
                )
        else:
            flattened_data.append({"Category": key, "Type": "value", "Value": value})
    return pd.DataFrame(flattened_data)


# Change the timings of the dataframe in a series of integers (0 to 23) representing the hours of day
def clean_seasonal_data(df):
    # extract the number of the first hour from string
    def extract_first_hour(s):
        split_string = s.split()
        start_time = split_string[1].split(":")  # Extract the '00' part
        return int(start_time[0])  # Convert the hour part to integer

    df["first_hour"] = df["Hour"].apply(extract_first_hour)
    df.drop(["Hour"], axis=1, inplace=True)
    df.rename(columns={"first_hour": "Hour"}, inplace=True)
    return df


# This function gets as input the hourly prices from the provider (divided in season, day, hour) and the daily period
# consumptions from Elcom, and it returns the merged dataframe.
def average_price(df_arbeitpreises, h4_verbrauch_df):
    df_arbeitpreises["Hour"] = df_arbeitpreises["Hour"].astype(int)
    elcom_hourly_df = pd.merge(
        df_arbeitpreises, h4_verbrauch_df, on=["Season", "Hour"], how="left"
    )
    return elcom_hourly_df


# This functions take as input the sub-dataframe of Arbeitspreisen referring to the one of the standard daily periods
# defined by Elcom (e.g. 6-12am, 12-18pm etc.) and returns a dataframe containing the average yearly expense (in CHF)
# for that period of time, divided by season (winter and summer).
def average_on_day_period(df):
    weekly_mean_df = df.groupby(["Category", "Season", "Day"], as_index=False).mean()
    for index, row in weekly_mean_df.iterrows():
        if row["Day"] == "Montag-Freitag":
            weekly_mean_df.loc[index, "Value"] = (
                row["Value"] * 5 * row["Verbrauch"] / (7 * 100)
            )
        else:
            weekly_mean_df.loc[index, "Value"] = (
                row["Value"] * row["Verbrauch"] / (7 * 100)
            )
    weekly_mean_df.drop(["Category", "Day", "Verbrauch", "Hour"], axis=1, inplace=True)
    weekly_mean_df.reset_index(inplace=True)
    return weekly_mean_df.groupby(["Season"], as_index=False).sum()


# Split the dataframe containing hourly prices  in periods, applies iteratively the weekly means for each period and
# returns a dataframe with all averages for each season for each period
def get_seasonal_averages(df, category):
    if category not in ["Netz", "Energie"]:
        raise ValueError("Invalid option. Expected 'Netz' or 'Energie'.")
    if category == "Netz":
        df = df.query("Category=='Netznutzung'")
    else:
        df = df.query("Category=='Energielieferung'")

    # The dataframe is splitted in the periods defined by Elcom
    period1_df = df[(df["Hour"] >= 6) & (df["Hour"] < 12)].copy()
    period2_df = df[(df["Hour"] >= 12) & (df["Hour"] < 18)].copy()
    period3_df = df[(df["Hour"] >= 18) & (df["Hour"] < 22)].copy()
    period4_df = df[(df["Hour"] >= 22) | (df["Hour"] < 6)].copy()
    periods = [period1_df, period2_df, period3_df, period4_df]
    averages = []
    for period_df in periods:
        averages.append(average_on_day_period(period_df))

    concatenated_df = pd.concat(averages, axis=0, ignore_index=True)
    return concatenated_df


# Calculate the average yearly price (Rp./kWh) for H4 category
def get_yearly_average_tarif(seasonal_avg_df):
    total_price = seasonal_avg_df["Value"].sum()
    return total_price / TOT_VERBRAUCH_H4 * 100


# Calculate the minimum and maximum average tariff of the product
def durchschnitt_calculation(durchscnitt_df, tariff_df):
    # calculation for Netznutzung
    seasonal_netz_df = get_seasonal_averages(tariff_df, "Netz")
    avg_netz = get_yearly_average_tarif(seasonal_netz_df)
    durch_netz = (
        durchscnitt_df[durchscnitt_df["Category"] == "Netznutzung"]
        .copy()
        .drop(["Category"], axis=1)
    )
    durch_netz.set_index("Type", inplace=True)
    total_netz = (
        (
            (
                durch_netz.loc["Grundpreis in CHF"].Value
                + durch_netz.loc["Leistungspreis in CHF"].Value
            )
            * 100
            / TOT_VERBRAUCH_H4
        )
        + durch_netz.loc["Systemdienstleistung in Rp./kWh"].Value
        + avg_netz
        - durch_netz.loc["ZusätzlicherRabatt in Rp./kWh"].Value
    )

    # calculation for Energielieferung
    seasonal_ener_df = get_seasonal_averages(tariff_df, "Energie")
    avg_ener = get_yearly_average_tarif(seasonal_ener_df)
    durch_ener = (
        durchscnitt_df[durchscnitt_df["Category"] == "Energielieferung"]
        .copy()
        .drop(["Category"], axis=1)
    )
    durch_ener.set_index("Type", inplace=True)
    total_ener = (
        (
            (
                durch_ener.loc["Grundpreis in CHF"].Value
                + durch_ener.loc["Leistungspreis in CHF"].Value
            )
            * 100
            / TOT_VERBRAUCH_H4
        )
        + avg_ener
        - durch_ener.loc["ZusätzlicherRabatt in Rp./kWh"].Value
    )

    # calculation Gemeinde Abgaben
    abgaben_max = durchscnitt_df[
        durchscnitt_df["Category"] == "Abgaben in Rp./kWh"
    ].Value.max()
    abgaben_min = durchscnitt_df[
        durchscnitt_df["Category"] == "Abgaben in Rp./kWh"
    ].Value.min()

    # Netzzuschlag
    netzzuschlag = durchscnitt_df[
        durchscnitt_df["Category"] == "Netzuschlag in Rp./kWh"
    ].Value.iloc[0]

    # Stromreserve / Winterstromreserve
    stromreserve = durchscnitt_df[
        durchscnitt_df["Category"] == "Stromreserve/Winterstromreserve in in Rp./kWh"
    ].Value.iloc[0]

    total_duschschnitt_min = (
        total_netz + total_ener + abgaben_min + netzzuschlag + stromreserve
    )
    total_duschschnitt_max = (
        total_netz + total_ener + abgaben_max + netzzuschlag + stromreserve
    )

    return total_duschschnitt_min, total_duschschnitt_max


def write_output_tarif(input_json, output_values, output_json):
    if type(output_values) is not list:
        raise ValueError("Invalid option. 'output_values' must be a list.")
    else:
        new_fields = {
            "tiefster Preis [exkl. MWST]": round(output_values[0], 2),
            "höchster Preis [exkl. MWST]": round(output_values[1], 2),
        }
        # Create the new structure
        new_json_data = {"input": input_json, "output": new_fields}
        # Write the updated JSON data to a new file
        with open(output_json, "w", encoding="utf-8") as file:
            json.dump(new_json_data, file, indent=4, ensure_ascii=False)


def write_output_validation(input_json, output_values, output_json):
    with open(input_json, "r", encoding="utf-8") as file:
        input_json_val = json.load(file)
    if type(output_values) is not list:
        raise ValueError("Invalid option. 'output_values' must be a list.")
    else:
        input_json_val["Elcom validation"] = {
            "Elcom tiefster Preis [exkl. MWST]": output_values[0],
            "Elcom höchster Preis [exkl. MWST]": output_values[1],
        }

        # Write the updated JSON data to a new file
        with open(output_json, "w", encoding="utf-8") as file:
            json.dump(input_json_val, file, indent=4, ensure_ascii=False)


# def validate_tarif_output(input_json, path_elcom_file, output_json):
#    with open(input_json, 'r', encoding='utf-8') as file:
#        input_json_val = json.load(file)
#    min_input_tarif = input_json_val["output"]['tiefster Preis [exkl. MWST]']
#    max_input_tarif = input_json_val["output"]['höchster Preis [exkl. MWST]']
#    nr_elcom = get_number_from_json(input_json)
#    min_validated, max_validated = compare_data_elcom(min_input_tarif, max_input_tarif, nr_elcom, path_elcom_file)
#    write_output_validation(input_json, [min_validated, max_validated], output_json)


# Utility function to get the elcom number from the .json file name
def get_number_from_json(path):
    filename = os.path.basename(path)
    # Check if the file has a .json extension
    if filename.endswith(".json"):
        # Use regex to extract any number in file name
        match = re.search(r"(\d+)", filename)
        if match:
            return int(match.group(0))
        else:
            warnings.warn(
                f"The name of the input file does not contain any number. Validation not possible."
            )
            return 9999
    else:
        raise Exception("Input file is not .JSON")


# Utility function to compare the elcom prices for 2024 with the calculated prices from the .json file
def compare_data_elcom(input_min, input_max, nr_elcom, path_elcom_file):
    df = pd.read_csv(path_elcom_file)
    if nr_elcom in df["nr_elcom"].unique():
        min_elcom = df[df["nr_elcom"] == nr_elcom]["tarif_elcom"].min()
        max_elcom = df[df["nr_elcom"] == nr_elcom]["tarif_elcom"].max()
        if np.abs(min_elcom - input_min) <= 0.01:
            min_validated = True
        else:
            min_validated = False
        if np.abs(max_elcom - input_max) <= 0.01:
            max_validated = True
        else:
            max_validated = False
    else:
        warnings.warn(
            f"Input file does not contain this elcom number provider. Validation not possible."
        )
        min_validated = None
        max_validated = None

    return min_validated, max_validated
