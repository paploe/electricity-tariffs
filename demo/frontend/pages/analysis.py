import os
import json
import streamlit as st
import plotly.graph_objects as go


def process_pie_chart():
    st.title("Number of processed files")

    data_dict = json.load(open("../coverage-analyzer/src/stats.json", "r"))
    elcom_dict = json.load(open("../constants/elcom-numbers/elcom-data.json", "r"))

    processed_operators = data_dict["countProcessed"]
    total_operators = len(elcom_dict)

    # Group data together
    group_values = [processed_operators, total_operators - processed_operators]

    group_labels = ['Processed', 'Not processed']

    # Create distplot with custom bin_size
    fig = go.Figure()
    fig.add_trace(go.Pie(labels=group_labels, values=group_values))

    # Plot!
    st.plotly_chart(fig, use_container_width=True)

process_pie_chart()
