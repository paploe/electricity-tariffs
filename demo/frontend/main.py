import time
import json
import requests
import streamlit as st


def check_status(key: str):
    while True:
        response = requests.get('http://backend:8000/')

        if response.json().get(key, False):
            break

        time.sleep(1)


def read_elcon_data_dict(elcom_data_json):
      data = json.load(open(elcom_data_json, "r"))

      return {el["operatorName"]: el["elcomNumbers"] for el in data}

elcon_dict = read_elcon_data_dict("../constants/elcom-numbers/elcom-data.json")


if 'clicked' not in st.session_state:
    st.session_state.clicked = False
    st.session_state.option = None

if not st.session_state.clicked:
    option = st.selectbox(
        "Select operator",
        tuple(elcon_dict.keys()),
    )
    st.session_state.option = option


def click_button():
    st.session_state.clicked = True

def click_reset():
    st.session_state.clicked = False

st.button('Process ' + st.session_state.option, on_click=click_button)

if st.session_state.clicked:

    with st.status("Downloading data...", expanded=True) as status:
        st.write("Searching for data...")
        check_status("scrap_file")
        st.write("Found URL.")
        check_status("download_file")
        status.update(
            label="Download complete!", state="complete", expanded=False
        )

    with st.status("Processing data...", expanded=True) as status:
        st.write("Extracting data...")
        check_status("extract_data")
        for i in range(6):
            st.write(f"Harmonizing data part {i+1}/6")
            check_status(f"harmonize_data_{i+1}")
        st.write("Finalizing data...")
        check_status("finalize_data")
        status.update(
            label="Processing complete!", state="complete", expanded=False
        )

st.button("Display results", on_click=click_button)

st.button("Reset", on_click=click_reset)
