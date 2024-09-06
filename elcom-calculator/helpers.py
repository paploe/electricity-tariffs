import pandas as pd

# Definition from Elcom H4 period consumption:
# "Wohnung mit einem Gesamtverbrauch pro Jahr von 4,500 kWh, aufgeteilt wie folgt"
h4_verbrauch_df = pd.read_csv("data/hourly_verbrauch_h4.csv")
TOT_VERBRAUCH_H4 = 4500


def get_df_from_json(json_file):
    return ()


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
        if row["Day"] == "mo-fri":
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
        df = df.query("Category=='Energie'")

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
    durch_netz = durchscnitt_df[durchscnitt_df["Category"] == "Netznutzung"].copy().drop(["Category"], axis=1)
    durch_netz.set_index("Type", inplace=True)
    total_netz = ((durch_netz.loc["grundpreis"].Value + durch_netz.loc[
        "leistungspreis"].Value) * 100 / TOT_VERBRAUCH_H4) + durch_netz.loc["systemdienstleistung"].Value + avg_netz - \
                 durch_netz.loc["additional_rabatt"].Value

    # calculation for Energielieferung
    seasonal_ener_df = get_seasonal_averages(tariff_df, "Energie")
    avg_ener = get_yearly_average_tarif(seasonal_ener_df)
    durch_ener = durchscnitt_df[durchscnitt_df["Category"] == "Energielieferung"].copy().drop(["Category"], axis=1)
    durch_ener.set_index("Type", inplace=True)
    total_ener = ((durch_ener.loc["grundpreis"].Value + durch_ener.loc[
        "leistungspreis"].Value) * 100 / TOT_VERBRAUCH_H4) + avg_ener - durch_ener.loc["additional_rabatt"].Value

    # calculation Abgaben
    abgaben_max = durchscnitt_df[durchscnitt_df["Category"] == "Abgaben"].Value.max()
    abgaben_min = durchscnitt_df[durchscnitt_df["Category"] == "Abgaben"].Value.min()

    # Netzzuschlag
    netzzuschlag = durchscnitt_df[durchscnitt_df["Category"] == "Netzuschlag"].Value

    total_duschschnitt_min = total_netz + total_ener + abgaben_min + netzzuschlag
    total_duschschnitt_max = total_netz + total_ener + abgaben_max + netzzuschlag
    return total_duschschnitt_min, total_duschschnitt_max

